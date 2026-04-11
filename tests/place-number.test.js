'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { chromium } = require('playwright');
const {
    getRowText,
    getText,
    openAppPage,
    setRandomSequence,
    waitForText,
    waitForVisible
} = require('./support/browser-test-helpers');

let browser;

async function openPlaceNumber(page, variant) {
    await page.click('.play-place-number-btn');
    await waitForVisible(page, '#place-version-modal');
    await page.click(`.place-version-option[data-place-variant="${variant}"]`);
    await waitForVisible(page, '#place-number');
}

async function clickPlaceChoice(page, label) {
    await page.locator('#place-choice-buttons .place-option-btn', { hasText: label }).click();
}

async function clickNumberLineAtRatio(page, ratio) {
    const box = await page.locator('#place-number-line .place-number-line-inner').boundingBox();
    if (!box) {
        throw new Error('Could not measure the Place That Number line.');
    }

    await page.mouse.click(box.x + (box.width * ratio), box.y + (box.height / 2));
}

test.before(async () => {
    browser = await chromium.launch({ headless: true });
});

test.after(async () => {
    await browser?.close();
});

test('Place That Number 0-100 keeps the integer version and records half-step placement history', async (t) => {
    const page = await openAppPage(browser, t);

    await openPlaceNumber(page, 'int_100');
    await setRandomSequence(page, [0.75, 0.45, 0.15, 0.15]);

    await page.click('#roll-place-number-btn');
    await waitForText(page, '#place-digits', '7 & 4');
    await clickPlaceChoice(page, '74');
    await clickNumberLineAtRatio(page, 0.745);
    await page.click('#check-place-number-btn');
    await waitForText(page, '#place-round', '2');

    await page.click('#roll-place-number-btn');
    await waitForText(page, '#place-digits', '1 & 1');
    await clickNumberLineAtRatio(page, 1);
    await page.click('#check-place-number-btn');

    await waitForVisible(page, '#game-modal');

    const priorCorrectRow = await getRowText(page, '#place-number-table tbody tr:nth-child(2)');
    assert.deepEqual(priorCorrectRow, ['1', '7 & 4', '74', '74 1/2', 'Correct']);
});

test('Place That Number 0-1000 supports three dice and records half-step placement history', async (t) => {
    const page = await openAppPage(browser, t);

    await openPlaceNumber(page, 'int_1000');
    assert.equal(await getText(page, '#place-number-title'), 'Place That Number (0 to 1000)');
    assert.match(await getText(page, '#place-benchmark-toggle-label'), /250 \/ 500 \/ 750/);

    await setRandomSequence(page, [0.15, 0.25, 0.35, 0.45, 0.45, 0.45]);

    await page.click('#roll-place-number-btn');
    await waitForText(page, '#place-digits', '1 & 2 & 3');
    await clickPlaceChoice(page, '123');
    await clickNumberLineAtRatio(page, 0.1235);
    await page.click('#check-place-number-btn');
    await waitForText(page, '#place-round', '2');

    await page.click('#roll-place-number-btn');
    await waitForText(page, '#place-digits', '4 & 4 & 4');
    await clickNumberLineAtRatio(page, 1);
    await page.click('#check-place-number-btn');

    await waitForVisible(page, '#game-modal');

    const priorCorrectRow = await getRowText(page, '#place-number-table tbody tr:nth-child(2)');
    assert.deepEqual(priorCorrectRow, ['1', '1 & 2 & 3', '123', '123 1/2', 'Correct']);
});

test('Place That Number 0-6 fractions normalizes the chosen value and records mixed-fraction history', async (t) => {
    const page = await openAppPage(browser, t);

    await openPlaceNumber(page, 'frac_0_6');
    assert.equal(await getText(page, '#place-number-title'), 'Place That Number (0 to 6 Fractions)');

    await setRandomSequence(page, [0.2, 0.75, 0, 0]);

    await page.click('#roll-place-number-btn');
    await waitForText(page, '#place-digits', '2 & 5');
    await clickPlaceChoice(page, '5/2');
    await clickNumberLineAtRatio(page, 2.5 / 6);
    await page.click('#check-place-number-btn');
    await waitForText(page, '#place-round', '2');

    await page.click('#roll-place-number-btn');
    await waitForText(page, '#place-digits', '1 & 1');
    await clickNumberLineAtRatio(page, 1);
    await page.click('#check-place-number-btn');

    await waitForVisible(page, '#game-modal');

    const priorCorrectRow = await getRowText(page, '#place-number-table tbody tr:nth-child(2)');
    assert.deepEqual(priorCorrectRow, ['1', '2 & 5', '5/2 (= 2 1/2)', '2 1/2', 'Correct']);
});
