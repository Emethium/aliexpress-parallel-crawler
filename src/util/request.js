/**
 * Provides helper methods for dealing with application requests
 *
 * @module util/request
 */

const logger = require("../config/logger")

/**
 *
 * @param {*} req - A http.Request object for the current request
 */
function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    try {
      let data = ""

      req.on("data", chunk => (data += chunk))

      req.on("end", () => {
        logger.silly("Request transit ended", { category: "server" })

        try {
          resolve(JSON.parse(data.toString()))
        } catch (error) {
          logger.error("The provided request body is not a valid JSON", {
            category: "server",
            content: data.toString(),
            error: {
              stack: error.stack,
              name: error.name,
              message: error.message,
            },
          })

          reject(error)
        }
      })
    } catch (error) {
      logger.error(
        "Could not parse request body or process the current request",
        {
          category: "server",
          error: {
            stack: error.stack,
            name: error.name,
            message: error.message,
          },
        },
      )
    }
  })
}

module.exports = {
  parseRequestBody,
}
