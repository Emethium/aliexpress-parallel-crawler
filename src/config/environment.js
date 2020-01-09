/**
 * Provides constants on initialization for managing the environment
 *
 * @module config/environment
 */

const os = require("os")

/**
 * The host address in which the server listener
 * should bind wait for incoming requests
 * Defaults to 0.0.0.0
 *
 * @static
 * @constant
 * @type {string}
 */
const bindAddress = process.env.BIND_ADDRESS || "0.0.0.0"

/**
 * The host port in which the server listener should bind
 * Defaults to 3000
 *
 * @static
 * @constant
 * @type {number}
 * */
const port = parseInt(process.env.PORT || 3000, 10)

/**
 * Maximum concurrency allowed for Puppeteer Cluster
 * Defaults to the number of available CPUs through os.cpus()
 * When the number of cpus is not available, defaults to 1
 *
 * @static
 * @constant
 * @type {number}
 * */
const concurrency = parseInt(
  process.env.CONCURRENCY || os.cpus().length || 1,
  10,
)

/**
 * Maximum number of retries per cluster task
 * Defaults to 3
 *
 * @static
 * @constant
 * @type {number}
 */
const retries = parseInt(process.env.RETRIES || 3, 10)

/**
 * Default metadata for logging services
 *
 * @static
 * @constant
 * @type {Object.<string, any>}
 */
const defaultMeta = {
  service: "scraper",
  host: os.hostname(),
  arch: os.arch(),
  cpus: os.cpus().length,
  platform: os.platform(),
  totalmem: parseInt(os.totalmem() / 1000.0 ** 2) + "MB",
  category: "no-category",
}

module.exports = {
  bindAddress,
  port,
  concurrency,
  retries,
  defaultMeta,
}
