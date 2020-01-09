/**
 * Implements everything log related
 *
 * @module config/logger
 */

const { format, createLogger, transports } = require("winston")
const { defaultMeta } = require("./environment")

/**
 * Creates a derived logger using winston.createLogger.
 *
 * By default, in production, logs are limited to info.
 * Locally all logs should appear in your console.
 *
 * @type {DerivedLogger}
 * @static
 * @constant
 */
const logger = new createLogger({
  level: "silly",
  format: format.json(),
  exitOnError: false,
  defaultMeta,
})

logger.add(
  new transports.Console({
    format: format.combine(
      format.colorize({ all: true }),
      format.timestamp({
        format: "DD-MM-YYYY HH:mm:ss",
      }),
      format.printf(msg => {
        const { timeElapsed, error, timestamp, level, message, context } = msg

        let out = `${timestamp} - ${level} : ${message}`

        if (timeElapsed) out += ` (${timeElapsed}ms)`
        if (error && error.stack) out += `\n\n${error.stack}\n`
        if (error && error.code) out += ` (${error.code})`

        return out
      }),
    ),
  }),
)

module.exports = logger
