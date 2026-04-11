'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { chromium } = require('playwright');
const {
    clickDecimatCells,
    closeCustomDiceModal,
    configureDecimatDice,
    getRowText,
    getText,
    isDisabled,
    openDecimatDiceModal,
    openAppPage,
    openDecimats,
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

test('Colour in Decimats records a correct hundredths selection', async (t) => {
    const page = await openAppPage(browser, t);

    await openDecimats(page);
    await configureDecimatDice(page, 3, 100);

    await page.click('#roll-decimat-btn');
    await waitForText(page, '#current-decimat-roll', '3/100 (0.03)');

    await clickDecimatCells(page, '#decimat-board .decimat-hundredth:not(.decimat-cell-split)', 3);

    await waitForText(page, '#decimat-selected', '0.030');
    await page.click('#check-decimat-btn');

    await waitForText(page, '#decimat-correct-count', '1');
    await waitForText(page, '#decimat-total', '0.030');

    const latestRow = await getRowText(page, '#decimats-table tbody tr:first-child');
    assert.deepEqual(latestRow, ['1', '3/100 (0.03)', '3/100 (0.03)', '0.03', 'Correct']);
});

test('Colour in Decimats custom dice persist for the current session and reset to defaults', async (t) => {
    const page = await openAppPage(browser, t);

    await openDecimats(page);
    await openDecimatDiceModal(page);

    await page.locator('#decimat-int-1').fill('6');
    await page.selectOption('#decimat-place-1', '10');
    await page.click('#save-decimat-dice');
    await page.waitForFunction(() => {
        const message = document.querySelector('#decimat-dice-error');
        return message && !message.hidden && message.textContent.includes('saved successfully');
    });
    await closeCustomDiceModal(page);

    await reloadApp(page);
    await openDecimats(page);
    await openDecimatDiceModal(page);
    assert.equal(await page.locator('#decimat-int-1').inputValue(), '6');
    assert.equal(await page.locator('#decimat-place-1').inputValue(), '10');

    await page.click('#reset-decimat-dice');
    await page.waitForFunction(() => {
        const message = document.querySelector('#decimat-dice-error');
        return message && !message.hidden && message.textContent.includes('reset to default');
    });
    assert.equal(await page.locator('#decimat-int-1').inputValue(), '1');
    assert.equal(await page.locator('#decimat-place-1').inputValue(), '10');
    await closeCustomDiceModal(page);

    await reloadApp(page);
    await openDecimats(page);
    await openDecimatDiceModal(page);
    assert.equal(await page.locator('#decimat-int-1').inputValue(), '1');
    assert.equal(await page.locator('#decimat-place-1').inputValue(), '10');
});

test('Colour in Decimats locks custom dice during an active round', async (t) => {
    const page = await openAppPage(browser, t);

    await openDecimats(page);
    await configureDecimatDice(page, 3, 100);

    await page.click('#roll-decimat-btn');
    await waitForText(page, '#current-decimat-roll', '3/100 (0.03)');

    await openDecimatDiceModal(page);
    assert.equal(await isDisabled(page, '#decimat-int-1'), true);
    assert.equal(await isDisabled(page, '#save-decimat-dice'), true);

    const lockedNotice = await getText(page, '#decimats-custom-dice-panel .dice-locked-notice');
    assert.match(lockedNotice, /cannot be changed during an active Decimats game/i);
});

test('Colour in Decimats clear selection resets the chosen blocks', async (t) => {
    const page = await openAppPage(browser, t);

    await openDecimats(page);
    await configureDecimatDice(page, 3, 100);

    await page.click('#roll-decimat-btn');
    await waitForText(page, '#current-decimat-roll', '3/100 (0.03)');

    await clickDecimatCells(page, '#decimat-board .decimat-hundredth:not(.decimat-cell-split)', 2);
    await waitForText(page, '#decimat-selected', '0.020');
    assert.equal(await isDisabled(page, '#check-decimat-btn'), false);

    await page.click('#clear-decimat-selection-btn');

    await waitForText(page, '#decimat-selected', '0.000');
    assert.equal(await isDisabled(page, '#check-decimat-btn'), true);
});

test('Colour in Decimats incorrect attempt clears the selection and keeps the round active', async (t) => {
    const page = await openAppPage(browser, t);

    await openDecimats(page);
    await configureDecimatDice(page, 3, 100);

    await page.click('#roll-decimat-btn');
    await waitForText(page, '#current-decimat-roll', '3/100 (0.03)');

    await clickDecimatCells(page, '#decimat-board .decimat-hundredth:not(.decimat-cell-split)', 2);
    await page.click('#check-decimat-btn');

    await waitForText(page, '#decimat-incorrect-count', '1');
    await waitForText(page, '#decimat-round', '1');
    await waitForText(page, '#decimat-selected', '0.000');

    const feedback = await getText(page, '#decimat-feedback');
    assert.match(feedback, /two attempts remaining/i);
    assert.equal(await isDisabled(page, '#check-decimat-btn'), true);

    const latestRow = await getRowText(page, '#decimats-table tbody tr:first-child');
    assert.deepEqual(latestRow, ['1', '3/100 (0.03)', '2/100 (0.02)', '0', 'Incorrect']);
});

test('Colour in Decimats advances after the third incorrect attempt', async (t) => {
    const page = await openAppPage(browser, t);

    await openDecimats(page);
    await configureDecimatDice(page, 3, 100);

    await page.click('#roll-decimat-btn');
    await waitForText(page, '#current-decimat-roll', '3/100 (0.03)');

    for (let attempt = 0; attempt < 3; attempt += 1) {
        await clickDecimatCells(page, '#decimat-board .decimat-hundredth:not(.decimat-cell-split)', 2);
        await page.click('#check-decimat-btn');
    }

    await waitForText(page, '#decimat-incorrect-count', '3');
    await waitForText(page, '#decimat-round', '2');
    await waitForText(page, '#current-decimat-roll', '-');
});

test('Colour in Decimats confirms a possible skip', async (t) => {
    const page = await openAppPage(browser, t);

    await openDecimats(page);
    await configureDecimatDice(page, 3, 100);

    await page.click('#roll-decimat-btn');
    await waitForText(page, '#current-decimat-roll', '3/100 (0.03)');

    await page.click('#skip-decimat-turn-btn');
    await waitForVisible(page, '#skip-confirm-modal');

    const modalMessage = await getText(page, '#skip-confirm-message');
    assert.match(modalMessage, /possible/i);

    await page.click('#skip-confirm-yes');
    await waitForHidden(page, '#skip-confirm-modal');
    await waitForText(page, '#decimat-skipped-possible-count', '1');

    const latestRow = await getRowText(page, '#decimats-table tbody tr:first-child');
    assert.deepEqual(latestRow, ['1', '3/100 (0.03)', '-', '0', 'Skipped (Possible)']);
});

test('Colour in Decimats marks an impossible skip once the remaining area is too small', async (t) => {
    const page = await openAppPage(browser, t);

    await openDecimats(page);
    await configureDecimatDice(page, 4, [10, 10, 1000, 1000, 1000, 1000]);
    await setRandomSequence(page, [0, 0, 0, 0, 0, 0]);

    for (let round = 0; round < 2; round += 1) {
        await page.click('#roll-decimat-btn');
        await waitForText(page, '#current-decimat-roll', '4/10 (0.4)');
        await clickDecimatCells(page, '#decimat-board .decimat-tenth:not(.decimat-cell-split):not(.decimat-cell-filled)', 4);
        await page.click('#check-decimat-btn');
        await waitForText(page, '#decimat-correct-count', String(round + 1));
    }

    await page.click('#roll-decimat-btn');
    await waitForText(page, '#current-decimat-roll', '4/10 (0.4)');

    await page.click('#skip-decimat-turn-btn');

    await waitForText(page, '#decimat-skipped-count', '1');
    await waitForHidden(page, '#skip-confirm-modal');

    const latestRow = await getRowText(page, '#decimats-table tbody tr:first-child');
    assert.deepEqual(latestRow, ['3', '4/10 (0.4)', '-', '0.8', 'Skipped (Impossible)']);
});

test('Colour in Decimats supports splitting a hundredth into thousandths', async (t) => {
    const page = await openAppPage(browser, t);

    await openDecimats(page);
    await configureDecimatDice(page, 1, 1000);

    await page.click('#roll-decimat-btn');
    await waitForText(page, '#current-decimat-roll', '1/1000 (0.001)');

    const hundredths = page.locator('#decimat-board .decimat-hundredth:not(.decimat-cell-split)');
    await hundredths.first().dblclick();

    await page.waitForFunction(() =>
        document.querySelectorAll('#decimat-board .decimat-hundredth.decimat-cell-split').length === 2
    );

    const splitFeedback = await getText(page, '#decimat-feedback');
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

test('Colour in Decimats shows a win modal when the full board is shaded', async (t) => {
    const page = await openAppPage(browser, t);

    await openDecimats(page);
    await configureDecimatDice(page, 1, 10);

    await page.click('#roll-decimat-btn');
    await waitForText(page, '#current-decimat-roll', '1/10 (0.1)');
    await clickDecimatCells(page, '#decimat-board .decimat-hundredth:not(.decimat-cell-split)', 9);
    const splitHundredth = page.locator('#decimat-board .decimat-hundredth.decimat-cell-split');
    await clickDecimatCells(page, '#decimat-board .decimat-hundredth.decimat-cell-split .decimat-thousandth', 10);
    await page.click('#check-decimat-btn');

    for (let round = 0; round < 9; round += 1) {
        await page.click('#roll-decimat-btn');
        await waitForText(page, '#current-decimat-roll', '1/10 (0.1)');
        await page.locator('#decimat-board .decimat-tenth:not(.decimat-cell-split):not(.decimat-cell-filled)').first().click();
        await page.click('#check-decimat-btn');
    }

    await waitForGameModal(page);
    await waitForText(page, '#modal-title', 'You Win!');

    const modalReason = await getText(page, '#modal-stats .modal-reason');
    assert.match(modalReason, /filled the entire Decimat/i);

    await page.click('#modal-play-again');
    await waitForHidden(page, '#game-modal');
    await waitForText(page, '#decimat-round', '1');
    await waitForText(page, '#decimat-total', '0.000');
});

test('Colour in Decimats shows a loss modal when no rolls remain possible', async (t) => {
    const page = await openAppPage(browser, t);

    await openDecimats(page);
    await configureDecimatDice(page, 4, 10);

    for (let round = 0; round < 2; round += 1) {
        await page.click('#roll-decimat-btn');
        await waitForText(page, '#current-decimat-roll', '4/10 (0.4)');
        await clickDecimatCells(page, '#decimat-board .decimat-tenth:not(.decimat-cell-split):not(.decimat-cell-filled)', 4);
        await page.click('#check-decimat-btn');
    }

    await waitForGameModal(page);
    await waitForText(page, '#modal-title', 'Game Over');

    const modalReason = await getText(page, '#modal-stats .modal-reason');
    assert.match(modalReason, /no possible rolls remaining/i);

    await page.click('#modal-play-again');
    await waitForHidden(page, '#game-modal');
    await waitForText(page, '#decimat-round', '1');
    await waitForText(page, '#decimat-total', '0.000');
});
