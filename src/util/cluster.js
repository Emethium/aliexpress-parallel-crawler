/**
 * Provides utility methods to interact
 * and manage the puppeteer cluster
 *
 * @module util/cluster
 */

const { Cluster } = require("puppeteer-cluster")
const puppeteerExtra = require("puppeteer-extra")
const pluginStealth = require("puppeteer-extra-plugin-stealth")

const env = require("../config/environment")
const logger = require("../config/logger")

/**
 *
 * @param {Cluster} cluster
 */
function extractClusterMetadata(cluster) {
  if (!cluster) return {}

  const { errorCount, isClosed, startTime, workersAvail, workersBusy } = cluster

  return {
    errorCount,
    isClosed,
    startTime,
    uptime: Date.now() - startTime,
    workersBusy: workersBusy.length,
    workersAvail: workersAvail.length,
  }
}

/**
 * Initializes a puppeteer cluster
 *
 * @returns {Cluster} The initialized cluster
 */
async function initializeCluster() {
  const args = [
    // Required for Docker version of Puppeteer
    "--no-sandbox",
    "--disable-setuid-sandbox",
    // Disable GPU
    "--disable-gpu",
    // This will write shared memory files into /tmp instead of /dev/shm,
    // because Docker’s default for /dev/shm is 64MB
    "--disable-dev-shm-usage",
    // Setting the same cache dir to (try to, at least) benefit caching for the entire cluster
    "--disk-cache-dir=/tmp/browser-cache-disk",
  ]

  puppeteerExtra.use(pluginStealth())

  const cluster = await Cluster.launch({
    concurrency: Cluster.CONCURRENCY_BROWSER,
    maxConcurrency: env.concurrency,
    puppeteer: puppeteerExtra,
    retryLimit: env.retries,
    timeout: 240000,
    workerCreationDelay: 1500,
    sameDomainDelay: 1000,
    puppeteerOptions: {
      executablePath: "/usr/bin/chromium-browser",
      ignoreDefaultArgs: ["--enable-automation"],
      ignoreHTTPSErrors: true,
      defaultViewport: {
        width: 1024,
        height: 768,
      },
      args,
    },
  })

  logger.warn(`Cluster started with ${env.concurrency} nodes!`, {
    category: "cluster",
    concurrency: env.concurrency,
    retries: env.retries,
  })

  return cluster
}

// Exports
module.exports = {
  extractClusterMetadata,
  initializeCluster,
}
