'use strict';

const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { startPageCoverage, stopPageCoverage } = require('./browser-coverage');

const appUrl = pathToFileURL(path.resolve(__dirname, '..', '..', 'index.html')).href;

async function openAppPage(browser, t) {
    const context = await browser.newContext({
        viewport: { width: 1440, height: 1400 }
    });
    const page = await context.newPage();

    await startPageCoverage(page);

    t.after(async () => {
        try {
            await stopPageCoverage(page);
        } finally {
            await context.close();
        }
    });

    await page.goto(appUrl);
    await page.waitForLoadState('domcontentloaded');

    return page;
}

async function waitForVisible(page, selector) {
    await page.waitForFunction((sel) => {
        const element = document.querySelector(sel);
        return Boolean(element) && !element.hidden;
    }, selector);
}

async function waitForHidden(page, selector) {
    await page.waitForFunction((sel) => {
        const element = document.querySelector(sel);
        return !element || element.hidden;
    }, selector);
}

async function waitForText(page, selector, expectedText) {
    await page.waitForFunction(({ sel, expected }) => {
        const element = document.querySelector(sel);
        return element && element.textContent.trim() === expected;
    }, { sel: selector, expected: expectedText });
}

async function getText(page, selector) {
    return (await page.locator(selector).textContent()).trim();
}

async function getRowText(page, rowSelector) {
    await page.waitForFunction((sel) => Boolean(document.querySelector(sel)), rowSelector);

    return page.locator(`${rowSelector} td`).evaluateAll((cells) =>
        cells.map((cell) => cell.textContent.trim())
    );
}

async function isDisabled(page, selector) {
    return page.locator(selector).evaluate((element) => element.disabled);
}

async function openFractions(page, version = 'proper') {
    await page.click('.play-fractions-btn');
    await waitForVisible(page, '#version-modal');
    await page.click(`.version-option[data-version="${version}"]`);
    await waitForVisible(page, '#fractions');
}

async function openDecimats(page) {
    await page.click('.play-decimats-btn');
    await waitForVisible(page, '#decimats');
}

function normalizeFaces(value, faceCount = 6) {
    if (Array.isArray(value)) {
        if (value.length !== faceCount) {
            throw new Error(`Expected ${faceCount} dice faces, received ${value.length}.`);
        }
        return value;
    }

    return Array(faceCount).fill(value);
}

async function configureFractionsDice(page, numerator, denominator) {
    const numerators = normalizeFaces(numerator);
    const denominators = normalizeFaces(denominator);

    await page.click('#custom-dice-trigger');
    await waitForVisible(page, '#custom-dice-modal');
    await waitForVisible(page, '#fractions-custom-dice-panel');

    for (let face = 1; face <= 6; face += 1) {
        await page.locator(`#frac-int-${face}`).fill(String(numerators[face - 1]));
        await page.selectOption(`#frac-denom-${face}`, String(denominators[face - 1]));
    }

    await page.click('#save-fraction-dice');
    await page.waitForFunction(() => {
        const message = document.querySelector('#fraction-dice-error');
        return message && !message.hidden && message.textContent.includes('saved successfully');
    });
    await page.click('#custom-dice-close');
    await waitForHidden(page, '#custom-dice-modal');
}

async function configureDecimatDice(page, numberValue, placeValue) {
    const numbers = normalizeFaces(numberValue);
    const placeValues = normalizeFaces(placeValue);

    await page.click('#custom-decimat-dice-trigger');
    await waitForVisible(page, '#custom-dice-modal');
    await waitForVisible(page, '#decimats-custom-dice-panel');

    for (let face = 1; face <= 6; face += 1) {
        await page.locator(`#decimat-int-${face}`).fill(String(numbers[face - 1]));
        await page.selectOption(`#decimat-place-${face}`, String(placeValues[face - 1]));
    }

    await page.click('#save-decimat-dice');
    await page.waitForFunction(() => {
        const message = document.querySelector('#decimat-dice-error');
        return message && !message.hidden && message.textContent.includes('saved successfully');
    });
    await page.click('#custom-dice-close');
    await waitForHidden(page, '#custom-dice-modal');
}

async function clickFractionCells(page, rowIndex, cellIndexes) {
    for (const cellIndex of cellIndexes) {
        await page.click(`.fraction-cell[data-row="${rowIndex}"][data-cell="${cellIndex}"]`);
    }
}

async function clickDecimatCells(page, selector, count) {
    const cells = page.locator(selector);

    for (let index = 0; index < count; index += 1) {
        await cells.nth(index).click();
    }
}

async function setRandomSequence(page, values) {
    await page.evaluate((sequence) => {
        let index = 0;
        const fallback = sequence.length > 0 ? sequence[sequence.length - 1] : 0;

        Math.random = () => {
            const nextValue = index < sequence.length ? sequence[index] : fallback;
            index += 1;
            return nextValue;
        };
    }, values);
}

module.exports = {
    clickDecimatCells,
    clickFractionCells,
    configureDecimatDice,
    configureFractionsDice,
    getRowText,
    getText,
    isDisabled,
    openAppPage,
    openDecimats,
    openFractions,
    setRandomSequence,
    waitForHidden,
    waitForText,
    waitForVisible
};
