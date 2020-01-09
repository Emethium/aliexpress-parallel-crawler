/**
 * Implements functions for navigating and extracting data from Aliexpress
 *
 * @module core/aliexpress
 */

// Local imports
const logger = require("../config/logger")
const { measureTimeElapsed } = require("../util")

const {
  aliexpressURL,
  productSelector,
  searchButtonSelector,
  offerSelector,
  offersSelector,
} = require("../constants/aliexpress")

async function extractOffers(page) {
  const offers = await page.$$eval(offerSelector, offers =>
    Array.from(offers).map(el => el.innerText),
  )
  console.log(offers)
  return offers.map(parseOffer)
}

function parseOffer(offer) {
  const splittedText = offer.split("\n")

  return {
    productTitle: splittedText[0],
    discountedPriceRange: splittedText[1],
    fullPriceRange: splittedText[2],
    grade: splittedText[4].trim(),
    soldUnits: splittedText[5],
    seller: splittedText[6],
  }
}

/**
 * Submits the search form and halts execution until the resulting screen loads
 *
 * @param {*} page
 * @param {Context} context - The execution context
 */
async function submitForm(page, context) {
  const meta = { category: "scraper", context }

  logger.debug("Submiting form...", meta)

  const start = measureTimeElapsed()

  await page.click(searchButtonSelector)
  await page.waitFor(15000)
  await page.screenshot({ path: "shenanigans0.jpg", fullPage: true })
  // Since the page has lazy loading, we are going to force all the
  // offers to be requested by going to the end of the page
  await page.keyboard.press("End")
  await page.waitFor(5000)
  await page.screenshot({ path: "shenanigans.jpg", fullPage: true })

  const timeElapsed = measureTimeElapsed(start)

  logger.debug("Form filled and resulting page loaded", {
    ...meta,
    timeElapsed,
  })

  return timeElapsed
}

/**
 * Fills the search form (but does not submits it)
 *
 * @param {*} page
 * @param {Context} context - The execution context
 */
async function fillForm(page, context) {
  const meta = { category: "scraper", context }
  const start = measureTimeElapsed()

  await page.type(productSelector, context.product, { delay: 300 })
  const timeElapsed = measureTimeElapsed(start)

  logger.debug("Filled form", {
    ...meta,
    timeElapsed,
  })

  return timeElapsed
}

/**
 * Opens the configured Aliexpress' URL
 * and wait until page is fully loaded
 *
 * @param {*} page
 * @param {Context} context - The execution context
 *
 * @returns {number} - The time elapsed in ms
 */
async function loadPage(page, context) {
  const meta = { category: "scraper", context }
  logger.debug("Loading page...", meta)

  const start = measureTimeElapsed()

  await page.goto(aliexpressURL, {
    waitUntil: ["load"],
    timeout: 30000,
  })

  const timeElapsed = measureTimeElapsed(start)

  logger.debug("Page loaded...", { ...meta, timeElapsed })

  return timeElapsed
}

/**
 * Navigates through Aliexpress and extract all price points
 * for the given execution context
 *
 * @param {Object<string, any>} opts - The options for scrapping
 * @param {*} opts.page - The page bounded to the given puppeteer context
 * @param {Context} opts.context - The execution context
 *
 * @returns {ScrapResult} - The result of the scraping
 */
async function scrap({ page, context }) {
  const perf = {}

  try {
    // Load page
    perf["pageLoad"] = await loadPage(page, context)
    await page.screenshot({ path: "pageLoad.jpg", fullPage: true })

    // Fill form
    perf["fillParameters"] = await fillForm(page, context)
    await page.screenshot({ path: "fillParameters.jpg", fullPage: true })

    // Submits form
    perf["resultPage"] = await submitForm(page, context)
    await page.screenshot({ path: "resultPage.jpg", fullPage: true })

    const offers = await extractOffers(page)

    logger.debug("Completed without errors", {
      category: "scraper",
      context,
    })

    return {
      offers,
      perf,
    }
  } catch (error) {
    const { message, name, stack } = error

    logger.error("An unknown error happened", {
      category: "error",
      error: {
        message,
        stack,
        name,
      },
      context,
    })

    await page.screenshot({ path: "error", fullPage: true })

    return { error, perf }
  }
}

module.exports = scrap
