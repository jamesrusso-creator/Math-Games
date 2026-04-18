'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { chromium } = require('playwright');
const {
    getRowText,
    getText,
    isDisabled,
    openAppPage,
    openPlaceNumber,
    setRandomSequence,
    waitForText,
    waitForVisible
} = require('./support/browser-test-helpers');

let browser;

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

async function getOptionalBenchmarkState(page) {
    const lineClasses = await page.locator('#place-number-line').getAttribute('class');
    const labelClasses = await page.locator('#place-number-labels').getAttribute('class');
    const labels = await page.locator('#place-number-labels .place-optional-benchmark').evaluateAll((nodes) =>
        nodes.map((node) => node.textContent.trim())
    );

    return { lineClasses, labelClasses, labels };
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
    assert.deepEqual(priorCorrectRow, ['1', '7 & 4', '74', '74 + 1/2', 'Correct']);
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
    assert.deepEqual(priorCorrectRow, ['1', '1 & 2 & 3', '123', '123 + 1/2', 'Correct']);
});

test('Place That Number 0-6 fractions use 1 and 3 benchmarks and simplified improper-fraction labels', async (t) => {
    const page = await openAppPage(browser, t);

    await openPlaceNumber(page, 'frac_0_6');
    assert.equal(await getText(page, '#place-number-title'), 'Place That Number (0 to 6 Fractions)');
    assert.equal(await getText(page, '#place-benchmark-toggle-label'), 'Show 1 / 3 benchmarks');

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
    assert.deepEqual(priorCorrectRow, ['1', '2 & 5', '5/2 (= 2 + 1/2)', '2 + 1/2', 'Correct']);

    const markerLabels = await page.locator('.place-marker-label').evaluateAll((nodes) =>
        nodes.map((node) => node.textContent.trim())
    );
    assert.equal(markerLabels.includes('5/2'), true);
    assert.equal(markerLabels.includes('2 1/2'), false);
});

test('Place That Number fraction accepts an improper fraction placed in the correct gap', async (t) => {
    const page = await openAppPage(browser, t);

    await openPlaceNumber(page, 'frac_0_6');
    await setRandomSequence(page, [0.75, 0.75, 0.95, 0.55, 0.95, 0.75]);

    await page.click('#roll-place-number-btn');
    await waitForText(page, '#place-digits', '5 & 5');
    await clickPlaceChoice(page, '5/5');
    await clickNumberLineAtRatio(page, 1 / 6);
    await page.click('#check-place-number-btn');
    await waitForText(page, '#place-round', '2');

    await page.click('#roll-place-number-btn');
    await waitForText(page, '#place-digits', '6 & 4');
    await clickPlaceChoice(page, '6/4');
    await clickNumberLineAtRatio(page, 1.5 / 6);
    await page.click('#check-place-number-btn');
    await waitForText(page, '#place-round', '3');

    await page.click('#roll-place-number-btn');
    await waitForText(page, '#place-digits', '6 & 5');
    await clickPlaceChoice(page, '6/5');
    await clickNumberLineAtRatio(page, 0.24);
    await page.click('#check-place-number-btn');
    await waitForText(page, '#place-round', '4');

    const feedback = await getText(page, '#place-number-feedback');
    assert.match(feedback, /Placed! 6\/5 is in the correct gap/i);
    assert.doesNotMatch(feedback, /1 1\/5|1 1\/2|true position/i);
});

test('Place That Number fraction keeps estimated benchmarks for order when later placements fit between them', async (t) => {
    const page = await openAppPage(browser, t);

    await openPlaceNumber(page, 'frac_0_6');
    await setRandomSequence(page, [0.55, 0.2, 0.75, 0.95, 0.75, 0.35]);

    await page.click('#roll-place-number-btn');
    await waitForText(page, '#place-digits', '4 & 2');
    await clickPlaceChoice(page, '2/4');
    await clickNumberLineAtRatio(page, 43 / 360);
    await page.click('#check-place-number-btn');
    await waitForText(page, '#place-round', '2');

    await page.click('#roll-place-number-btn');
    await waitForText(page, '#place-digits', '5 & 6');
    await clickPlaceChoice(page, '5/6');
    await clickNumberLineAtRatio(page, 73 / 360);
    await page.click('#check-place-number-btn');
    await waitForText(page, '#place-round', '3');

    assert.deepEqual(
        await page.evaluate(() => GameState.placeNumber.placedNumbers.map(({ valueUnits, positionUnits }) => ({
            valueUnits,
            positionUnits
        }))),
        [
            { valueUnits: 30, positionUnits: 43 },
            { valueUnits: 50, positionUnits: 73 }
        ]
    );

    await page.click('#roll-place-number-btn');
    await waitForText(page, '#place-digits', '5 & 3');
    await clickPlaceChoice(page, '3/5');
    await clickNumberLineAtRatio(page, 53 / 360);
    await page.click('#check-place-number-btn');
    await waitForText(page, '#place-round', '4');

    assert.deepEqual(
        await page.evaluate(() => GameState.placeNumber.placedNumbers
            .map(({ valueUnits, positionUnits }) => ({
                valueUnits,
                positionUnits
            }))
            .sort((a, b) => a.positionUnits - b.positionUnits)),
        [
            { valueUnits: 30, positionUnits: 43 },
            { valueUnits: 36, positionUnits: 53 },
            { valueUnits: 50, positionUnits: 73 }
        ]
    );

    const feedback = await getText(page, '#place-number-feedback');
    assert.match(feedback, /Placed! 3\/5 is in the correct gap/i);
    assert.doesNotMatch(feedback, /true position|keep your marker inside that gap/i);
});

