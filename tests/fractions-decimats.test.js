'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const {
    startPageCoverage,
    stopPageCoverage,
    writeCoverageReport
} = require('./support/browser-coverage');

const appUrl = pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href;

let browser;

test.before(async () => {
    browser = await chromium.launch({ headless: true });
});

test.after(async () => {
    await browser?.close();
    writeCoverageReport();
});

async function newPage(t) {
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

async function getRowText(page, rowSelector) {
    await page.waitForFunction((sel) => Boolean(document.querySelector(sel)), rowSelector);

    return page.locator(`${rowSelector} td`).evaluateAll((cells) =>
        cells.map((cell) => cell.textContent.trim())
    );
}

async function openFractions(page) {
    await page.click('.play-fractions-btn');
    await waitForVisible(page, '#version-modal');
    await page.click('.version-option[data-version="proper"]');
    await waitForVisible(page, '#fractions');
}

async function openDecimats(page) {
    await page.click('.play-decimats-btn');
    await waitForVisible(page, '#decimats');
}

async function configureFractionsDice(page, numerator, denominator) {
    await page.click('#custom-dice-trigger');
    await waitForVisible(page, '#custom-dice-modal');
    await waitForVisible(page, '#fractions-custom-dice-panel');

    for (let face = 1; face <= 6; face += 1) {
        await page.locator(`#frac-int-${face}`).fill(String(numerator));
        await page.selectOption(`#frac-denom-${face}`, String(denominator));
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
    await page.click('#custom-decimat-dice-trigger');
    await waitForVisible(page, '#custom-dice-modal');
    await waitForVisible(page, '#decimats-custom-dice-panel');

    for (let face = 1; face <= 6; face += 1) {
        await page.locator(`#decimat-int-${face}`).fill(String(numberValue));
        await page.selectOption(`#decimat-place-${face}`, String(placeValue));
    }

    await page.click('#save-decimat-dice');
    await page.waitForFunction(() => {
        const message = document.querySelector('#decimat-dice-error');
        return message && !message.hidden && message.textContent.includes('saved successfully');
    });
    await page.click('#custom-dice-close');
    await waitForHidden(page, '#custom-dice-modal');
}

test('Colour in Fractions records a correct fixed roll', async (t) => {
    const page = await newPage(t);

    await openFractions(page);
    await configureFractionsDice(page, 1, 2);

    await page.click('#roll-fraction-btn');
    await waitForText(page, '#current-fraction', '1/2');

    await page.click('.fraction-cell[data-row="0"][data-cell="0"]');
    await waitForText(page, '#fraction-selected', '0.500');

    await page.click('#check-result-btn');

    await waitForText(page, '#correct-count', '1');
    await waitForText(page, '#fraction-round', '2');

    const latestRow = await getRowText(page, '#fractions-table tbody tr:first-child');
    assert.deepEqual(latestRow, ['1', '1/2', '1/2', 'Correct']);

    const wasUsed = await page.locator('.fraction-cell[data-row="0"][data-cell="0"]').evaluate((cell) =>
        cell.classList.contains('used')
    );
    assert.equal(wasUsed, true);
});

test('Colour in Fractions confirms a possible skip', async (t) => {
    const page = await newPage(t);

    await openFractions(page);
    await configureFractionsDice(page, 1, 2);

    await page.click('#roll-fraction-btn');
    await waitForText(page, '#current-fraction', '1/2');

    await page.click('#skip-turn-btn');
    await waitForVisible(page, '#skip-confirm-modal');

    const modalMessage = await page.locator('#skip-confirm-message').textContent();
    assert.match(modalMessage, /possible/i);

    await page.click('#skip-confirm-yes');
    await waitForHidden(page, '#skip-confirm-modal');
    await waitForText(page, '#skipped-possible-count', '1');

    const latestRow = await getRowText(page, '#fractions-table tbody tr:first-child');
    assert.deepEqual(latestRow, ['1', '1/2', '-', 'Skipped (Possible)']);
});

test('Colour in Decimats records a correct hundredths selection', async (t) => {
    const page = await newPage(t);

    await openDecimats(page);
    await configureDecimatDice(page, 3, 100);

    await page.click('#roll-decimat-btn');
    await waitForText(page, '#current-decimat-roll', '3/100 (0.03)');

    const hundredths = page.locator('#decimat-board .decimat-hundredth:not(.decimat-cell-split)');
    await hundredths.nth(0).click();
    await hundredths.nth(1).click();
    await hundredths.nth(2).click();

    await waitForText(page, '#decimat-selected', '0.030');
    await page.click('#check-decimat-btn');

    await waitForText(page, '#decimat-correct-count', '1');
    await waitForText(page, '#decimat-total', '0.030');

    const latestRow = await getRowText(page, '#decimats-table tbody tr:first-child');
    assert.deepEqual(latestRow, ['1', '3/100 (0.03)', '3/100 (0.03)', '0.03', 'Correct']);
});

test('Colour in Decimats supports splitting a hundredth into thousandths', async (t) => {
    const page = await newPage(t);

    await openDecimats(page);
    await configureDecimatDice(page, 1, 1000);

    await page.click('#roll-decimat-btn');
    await waitForText(page, '#current-decimat-roll', '1/1000 (0.001)');

    const hundredths = page.locator('#decimat-board .decimat-hundredth:not(.decimat-cell-split)');
    await hundredths.first().dblclick();

    await page.waitForFunction(() =>
        document.querySelectorAll('#decimat-board .decimat-hundredth.decimat-cell-split').length === 2
    );

    const splitFeedback = await page.locator('#decimat-feedback').textContent();
    assert.match(splitFeedback, /split the hundredth into thousandths/i);

    const splitHundredths = page.locator('#decimat-board .decimat-hundredth.decimat-cell-split');
    await splitHundredths.nth(1).locator('.decimat-thousandth').first().click();

    await waitForText(page, '#decimat-selected', '0.001');
    await page.click('#check-decimat-btn');

    await waitForText(page, '#decimat-correct-count', '1');
    await waitForText(page, '#decimat-total', '0.001');

    const latestRow = await getRowText(page, '#decimats-table tbody tr:first-child');
    assert.deepEqual(latestRow, ['1', '1/1000 (0.001)', '1/1000 (0.001)', '0.001', 'Correct']);
});
