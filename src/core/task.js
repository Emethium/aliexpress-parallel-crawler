/**
 * Provides core functionality for managing and handling cluster tasks
 *
 * @module core/task
 */

const env = require("../config/environment")
const logger = require("../config/logger")
const measureTimeElapsed = require("../util/time").measureTimeElapsed
const scrapAliexpress = require("./aliexpress")

/**
 * @type {string[]} - The code for the allowed sites
 */
const allowedSites = ["aliexpress"]

/**
 * Resolves the scrap function given the site
 *
 * @param {string} site - The desired site to scrap
 *
 * @returns {Function} - The scrap implementation of the specified site
 */
function resolve(site) {
  if (allowedSites.includes(site)) {
    logger.info(`Started scraping ${site}...`)

    switch (site) {
      case "aliexpress":
        return scrapAliexpress
    }
  } else {
    logger.error(`An unknown site (${site}) was provided.`, {
      category: "error",
    })
  }
}

/**
 * Process tasks executed in a puppeteer cluster
 *
 * @param {Object<string, any>} options - Options for running the task
 * @param {*} options.page - The page object bounded to the chrome execution context
 * @param {*} options.data - The task to be performed
 *
 */
async function taskHandler({ page, data: task }) {
  const start = measureTimeElapsed()

  // Save which execution is this and increment retries
  const execution = task.retries + 1
  task.retries++

  // Extract execution context
  const context = task.context

  // Resolve which scraper to use
  const scraper = resolve(context.site)

  // Bypass current task if provided execution context
  // does not resolve to a valid handler and remove task
  if (!scraper) {
    tasks.delete(context["id"])
    return
  }

  // Start scraping
  const { pricePoints, error, perf } = await scraper({
    page,
    context,
  })

  task.timeElapsed += measureTimeElapsed(start)

  // Check if a retry is required or not
  if (error) {
    const baseError = {
      transient: true,
      execution,
      perf,
    }

    // Preserve order, because if transient
    // is provided by error it should be overwriten
    // from the base error
    const errorResult = {
      ...baseError,
      ...error,
    }

    // Add error result to task
    task.errors.push(errorResult)

    // if error is transient and maximum retries not reached
    // throw an error to force the task handler to retry,
    // otherwise finish execution
    if (task.retries < env.retries && errorResult.transient) {
      logger.info(`Retrying task (${task.retries + 1}/${env.retries})...`, {
        category: "server",
        context,
      })
      throw "retry"
    } else {
      task.success = false
    }
  } else {
    task.success = true
    task.pricePoints = pricePoints
    task.perf = perf
  }
}

/**
 * Creates tasks given the execution context provided
 *
 * @param {Context} context - The execution context
 *
 * @returns {Task} The task to be performed
 */
function createTask(context) {
  return {
    context,
    retries: -1,
    success: false,
    timeElapsed: 0.0,
    perf: {},
    errors: [],
    pricePoints: [],
  }
}

module.exports = {
  taskHandler,
  createTask,
}