test('Place That Number waits for a chosen value before allowing marker placement', async (t) => {
    const page = await openAppPage(browser, t);

    await openPlaceNumber(page, 'int_100');
    await setRandomSequence(page, [0.15, 0.25]);

    await page.click('#roll-place-number-btn');
    await waitForText(page, '#place-digits', '1 & 2');

    assert.equal(await getText(page, '#place-selected-number'), '-');
    assert.equal(await isDisabled(page, '#check-place-number-btn'), true);
    assert.equal(await page.locator('#place-number-line').getAttribute('aria-disabled'), 'true');

    await clickNumberLineAtRatio(page, 0.12);

    const feedback = await getText(page, '#place-number-feedback');
    assert.match(feedback, /Choose one of the available values first/i);
    assert.equal(await page.locator('.place-marker.preview').count(), 0);
    assert.equal(await isDisabled(page, '#clear-place-marker-btn'), true);
});

test('Place That Number 0-1000 auto-selects a single available value and lets the player open the hint', async (t) => {
    const page = await openAppPage(browser, t);

    await openPlaceNumber(page, 'int_1000');
    await setRandomSequence(page, [0.45, 0.45, 0.45]);

    await page.click('#roll-place-number-btn');
    await waitForText(page, '#place-digits', '4 & 4 & 4');
    await waitForText(page, '#place-selected-number', '444');

    assert.equal(await getText(page, '#place-choice-message'), 'Only one new value is available from this roll.');
    assert.equal(await page.locator('#place-choice-buttons .place-option-btn').count(), 1);
    assert.equal(await getText(page, '#place-choice-buttons .place-option-btn'), '444');
    assert.equal(await page.locator('#place-hint-toggle').isHidden(), false);
    assert.equal(await page.locator('#place-hint-toggle').getAttribute('aria-expanded'), 'false');

    await page.click('#place-hint-toggle');

    const note = await getText(page, '#place-anchor-note');
    assert.match(note, /444 is using the whole 0 to 1000 line/i);
    assert.match(note, /Click or drag on the line to place your marker/i);
    assert.equal(await page.locator('#place-hint-toggle').getAttribute('aria-expanded'), 'true');
});

test('Place That Number clears the preview marker and disables checking again after Clear Marker', async (t) => {
    const page = await openAppPage(browser, t);

    await openPlaceNumber(page, 'int_100');
    await setRandomSequence(page, [0.15, 0.25]);

    await page.click('#roll-place-number-btn');
    await waitForText(page, '#place-digits', '1 & 2');
    await clickPlaceChoice(page, '12');
    await clickNumberLineAtRatio(page, 0.12);

    await page.waitForFunction(() => document.querySelectorAll('.place-marker.preview').length === 1);
    assert.equal(await isDisabled(page, '#check-place-number-btn'), false);
    assert.equal(await isDisabled(page, '#clear-place-marker-btn'), false);

    await page.click('#clear-place-marker-btn');

    await page.waitForFunction(() => document.querySelectorAll('.place-marker.preview').length === 0);
    assert.equal(await isDisabled(page, '#check-place-number-btn'), true);
    assert.equal(await isDisabled(page, '#clear-place-marker-btn'), true);
    assert.equal(await getText(page, '#place-anchor-note'), 'Click or drag on the line to place your marker.');
});

test('Place That Number fraction rolls filter out equivalent values that are already benchmarks', async (t) => {
    const page = await openAppPage(browser, t);

    await openPlaceNumber(page, 'frac_0_6');
    await setRandomSequence(page, [0.2, 0.55, 0.2, 0.55]);

    await page.click('#roll-place-number-btn');
    await waitForText(page, '#place-digits', '2 & 4');
    await clickPlaceChoice(page, '2/4');
    await clickNumberLineAtRatio(page, 0.5 / 6);
    await page.click('#check-place-number-btn');
    await waitForText(page, '#place-round', '2');

    await page.click('#roll-place-number-btn');
    await waitForText(page, '#place-digits', '2 & 4');
    await waitForText(page, '#place-selected-number', '4/2 (= 2)');

    assert.equal(await getText(page, '#place-choice-message'), 'Only one new value is available from this roll.');
    assert.equal(await page.locator('#place-choice-buttons .place-option-btn').count(), 1);
    assert.equal(await getText(page, '#place-choice-buttons .place-option-btn'), '4/2');
    assert.equal(await getText(page, '#place-number-feedback'), 'Only 4/2 is still available from these dice. Place it on the line.');
});

