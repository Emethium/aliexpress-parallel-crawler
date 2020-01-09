/**
 * Common helpers for dealing with time transformation
 *
 * @module util/time
 */

/**
 * Returns the elapsed time in ms from the result of process.hrtime(start)
 *
 * @param {NodeJS.HRTime} hrtime - Time in [seconds, nanoseconds], any other parameters will be ignored
 * @returns {string} - The time elapsed in milliseconds
 * */
function toMilliseconds(hrtime) {
  const [seconds, nanoseconds, ..._] = hrtime

  return (seconds * 1000 + nanoseconds / 1000000).toFixed(2)
}

/**
 * Returns a reference to a arbitrary fixed point if time if hrtime is not provided.
 * Otherwise returns the time spent in milliseconds
 *
 * @param {NodeJS.HRTime} [hrtime]
 * @returns {NodeJS.HRTime | number}
 * */
function measureTimeElapsed(hrtime) {
  if (hrtime) {
    return parseFloat(toMilliseconds(process.hrtime(hrtime)), 10)
  } else {
    return process.hrtime()
  }
}

// Exports
exports.toMilliseconds = toMilliseconds
exports.measureTimeElapsed = measureTimeElapsed