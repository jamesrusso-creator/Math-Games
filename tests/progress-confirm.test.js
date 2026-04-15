'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { chromium } = require('playwright');
const {
    configureDecimatDice,
    configureFractionsDice,
    getText,
    openAppPage,
    openDecimats,
    openFractions,
    openPlaceNumber,
    setRandomSequence,
    waitForHidden,
    waitForText,
    waitForVisible
} = require('./support/browser-test-helpers');

let browser;

test.before(async () => {
    browser = await chromium.launch({ headless: true });
});

test.after(async () => {
    await browser?.close();
});

test('New Game in Colour in Fractions confirms before clearing an unfinished round', async (t) => {
    const page = await openAppPage(browser, t);

    await openFractions(page);
    await configureFractionsDice(page, 1, 2);

    await page.click('#roll-fraction-btn');
    await waitForText(page, '#current-fraction', '1/2');

    await page.click('#reset-fractions-btn');
    await waitForVisible(page, '#progress-confirm-modal');
    assert.equal(await getText(page, '#progress-confirm-title'), 'Start a new game?');
    assert.match(await getText(page, '#progress-confirm-message'), /Colour in Fractions/i);

    await page.click('#progress-confirm-cancel');
    await waitForHidden(page, '#progress-confirm-modal');
    await waitForText(page, '#current-fraction', '1/2');

    await page.click('#reset-fractions-btn');
    await waitForVisible(page, '#progress-confirm-modal');
    await page.click('#progress-confirm-yes');
    await waitForHidden(page, '#progress-confirm-modal');
    await waitForText(page, '#current-fraction', '-');
    await waitForText(page, '#fraction-round', '1');
    await waitForText(page, '#correct-count', '0');
});

test('New Game in Colour in Decimats confirms before clearing an unfinished round', async (t) => {
    const page = await openAppPage(browser, t);

    await openDecimats(page);
    await configureDecimatDice(page, 3, 100);

    await page.click('#roll-decimat-btn');
    await waitForText(page, '#current-decimat-roll', '3/100 (0.03)');

    await page.click('#reset-decimats-btn');
    await waitForVisible(page, '#progress-confirm-modal');
    assert.equal(await getText(page, '#progress-confirm-title'), 'Start a new game?');
    assert.match(await getText(page, '#progress-confirm-message'), /Colour in Decimats/i);

    await page.click('#progress-confirm-yes');
    await waitForHidden(page, '#progress-confirm-modal');
    await waitForText(page, '#current-decimat-roll', '-');
    await waitForText(page, '#decimat-round', '1');
    await waitForText(page, '#decimat-total', '0.000');
});

test('New Game in Place That Number confirms before clearing an unfinished round', async (t) => {
    const page = await openAppPage(browser, t);

    await openPlaceNumber(page, 'int_100');
    await setRandomSequence(page, [0.15, 0.25]);

    await page.click('#roll-place-number-btn');
    await waitForText(page, '#place-digits', '1 & 2');

    await page.click('#reset-place-number-btn');
    await waitForVisible(page, '#progress-confirm-modal');
    assert.equal(await getText(page, '#progress-confirm-title'), 'Start a new game?');
    assert.match(await getText(page, '#progress-confirm-message'), /Place That Number/i);

    await page.click('#progress-confirm-yes');
    await waitForHidden(page, '#progress-confirm-modal');
    await waitForText(page, '#place-digits', '-');
    await waitForText(page, '#place-round', '1');
    await waitForText(page, '#place-selected-number', '-');
});

test('Top navigation confirms before leaving an unfinished game for Home', async (t) => {
    const page = await openAppPage(browser, t);

    await openFractions(page);
    await configureFractionsDice(page, 1, 2);

    await page.click('#roll-fraction-btn');
    await waitForText(page, '#current-fraction', '1/2');

    await page.click('.nav-link[href="#home"]');
    await waitForVisible(page, '#progress-confirm-modal');
    assert.equal(await getText(page, '#progress-confirm-title'), 'Leave current game?');

    await page.click('#progress-confirm-cancel');
    await waitForHidden(page, '#progress-confirm-modal');
    await waitForVisible(page, '#fractions');
    await waitForText(page, '#current-fraction', '1/2');

    await page.click('.nav-link[href="#home"]');
    await waitForVisible(page, '#progress-confirm-modal');
    await page.click('#progress-confirm-yes');
    await waitForHidden(page, '#progress-confirm-modal');
    await waitForVisible(page, '#home');
});

test('Top navigation confirms before switching from Decimats to another game', async (t) => {
    const page = await openAppPage(browser, t);

    await openDecimats(page);
    await configureDecimatDice(page, 3, 100);

    await page.click('#roll-decimat-btn');
    await waitForText(page, '#current-decimat-roll', '3/100 (0.03)');

    await page.click('.nav-link[href="#fractions"]');
    await waitForVisible(page, '#progress-confirm-modal');
    assert.equal(await getText(page, '#progress-confirm-title'), 'Leave current game?');

    await page.click('#progress-confirm-yes');
    await waitForHidden(page, '#progress-confirm-modal');
    await waitForVisible(page, '#version-modal');

    await page.click('#version-modal-cancel');
    await waitForHidden(page, '#version-modal');
});

test('Top navigation confirms before reopening Place That Number on a different version', async (t) => {
    const page = await openAppPage(browser, t);

    await openPlaceNumber(page, 'int_100');
    await setRandomSequence(page, [0.75, 0.45]);

    await page.click('#roll-place-number-btn');
    await waitForText(page, '#place-digits', '7 & 4');

    await page.click('.nav-link[href="#place-number"]');
    await waitForVisible(page, '#progress-confirm-modal');
    assert.equal(await getText(page, '#progress-confirm-title'), 'Start a new game?');

    await page.click('#progress-confirm-yes');
    await waitForHidden(page, '#progress-confirm-modal');
    await waitForVisible(page, '#place-version-modal');

    await page.click('#place-version-modal-cancel');
    await waitForHidden(page, '#place-version-modal');
});