test('Place That Number fraction benchmark toggle shows and hides the optional guides', async (t) => {
    const page = await openAppPage(browser, t);

    await openPlaceNumber(page, 'frac_0_6');

    assert.deepEqual(await getOptionalBenchmarkState(page), {
        lineClasses: 'place-number-line',
        labelClasses: 'place-number-labels',
        labels: ['1', '3']
    });

    await page.check('#place-show-benchmarks');
    await page.waitForFunction(() =>
        document.querySelector('#place-number-line').classList.contains('place-benchmarks-visible') &&
        document.querySelector('#place-number-labels').classList.contains('place-benchmarks-visible')
    );

    assert.deepEqual(await getOptionalBenchmarkState(page), {
        lineClasses: 'place-number-line place-benchmarks-visible',
        labelClasses: 'place-number-labels place-benchmarks-visible',
        labels: ['1', '3']
    });

    await page.uncheck('#place-show-benchmarks');
    await page.waitForFunction(() =>
        !document.querySelector('#place-number-line').classList.contains('place-benchmarks-visible') &&
        !document.querySelector('#place-number-labels').classList.contains('place-benchmarks-visible')
    );

    assert.deepEqual(await getOptionalBenchmarkState(page), {
        lineClasses: 'place-number-line',
        labelClasses: 'place-number-labels',
        labels: ['1', '3']
    });
});

test('Place That Number game over automatically shows the optional benchmark guides', async (t) => {
    const page = await openAppPage(browser, t);

    await openPlaceNumber(page, 'int_100');
    await setRandomSequence(page, [0.75, 0.45, 0.15, 0.15]);

    assert.equal(await page.locator('#place-show-benchmarks').isChecked(), false);

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
    await page.waitForFunction(() =>
        document.querySelector('#place-show-benchmarks').checked &&
        document.querySelector('#place-number-line').classList.contains('place-benchmarks-visible') &&
        document.querySelector('#place-number-labels').classList.contains('place-benchmarks-visible')
    );

    assert.equal(await page.locator('#place-show-benchmarks').isChecked(), true);
    assert.deepEqual(await getOptionalBenchmarkState(page), {
        lineClasses: 'place-number-line place-benchmarks-visible',
        labelClasses: 'place-number-labels place-benchmarks-visible',
        labels: ['25', '50', '75']
    });
});

test('Place That Number New Game resets benchmark guides back to hidden', async (t) => {
    const page = await openAppPage(browser, t);

    await openPlaceNumber(page, 'frac_0_6');
    await page.check('#place-show-benchmarks');
    await page.waitForFunction(() =>
        document.querySelector('#place-show-benchmarks').checked &&
        document.querySelector('#place-number-line').classList.contains('place-benchmarks-visible') &&
        document.querySelector('#place-number-labels').classList.contains('place-benchmarks-visible')
    );

    await page.click('#reset-place-number-btn');
    await page.waitForFunction(() =>
        !document.querySelector('#place-show-benchmarks').checked &&
        !document.querySelector('#place-number-line').classList.contains('place-benchmarks-visible') &&
        !document.querySelector('#place-number-labels').classList.contains('place-benchmarks-visible')
    );

    assert.equal(await page.locator('#place-show-benchmarks').isChecked(), false);
    assert.deepEqual(await getOptionalBenchmarkState(page), {
        lineClasses: 'place-number-line',
        labelClasses: 'place-number-labels',
        labels: ['1', '3']
    });
});

test('Place That Number version switching resets benchmark guides back to hidden', async (t) => {
    const page = await openAppPage(browser, t);

    await openPlaceNumber(page, 'frac_0_6');
    await page.check('#place-show-benchmarks');
    await page.waitForFunction(() =>
        document.querySelector('#place-show-benchmarks').checked &&
        document.querySelector('#place-number-line').classList.contains('place-benchmarks-visible') &&
        document.querySelector('#place-number-labels').classList.contains('place-benchmarks-visible')
    );

    await page.click('.nav-link[href="#place-number"]');
    await waitForVisible(page, '#place-version-modal');
    await page.click('.place-version-option[data-place-variant="int_1000"]');
    await waitForText(page, '#place-number-title', 'Place That Number (0 to 1000)');
    await page.waitForFunction(() =>
        !document.querySelector('#place-show-benchmarks').checked &&
        !document.querySelector('#place-number-line').classList.contains('place-benchmarks-visible') &&
        !document.querySelector('#place-number-labels').classList.contains('place-benchmarks-visible')
    );

    assert.equal(await page.locator('#place-show-benchmarks').isChecked(), false);
    assert.deepEqual(await getOptionalBenchmarkState(page), {
        lineClasses: 'place-number-line',
        labelClasses: 'place-number-labels',
        labels: ['250', '500', '750']
    });
});
