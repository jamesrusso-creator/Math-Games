'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { chromium } = require('playwright');
const {
    clickFractionCells,
    configureFractionsDice,
    getRowText,
    getText,
    isDisabled,
    openAppPage,
    openFractions,
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

test('Colour in Fractions records a correct fixed roll', async (t) => {
    const page = await openAppPage(browser, t);

    await openFractions(page);
    await configureFractionsDice(page, 1, 2);

    await page.click('#roll-fraction-btn');
    await waitForText(page, '#current-fraction', '1/2');

    await clickFractionCells(page, 0, [0]);
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

test('Colour in Fractions clear selection resets the current choice', async (t) => {
    const page = await openAppPage(browser, t);

    await openFractions(page);
    await configureFractionsDice(page, 1, 2);

    await page.click('#roll-fraction-btn');
    await waitForText(page, '#current-fraction', '1/2');

    await clickFractionCells(page, 0, [0]);
    await waitForText(page, '#fraction-selected', '0.500');
    assert.equal(await isDisabled(page, '#check-result-btn'), false);

    await page.click('#clear-selection-btn');

    await waitForText(page, '#fraction-selected', '0.000');
    assert.equal(await isDisabled(page, '#check-result-btn'), true);
});

test('Colour in Fractions incorrect attempt clears selection and keeps the round active', async (t) => {
    const page = await openAppPage(browser, t);

    await openFractions(page);
    await configureFractionsDice(page, 1, 2);

    await page.click('#roll-fraction-btn');
    await waitForText(page, '#current-fraction', '1/2');

    await clickFractionCells(page, 1, [0]);
    await page.click('#check-result-btn');

    await waitForText(page, '#incorrect-count', '1');
    await waitForText(page, '#fraction-round', '1');
    await waitForText(page, '#fraction-selected', '0.000');

    const feedback = await getText(page, '#fraction-feedback');
    assert.match(feedback, /two attempts remaining/i);
    assert.equal(await isDisabled(page, '#check-result-btn'), true);

    const latestRow = await getRowText(page, '#fractions-table tbody tr:first-child');
    assert.deepEqual(latestRow, ['1', '1/2', '1/3', 'Incorrect']);
});

test('Colour in Fractions advances after the third incorrect attempt', async (t) => {
    const page = await openAppPage(browser, t);

    await openFractions(page);
    await configureFractionsDice(page, 1, 2);

    await page.click('#roll-fraction-btn');
    await waitForText(page, '#current-fraction', '1/2');

    for (let attempt = 0; attempt < 3; attempt += 1) {
        await clickFractionCells(page, 1, [attempt % 3]);
        await page.click('#check-result-btn');
    }

    await waitForText(page, '#incorrect-count', '3');
    await waitForText(page, '#fraction-round', '2');
    await waitForText(page, '#current-fraction', '-');

    const latestRow = await getRowText(page, '#fractions-table tbody tr:first-child');
    assert.deepEqual(latestRow, ['1', '1/2', '1/3', 'Incorrect']);
});

test('Colour in Fractions confirms a possible skip', async (t) => {
    const page = await openAppPage(browser, t);

    await openFractions(page);
    await configureFractionsDice(page, 1, 2);

    await page.click('#roll-fraction-btn');
    await waitForText(page, '#current-fraction', '1/2');

    await page.click('#skip-turn-btn');
    await waitForVisible(page, '#skip-confirm-modal');

    const modalMessage = await getText(page, '#skip-confirm-message');
    assert.match(modalMessage, /possible/i);

    await page.click('#skip-confirm-yes');
    await waitForHidden(page, '#skip-confirm-modal');
    await waitForText(page, '#skipped-possible-count', '1');

    const latestRow = await getRowText(page, '#fractions-table tbody tr:first-child');
    assert.deepEqual(latestRow, ['1', '1/2', '-', 'Skipped (Possible)']);
});

test('Colour in Fractions marks an impossible skip without opening the confirmation modal', async (t) => {
    const page = await openAppPage(browser, t);

    await openFractions(page);

    await configureFractionsDice(page, 2, [5, 5, 5, 2, 2, 2]);
    await setRandomSequence(page, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

    const selectionPlan = [
        { rowIndex: 3, cellIndexes: [0, 1] },
        { rowIndex: 3, cellIndexes: [2, 3] },
        { rowIndex: 6, cellIndexes: [0, 1, 2, 3] },
        { rowIndex: 6, cellIndexes: [4, 5, 6, 7] },
        { rowIndex: 3, cellIndexes: [4], extra: { rowIndex: 6, cellIndexes: [8, 9] } }
    ];

    for (let round = 0; round < selectionPlan.length; round += 1) {
        const selection = selectionPlan[round];

        await page.click('#roll-fraction-btn');
        await waitForText(page, '#current-fraction', '2/5');

        await clickFractionCells(page, selection.rowIndex, selection.cellIndexes);
        if (selection.extra) {
            await clickFractionCells(page, selection.extra.rowIndex, selection.extra.cellIndexes);
        }

        await page.click('#check-result-btn');
        await waitForText(page, '#correct-count', String(round + 1));
    }

    await page.click('#roll-fraction-btn');
    await waitForText(page, '#current-fraction', '2/5');

    await page.click('#skip-turn-btn');

    await waitForText(page, '#skipped-count', '1');
    await waitForHidden(page, '#skip-confirm-modal');

    const latestRow = await getRowText(page, '#fractions-table tbody tr:first-child');
    assert.deepEqual(latestRow, ['6', '2/5', '-', 'Skipped (Impossible)']);
});
