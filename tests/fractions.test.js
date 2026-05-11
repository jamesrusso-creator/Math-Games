'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { chromium } = require('playwright');
const {
    clickFractionCells,
    closeCustomDiceModal,
    configureFractionsDice,
    getRowText,
    getText,
    isDisabled,
    openFractionDiceModal,
    openAppPage,
    openFractions,
    reloadApp,
    setRandomSequence,
    waitForGameModal,
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

test('Colour in Fractions custom dice persist for the current session and reset to defaults', async (t) => {
    const page = await openAppPage(browser, t);

    await openFractions(page);
    await openFractionDiceModal(page);

    await page.locator('#frac-int-1').fill('6');
    await page.selectOption('#frac-denom-1', '6');
    await page.click('#save-fraction-dice');
    await page.waitForFunction(() => {
        const message = document.querySelector('#fraction-dice-error');
        return message && !message.hidden && message.textContent.includes('saved successfully');
    });
    await closeCustomDiceModal(page);

    await reloadApp(page);
    await openFractions(page);
    await openFractionDiceModal(page);
    assert.equal(await page.locator('#frac-int-1').inputValue(), '6');
    assert.equal(await page.locator('#frac-denom-1').inputValue(), '6');

    await page.click('#reset-fraction-dice');
    await page.waitForFunction(() => {
        const message = document.querySelector('#fraction-dice-error');
        return message && !message.hidden && message.textContent.includes('reset to default');
    });
    assert.equal(await page.locator('#frac-int-1').inputValue(), '1');
    assert.equal(await page.locator('#frac-denom-1').inputValue(), '4');
    await closeCustomDiceModal(page);

    await reloadApp(page);
    await openFractions(page);
    await openFractionDiceModal(page);
    assert.equal(await page.locator('#frac-int-1').inputValue(), '1');
    assert.equal(await page.locator('#frac-denom-1').inputValue(), '4');
});

test('Colour in Fractions warns when proper version dice can roll improper fractions', async (t) => {
    const page = await openAppPage(browser, t);

    await openFractions(page, 'proper');
    await openFractionDiceModal(page);

    assert.equal(await page.locator('#fraction-dice-warning').evaluate((warning) => warning.hidden), true);

    await page.locator('#frac-int-1').fill('6');
    await page.waitForFunction(() => {
        const warning = document.querySelector('#fraction-dice-warning');
        return warning
            && !warning.hidden
            && warning.textContent.includes('Without Improper Fractions')
            && warning.textContent.includes('can roll an improper fraction');
    });

    await page.locator('#frac-int-1').fill('1');
    await page.waitForFunction(() => {
        const warning = document.querySelector('#fraction-dice-warning');
        return warning && warning.hidden;
    });
});

test('Colour in Fractions warns when improper version dice cannot roll improper fractions', async (t) => {
    const page = await openAppPage(browser, t);

    await openFractions(page, 'improper');
    await openFractionDiceModal(page);

    assert.equal(await page.locator('#fraction-dice-warning').evaluate((warning) => warning.hidden), true);

    for (let face = 1; face <= 6; face += 1) {
        await page.locator(`#frac-int-${face}`).fill('1');
        await page.selectOption(`#frac-denom-${face}`, '6');
    }

    await page.waitForFunction(() => {
        const warning = document.querySelector('#fraction-dice-warning');
        return warning
            && !warning.hidden
            && warning.textContent.includes('With Improper Fractions')
            && warning.textContent.includes('cannot roll an improper fraction');
    });

    await page.locator('#frac-int-1').fill('6');
    await page.waitForFunction(() => {
        const warning = document.querySelector('#fraction-dice-warning');
        return warning && warning.hidden;
    });
});

test('Colour in Fractions locks custom dice during an active round', async (t) => {
    const page = await openAppPage(browser, t);

    await openFractions(page);
    await configureFractionsDice(page, 1, 2);

    await page.click('#roll-fraction-btn');
    await waitForText(page, '#current-fraction', '1/2');

    await openFractionDiceModal(page);
    assert.equal(await isDisabled(page, '#frac-int-1'), true);
    assert.equal(await isDisabled(page, '#save-fraction-dice'), true);

    const lockedNotice = await getText(page, '#fractions-custom-dice-panel .dice-locked-notice');
    assert.match(lockedNotice, /cannot be changed during an active Fractions game/i);
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

test('Colour in Fractions shows a win modal when the wall is completely filled', async (t) => {
    const page = await openAppPage(browser, t);

    await openFractions(page);
    await configureFractionsDice(page, 6, 6);

    const rowCellCounts = [2, 3, 4, 5, 6, 8, 10, 12];

    for (let rowIndex = 0; rowIndex < rowCellCounts.length; rowIndex += 1) {
        await page.click('#roll-fraction-btn');
        await waitForText(page, '#current-fraction', '6/6');

        await clickFractionCells(
            page,
            rowIndex,
            Array.from({ length: rowCellCounts[rowIndex] }, (_, index) => index)
        );
        await page.click('#check-result-btn');
    }

    await waitForGameModal(page);
    await waitForText(page, '#modal-title', 'You Win!');

    const modalReason = await getText(page, '#modal-stats .modal-reason');
    assert.match(modalReason, /filled the entire fraction wall/i);

    await page.click('#modal-play-again');
    await waitForHidden(page, '#game-modal');
    await waitForText(page, '#fraction-round', '1');
    await waitForText(page, '#correct-count', '0');
});

test('Colour in Fractions shows a loss modal when no possible moves remain', async (t) => {
    const page = await openAppPage(browser, t);

    await openFractions(page);
    await configureFractionsDice(page, 2, 5);

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
    }

    await waitForGameModal(page);
    await waitForText(page, '#modal-title', 'Game Over');

    const modalReason = await getText(page, '#modal-stats .modal-reason');
    assert.match(modalReason, /no possible moves remaining/i);

    await page.click('#modal-play-again');
    await waitForHidden(page, '#game-modal');
    await waitForText(page, '#fraction-round', '1');
    await waitForText(page, '#correct-count', '0');
});
