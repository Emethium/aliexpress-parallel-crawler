// Third party modules
const http = require("http")

// Local modules
const env = require("./config/environment")
const logger = require("./config/logger")
const { taskHandler, createTask } = require("./core/task")
const {
  extractClusterMetadata,
  initializeCluster,
  measureTimeElapsed,
  parseRequestBody,
} = require("./util")

// Global variables
let cluster
let initializingCluster = false
let serverBusy = false

/**
 * When the server is considered busy, or cluster is
 * initializing, returns true, otherwise returns false.
 *
 * @returns {boolean} The server is busy performing and not ready for receiving incoming requests
 */
function isBusy() {
  return serverBusy || initializingCluster
}

/**
 * Enqueues all tasks derived from batch and await until
 * they are fully processed.
 *
 * Duplicated tasks are removed by default.
 *
 * @param {*} batch - The incoming tasks to process
 *
 * @returns {void}
 *
 */
async function execute(batch) {
  // Register task handler
  cluster.task(taskHandler)

  // Start processing the incoming batch
  const start = measureTimeElapsed()
  const receivedTasksCount = batch.length

  // Create all tasks from the provided batch
  // A Map ensures that eventually duplicate
  // items in a batch are not processed twice
  const tasks = new Map()

  for (let index = 0; index < batch.length; index++) {
    const context = batch[index]
    tasks.set(context["id"], createTask(context))
  }

  const executedTasksCount = tasks.size

  logger.info(`There are ${tasks.size} pending tasks`, {
    category: "server",
    receivedTasksCount,
  })

  // Enqueue all tasks
  for (const [_, task] of tasks) {
    cluster.queue(task)
  }

  // Wait until all tasks are completed
  await cluster.idle()

  const timeElapsed = measureTimeElapsed(start)

  const response = Array.from(tasks.values())
  const avgTimeElapsedPerTask = timeElapsed / executedTasksCount
  const avgTimeElapsedPerCore = avgTimeElapsedPerTask * env.concurrency
  const successfullTasksCount = response.filter(task => task.success).length

  return {
    response,
    timeElapsed,
    receivedTasksCount,
    executedTasksCount,
    avgTimeElapsedPerTask,
    avgTimeElapsedPerCore,
    successfullTasksCount,
  }
}

/***
 * Endpoint handlers
 *
 * The following section implements functions for handling incoming requests
 * */

/**
 * POST /scrap
 * POST /
 *
 * @param {http.IncomingRequest} req - The incoming request
 * @param {http.ServerResponse} res - The server response
 *
 * @returns {void}
 *
 */
async function scrap(req, res) {
  // Set response as JSON
  res.setHeader("Content-Type", "application/json")

  try {
    if (isBusy()) {
      res.write(JSON.stringify({ busy: true }))
    } else {
      // Lock server for the current batch
      serverBusy = true

      const { receiptHandle, messageId, body: batch } = await parseRequestBody(
        req,
      )

      initializingCluster = true

      try {
        cluster = await initializeCluster()
      } finally {
        initializingCluster = false
      }

      const response = await execute(batch)

      response.proxy = proxy
      response.receiptHandle = receiptHandle
      response.messageId = messageId

      logger.info("Request fully processed", {
        category: "server",
        timeElapsed: response.timeElapsed,
        performedTasks: response.performedTasks,
      })

      res.write(Buffer.from(JSON.stringify(response)))

      serverBusy = false
    }
  } catch (error) {
    serverBusy = false

    const { message, stack, name } = error

    logger.error(`Could not process the incoming request because ${message}`, {
      category: "server",
      error: {
        message,
        stack,
        name,
      },
    })

    res.statusCode = 500

    res.write(JSON.stringify({ error: { message, name } }))
  } finally {
    logger.silly("Request processed by /scrap")
    res.end()
  }
}

/**
 * GET /status
 * GET /*
 *
 * @param {http.IncomingRequest} _req - The incoming request
 * @param {http.ServerResponse} res - The server response
 *
 * @returns {void}
 */
async function status(req, res) {
  const { remoteAddress } = req.connection

  logger.info(`Received incoming request for /status from ${remoteAddress}`, {
    category: "server",
    remoteAddress,
  })

  const metadata = extractClusterMetadata(cluster)
  const buffer = Buffer.from(
    JSON.stringify({ cluster: metadata, busy: isBusy(), up: true }),
  )

  res.setHeader("Content-Type", "application/json")

  res.write(buffer)
  logger.silly("Request processed by /status")
  res.end()
}

// Start and configure server
const server = http.createServer(async (req, res) => {
  switch (req.url) {
    case "/scrap":
    case "/":
      await scrap(req, res)
      break
    case "/status":
    default:
      await status(req, res)
  }
})

server.setTimeout(env.timeout)

server.listen(env.port, env.bindAddress, () => {
  logger.info(`Started server on ${env.bindAddress}:${env.port}`, {
    category: "server",
    port: env.port,
    bindAddress: env.bindAddress,
  })
})
