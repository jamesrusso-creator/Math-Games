/**
 * Math Games - Colour in Fractions
 * Interactive educational fraction wall game with dice rolling.
 */

// ============================================
// Game State
// ============================================

const GameState = {
    fractions: {
        currentRoll: null,
        round: 1,
        selectedCells: [],
        isSelecting: false,
        isGameOver: false,
        attemptsLeft: 3,
        stats: { correct: 0, incorrect: 0, skipped: 0, skippedPossible: 0 },
        customIntDice: null,
        customFracDice: null
    },
    decimats: {
        currentRoll: null,
        round: 1,
        totalUnits: 0,
        selectedCellIds: [],
        isSelecting: false,
        board: [],
        isGameOver: false,
        attemptsLeft: 3,
        customIntDice: null,
        customPlaceDice: null,
        stats: { correct: 0, incorrect: 0, skipped: 0, skippedPossible: 0 }
    },
    placeNumber: {
        variant: 'int_100',
        currentRoll: null,
        selectedOptionId: null,
        estimateUnits: null,
        showHint: false,
        round: 1,
        placedNumbers: [],
        failedPlacement: null,
        showBenchmarks: false,
        isDraggingEstimate: false,
        dragPointerId: null,
        isGameOver: false,
        stats: { correct: 0, incorrect: 0 }
    }
};

// ============================================
// Version Configurations
// ============================================

const VERSIONS = {
    proper: {
        label: 'Without Improper Fractions',
        intDice: [1, 1, 2, 2, 3, 3],
        fracDice: [4, 5, 6, 8, 10, 12],
        wallRows: [
            { denominator: 2, cells: 2, value: 1/2 },
            { denominator: 3, cells: 3, value: 1/3 },
            { denominator: 4, cells: 4, value: 1/4 },
            { denominator: 5, cells: 5, value: 1/5 },
            { denominator: 6, cells: 6, value: 1/6 },
            { denominator: 8, cells: 8, value: 1/8 },
            { denominator: 10, cells: 10, value: 1/10 },
            { denominator: 12, cells: 12, value: 1/12 }
        ]
    },
    improper: {
        label: 'With Improper Fractions',
        intDice: [1, 2, 2, 3, 3, 4],
        fracDice: [2, 3, 4, 6, 8, 12],
        wallRows: [
            { denominator: 2, cells: 2, value: 1/2 },
            { denominator: 3, cells: 3, value: 1/3 },
            { denominator: 4, cells: 4, value: 1/4 },
            { denominator: 6, cells: 6, value: 1/6 },
            { denominator: 8, cells: 8, value: 1/8 },
            { denominator: 12, cells: 12, value: 1/12 }
        ]
    }
};

let currentVersion = 'proper';
const FRACTION_DENOMINATOR_OPTIONS = [2, 3, 4, 5, 6, 8, 10, 12];
const DEFAULT_DECIMAT_INT_DICE = [1, 2, 3, 4, 5, 6];
const DECIMAT_PLACE_VALUE_OPTIONS = [10, 100, 1000];
const DEFAULT_DECIMAT_PLACE_DICE = [10, 100, 100, 1000, 1000, 1000];
const PLACE_NUMBER_DIGIT_VALUES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const PLACE_NUMBER_SIGN_VALUES = ['+', '-'];
let decimatCellCounter = 0;

// Sync initial dice values from default version
GameState.fractions.customIntDice = [...VERSIONS.proper.intDice];
GameState.fractions.customFracDice = [...VERSIONS.proper.fracDice];
GameState.decimats.customIntDice = [...DEFAULT_DECIMAT_INT_DICE];
GameState.decimats.customPlaceDice = [...DEFAULT_DECIMAT_PLACE_DICE];

// ============================================
// Utility Functions
// ============================================

function $(selector) {
    return document.querySelector(selector);
}

function $$(selector) {
    return document.querySelectorAll(selector);
}

function formatFraction(numerator, denominator) {
    return `${numerator}/${denominator}`;
}

function setFracDiceDisplay(numerator, denominator) {
    const num = $('#fraction-dice .frac-num');
    const den = $('#fraction-dice .frac-den');
    if (num) num.textContent = numerator;
    if (den) den.textContent = denominator;
}

function formatSelectedCells(cells) {
    const counts = new Map();
    cells.forEach(item => {
        const cell = $(`.fraction-cell[data-row="${item.row}"][data-cell="${item.cell}"]`);
        const denom = parseInt(cell.dataset.denominator);
        counts.set(denom, (counts.get(denom) || 0) + 1);
    });
    return Array.from(counts.entries())
        .map(([denom, count]) => formatFraction(count, denom))
        .join(' + ');
}

function attemptsToWords(n) {
    const words = { 1: 'One attempt', 2: 'Two attempts', 3: 'Three attempts' };
    return words[n] || `${n} attempts`;
}

function formatDecimalFromUnits(units, fixedDigits, trimTrailingZeros) {
    const digits = typeof fixedDigits === 'number' ? fixedDigits : 3;
    const value = (units / 1000).toFixed(digits);

    if (!trimTrailingZeros) {
        return value;
    }

    return value
        .replace(/(\.\d*?[1-9])0+$/, '$1')
        .replace(/\.0+$/, '');
}

function formatRollDecimal(numerator, denominator) {
    const fixedDigits = denominator === 10 ? 1 : denominator === 100 ? 2 : 3;
    return (numerator / denominator).toFixed(fixedDigits);
}

function clampNumber(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function formatDigitRoll(digits) {
    if (!digits || digits.length === 0) return '-';
    return digits.join(' & ');
}

function greatestCommonDivisor(a, b) {
    let x = Math.abs(a);
    let y = Math.abs(b);

    while (y !== 0) {
        [x, y] = [y, x % y];
    }

    return x || 1;
}

function formatMixedFractionFromUnits(units, unitsPerWhole, options = {}) {
    if (typeof units !== 'number' || Number.isNaN(units)) return '-';
    const {
        wholeJoiner = ' ',
        negativeWholeJoiner = wholeJoiner
    } = options;
    const isNegative = units < 0;
    const absoluteUnits = Math.abs(units);
    const whole = Math.floor(absoluteUnits / unitsPerWhole);
    const remainder = absoluteUnits % unitsPerWhole;
    const signPrefix = isNegative ? '-' : '';

    if (remainder === 0) {
        return `${signPrefix}${whole}`;
    }

    const divisor = greatestCommonDivisor(remainder, unitsPerWhole);
    const numerator = remainder / divisor;
    const denominator = unitsPerWhole / divisor;

    if (whole === 0) {
        return `${signPrefix}${numerator}/${denominator}`;
    }

    const joiner = isNegative ? negativeWholeJoiner : wholeJoiner;
    return `${signPrefix}${whole}${joiner}${numerator}/${denominator}`;
}

function formatCanonicalChoice(rawLabel, canonicalLabel) {
    return rawLabel === canonicalLabel ? rawLabel : `${rawLabel} (= ${canonicalLabel})`;
}

function formatHistoryMixedFractionFromUnits(units, unitsPerWhole) {
    return formatMixedFractionFromUnits(units, unitsPerWhole, {
        wholeJoiner: ' + ',
        negativeWholeJoiner: ' - '
    });
}

function formatImproperFractionFromUnits(units, unitsPerWhole) {
    if (typeof units !== 'number' || Number.isNaN(units)) return '-';

    if (units % unitsPerWhole === 0) {
        return `${units / unitsPerWhole}`;
    }

    const divisor = greatestCommonDivisor(units, unitsPerWhole);
    return `${units / divisor}/${unitsPerWhole / divisor}`;
}

function formatFixedDecimalFromUnits(units, unitsPerWhole, digits = 2) {
    if (typeof units !== 'number' || Number.isNaN(units)) return '-';
    return (units / unitsPerWhole).toFixed(digits);
}

const PLACE_NUMBER_FORMATTERS = {
    mixed: formatMixedFractionFromUnits,
    historyMixed: formatHistoryMixedFractionFromUnits,
    improper: formatImproperFractionFromUnits,
    decimal2: (units, unitsPerWhole) => formatFixedDecimalFromUnits(units, unitsPerWhole, 2)
};

function formatReadableChoices(items) {
    if (!items || items.length === 0) return '';
    if (items.length === 1) return items[0];
    if (items.length === 2) return `${items[0]} or ${items[1]}`;

    return `${items.slice(0, -1).join(', ')}, or ${items[items.length - 1]}`;
}

function buildUniqueDigitNumbers(digits) {
    const values = new Set();
    const used = new Array(digits.length).fill(false);
    const path = [];

    function walk() {
        if (path.length === digits.length) {
            values.add(Number(path.join('')));
            return;
        }

        const seenAtDepth = new Set();

        digits.forEach((digit, index) => {
            if (used[index] || seenAtDepth.has(digit)) return;
            seenAtDepth.add(digit);
            used[index] = true;
            path.push(digit);
            walk();
            path.pop();
            used[index] = false;
        });
    }

    walk();
    return [...values];
}

function buildPlaceIntegerRollOptions(dice, placedValues, variant) {
    return buildUniqueDigitNumbers(dice)
        .filter(value => value > 0 && value < variant.rangeMax)
        .map(value => ({
            rawLabel: `${value}`,
            valueUnits: value * variant.unitsPerWhole
        }))
        .filter(option => !placedValues.has(option.valueUnits));
}

function buildPlaceSignedIntegerRollOptions(dice, placedValues, variant) {
    const [sign, ...digits] = dice;
    const signMultiplier = sign === '-' ? -1 : 1;
    const minValueUnits = getPlaceNumberMinValueUnits(variant);
    const maxValueUnits = getPlaceNumberMaxValueUnits(variant);

    return buildUniqueDigitNumbers(digits)
        .filter(value => value > 0)
        .map(value => {
            const signedValue = signMultiplier * value;
            return {
                rawLabel: `${signedValue}`,
                valueUnits: signedValue * variant.unitsPerWhole
            };
        })
        .filter(option => option.valueUnits > minValueUnits && option.valueUnits < maxValueUnits)
        .filter(option => !placedValues.has(option.valueUnits));
}

function buildPlaceFractionRollOptions(dice, placedValues, variant) {
    const [left, right] = dice;
    const orderedPairs = left === right
        ? [[left, right]]
        : [[left, right], [right, left]];

    return orderedPairs
        .map(([numerator, denominator]) => ({
            rawLabel: `${numerator}/${denominator}`,
            valueUnits: (numerator * variant.unitsPerWhole) / denominator
        }))
        .filter(option => option.valueUnits > 0 && option.valueUnits < variant.rangeUnits)
        .filter(option => !placedValues.has(option.valueUnits));
}

function formatPlaceVariantUnits(units, variant, formatKey = 'mixed') {
    const formatter = PLACE_NUMBER_FORMATTERS[formatKey] || PLACE_NUMBER_FORMATTERS.mixed;
    return formatter(units, variant.unitsPerWhole);
}

function createPlaceChoiceOption(variant, option) {
    const canonicalLabel = formatPlaceVariantUnits(option.valueUnits, variant, variant.selectedValueFormat);
    const historyCanonicalLabel = formatPlaceVariantUnits(option.valueUnits, variant, variant.historyValueFormat);
    const markerLabel = formatPlaceVariantUnits(option.valueUnits, variant, variant.markerValueFormat);
    return {
        id: `${option.rawLabel}:${option.valueUnits}`,
        rawLabel: option.rawLabel,
        valueUnits: option.valueUnits,
        canonicalLabel,
        historyCanonicalLabel,
        markerLabel,
        choiceLabel: option.rawLabel,
        selectedLabel: formatCanonicalChoice(option.rawLabel, canonicalLabel),
        historyLabel: formatCanonicalChoice(option.rawLabel, historyCanonicalLabel)
    };
}

function formatPlaceBenchmarkToggleLabel(benchmarkLabels) {
    return `Show ${benchmarkLabels.join(' / ')} benchmarks`;
}

function createPlaceRollPromptSingle(sourceLabel) {
    return available => `Only ${available} is still available from these ${sourceLabel}. Place it on the line.`;
}

function createPlaceRollPromptMultiple(valueLabel) {
    return available => `Choose ${available}, then place your ${valueLabel} on the line.`;
}

function createPlaceNumberVariant(config) {
    return {
        choiceCardTitle: 'Build Your Number',
        statusChoiceLabel: 'Chosen Value',
        benchmarkToggleTemplate: formatPlaceBenchmarkToggleLabel,
        selectedValueFormat: 'mixed',
        historyValueFormat: 'historyMixed',
        historyPlacementFormat: 'historyMixed',
        historyDecimalFormat: 'decimal2',
        feedbackValueFormat: 'mixed',
        markerValueFormat: 'mixed',
        historyDecimalLabel: 'Decimal',
        showHistoryDecimalColumn: false,
        rollDisplayFormatter: formatDigitRoll,
        ...config
    };
}

function createPlaceIntegerVariant(config) {
    return createPlaceNumberVariant({
        statusRollLabel: 'Digits',
        historyRollLabel: 'Digits',
        historyChoiceLabel: 'Number',
        unitsPerWhole: 2,
        diceFaces: PLACE_NUMBER_DIGIT_VALUES,
        keyboardStepUnits: 1,
        optionBuilder: buildPlaceIntegerRollOptions,
        rollPromptSingle: createPlaceRollPromptSingle('digits'),
        rollPromptMultiple: createPlaceRollPromptMultiple('number'),
        ...config
    });
}

const PLACE_NUMBER_VARIANTS = {
    int_100: createPlaceIntegerVariant({
        id: 'int_100',
        title: 'Place That Number (0 to 100)',
        badge: '0 to 100',
        description: 'Two digit dice, whole-number targets, and half-step placement on a 0 to 100 line.',
        benchmarkUnits: [50, 100, 150],
        rangeMax: 100,
        rangeUnits: 200,
        diceCount: 2,
        keyboardJumpUnits: 10,
        wallHint: 'Choose a two-digit number, then click or drag on the line to place it between 0 and 100.',
        lineAriaLabel: 'Interactive number line from 0 to 100. Click or drag to place your chosen number.',
        howToPlaySteps: [
            'Roll the two digit dice to get a pair of digits.',
            'Choose which two-digit number you want to build from those digits.',
            'Click or drag on the number line to estimate where that number belongs from 0 to 100.',
            'Use the numbers already on the line as benchmarks for later rounds.',
            'The run ends as soon as you place one number incorrectly, so the goal is to last longer than everyone else.'
        ],
        wholeLineHint: valueLabel => `${valueLabel} is using the whole 0 to 100 line. Look for halves, quarters, and tens.`,
    }),
    int_neg_100: createPlaceNumberVariant({
        id: 'int_neg_100',
        title: 'Place That Number (-100 to 100)',
        badge: '-100 to 100',
        description: 'A sign die plus two digit dice build positive and negative whole numbers on a -100 to 100 line.',
        benchmarkUnits: [-100, 0, 100],
        minValueUnits: -200,
        maxValueUnits: 200,
        rangeUnits: 400,
        unitsPerWhole: 2,
        diceCount: 3,
        keyboardStepUnits: 1,
        keyboardJumpUnits: 10,
        statusRollLabel: 'Dice',
        historyRollLabel: 'Dice',
        historyChoiceLabel: 'Number',
        wallHint: 'Roll the sign die and two digit dice, choose a number, then click or drag on the line to place it between -100 and 100.',
        lineAriaLabel: 'Interactive number line from -100 to 100. Click or drag to place your chosen number.',
        howToPlaySteps: [
            'Roll one sign die and two digit dice.',
            'Use the sign die with the digits to choose which signed number you want to build.',
            'Click or drag on the number line to estimate where that number belongs from -100 to 100.',
            'Use the numbers already on the line as benchmarks for later rounds.',
            'The run ends as soon as you place one number incorrectly, so the goal is to last longer than everyone else.'
        ],
        wholeLineHint: valueLabel => `${valueLabel} is using the whole -100 to 100 line. Look for zero, halves, and symmetric benchmarks.`,
        optionBuilder: buildPlaceSignedIntegerRollOptions,
        rollDisplayFormatter: (dice) => `${dice[0]} & ${dice.slice(1).join(' & ')}`,
        rollDice: () => [
            pickRandomValue(PLACE_NUMBER_SIGN_VALUES),
            pickRandomValue(PLACE_NUMBER_DIGIT_VALUES),
            pickRandomValue(PLACE_NUMBER_DIGIT_VALUES)
        ]
    }),
    int_1000: createPlaceIntegerVariant({
        id: 'int_1000',
        title: 'Place That Number (0 to 1000)',
        badge: '0 to 1000',
        description: 'Three digit dice, more possible targets, and the same half-step placement on a 0 to 1000 line.',
        benchmarkUnits: [500, 1000, 1500],
        rangeMax: 1000,
        rangeUnits: 2000,
        diceCount: 3,
        keyboardJumpUnits: 20,
        wallHint: 'Choose a three-digit number, then click or drag on the line to place it between 0 and 1000.',
        lineAriaLabel: 'Interactive number line from 0 to 1000. Click or drag to place your chosen number.',
        howToPlaySteps: [
            'Roll the three digit dice to get a set of digits.',
            'Choose which number you want to build from those digits.',
            'Click or drag on the number line to estimate where that number belongs from 0 to 1000.',
            'Use the numbers already on the line as benchmarks for later rounds.',
            'The run ends as soon as you place one number incorrectly, so the goal is to survive for more rounds than everyone else.'
        ],
        wholeLineHint: valueLabel => `${valueLabel} is using the whole 0 to 1000 line. Look for halves, quarters, and hundreds.`,
    }),
    frac_0_6: createPlaceNumberVariant({
        id: 'frac_0_6',
        title: 'Place That Number (0 to 6 Fractions)',
        badge: '0 to 6 Fractions',
        description: 'Two dice from 1 to 6. Choose which way to write them as a fraction, then place that value on a 0 to 6 line.',
        benchmarkUnits: [60, 180],
        rangeMax: 6,
        rangeUnits: 360,
        unitsPerWhole: 60,
        diceFaces: [1, 2, 3, 4, 5, 6],
        diceCount: 2,
        keyboardStepUnits: 1,
        keyboardJumpUnits: 10,
        choiceCardTitle: 'Build Your Fraction',
        statusRollLabel: 'Dice',
        historyRollLabel: 'Dice',
        historyChoiceLabel: 'Fraction',
        historyPlacementFormat: 'decimal2',
        feedbackValueFormat: 'improper',
        markerValueFormat: 'improper',
        showHistoryDecimalColumn: true,
        wallHint: 'Choose one of the two fractions, then click or drag on the line to place it between 0 and 6.',
        lineAriaLabel: 'Interactive number line from 0 to 6. Click or drag to place your chosen fraction.',
        howToPlaySteps: [
            'Roll the two dice to get two numbers from 1 to 6.',
            'Choose which way to write them as a fraction.',
            'Click or drag on the number line to estimate where that fraction belongs from 0 to 6.',
            'Use the numbers already on the line as benchmarks for later rounds.',
            'The run ends as soon as you place one value incorrectly, so the goal is to survive for more rounds than everyone else.'
        ],
        rollPromptSingle: createPlaceRollPromptSingle('dice'),
        rollPromptMultiple: createPlaceRollPromptMultiple('fraction'),
        wholeLineHint: valueLabel => `${valueLabel} is using the whole 0 to 6 line. Look for halves, thirds, and sixths.`,
        optionBuilder: buildPlaceFractionRollOptions
    })
};

// ============================================
// Session Storage
// ============================================

const STORAGE_KEYS = {
    fractionIntDicePrefix: 'mathgames_fraction_int_dice',
    fractionFracDicePrefix: 'mathgames_fraction_frac_dice',
    decimatIntDice: 'mathgames_decimat_int_dice',
    decimatPlaceDice: 'mathgames_decimat_place_dice'
};

const FRACTION_DICE_FACE_COUNT = 6;
const DECIMAT_DICE_FACE_COUNT = 6;

function getDiceStorage() {
    try {
        return window.sessionStorage;
    } catch (e) {
        console.error('Session storage is unavailable:', e);
        return null;
    }
}

function clearLegacyPersistentDiceStorage() {
    try {
        Object.keys(VERSIONS).forEach(version => {
            const keys = getFractionStorageKeys(version);
            localStorage.removeItem(keys.intDice);
            localStorage.removeItem(keys.fracDice);
        });

        localStorage.removeItem(STORAGE_KEYS.decimatIntDice);
        localStorage.removeItem(STORAGE_KEYS.decimatPlaceDice);
    } catch (e) {
        console.error('Error clearing legacy dice settings:', e);
    }
}

function forEachFractionDiceFace(callback) {
    for (let face = 1; face <= FRACTION_DICE_FACE_COUNT; face++) {
        callback({
            face,
            intInput: $(`#frac-int-${face}`),
            fracSelect: $(`#frac-denom-${face}`)
        });
    }
}

function forEachDecimatDiceFace(callback) {
    for (let face = 1; face <= DECIMAT_DICE_FACE_COUNT; face++) {
        callback({
            face,
            intInput: $(`#decimat-int-${face}`),
            placeSelect: $(`#decimat-place-${face}`)
        });
    }
}

function pickRandomValue(values) {
    return values[Math.floor(Math.random() * values.length)];
}

function isValidDiceArray(values, faceCount, validator) {
    return Array.isArray(values) && values.length === faceCount && values.every(validator);
}

function openModal(modal, options = {}) {
    const { initialFocus = null, onDismiss = null } = options;

    if (!modal) {
        return () => {};
    }

    let isClosed = false;

    const close = (reason = 'close') => {
        if (isClosed) return;

        isClosed = true;
        modal.hidden = true;
        modal.removeEventListener('click', handleBackdrop);
        document.removeEventListener('keydown', handleEscape);

        if (reason !== 'action') {
            onDismiss?.(reason);
        }
    };

    function handleBackdrop(e) {
        if (e.target === modal) {
            close('backdrop');
        }
    }

    function handleEscape(e) {
        if (e.key === 'Escape') {
            close('escape');
        }
    }

    modal.hidden = false;
    modal.addEventListener('click', handleBackdrop);
    document.addEventListener('keydown', handleEscape);
    initialFocus?.focus();

    return close;
}

function showOptionPickerModal({
    modalSelector,
    optionSelector,
    cancelSelector,
    valueDataKey
}) {
    return new Promise((resolve) => {
        const modal = $(modalSelector);
        const cancelBtn = $(cancelSelector);
        const options = Array.from($$(optionSelector));

        if (!modal || options.length === 0) {
            resolve(null);
            return;
        }

        let isResolved = false;
        let closeModal = () => {};

        const cleanup = () => {
            options.forEach(option => option.removeEventListener('click', onPick));
            cancelBtn?.removeEventListener('click', onCancel);
        };

        const finish = (value, dismissed = false) => {
            if (isResolved) return;
            isResolved = true;

            if (!dismissed) {
                closeModal('action');
            }

            cleanup();
            resolve(value);
        };

        function onPick(event) {
            finish(event.currentTarget.dataset[valueDataKey] ?? null);
        }

        function onCancel() {
            finish(null);
        }

        options.forEach(option => option.addEventListener('click', onPick));
        cancelBtn?.addEventListener('click', onCancel);
        closeModal = openModal(modal, {
            initialFocus: options[0] || cancelBtn,
            onDismiss: () => finish(null, true)
        });
    });
}

function showProgressLossConfirmModal({
    title,
    message,
    confirmLabel = 'Yes, Continue',
    cancelLabel = 'Cancel'
}) {
    return new Promise((resolve) => {
        const modal = $('#progress-confirm-modal');
        const titleEl = $('#progress-confirm-title');
        const messageEl = $('#progress-confirm-message');
        const confirmBtn = $('#progress-confirm-yes');
        const cancelBtn = $('#progress-confirm-cancel');

        if (!modal || !titleEl || !messageEl || !confirmBtn || !cancelBtn) {
            resolve(false);
            return;
        }

        titleEl.textContent = title;
        messageEl.textContent = message;
        confirmBtn.textContent = confirmLabel;
        cancelBtn.textContent = cancelLabel;

        let isResolved = false;
        let closeModal = () => {};

        const cleanup = () => {
            confirmBtn.onclick = null;
            cancelBtn.onclick = null;
        };

        const finish = (value, dismissed = false) => {
            if (isResolved) return;
            isResolved = true;

            if (!dismissed) {
                closeModal('action');
            }

            cleanup();
            resolve(value);
        };

        closeModal = openModal(modal, {
            initialFocus: cancelBtn,
            onDismiss: () => finish(false, true)
        });

        confirmBtn.onclick = () => finish(true);
        cancelBtn.onclick = () => finish(false);
    });
}

function hasRecordedGameProgress(stats = {}) {
    return Object.values(stats).some(value => value > 0);
}

function getVisibleSectionId() {
    return Array.from($$('.section')).find(section => !section.hidden)?.id || null;
}

function isFractionsGameInProgress() {
    const state = GameState.fractions;
    return !state.isGameOver && (
        state.currentRoll !== null
        || state.isSelecting
        || state.selectedCells.length > 0
        || state.round > 1
        || hasRecordedGameProgress(state.stats)
    );
}

function isDecimatsGameInProgress() {
    const state = GameState.decimats;
    return !state.isGameOver && (
        state.currentRoll !== null
        || state.isSelecting
        || state.selectedCellIds.length > 0
        || state.totalUnits > 0
        || state.round > 1
        || hasRecordedGameProgress(state.stats)
    );
}

function isPlaceNumberGameInProgress() {
    const state = GameState.placeNumber;
    return !state.isGameOver && (
        state.currentRoll !== null
        || state.selectedOptionId !== null
        || state.estimateUnits !== null
        || state.placedNumbers.length > 0
        || state.round > 1
        || hasRecordedGameProgress(state.stats)
    );
}

function getActiveUnfinishedGame() {
    const visibleSectionId = getVisibleSectionId();

    if (visibleSectionId === 'fractions' && isFractionsGameInProgress()) {
        return { sectionId: 'fractions', label: 'Colour in Fractions' };
    }

    if (visibleSectionId === 'decimats' && isDecimatsGameInProgress()) {
        return { sectionId: 'decimats', label: 'Colour in Decimats' };
    }

    if (visibleSectionId === 'place-number' && isPlaceNumberGameInProgress()) {
        return { sectionId: 'place-number', label: 'Place That Number' };
    }

    return null;
}

async function confirmProgressLossIfNeeded({ action = 'navigate', targetId = null } = {}) {
    const activeGame = getActiveUnfinishedGame();

    if (!activeGame) {
        return true;
    }

    const isRestartingCurrentGame = action === 'reset' || targetId === activeGame.sectionId;

    return showProgressLossConfirmModal({
        title: isRestartingCurrentGame ? 'Start a new game?' : 'Leave current game?',
        message: isRestartingCurrentGame
            ? `Your current progress in ${activeGame.label} will be lost if you start again.`
            : `Your current progress in ${activeGame.label} will be lost if you continue.`,
        confirmLabel: isRestartingCurrentGame ? 'Yes, Start New Game' : 'Yes, Continue'
    });
}

function setFeedbackMessage(selector, message, type) {
    const feedback = $(selector);
    if (!feedback) return;

    feedback.textContent = message;
    feedback.className = `feedback-message ${type}`;
    feedback.hidden = false;
}

function clearFeedbackMessage(selector) {
    const feedback = $(selector);
    if (!feedback) return;

    feedback.hidden = true;
    feedback.textContent = '';
    feedback.className = 'feedback-message';
}

function getFractionVersionConfig(version = currentVersion) {
    return VERSIONS[version] || VERSIONS.proper;
}

function getFractionStorageKeys(version = currentVersion) {
    return {
        intDice: `${STORAGE_KEYS.fractionIntDicePrefix}_${version}`,
        fracDice: `${STORAGE_KEYS.fractionFracDicePrefix}_${version}`
    };
}

function saveFractionCustomDice(version = currentVersion) {
    const keys = getFractionStorageKeys(version);
    const storage = getDiceStorage();
    if (!storage) return false;

    try {
        storage.setItem(keys.intDice, JSON.stringify(GameState.fractions.customIntDice));
        storage.setItem(keys.fracDice, JSON.stringify(GameState.fractions.customFracDice));
        return true;
    } catch (e) {
        console.error('Error saving dice settings:', e);
        return false;
    }
}

function saveDecimatCustomDice() {
    const storage = getDiceStorage();
    if (!storage) return false;

    try {
        storage.setItem(STORAGE_KEYS.decimatIntDice, JSON.stringify(GameState.decimats.customIntDice));
        storage.setItem(STORAGE_KEYS.decimatPlaceDice, JSON.stringify(GameState.decimats.customPlaceDice));
        return true;
    } catch (e) {
        console.error('Error saving decimat dice settings:', e);
        return false;
    }
}

function loadFractionCustomDice(version = currentVersion) {
    const keys = getFractionStorageKeys(version);
    const defaults = getFractionVersionConfig(version);
    const storage = getDiceStorage();
    let intDice = [...defaults.intDice];
    let fracDice = [...defaults.fracDice];

    try {
        const storedIntDice = storage?.getItem(keys.intDice);
        const storedFracDice = storage?.getItem(keys.fracDice);

        if (storedIntDice) {
            const parsedIntDice = JSON.parse(storedIntDice);
            if (isValidDiceArray(parsedIntDice, FRACTION_DICE_FACE_COUNT, value => Number.isInteger(value) && value >= 1 && value <= 6)) {
                intDice = parsedIntDice;
            }
        }

        if (storedFracDice) {
            const parsedFracDice = JSON.parse(storedFracDice);
            if (isValidDiceArray(parsedFracDice, FRACTION_DICE_FACE_COUNT, value => FRACTION_DENOMINATOR_OPTIONS.includes(value))) {
                fracDice = parsedFracDice;
            }
        }
    } catch (e) {
        console.error('Error loading fraction dice settings:', e);
    }

    GameState.fractions.customIntDice = intDice;
    GameState.fractions.customFracDice = fracDice;
}

function loadDecimatCustomDice() {
    const storage = getDiceStorage();

    try {
        const intDice = storage?.getItem(STORAGE_KEYS.decimatIntDice);
        const placeDice = storage?.getItem(STORAGE_KEYS.decimatPlaceDice);

        if (intDice) {
            const parsedIntDice = JSON.parse(intDice);
            if (isValidDiceArray(parsedIntDice, DECIMAT_DICE_FACE_COUNT, value => Number.isInteger(value) && value >= 1 && value <= 6)) {
                GameState.decimats.customIntDice = parsedIntDice;
            }
        }

        if (placeDice) {
            const parsedPlaceDice = JSON.parse(placeDice);
            if (isValidDiceArray(parsedPlaceDice, DECIMAT_DICE_FACE_COUNT, value => DECIMAT_PLACE_VALUE_OPTIONS.includes(value))) {
                GameState.decimats.customPlaceDice = parsedPlaceDice;
            }
        }
    } catch (e) {
        console.error('Error loading decimat dice settings:', e);
    }
}

function loadCustomDice() {
    clearLegacyPersistentDiceStorage();
    loadFractionCustomDice();
    loadDecimatCustomDice();
}

function resetFractionCustomDice() {
    const keys = getFractionStorageKeys(currentVersion);
    const storage = getDiceStorage();
    storage?.removeItem(keys.intDice);
    storage?.removeItem(keys.fracDice);
    const v = getFractionVersionConfig(currentVersion);
    GameState.fractions.customIntDice = [...v.intDice];
    GameState.fractions.customFracDice = [...v.fracDice];
}

function resetDecimatCustomDice() {
    const storage = getDiceStorage();
    storage?.removeItem(STORAGE_KEYS.decimatIntDice);
    storage?.removeItem(STORAGE_KEYS.decimatPlaceDice);
    GameState.decimats.customIntDice = [...DEFAULT_DECIMAT_INT_DICE];
    GameState.decimats.customPlaceDice = [...DEFAULT_DECIMAT_PLACE_DICE];
}

// ============================================
// Version Picker
// ============================================

function showVersionPicker() {
    return showOptionPickerModal({
        modalSelector: '#version-modal',
        optionSelector: '#version-modal .version-option',
        cancelSelector: '#version-modal-cancel',
        valueDataKey: 'version'
    });
}

function showPlaceNumberVersionPicker() {
    return showOptionPickerModal({
        modalSelector: '#place-version-modal',
        optionSelector: '#place-version-modal .place-version-option',
        cancelSelector: '#place-version-modal-cancel',
        valueDataKey: 'placeVariant'
    });
}

function applyVersion(version) {
    currentVersion = version;
    loadFractionCustomDice(version);

    createFractionWall();
    resetFractionsGame();
    populateFractionDiceInputs();

    const subtitle = version === 'improper' ? '(With Improper Fractions)' : '(Without Improper Fractions)';
    $('#fractions-title').textContent = `Colour in Fractions ${subtitle}`;
}

async function navigateToFractions() {
    const version = await showVersionPicker();
    if (!version) return;

    showSection('fractions');
    applyVersion(version);
}

function navigateToDecimats() {
    showSection('decimats');
    resetDecimatsGame();
}

async function navigateToPlaceNumber() {
    const variant = await showPlaceNumberVersionPicker();
    if (!variant) return;

    showSection('place-number');
    applyPlaceNumberVariant(variant);
}

async function handleTopLevelNavigation(targetId) {
    const confirmed = await confirmProgressLossIfNeeded({ action: 'navigate', targetId });
    if (!confirmed) return;

    if (targetId === 'fractions') {
        await navigateToFractions();
        return;
    }

    if (targetId === 'decimats') {
        navigateToDecimats();
        return;
    }

    if (targetId === 'place-number') {
        await navigateToPlaceNumber();
        return;
    }

    showSection(targetId);
}

function showSection(targetId) {
    const navLinks = $$('.nav-link');
    const sections = $$('.section');

    navLinks.forEach(link => link.classList.remove('active'));
    const activeLink = $(`.nav-link[href="#${targetId}"]`);
    if (activeLink) activeLink.classList.add('active');

    sections.forEach(section => { section.hidden = section.id !== targetId; });
    window.scrollTo(0, 0);
}

// ============================================
// Navigation & UI Init
// ============================================

function initNavigation() {
    const navLinks = $$('.nav-link');
    const brandLink = $('.nav-brand-link');
    const mobileToggle = $('.mobile-menu-toggle');
    const navMenu = $('.nav-menu');

    mobileToggle?.addEventListener('click', () => {
        const expanded = mobileToggle.getAttribute('aria-expanded') === 'true';
        mobileToggle.setAttribute('aria-expanded', !expanded);
        navMenu.setAttribute('aria-expanded', !expanded);
    });

    navLinks.forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').slice(1);

            mobileToggle?.setAttribute('aria-expanded', 'false');
            navMenu?.setAttribute('aria-expanded', 'false');

            await handleTopLevelNavigation(targetId);
        });
    });

    brandLink?.addEventListener('click', async (e) => {
        e.preventDefault();
        mobileToggle?.setAttribute('aria-expanded', 'false');
        navMenu?.setAttribute('aria-expanded', 'false');
        await handleTopLevelNavigation('home');
    });
}

function initPlayNowButtons() {
    $('.play-fractions-btn')?.addEventListener('click', () => handleTopLevelNavigation('fractions'));
    $('.play-decimats-btn')?.addEventListener('click', () => handleTopLevelNavigation('decimats'));
    $('.play-place-number-btn')?.addEventListener('click', () => handleTopLevelNavigation('place-number'));
}

function initHowToPlay() {
    const triggers = $$('[data-how-to-play-target]');
    const modal = $('#how-to-play-modal');
    const title = $('#how-to-play-title');
    const list = $('#how-to-play-list');
    const closeBtn = $('#how-to-play-close');
    let closeModal = () => {};
    const HOW_TO_PLAY_CONTENT = {
        fractions: {
            title: 'How to Play',
            steps: [
                'Roll the dice to get a fraction',
                'Click on the fraction wall to shade in that fraction',
                'Try to fill rows completely without going over',
                'Record your rolls in the table',
                'The game ends when you can\'t fit the rolled fraction'
            ]
        },
        decimats: {
            title: 'How to Play',
            steps: [
                'Roll the number die and the place-value die',
                'Single-click Decimat blocks to select or unselect the matching decimal amount',
                'Double-click a tenth or hundredth block to break it into smaller parts',
                'Use Check Result to confirm your selection and record the round',
                'If the roll is larger than the remaining space, use Skip Turn to record Skipped (Impossible)'
            ]
        },
        'place-number': {
            title: 'How to Play',
            steps: []
        }
    };

    function updateHowToPlay(target) {
        const content = target === 'place-number'
            ? {
                title: 'How to Play',
                steps: getCurrentPlaceNumberVariant().howToPlaySteps
            }
            : (HOW_TO_PLAY_CONTENT[target] || HOW_TO_PLAY_CONTENT.fractions);
        if (title) title.textContent = content.title;
        if (list) {
            list.innerHTML = content.steps.map(step => `<li>${step}</li>`).join('');
        }
    }

    triggers.forEach(trigger => {
        trigger.addEventListener('click', () => {
            updateHowToPlay(trigger.dataset.howToPlayTarget);
            closeModal('action');
            closeModal = openModal(modal, {
                initialFocus: closeBtn,
                onDismiss: () => { closeModal = () => {}; }
            });
        });
    });

    closeBtn?.addEventListener('click', () => {
        closeModal('action');
        closeModal = () => {};
    });
}

// ============================================
// Custom Dice UI
// ============================================

function initCustomDiceUI() {
    loadCustomDice();

    const triggers = $$('[data-dice-config-target]');
    const modal = $('#custom-dice-modal');
    const closeBtn = $('#custom-dice-close');
    const title = $('#custom-dice-modal-title');
    const subtitle = $('#custom-dice-modal-subtitle');
    const panelContent = {
        fractions: {
            title: 'Custom Dice Settings: Colour in Fractions',
            subtitle: 'Adjust the number die and fraction die faces for the Fractions game.'
        },
        decimats: {
            title: 'Custom Dice Settings: Colour in Decimats',
            subtitle: 'Adjust the number die and place-value die faces for the Decimats game.'
        }
    };
    const panels = {
        fractions: $('#fractions-custom-dice-panel'),
        decimats: $('#decimats-custom-dice-panel')
    };
    const panelActions = {
        fractions: {
            saveButtonSelector: '#save-fraction-dice',
            resetButtonSelector: '#reset-fraction-dice',
            errorSelector: '#fraction-dice-error',
            validate: validateFractionDice,
            collectValues: getFractionDiceValues,
            applyValues: ({ intValues, extraValues }) => {
                GameState.fractions.customIntDice = intValues;
                GameState.fractions.customFracDice = extraValues;
            },
            save: () => saveFractionCustomDice(),
            reset: resetFractionCustomDice,
            populate: populateFractionDiceInputs
        },
        decimats: {
            saveButtonSelector: '#save-decimat-dice',
            resetButtonSelector: '#reset-decimat-dice',
            errorSelector: '#decimat-dice-error',
            validate: validateDecimatDice,
            collectValues: getDecimatDiceValues,
            applyValues: ({ intValues, extraValues }) => {
                GameState.decimats.customIntDice = intValues;
                GameState.decimats.customPlaceDice = extraValues;
            },
            save: saveDecimatCustomDice,
            reset: resetDecimatCustomDice,
            populate: populateDecimatDiceInputs
        }
    };
    let closeModal = () => {};

    function showCustomDicePanel(target) {
        const panelKey = target === 'decimats' ? 'decimats' : 'fractions';
        const content = panelContent[panelKey];

        Object.entries(panels).forEach(([key, panel]) => {
            if (!panel) return;
            panel.hidden = key !== panelKey;
        });

        title.textContent = content.title;
        if (subtitle) subtitle.textContent = content.subtitle;
        if (panelKey === 'fractions') updateFractionDiceVersionWarning();
    }

    triggers.forEach(trigger => {
        trigger.addEventListener('click', () => {
            showCustomDicePanel(trigger.dataset.diceConfigTarget);
            closeModal('action');
            closeModal = openModal(modal, {
                initialFocus: closeBtn,
                onDismiss: () => { closeModal = () => {}; }
            });
        });
    });
    closeBtn?.addEventListener('click', () => {
        closeModal('action');
        closeModal = () => {};
    });

    populateFractionDiceInputs();
    populateDecimatDiceInputs();
    showCustomDicePanel('fractions');

    Object.values(panelActions).forEach(bindCustomDicePanelActions);
    bindIntegerInputValidation(forEachFractionDiceFace);
    bindIntegerInputValidation(forEachDecimatDiceFace);
    bindFractionDiceWarningUpdates();
}

function showDiceMessage(el, text, autoHide, isSuccess = true) {
    if (!el) return;

    if (el._hideTimer) {
        window.clearTimeout(el._hideTimer);
        el._hideTimer = null;
    }

    el.textContent = text;
    el.style.color = isSuccess ? 'var(--color-success, #10b981)' : 'var(--color-error, #ef4444)';
    el.hidden = false;
    if (autoHide) {
        el._hideTimer = window.setTimeout(() => {
            el.hidden = true;
            el.style.color = '';
            el._hideTimer = null;
        }, 2000);
    }
}

function collectDiceValues(iterateFaces, getExtraInput) {
    const intValues = [];
    const extraValues = [];

    iterateFaces(faceData => {
        intValues.push(parseInt(faceData.intInput.value, 10));
        extraValues.push(parseInt(getExtraInput(faceData).value, 10));
    });

    return { intValues, extraValues };
}

function populateDiceInputs(iterateFaces, intValues, extraValues, getExtraInput) {
    iterateFaces(faceData => {
        const { face, intInput } = faceData;
        const extraInput = getExtraInput(faceData);

        if (intInput) intInput.value = intValues[face - 1];
        if (extraInput) extraInput.value = extraValues[face - 1];
    });
}

function validateDiceFaces(options) {
    const {
        iterateFaces,
        errorMsg,
        getExtraInput = null,
        isExtraValid = null,
        getIntegerErrorMessage,
        getExtraErrorMessage = null
    } = options;

    let invalidIntegerFace = null;
    let invalidExtraFace = null;

    iterateFaces(faceData => {
        if (invalidIntegerFace || invalidExtraFace) return;

        const intValue = parseInt(faceData.intInput.value, 10);
        if (isNaN(intValue) || intValue < 1 || intValue > 6) {
            invalidIntegerFace = { face: faceData.face, input: faceData.intInput };
            return;
        }

        if (getExtraInput && isExtraValid) {
            const extraInput = getExtraInput(faceData);
            const extraValue = parseInt(extraInput.value, 10);

            if (!isExtraValid(extraValue)) {
                invalidExtraFace = { face: faceData.face, input: extraInput };
            }
        }
    });

    if (invalidIntegerFace) {
        showDiceMessage(errorMsg, getIntegerErrorMessage(invalidIntegerFace.face), false, false);
        invalidIntegerFace.input.focus();
        return false;
    }

    if (invalidExtraFace && getExtraErrorMessage) {
        showDiceMessage(errorMsg, getExtraErrorMessage(invalidExtraFace.face), false, false);
        invalidExtraFace.input.focus();
        return false;
    }

    errorMsg.hidden = true;
    errorMsg.style.color = '';
    return true;
}

function bindIntegerInputValidation(iterateFaces) {
    iterateFaces(({ intInput: input }) => {
        input?.addEventListener('input', () => validateIntegerInput(input, 1, 6));
    });
}

function bindCustomDicePanelActions(config) {
    const saveBtn = $(config.saveButtonSelector);
    const resetBtn = $(config.resetButtonSelector);
    const errorMsg = $(config.errorSelector);

    saveBtn?.addEventListener('click', () => {
        if (!config.validate()) return;

        config.applyValues(config.collectValues());

        if (config.save()) {
            showDiceMessage(errorMsg, 'Dice settings saved successfully!', true);
        } else {
            showDiceMessage(errorMsg, 'Error saving dice settings. Please try again.', false, false);
        }
    });

    resetBtn?.addEventListener('click', () => {
        config.reset();
        config.populate();
        showDiceMessage(errorMsg, 'Dice settings reset to default!', true);
    });
}

function getFractionDiceValues() {
    return collectDiceValues(forEachFractionDiceFace, ({ fracSelect }) => fracSelect);
}

function getDecimatDiceValues() {
    return collectDiceValues(forEachDecimatDiceFace, ({ placeSelect }) => placeSelect);
}

function populateFractionDiceInputs() {
    populateDiceInputs(
        forEachFractionDiceFace,
        GameState.fractions.customIntDice,
        GameState.fractions.customFracDice,
        ({ fracSelect }) => fracSelect
    );
    updateFractionDiceVersionWarning();
}

function populateDecimatDiceInputs() {
    populateDiceInputs(
        forEachDecimatDiceFace,
        GameState.decimats.customIntDice,
        GameState.decimats.customPlaceDice,
        ({ placeSelect }) => placeSelect
    );
}

function validateFractionDice() {
    return validateDiceFaces({
        iterateFaces: forEachFractionDiceFace,
        errorMsg: $('#fraction-dice-error'),
        getIntegerErrorMessage: face => `Face ${face}: Integer dice must be between 1 and 6.`
    });
}

function canGenerateImproperFraction(intValues, denominators) {
    return intValues.some(numerator =>
        denominators.some(denominator => numerator >= denominator)
    );
}

function areFractionDiceValuesValid({ intValues, extraValues }) {
    return isValidDiceArray(
        intValues,
        FRACTION_DICE_FACE_COUNT,
        value => Number.isInteger(value) && value >= 1 && value <= 6
    ) && isValidDiceArray(
        extraValues,
        FRACTION_DICE_FACE_COUNT,
        value => FRACTION_DENOMINATOR_OPTIONS.includes(value)
    );
}

function getFractionDiceVersionWarning(diceValues) {
    if (!areFractionDiceValuesValid(diceValues)) return '';

    const canRollImproper = canGenerateImproperFraction(diceValues.intValues, diceValues.extraValues);

    if (currentVersion === 'improper' && !canRollImproper) {
        return 'Warning: This game is set to With Improper Fractions, but these dice cannot roll an improper fraction.';
    }

    if (currentVersion !== 'improper' && canRollImproper) {
        return 'Warning: This game is set to Without Improper Fractions, but these dice can roll an improper fraction.';
    }

    return '';
}

function updateFractionDiceVersionWarning() {
    const warning = $('#fraction-dice-warning');
    if (!warning) return;

    const warningText = getFractionDiceVersionWarning(getFractionDiceValues());
    warning.textContent = warningText;
    warning.hidden = warningText === '';
}

function bindFractionDiceWarningUpdates() {
    forEachFractionDiceFace(({ intInput, fracSelect }) => {
        intInput?.addEventListener('input', updateFractionDiceVersionWarning);
        fracSelect?.addEventListener('change', updateFractionDiceVersionWarning);
    });
}

function validateDecimatDice() {
    return validateDiceFaces({
        iterateFaces: forEachDecimatDiceFace,
        errorMsg: $('#decimat-dice-error'),
        getExtraInput: ({ placeSelect }) => placeSelect,
        isExtraValid: value => DECIMAT_PLACE_VALUE_OPTIONS.includes(value),
        getIntegerErrorMessage: face => `Face ${face}: Number die values must be between 1 and 6.`,
        getExtraErrorMessage: face => `Face ${face}: Choose 1/10, 1/100, or 1/1000 for the place-value die.`
    });
}

function validateIntegerInput(input, min, max) {
    const value = parseInt(input.value, 10);
    if (isNaN(value) || value < min || value > max) {
        input.classList.add('invalid');
        input.setCustomValidity(`Value must be between ${min} and ${max}`);
    } else {
        input.classList.remove('invalid');
        input.setCustomValidity('');
    }
}

// ============================================
// Modal
// ============================================

function showEndModal({
    isWin,
    roundsPlayed,
    onPlayAgain,
    winReason,
    loseReason,
    statsItems
}) {
    const modal = $('#game-modal');
    const inner = $('#modal-inner');
    const fireworks = $('#fireworks-container');
    const icon = $('#modal-icon');
    const title = $('#modal-title');
    const statsEl = $('#modal-stats');
    const playAgainBtn = $('#modal-play-again');
    const closeBtn = $('#modal-close');

    inner.classList.remove('modal-win', 'modal-lose');
    fireworks.hidden = true;
    fireworks.innerHTML = '';

    if (isWin) {
        inner.classList.add('modal-win');
        fireworks.hidden = false;
        for (let i = 0; i < 24; i++) {
            const spark = document.createElement('div');
            spark.className = 'firework-spark';
            spark.style.setProperty('--angle', `${(i / 24) * 360}deg`);
            spark.style.setProperty('--delay', `${Math.random() * 0.4}s`);
            spark.style.setProperty('--hue', `${Math.floor(Math.random() * 360)}`);
            fireworks.appendChild(spark);
        }
        icon.textContent = '🎉';
        title.textContent = 'You Win!';
    } else {
        inner.classList.add('modal-lose');
        icon.textContent = '😔';
        title.textContent = 'Game Over';
    }

    const renderedStats = statsItems.map(item => `
        <div class="modal-stat ${item.className}">
            <span class="modal-stat-value">${item.value}</span>
            <span class="modal-stat-label">${item.label}</span>
        </div>
    `).join('');

    statsEl.innerHTML = `
        <p class="modal-reason">${isWin ? winReason : loseReason}</p>
        <p class="modal-rounds">Rounds played: ${roundsPlayed}</p>
        <div class="modal-stat-grid">
            ${renderedStats}
        </div>
    `;

    const cleanup = () => {
        fireworks.innerHTML = '';
        playAgainBtn.onclick = null;
        closeBtn.onclick = null;
    };
    const closeModal = openModal(modal, {
        initialFocus: playAgainBtn,
        onDismiss: cleanup
    });

    playAgainBtn.onclick = () => {
        closeModal('action');
        cleanup();
        onPlayAgain();
    };
    closeBtn.onclick = () => {
        closeModal('action');
        cleanup();
    };
}

// ============================================
// Fractions Game
// ============================================

function initFractionsGame() {
    $('#roll-fraction-btn')?.addEventListener('click', rollFractionDice);
    $('#reset-fractions-btn')?.addEventListener('click', async () => {
        if (await confirmProgressLossIfNeeded({ action: 'reset', targetId: 'fractions' })) {
            resetFractionsGame();
        }
    });
    $('#check-result-btn')?.addEventListener('click', checkResult);
    $('#skip-turn-btn')?.addEventListener('click', skipTurn);
    $('#clear-selection-btn')?.addEventListener('click', clearSelection);

    createFractionWall();
    resetFractionsGame();
}

function createFractionWall() {
    const wall = $('#fraction-wall');
    if (!wall) return;

    wall.innerHTML = '';
    const rows = (VERSIONS[currentVersion] || VERSIONS.proper).wallRows;

    rows.forEach((row, rowIndex) => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'fraction-row';
        rowDiv.setAttribute('role', 'row');
        rowDiv.dataset.rowIndex = rowIndex;
        rowDiv.dataset.denominator = row.denominator;

        for (let i = 0; i < row.cells; i++) {
            const cell = document.createElement('div');
            cell.className = 'fraction-cell';
            cell.setAttribute('role', 'gridcell');
            cell.dataset.row = rowIndex;
            cell.dataset.cell = i;
            cell.dataset.denominator = row.denominator;
            cell.dataset.value = row.value;
            cell.tabIndex = 0;
            cell.setAttribute('aria-label', `1/${row.denominator} bar, cell ${i + 1} of ${row.cells}`);
            cell.addEventListener('click', () => handleCellSelection(rowIndex, i));
            cell.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleCellSelection(rowIndex, i);
                }
            });
            rowDiv.appendChild(cell);
        }
        wall.appendChild(rowDiv);
    });
}

function resetFractionsGame() {
    const state = GameState.fractions;
    state.currentRoll = null;
    state.round = 1;
    state.selectedCells = [];
    state.isSelecting = false;
    state.isGameOver = false;
    state.attemptsLeft = 3;
    state.stats = { correct: 0, incorrect: 0, skipped: 0, skippedPossible: 0 };

    $$('.fraction-cell').forEach(cell => {
        cell.classList.remove('selected', 'used');
    });

    const tbody = $('#fractions-table tbody');
    if (tbody) tbody.innerHTML = '';

    updateFractionDisplay();
    updateStatsDisplay();
    hideFeedback();

    setFracDiceDisplay('?', '?');
    $('#fraction-dice-int .dice-face').textContent = '?';
    $('#current-fraction').textContent = '-';
    $('#fraction-action-buttons').hidden = true;
    $('#fraction-wall').classList.remove('selecting');
    $('#roll-fraction-btn').disabled = false;
    setFractionDiceLocked(false);
}

function rollFractionDice() {
    const state = GameState.fractions;
    if (state.isGameOver || state.isSelecting) return;

    const diceInt = $('#fraction-dice-int');
    const diceFrac = $('#fraction-dice');

    $('#roll-fraction-btn').disabled = true;
    setFractionDiceLocked(true);
    diceInt.classList.add('rolling');
    diceFrac.classList.add('rolling');

    setTimeout(() => {
        const intValue = pickRandomValue(state.customIntDice);
        const denomValue = pickRandomValue(state.customFracDice);

        state.currentRoll = {
            numerator: intValue,
            denominator: denomValue,
            display: formatFraction(intValue, denomValue),
            value: intValue / denomValue
        };
        state.isSelecting = true;
        state.selectedCells = [];
        state.attemptsLeft = 3;

        $('#fraction-dice-int .dice-face').textContent = intValue;
        setFracDiceDisplay(1, denomValue);
        $('#current-fraction').textContent = state.currentRoll.display;

        diceInt.classList.remove('rolling');
        diceFrac.classList.remove('rolling');

        $('#fraction-action-buttons').hidden = false;
        $('#check-result-btn').disabled = true;
        $('#fraction-wall').classList.add('selecting');

        showFeedback(`Select bars that sum to ${state.currentRoll.display}, then click "Check Result"`, 'info');
        updateFractionDisplay();
    }, 500);
}

function handleCellSelection(rowIndex, cellIndex) {
    const state = GameState.fractions;
    if (!state.isSelecting || state.isGameOver) return;

    const cell = $(`.fraction-cell[data-row="${rowIndex}"][data-cell="${cellIndex}"]`);
    if (!cell || cell.classList.contains('used')) return;

    const selectedIndex = state.selectedCells.findIndex(
        item => item.row === rowIndex && item.cell === cellIndex
    );

    if (selectedIndex === -1) {
        cell.classList.add('selected');
        state.selectedCells.push({ row: rowIndex, cell: cellIndex, value: parseFloat(cell.dataset.value) });
    } else {
        cell.classList.remove('selected');
        state.selectedCells.splice(selectedIndex, 1);
    }

    $('#check-result-btn').disabled = state.selectedCells.length === 0;
    updateFractionDisplay();
}

function clearSelection() {
    const state = GameState.fractions;
    state.selectedCells.forEach(item => {
        const cell = $(`.fraction-cell[data-row="${item.row}"][data-cell="${item.cell}"]`);
        if (cell) cell.classList.remove('selected');
    });
    state.selectedCells = [];
    $('#check-result-btn').disabled = true;
    updateFractionDisplay();
}

function checkResult() {
    const state = GameState.fractions;
    if (!state.isSelecting || !state.currentRoll) return;

    const targetValue = state.currentRoll.value;
    const selectedValue = state.selectedCells.reduce((sum, item) => sum + item.value, 0);

    if (Math.abs(selectedValue - targetValue) < 0.0001) {
        handleCorrectAnswer();
    } else {
        handleIncorrectAnswer();
    }
}

function handleCorrectAnswer() {
    const state = GameState.fractions;
    const roll = state.currentRoll;

    state.selectedCells.forEach(item => {
        const cell = $(`.fraction-cell[data-row="${item.row}"][data-cell="${item.cell}"]`);
        if (cell) {
            cell.classList.remove('selected');
            cell.classList.add('used');
        }
    });

    state.stats.correct++;

    const selectedDisplay = formatSelectedCells(state.selectedCells);
    const entry = { round: state.round, target: roll.display, selection: selectedDisplay || roll.display, result: 'Correct' };
    addToFractionsTable(entry);

    showFeedback(`Correct! ${roll.display} = ${selectedDisplay}`, 'success');
    nextRound();
}

function handleIncorrectAnswer() {
    const state = GameState.fractions;
    const roll = state.currentRoll;

    state.stats.incorrect++;
    state.attemptsLeft--;

    const selectedDisplay = formatSelectedCells(state.selectedCells);
    const entry = { round: state.round, target: roll.display, selection: selectedDisplay, result: 'Incorrect' };
    addToFractionsTable(entry);

    clearSelection();
    updateStatsDisplay();

    if (state.attemptsLeft <= 0) {
        showFeedback('No attempts remaining. Round over. Roll the dice for a new round.', 'error');
        nextRound();
    } else {
        const attemptsMsg = attemptsToWords(state.attemptsLeft) + ' remaining';
        showFeedback(`Check the size of the fraction pieces. Does ${selectedDisplay} equal ${roll.display}? Try selecting bars that match ${roll.display}. ${attemptsMsg}.`, 'error');
    }
}

function skipTurn() {
    const state = GameState.fractions;
    if (!state.isSelecting || !state.currentRoll) return;

    const roll = state.currentRoll;

    if (canMakeFraction(roll.value)) {
        showSkipConfirmModal(() => doSkipTurn('Skipped (Possible)'));
        return;
    }

    doSkipTurn('Skipped (Impossible)');
}

function doSkipTurn(resultLabel) {
    const state = GameState.fractions;
    const roll = state.currentRoll;

    if (resultLabel === 'Skipped (Possible)') {
        state.stats.skippedPossible++;
        showFeedback(`Skipped. ${roll.display} could have been made with remaining bars.`, 'skipped-possible');
    } else {
        state.stats.skipped++;
        showFeedback(`Skipped! ${roll.display} cannot be made with remaining bars.`, 'warning');
    }

    const entry = { round: state.round, target: roll.display, selection: '-', result: resultLabel };
    addToFractionsTable(entry);

    nextRound();
}

function showSkipConfirmModal(onConfirm, message = 'Are you sure you want to skip your turn? It is possible to make this roll.') {
    const modal = $('#skip-confirm-modal');
    const messageEl = $('#skip-confirm-message');
    const yesBtn = $('#skip-confirm-yes');
    const cancelBtn = $('#skip-confirm-cancel');

    if (messageEl) {
        messageEl.textContent = message;
    }

    const cleanup = () => {
        yesBtn.onclick = null;
        cancelBtn.onclick = null;
    };
    const closeModal = openModal(modal, {
        initialFocus: cancelBtn,
        onDismiss: cleanup
    });

    yesBtn.onclick = () => {
        closeModal('action');
        cleanup();
        onConfirm();
    };
    cancelBtn.onclick = () => {
        closeModal('action');
        cleanup();
    };
}

// ============================================
// Fraction Possibility Check (subset sum)
// ============================================

function canMakeFraction(targetValue) {
    const availableBars = [];
    $$('.fraction-cell:not(.used)').forEach(cell => {
        availableBars.push({ value: parseFloat(cell.dataset.value) });
    });
    return canMakeSum(availableBars, targetValue, 0);
}

function canMakeSum(bars, target, index) {
    if (Math.abs(target) < 0.0001) return true;
    if (target < 0 || index >= bars.length) return false;
    return canMakeSum(bars, target - bars[index].value, index + 1)
        || canMakeSum(bars, target, index + 1);
}

function hasAnyPossibleFraction() {
    const state = GameState.fractions;
    for (const numerator of state.customIntDice) {
        for (const denominator of state.customFracDice) {
            const value = numerator / denominator;
            if (canMakeFraction(value)) return true;
        }
    }
    return false;
}

// ============================================
// Round & Game Flow
// ============================================

function isFractionWallFull() {
    return $$('.fraction-cell:not(.used)').length === 0;
}

function nextRound() {
    const state = GameState.fractions;

    state.selectedCells.forEach(item => {
        const cell = $(`.fraction-cell[data-row="${item.row}"][data-cell="${item.cell}"]`);
        if (cell) cell.classList.remove('selected');
    });

    state.round++;
    state.currentRoll = null;
    state.selectedCells = [];
    state.isSelecting = false;

    $('#fraction-action-buttons').hidden = true;
    $('#check-result-btn').disabled = true;
    $('#fraction-wall').classList.remove('selecting');
    $('#roll-fraction-btn').disabled = false;
    setFracDiceDisplay('?', '?');
    $('#fraction-dice-int .dice-face').textContent = '?';
    $('#current-fraction').textContent = '-';

    updateFractionDisplay();
    updateStatsDisplay();

    if (isFractionWallFull()) {
        endFractionsGame(true);
    } else if (!hasAnyPossibleFraction()) {
        endFractionsGame(false);
    }
}

function endFractionsGame(isWin) {
    const state = GameState.fractions;
    state.isGameOver = true;
    const totalAttempts = state.stats.correct + state.stats.incorrect;
    const accuracy = totalAttempts > 0 ? Math.round((state.stats.correct / totalAttempts) * 100) : 0;
    const roundsPlayed = GameState.fractions.round - 1;

    showEndModal({
        isWin,
        roundsPlayed: Math.max(1, roundsPlayed),
        onPlayAgain: resetFractionsGame,
        winReason: 'Congratulations! You filled the entire fraction wall!',
        loseReason: 'No possible moves remaining with the current dice.',
        statsItems: [
            { className: 'correct', value: state.stats.correct, label: 'Correct' },
            { className: 'incorrect', value: state.stats.incorrect, label: 'Incorrect' },
            { className: 'skipped', value: state.stats.skipped, label: 'Skipped (Impossible)' },
            { className: 'skipped-possible', value: state.stats.skippedPossible, label: 'Skipped (Possible)' },
            { className: 'accuracy', value: `${accuracy}%`, label: 'Accuracy' }
        ]
    });
}

// ============================================
// Dice Lock
// ============================================

function setCustomDicePanelLocked(panelSelector, locked, message) {
    const panel = $(panelSelector);
    if (!panel) return;

    panel.querySelectorAll('input, select, button').forEach(el => {
        el.disabled = locked;
    });

    let notice = panel.querySelector('.dice-locked-notice');
    if (locked) {
        if (!notice) {
            notice = document.createElement('p');
            notice.className = 'dice-locked-notice';
            notice.setAttribute('role', 'alert');
            notice.textContent = message;
        }
        const versionWarning = panel.querySelector('.dice-version-warning');
        if (versionWarning) {
            versionWarning.after(notice);
        } else {
            panel.prepend(notice);
        }
        notice.hidden = false;
    } else if (notice) {
        notice.hidden = true;
    }
}

function setFractionDiceLocked(locked) {
    setCustomDicePanelLocked(
        '#fractions-custom-dice-panel',
        locked,
        'Dice settings cannot be changed during an active Fractions game. Start a new game to modify.'
    );
}

function setDecimatDiceLocked(locked) {
    setCustomDicePanelLocked(
        '#decimats-custom-dice-panel',
        locked,
        'Dice settings cannot be changed during an active Decimats game. Start a new game to modify.'
    );
}

// ============================================
// UI Updates
// ============================================

function showFeedback(message, type) {
    setFeedbackMessage('#fraction-feedback', message, type);
}

function hideFeedback() {
    clearFeedbackMessage('#fraction-feedback');
}

function updateFractionDisplay() {
    const selectedValue = GameState.fractions.selectedCells.reduce((sum, item) => sum + item.value, 0);
    $('#fraction-selected').textContent = selectedValue.toFixed(3);
    $('#fraction-round').textContent = GameState.fractions.round;
}

function updateStatsDisplay() {
    const stats = GameState.fractions.stats;
    $('#correct-count').textContent = stats.correct;
    $('#incorrect-count').textContent = stats.incorrect;
    $('#skipped-count').textContent = stats.skipped;
    $('#skipped-possible-count').textContent = stats.skippedPossible;
}

function getHistoryResultClass(result) {
    if (result === 'Correct') return 'result-correct';
    if (result === 'Incorrect') return 'result-incorrect';
    if (result === 'Skipped (Possible)') return 'result-skipped-possible';
    return 'result-skipped';
}

function prependHistoryRow(tableSelector, cells, result) {
    const tbody = $(`${tableSelector} tbody`);
    if (!tbody) return;

    const row = document.createElement('tr');
    row.className = getHistoryResultClass(result);
    row.innerHTML = cells.map(cell => `<td>${cell}</td>`).join('');
    tbody.prepend(row);

    const scrollContainer = tbody.closest('.history-scroll');
    if (scrollContainer) scrollContainer.scrollTop = 0;
}

function addToFractionsTable(entry) {
    prependHistoryRow('#fractions-table', [
        entry.round,
        entry.target,
        entry.selection,
        entry.result
    ], entry.result);
}

// ============================================
// Decimats Game
// ============================================

function setDecimatPlaceDisplay(numerator, denominator) {
    const num = $('#decimat-dice-place .frac-num');
    const den = $('#decimat-dice-place .frac-den');
    if (num) num.textContent = numerator;
    if (den) den.textContent = denominator;
}

function showDecimatFeedback(message, type) {
    setFeedbackMessage('#decimat-feedback', message, type);
}

function hideDecimatFeedback() {
    clearFeedbackMessage('#decimat-feedback');
}

function createDecimatCell(level, units) {
    decimatCellCounter += 1;
    return {
        id: `decimat-${decimatCellCounter}`,
        level,
        units,
        state: 'empty',
        children: []
    };
}

function splitDecimatCell(cell) {
    if (!cell || cell.state !== 'empty') return false;

    if (cell.level === 'tenth') {
        cell.state = 'split';
        cell.children = Array.from({ length: 10 }, () => createDecimatCell('hundredth', 10));
        return true;
    }

    if (cell.level === 'hundredth') {
        cell.state = 'split';
        cell.children = Array.from({ length: 10 }, () => createDecimatCell('thousandth', 1));
        return true;
    }

    return false;
}

function buildInitialDecimatBoard() {
    decimatCellCounter = 0;

    const tenths = Array.from({ length: 10 }, () => createDecimatCell('tenth', 100));
    splitDecimatCell(tenths[0]);
    splitDecimatCell(tenths[0].children[0]);

    return tenths;
}

function findDecimatCellById(id, cells = GameState.decimats.board) {
    for (const cell of cells) {
        if (cell.id === id) return cell;
        if (cell.state === 'split') {
            const match = findDecimatCellById(id, cell.children);
            if (match) return match;
        }
    }
    return null;
}

function getDecimatSelectedCells() {
    return GameState.decimats.selectedCellIds
        .map(id => findDecimatCellById(id))
        .filter(Boolean);
}

function getDecimatSelectedUnits() {
    return getDecimatSelectedCells().reduce((sum, cell) => sum + cell.units, 0);
}

function formatDecimatSelection(cells) {
    const counts = new Map();

    cells.forEach(cell => {
        const denominator = 1000 / cell.units;
        counts.set(denominator, (counts.get(denominator) || 0) + 1);
    });

    return Array.from(counts.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([denominator, count]) => formatFraction(count, denominator))
        .join(' + ');
}

function formatDecimatSelectionLabel(cells) {
    if (!cells.length) return '-';

    const selectionFraction = formatDecimatSelection(cells);
    const selectionDecimal = formatDecimalFromUnits(
        cells.reduce((sum, cell) => sum + cell.units, 0),
        3,
        true
    );

    return `${selectionFraction} (${selectionDecimal})`;
}

function getDecimatCellAriaLabel(cell) {
    const valueLabel = formatDecimalFromUnits(cell.units, 3, true);

    if (cell.level === 'tenth') {
        return `tenth block worth ${valueLabel}. Click to select or deselect. Double-click to split into hundredths.`;
    }

    if (cell.level === 'hundredth') {
        return `hundredth block worth ${valueLabel}. Click to select or deselect. Double-click to split into thousandths.`;
    }

    return `thousandth block worth ${valueLabel}. Click to select or deselect.`;
}

function updateDecimatCellSelectionUI(element, isSelected) {
    if (!element) return;

    element.classList.toggle('decimat-cell-selected', isSelected);
    element.classList.toggle('decimat-cell-selectable', !isSelected);
}

function renderDecimatCell(cell) {
    const state = GameState.decimats;
    const element = document.createElement('div');
    element.className = `decimat-cell decimat-${cell.level}`;

    if (cell.state === 'split') {
        element.classList.add('decimat-cell-split');
        if (cell.level === 'tenth') element.classList.add('decimat-tenth-split');
        if (cell.level === 'hundredth') element.classList.add('decimat-hundredth-split');
        cell.children.forEach(child => element.appendChild(renderDecimatCell(child)));
        return element;
    }

    if (cell.state === 'filled') {
        element.classList.add('decimat-cell-filled');
        element.setAttribute('role', 'gridcell');
        element.setAttribute('aria-disabled', 'true');
        return element;
    }

    const isSelected = state.selectedCellIds.includes(cell.id);
    const isSelectable = state.isSelecting && !state.isGameOver;

    element.setAttribute('role', 'gridcell');

    if (isSelected) {
        element.classList.add('decimat-cell-selected');
    } else if (isSelectable) {
        element.classList.add('decimat-cell-selectable');
    }

    if (isSelectable) {
        element.tabIndex = 0;
        element.setAttribute('aria-label', getDecimatCellAriaLabel(cell));
        element.addEventListener('click', (event) => {
            if (event.detail !== 1) return;
            handleDecimatCellSelection(cell.id, element);
        });
        element.addEventListener('dblclick', (event) => {
            event.preventDefault();
            handleDecimatCellBreakdown(cell.id);
        });
        element.addEventListener('keydown', (e) => {
            if ((e.key === 'Enter' && e.shiftKey) || e.key.toLowerCase() === 'b') {
                if (cell.level === 'thousandth') return;
                e.preventDefault();
                handleDecimatCellBreakdown(cell.id);
                return;
            }

            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleDecimatCellSelection(cell.id, element);
            }
        });
    } else {
        element.tabIndex = -1;
    }

    return element;
}

function renderDecimatBoard() {
    const board = $('#decimat-board');
    if (!board) return;

    board.innerHTML = '';
    board.classList.toggle('selecting', GameState.decimats.isSelecting);
    GameState.decimats.board.forEach(cell => board.appendChild(renderDecimatCell(cell)));
    board.setAttribute(
        'aria-label',
        `Decimat board with ${formatDecimalFromUnits(GameState.decimats.totalUnits, 3, false)} shaded, ${formatDecimalFromUnits(getDecimatSelectedUnits(), 3, false)} selected, and ${formatDecimalFromUnits(1000 - GameState.decimats.totalUnits, 3, false)} remaining`
    );
}

function updateDecimatDisplay() {
    const state = GameState.decimats;
    $('#decimat-round').textContent = state.round;
    $('#current-decimat-roll').textContent = state.currentRoll
        ? `${state.currentRoll.fractionDisplay} (${state.currentRoll.decimalDisplay})`
        : '-';
    $('#decimat-selected').textContent = formatDecimalFromUnits(getDecimatSelectedUnits(), 3, false);
    $('#decimat-total').textContent = formatDecimalFromUnits(state.totalUnits, 3, false);
    $('#decimat-remaining').textContent = formatDecimalFromUnits(1000 - state.totalUnits, 3, false);
}

function updateDecimatStatsDisplay() {
    const stats = GameState.decimats.stats;
    $('#decimat-correct-count').textContent = stats.correct;
    $('#decimat-incorrect-count').textContent = stats.incorrect;
    $('#decimat-skipped-count').textContent = stats.skipped;
    $('#decimat-skipped-possible-count').textContent = stats.skippedPossible;
}

function addToDecimatsTable(entry) {
    prependHistoryRow('#decimats-table', [
        entry.round,
        entry.target,
        entry.selection,
        entry.total,
        entry.result
    ], entry.result);
}

function updateDecimatActionState() {
    $('#check-decimat-btn').disabled = GameState.decimats.selectedCellIds.length === 0;
}

function resetDecimatDiceDisplay() {
    $('#decimat-dice-int .dice-face').textContent = '?';
    setDecimatPlaceDisplay('?', '?');
}

function clearDecimatSelection(updateUI = true) {
    GameState.decimats.selectedCellIds = [];

    if (updateUI) {
        renderDecimatBoard();
        updateDecimatDisplay();
        updateDecimatActionState();
    }
}

function resetDecimatsGame() {
    const state = GameState.decimats;
    state.currentRoll = null;
    state.round = 1;
    state.totalUnits = 0;
    state.selectedCellIds = [];
    state.isSelecting = false;
    state.board = buildInitialDecimatBoard();
    state.isGameOver = false;
    state.attemptsLeft = 3;
    state.stats = { correct: 0, incorrect: 0, skipped: 0, skippedPossible: 0 };

    const tbody = $('#decimats-table tbody');
    if (tbody) tbody.innerHTML = '';

    renderDecimatBoard();
    updateDecimatDisplay();
    updateDecimatStatsDisplay();
    hideDecimatFeedback();

    resetDecimatDiceDisplay();
    $('#roll-decimat-btn').disabled = false;
    setDecimatDiceLocked(false);
    updateDecimatActionState();
    $('#decimat-action-buttons').hidden = true;
}

function getDecimatRemainingUnits() {
    return 1000 - GameState.decimats.totalUnits;
}

function canMakeDecimatAmount(targetUnits) {
    // Any remaining area can be broken down to thousandths, so remaining total determines feasibility.
    return targetUnits <= getDecimatRemainingUnits();
}

function getPossibleDecimatRollUnits() {
    const state = GameState.decimats;
    const possibleRolls = new Set();

    state.customIntDice.forEach(numerator => {
        state.customPlaceDice.forEach(denominator => {
            possibleRolls.add(numerator * (1000 / denominator));
        });
    });

    return Array.from(possibleRolls);
}

function hasAnyPossibleDecimatRoll() {
    const remainingUnits = getDecimatRemainingUnits();
    return getPossibleDecimatRollUnits().some(units => units <= remainingUnits);
}

function clearPendingDecimatRoll(options = {}) {
    const { preserveDiceDisplay = false } = options;
    const state = GameState.decimats;
    state.currentRoll = null;
    state.selectedCellIds = [];
    state.isSelecting = false;
    state.attemptsLeft = 3;
    if (!preserveDiceDisplay) {
        resetDecimatDiceDisplay();
    }
    $('#roll-decimat-btn').disabled = GameState.decimats.isGameOver;
    updateDecimatActionState();
    $('#decimat-action-buttons').hidden = true;
    renderDecimatBoard();
    updateDecimatDisplay();
}

function handleDecimatCellSelection(cellId, element = null) {
    const state = GameState.decimats;
    if (!state.isSelecting || !state.currentRoll || state.isGameOver) return;

    const cell = findDecimatCellById(cellId);
    if (!cell || cell.state !== 'empty') return;

    const selectedIndex = state.selectedCellIds.indexOf(cellId);
    if (selectedIndex !== -1) {
        state.selectedCellIds.splice(selectedIndex, 1);
        updateDecimatCellSelectionUI(element, false);
        updateDecimatDisplay();
        updateDecimatActionState();
        return;
    }

    state.selectedCellIds.push(cellId);
    updateDecimatCellSelectionUI(element, true);
    updateDecimatDisplay();
    updateDecimatActionState();
}

function handleDecimatCellBreakdown(cellId) {
    const state = GameState.decimats;
    if (!state.isSelecting || !state.currentRoll || state.isGameOver) return;

    const cell = findDecimatCellById(cellId);
    if (!cell || cell.state !== 'empty' || cell.level === 'thousandth') return;

    const selectedIndex = state.selectedCellIds.indexOf(cellId);
    if (selectedIndex !== -1) {
        state.selectedCellIds.splice(selectedIndex, 1);
    }

    if (!splitDecimatCell(cell)) return;

    renderDecimatBoard();
    updateDecimatDisplay();
    updateDecimatActionState();
    showDecimatFeedback(
        `Split the ${cell.level} into ${cell.level === 'tenth' ? 'hundredths' : 'thousandths'}.`,
        'info'
    );
}

function rollDecimatDice() {
    const state = GameState.decimats;
    if (state.isGameOver || state.currentRoll || state.isSelecting) return;

    const diceInt = $('#decimat-dice-int');
    const dicePlace = $('#decimat-dice-place');

    $('#roll-decimat-btn').disabled = true;
    setDecimatDiceLocked(true);
    diceInt.classList.add('rolling');
    dicePlace.classList.add('rolling');

    setTimeout(() => {
        const intValue = pickRandomValue(state.customIntDice);
        const denominator = pickRandomValue(state.customPlaceDice);

        state.currentRoll = {
            numerator: intValue,
            denominator,
            units: intValue * (1000 / denominator),
            fractionDisplay: formatFraction(intValue, denominator),
            decimalDisplay: formatRollDecimal(intValue, denominator)
        };
        state.selectedCellIds = [];
        state.attemptsLeft = 3;

        $('#decimat-dice-int .dice-face').textContent = intValue;
        setDecimatPlaceDisplay(1, denominator);

        diceInt.classList.remove('rolling');
        dicePlace.classList.remove('rolling');

        state.isSelecting = true;
        $('#decimat-action-buttons').hidden = false;
        updateDecimatActionState();
        renderDecimatBoard();

        showDecimatFeedback(
            `Roll ${state.currentRoll.fractionDisplay} = ${state.currentRoll.decimalDisplay}. Single-click blocks to select them, double-click a tenth or hundredth to break it down, then use "Check Result".`,
            'info'
        );
        updateDecimatDisplay();
    }, 500);
}

function endDecimatsGame(isWin) {
    const state = GameState.decimats;
    state.isGameOver = true;
    state.currentRoll = null;
    state.selectedCellIds = [];
    state.isSelecting = false;
    $('#roll-decimat-btn').disabled = true;
    $('#decimat-action-buttons').hidden = true;
    updateDecimatActionState();
    resetDecimatDiceDisplay();
    renderDecimatBoard();
    updateDecimatDisplay();
    hideDecimatFeedback();

    const totalAttempts = state.stats.correct + state.stats.incorrect;
    const accuracy = totalAttempts > 0 ? Math.round((state.stats.correct / totalAttempts) * 100) : 0;

    showEndModal({
        isWin,
        roundsPlayed: Math.max(1, state.round),
        onPlayAgain: resetDecimatsGame,
        winReason: 'Congratulations! You filled the entire Decimat!',
        loseReason: 'No possible rolls remaining with the current dice settings.',
        statsItems: [
            { className: 'correct', value: state.stats.correct, label: 'Correct' },
            { className: 'incorrect', value: state.stats.incorrect, label: 'Incorrect' },
            { className: 'skipped', value: state.stats.skipped, label: 'Skipped (Impossible)' },
            { className: 'skipped-possible', value: state.stats.skippedPossible, label: 'Skipped (Possible)' },
            { className: 'accuracy', value: `${accuracy}%`, label: 'Accuracy' }
        ]
    });
}

function nextDecimatRound(options = {}) {
    const { preserveDiceDisplay = false } = options;

    if (GameState.decimats.totalUnits >= 1000) {
        endDecimatsGame(true);
        return;
    }

    if (!hasAnyPossibleDecimatRoll()) {
        endDecimatsGame(false);
        return;
    }

    GameState.decimats.round += 1;
    clearPendingDecimatRoll({ preserveDiceDisplay });
}

function checkDecimatResult() {
    const state = GameState.decimats;
    if (!state.currentRoll || state.isGameOver || !state.isSelecting) return;

    const roll = state.currentRoll;
    const selectedCells = getDecimatSelectedCells();
    const selectedUnits = getDecimatSelectedUnits();
    const selectionLabel = formatDecimatSelectionLabel(selectedCells);

    if (selectedUnits === roll.units) {
        selectedCells.forEach(cell => {
            cell.state = 'filled';
        });

        state.totalUnits += selectedUnits;
        state.stats.correct++;

        addToDecimatsTable({
            round: state.round,
            target: `${roll.fractionDisplay} (${roll.decimalDisplay})`,
            selection: selectionLabel,
            total: formatDecimalFromUnits(state.totalUnits, 3, true),
            result: 'Correct'
        });
        renderDecimatBoard();
        updateDecimatStatsDisplay();
        showDecimatFeedback(
            `Correct! ${selectionLabel} matches ${roll.fractionDisplay}.`,
            'success'
        );
        nextDecimatRound();
        return;
    }

    state.stats.incorrect++;
    state.attemptsLeft--;

    addToDecimatsTable({
        round: state.round,
        target: `${roll.fractionDisplay} (${roll.decimalDisplay})`,
        selection: selectionLabel,
        total: formatDecimalFromUnits(state.totalUnits, 3, true),
        result: 'Incorrect'
    });
    updateDecimatStatsDisplay();

    clearDecimatSelection();

    if (state.attemptsLeft <= 0) {
        showDecimatFeedback(
            `No attempts remaining. ${roll.fractionDisplay} was not shaded correctly. Roll the dice for a new round.`,
            'error'
        );
        nextDecimatRound();
        return;
    }

    showDecimatFeedback(
        `Check the total carefully. Does ${selectionLabel} equal ${roll.fractionDisplay}? ${attemptsToWords(state.attemptsLeft)} remaining.`,
        'error'
    );
}

function skipDecimatTurn() {
    const state = GameState.decimats;
    if (!state.currentRoll || state.isGameOver) return;

    const roll = state.currentRoll;

    if (canMakeDecimatAmount(roll.units)) {
        showSkipConfirmModal(
            () => doDecimatSkipTurn('Skipped (Possible)'),
            `Are you sure you want to skip your turn? It is possible to make ${roll.decimalDisplay}.`
        );
        return;
    }

    doDecimatSkipTurn('Skipped (Impossible)');
}

function doDecimatSkipTurn(resultLabel) {
    const state = GameState.decimats;
    const roll = state.currentRoll;

    if (resultLabel === 'Skipped (Possible)') {
        state.stats.skippedPossible++;
        updateDecimatStatsDisplay();
        showDecimatFeedback(`Skipped. ${roll.decimalDisplay} could have been made with the remaining blocks.`, 'skipped-possible');
    } else {
        state.stats.skipped++;
        updateDecimatStatsDisplay();
        showDecimatFeedback(`Skipped. ${roll.decimalDisplay} cannot be made with the remaining blocks.`, 'warning');
    }

    addToDecimatsTable({
        round: state.round,
        target: `${roll.fractionDisplay} (${roll.decimalDisplay})`,
        selection: '-',
        total: formatDecimalFromUnits(state.totalUnits, 3, true),
        result: resultLabel
    });

    nextDecimatRound();
}

function initDecimatsGame() {
    $('#roll-decimat-btn')?.addEventListener('click', rollDecimatDice);
    $('#check-decimat-btn')?.addEventListener('click', checkDecimatResult);
    $('#skip-decimat-turn-btn')?.addEventListener('click', skipDecimatTurn);
    $('#clear-decimat-selection-btn')?.addEventListener('click', () => clearDecimatSelection());
    $('#reset-decimats-btn')?.addEventListener('click', async () => {
        if (await confirmProgressLossIfNeeded({ action: 'reset', targetId: 'decimats' })) {
            resetDecimatsGame();
        }
    });

    resetDecimatsGame();
}

// ============================================
// Place That Number Game
// ============================================

function getCurrentPlaceNumberVariant() {
    return PLACE_NUMBER_VARIANTS[GameState.placeNumber.variant] || PLACE_NUMBER_VARIANTS.int_100;
}

function getPlaceNumberMinValueUnits(variant = getCurrentPlaceNumberVariant()) {
    return typeof variant.minValueUnits === 'number' ? variant.minValueUnits : 0;
}

function getPlaceNumberMaxValueUnits(variant = getCurrentPlaceNumberVariant()) {
    return typeof variant.maxValueUnits === 'number' ? variant.maxValueUnits : variant.rangeUnits;
}

function getPlaceNumberSpanUnits(variant = getCurrentPlaceNumberVariant()) {
    return getPlaceNumberMaxValueUnits(variant) - getPlaceNumberMinValueUnits(variant);
}

function getPlaceNumberPositionUnitsForValue(valueUnits, variant = getCurrentPlaceNumberVariant()) {
    return valueUnits - getPlaceNumberMinValueUnits(variant);
}

function getPlaceNumberValueUnitsForPosition(positionUnits, variant = getCurrentPlaceNumberVariant()) {
    return getPlaceNumberMinValueUnits(variant) + positionUnits;
}

function getPlaceNumberOptionById(optionId = GameState.placeNumber.selectedOptionId) {
    const options = GameState.placeNumber.currentRoll?.options || [];
    return options.find(option => option.id === optionId) || null;
}

function formatPlaceNumberUnits(units, variant = getCurrentPlaceNumberVariant()) {
    return formatPlaceVariantUnits(units, variant, 'mixed');
}

function formatPlaceNumberHistoryUnits(units, variant = getCurrentPlaceNumberVariant()) {
    return formatPlaceVariantUnits(units, variant, variant.historyPlacementFormat);
}

function formatPlaceNumberHistoryDecimalUnits(units, variant = getCurrentPlaceNumberVariant()) {
    return formatPlaceVariantUnits(units, variant, variant.historyDecimalFormat);
}

function formatPlaceNumberImproperUnits(units, variant = getCurrentPlaceNumberVariant()) {
    return formatPlaceVariantUnits(units, variant, 'improper');
}

function formatPlaceNumberFeedbackUnits(units, variant = getCurrentPlaceNumberVariant()) {
    return formatPlaceVariantUnits(units, variant, variant.feedbackValueFormat);
}

function formatPlaceNumberMarkerUnits(units, variant = getCurrentPlaceNumberVariant()) {
    return formatPlaceVariantUnits(units, variant, variant.markerValueFormat);
}

function getPlaceNumberBenchmarkUnits(variant = getCurrentPlaceNumberVariant()) {
    const minValueUnits = getPlaceNumberMinValueUnits(variant);
    const spanUnits = getPlaceNumberSpanUnits(variant);
    return variant.benchmarkUnits || [
        minValueUnits + Math.round(spanUnits / 4),
        minValueUnits + Math.round(spanUnits / 2),
        minValueUnits + Math.round((spanUnits * 3) / 4)
    ];
}

function getPlaceNumberLabelPositionStyle(units, variant = getCurrentPlaceNumberVariant()) {
    const spanUnits = getPlaceNumberSpanUnits(variant);
    const ratio = spanUnits === 0
        ? 0
        : getPlaceNumberPositionUnitsForValue(units, variant) / spanUnits;
    return `left: calc(var(--place-line-edge-inset) + ${ratio} * (100% - (2 * var(--place-line-edge-inset))));`;
}

function renderPlaceNumberDice(dice = null, { rolling = false } = {}) {
    const row = $('#place-dice-row');
    const variant = getCurrentPlaceNumberVariant();
    if (!row) return;

    row.innerHTML = '';

    for (let index = 0; index < variant.diceCount; index++) {
        const die = document.createElement('div');
        die.className = 'dice small';
        if (rolling) {
            die.classList.add('rolling');
        }
        die.setAttribute('role', 'img');
        die.setAttribute('aria-label', `Die ${index + 1}`);

        const face = document.createElement('span');
        face.className = 'dice-face';
        face.textContent = dice && typeof dice[index] !== 'undefined' ? String(dice[index]) : '?';
        die.appendChild(face);
        row.appendChild(die);
    }
}

function renderPlaceNumberStaticUI() {
    const variant = getCurrentPlaceNumberVariant();
    const benchmarkUnits = getPlaceNumberBenchmarkUnits(variant);
    const benchmarkLabels = benchmarkUnits.map(units => formatPlaceNumberUnits(units, variant));
    const minValueUnits = getPlaceNumberMinValueUnits(variant);
    const maxValueUnits = getPlaceNumberMaxValueUnits(variant);
    const spanUnits = getPlaceNumberSpanUnits(variant);

    $('#place-number-title').textContent = variant.title;
    $('#place-roll-label').textContent = variant.statusRollLabel;
    $('#place-choice-label').textContent = variant.statusChoiceLabel;
    $('#place-history-roll-header').textContent = variant.historyRollLabel;
    $('#place-history-choice-header').textContent = variant.historyChoiceLabel;
    $('#place-history-decimal-header').textContent = variant.historyDecimalLabel;
    $('#place-history-decimal-header').hidden = !variant.showHistoryDecimalColumn;
    $('#place-history-decimal-col').hidden = !variant.showHistoryDecimalColumn;
    $('#place-wall-hint').textContent = variant.wallHint;
    $('#place-choice-title').textContent = variant.choiceCardTitle;
    $('#place-benchmark-toggle-label').textContent = variant.benchmarkToggleTemplate(benchmarkLabels);
    $('#place-number-line')?.setAttribute('aria-label', variant.lineAriaLabel);

    const ticks = $('#place-number-ticks');
    if (ticks) {
        ticks.innerHTML = [
            '<span class="place-number-tick-start" style="left: 0%;"></span>',
            ...benchmarkUnits.map((units) => {
                const ratio = spanUnits === 0
                    ? 0
                    : (getPlaceNumberPositionUnitsForValue(units, variant) / spanUnits);
                return `<span class="place-optional-benchmark" style="left: ${ratio * 100}%;"></span>`;
            }),
            '<span class="place-number-tick-end" style="left: 100%;"></span>'
        ].join('');
    }

    const labels = $('#place-number-labels');
    if (labels) {
        labels.innerHTML = [
            `<span class="place-number-label-start">${formatPlaceNumberUnits(minValueUnits, variant)}</span>`,
            ...benchmarkUnits.map((units, index) => `<span class="place-optional-benchmark" style="${getPlaceNumberLabelPositionStyle(units, variant)}">${benchmarkLabels[index]}</span>`),
            `<span class="place-number-label-end">${formatPlaceNumberUnits(maxValueUnits, variant)}</span>`
        ].join('');
    }

    renderPlaceNumberDice();
}

function showPlaceNumberFeedback(message, type) {
    setFeedbackMessage('#place-number-feedback', message, type);
}

function hidePlaceNumberFeedback() {
    clearFeedbackMessage('#place-number-feedback');
}

function generatePlaceNumberRoll() {
    const variant = getCurrentPlaceNumberVariant();
    const placedValues = new Set(GameState.placeNumber.placedNumbers.map(marker => marker.valueUnits));

    for (let attempt = 0; attempt < 240; attempt++) {
        const dice = typeof variant.rollDice === 'function'
            ? variant.rollDice(variant)
            : Array.from({ length: variant.diceCount }, () => pickRandomValue(variant.diceFaces));
        const options = variant.optionBuilder(dice, placedValues, variant)
            .map(option => createPlaceChoiceOption(variant, option));
        if (options.length > 0) {
            return {
                dice,
                display: (variant.rollDisplayFormatter || formatDigitRoll)(dice),
                options
            };
        }
    }

    return null;
}

function getPlaceNumberWindow(valueUnits) {
    const variant = getCurrentPlaceNumberVariant();
    const minValueUnits = getPlaceNumberMinValueUnits(variant);
    const maxValueUnits = getPlaceNumberMaxValueUnits(variant);
    const spanUnits = getPlaceNumberSpanUnits(variant);
    const sortedMarkers = [...GameState.placeNumber.placedNumbers]
        .sort((a, b) => a.valueUnits - b.valueUnits);
    const anchors = [
        { valueUnits: minValueUnits, positionUnits: 0 },
        ...sortedMarkers.map(marker => ({
            valueUnits: marker.valueUnits,
            positionUnits: marker.positionUnits
        })),
        { valueUnits: maxValueUnits, positionUnits: spanUnits }
    ];

    let left = anchors[0];
    let right = anchors[anchors.length - 1];

    for (let i = 0; i < anchors.length - 1; i++) {
        if (anchors[i].valueUnits < valueUnits && valueUnits < anchors[i + 1].valueUnits) {
            left = anchors[i];
            right = anchors[i + 1];
            break;
        }
    }

    const lowerPositionUnits = Math.min(left.positionUnits, right.positionUnits);
    const upperPositionUnits = Math.max(left.positionUnits, right.positionUnits);

    return {
        left,
        right,
        lowerPositionUnits,
        upperPositionUnits
    };
}

function describePlaceNumberWindow(valueUnits) {
    const variant = getCurrentPlaceNumberVariant();
    const minValueUnits = getPlaceNumberMinValueUnits(variant);
    const maxValueUnits = getPlaceNumberMaxValueUnits(variant);
    const { left, right } = getPlaceNumberWindow(valueUnits);
    const valueLabel = formatPlaceNumberUnits(valueUnits, variant);

    if (left.valueUnits === minValueUnits && right.valueUnits === maxValueUnits) {
        return variant.wholeLineHint(valueLabel);
    }

    return `${valueLabel} should sit between ${formatPlaceNumberUnits(left.valueUnits, variant)} and ${formatPlaceNumberUnits(right.valueUnits, variant)}. Use that gap as your benchmark.`;
}

function updatePlaceNumberGuidance() {
    const state = GameState.placeNumber;
    const selectedOption = getPlaceNumberOptionById();
    const note = $('#place-anchor-note');
    const hintToggle = $('#place-hint-toggle');

    if (!note) return;

    const syncHintToggle = (isVisible) => {
        if (!hintToggle) return;
        hintToggle.hidden = !isVisible;
        hintToggle.textContent = 'Hint';
        hintToggle.setAttribute('aria-expanded', state.showHint ? 'true' : 'false');
    };

    if (!state.currentRoll) {
        note.textContent = 'Roll the dice to get started.';
        syncHintToggle(false);
        return;
    }

    if (!selectedOption) {
        note.textContent = 'Choose one of the available values before you place a marker.';
        syncHintToggle(false);
        return;
    }

    const actionPrompt = state.estimateUnits === null
        ? 'Click or drag on the line to place your marker.'
        : 'Drag on the line to adjust your marker before checking.';

    note.textContent = state.showHint
        ? `${describePlaceNumberWindow(selectedOption.valueUnits)} ${actionPrompt}`
        : actionPrompt;

    syncHintToggle(true);
}

function getPlaceNumberMarkerLane(index) {
    return index % 2 === 0 ? 'upper' : 'lower';
}

function buildPlaceNumberMarker(marker, lane = 'upper', options = {}) {
    const variant = getCurrentPlaceNumberVariant();
    const spanUnits = getPlaceNumberSpanUnits(variant);
    const { hideLabel = false } = options;
    const element = document.createElement('div');
    element.className = `place-marker place-marker-${lane}`;
    if (marker.preview) {
        element.classList.add('preview');
    } else if (marker.failed) {
        element.classList.add('failed');
    } else {
        element.classList.add('locked');
    }
    if (hideLabel) {
        element.classList.add('label-hidden');
    }
    element.style.left = `${spanUnits === 0 ? 0 : (marker.positionUnits / spanUnits) * 100}%`;
    element.innerHTML = `
        <span class="place-marker-label">${marker.label}</span>
        <span class="place-marker-stem"></span>
        <span class="place-marker-dot"></span>
    `;
    return element;
}

function renderPlaceNumberLine() {
    const state = GameState.placeNumber;
    const markersLayer = $('#place-number-markers');
    const line = $('#place-number-line');
    if (!markersLayer || !line) return;

    markersLayer.innerHTML = '';

    const selectedOption = getPlaceNumberOptionById();
    const sortedMarkers = [...state.placedNumbers].sort((a, b) => a.valueUnits - b.valueUnits);
    sortedMarkers.forEach((marker, index) => {
        const lane = getPlaceNumberMarkerLane(index);
        markersLayer.appendChild(buildPlaceNumberMarker(marker, lane, {
            hideLabel: !state.isGameOver
        }));
    });

    if (state.currentRoll && selectedOption && state.estimateUnits !== null) {
        const previewLane = getPlaceNumberMarkerLane(sortedMarkers.length);
        markersLayer.appendChild(buildPlaceNumberMarker({
            label: selectedOption.markerLabel,
            positionUnits: state.estimateUnits,
            preview: true
        }, previewLane));
    }

    if (state.isGameOver && state.failedPlacement) {
        const failedLane = getPlaceNumberMarkerLane(sortedMarkers.length);
        markersLayer.appendChild(buildPlaceNumberMarker(state.failedPlacement, failedLane));
    }

    line.classList.toggle('is-active', Boolean(state.currentRoll) && Boolean(selectedOption) && !state.isGameOver);
    line.classList.toggle('is-dragging', state.isDraggingEstimate);
}

function updatePlaceNumberHistoryVisibility() {
    const historyPanel = $('#place-history-panel');
    if (!historyPanel) return;

    historyPanel.hidden = !GameState.placeNumber.isGameOver;
}

function updatePlaceNumberBenchmarkGuides() {
    const line = $('#place-number-line');
    const labels = $('#place-number-labels');
    const toggle = $('#place-show-benchmarks');
    const showBenchmarks = GameState.placeNumber.showBenchmarks;

    line?.classList.toggle('place-benchmarks-visible', showBenchmarks);
    labels?.classList.toggle('place-benchmarks-visible', showBenchmarks);

    if (toggle) {
        toggle.checked = showBenchmarks;
    }
}

function updatePlaceNumberChoiceCard() {
    const state = GameState.placeNumber;
    const card = $('#place-choice-card');
    const message = $('#place-choice-message');
    const buttons = $('#place-choice-buttons');

    if (!card || !buttons) return;

    if (!state.currentRoll) {
        card.hidden = true;
        buttons.innerHTML = '';
        return;
    }

    card.hidden = false;
    message.textContent = state.currentRoll.options.length === 1
        ? 'Only one new value is available from this roll.'
        : 'Choose the value that gives you the best benchmark.';

    buttons.innerHTML = '';
    state.currentRoll.options.forEach(option => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn place-option-btn';
        button.dataset.optionId = option.id;
        button.textContent = option.choiceLabel;
        const isSelected = state.selectedOptionId === option.id;
        button.classList.add(isSelected ? 'btn-primary' : 'btn-secondary');
        buttons.appendChild(button);
    });
}

function updatePlaceNumberActionState() {
    const state = GameState.placeNumber;
    const selectedOption = getPlaceNumberOptionById();
    const hasActiveRoll = Boolean(state.currentRoll) && !state.isGameOver;
    const line = $('#place-number-line');
    const checkBtn = $('#check-place-number-btn');
    const clearBtn = $('#clear-place-marker-btn');
    const actionButtons = $('#place-action-buttons');
    const rollBtn = $('#roll-place-number-btn');

    if (rollBtn) {
        rollBtn.disabled = state.isGameOver || hasActiveRoll;
    }

    if (actionButtons) {
        actionButtons.hidden = !hasActiveRoll;
    }

    if (line) {
        const canPlaceMarker = hasActiveRoll && Boolean(selectedOption);
        line.tabIndex = canPlaceMarker ? 0 : -1;
        line.setAttribute('aria-disabled', canPlaceMarker ? 'false' : 'true');
    }

    if (checkBtn) {
        checkBtn.disabled = !(hasActiveRoll && selectedOption && state.estimateUnits !== null);
    }

    if (clearBtn) {
        clearBtn.disabled = state.estimateUnits === null;
    }
}

function updatePlaceNumberDisplay() {
    const state = GameState.placeNumber;
    const selectedOption = getPlaceNumberOptionById();
    $('#place-round').textContent = state.round;
    $('#place-digits').textContent = state.currentRoll ? state.currentRoll.display : '-';
    $('#place-selected-number').textContent = selectedOption ? selectedOption.selectedLabel : '-';
    $('#place-correct-count').textContent = state.stats.correct;
    $('#place-benchmark-count').textContent = state.placedNumbers.length + 2;

    updatePlaceNumberHistoryVisibility();
    updatePlaceNumberBenchmarkGuides();
    updatePlaceNumberChoiceCard();
    updatePlaceNumberActionState();
    updatePlaceNumberGuidance();
    renderPlaceNumberLine();
}

function addToPlaceNumberTable(entry) {
    const variant = getCurrentPlaceNumberVariant();
    const cells = [
        entry.round,
        entry.roll,
        entry.choice
    ];

    if (variant.showHistoryDecimalColumn) {
        cells.push(entry.decimal ?? '-');
    }

    cells.push(entry.estimate, entry.result);

    prependHistoryRow('#place-number-table', cells, entry.result);
}

function setPlaceNumberDiceDisplay(dice) {
    renderPlaceNumberDice(dice);
}

function resetPlaceNumberDiceDisplay() {
    renderPlaceNumberDice();
}

function resetPlaceNumberTurnState({ clearFailedPlacement = false } = {}) {
    const state = GameState.placeNumber;
    state.currentRoll = null;
    state.selectedOptionId = null;
    state.estimateUnits = null;
    state.showHint = false;
    state.isDraggingEstimate = false;
    state.dragPointerId = null;

    if (clearFailedPlacement) {
        state.failedPlacement = null;
    }
}

function startPlaceNumberTurn(roll) {
    const state = GameState.placeNumber;
    resetPlaceNumberTurnState({ clearFailedPlacement: true });
    state.currentRoll = roll;
    state.selectedOptionId = roll.options.length === 1 ? roll.options[0].id : null;
}

function setPlaceNumberEstimate(valueUnits) {
    const variant = getCurrentPlaceNumberVariant();
    const selectedOption = getPlaceNumberOptionById();
    const state = GameState.placeNumber;
    if (!state.currentRoll || !selectedOption || state.isGameOver) return;

    const normalized = Math.round(clampNumber(valueUnits, 0, getPlaceNumberSpanUnits(variant)));
    state.estimateUnits = normalized;
    updatePlaceNumberDisplay();
}

function stopPlaceNumberDrag(pointerId = null) {
    const state = GameState.placeNumber;
    if (!state.isDraggingEstimate) return;
    if (pointerId !== null && state.dragPointerId !== pointerId) return;

    const line = $('#place-number-line');
    if (line && state.dragPointerId !== null && typeof line.hasPointerCapture === 'function' && line.hasPointerCapture(state.dragPointerId)) {
        try {
            line.releasePointerCapture(state.dragPointerId);
        } catch (error) {
            // Ignore release errors when the pointer capture has already been cleared.
        }
    }

    state.isDraggingEstimate = false;
    state.dragPointerId = null;
    renderPlaceNumberLine();
}

function clearPlaceNumberMarker() {
    const state = GameState.placeNumber;
    if (!state.currentRoll || state.isGameOver) return;

    stopPlaceNumberDrag();
    state.estimateUnits = null;
    updatePlaceNumberDisplay();
}

function setPlaceNumberEstimateFromClientX(line, clientX) {
    const variant = getCurrentPlaceNumberVariant();
    const spanUnits = getPlaceNumberSpanUnits(variant);
    if (!line) return;
    const surface = line.querySelector('.place-number-line-inner') || line;
    const rect = surface.getBoundingClientRect();
    if (rect.width <= 0) return;

    const ratio = clampNumber((clientX - rect.left) / rect.width, 0, 1);
    setPlaceNumberEstimate(ratio * spanUnits);
}

function handlePlaceNumberLinePointerDown(event) {
    const state = GameState.placeNumber;
    if (!state.currentRoll || state.isGameOver) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    if (!getPlaceNumberOptionById()) {
        showPlaceNumberFeedback('Choose one of the available values first, then place your marker on the line.', 'info');
        return;
    }

    const line = event.currentTarget;
    state.isDraggingEstimate = true;
    state.dragPointerId = event.pointerId;

    if (typeof line.setPointerCapture === 'function') {
        try {
            line.setPointerCapture(event.pointerId);
        } catch (error) {
            // Ignore capture errors when the browser does not allow pointer capture here.
        }
    }

    event.preventDefault();
    setPlaceNumberEstimateFromClientX(line, event.clientX);
}

function handlePlaceNumberLinePointerMove(event) {
    const state = GameState.placeNumber;
    if (!state.isDraggingEstimate || state.dragPointerId !== event.pointerId) return;

    event.preventDefault();
    setPlaceNumberEstimateFromClientX(event.currentTarget, event.clientX);
}

function handlePlaceNumberLinePointerUp(event) {
    const state = GameState.placeNumber;
    if (!state.isDraggingEstimate || state.dragPointerId !== event.pointerId) return;

    event.preventDefault();
    setPlaceNumberEstimateFromClientX(event.currentTarget, event.clientX);
    stopPlaceNumberDrag(event.pointerId);
}

function handlePlaceNumberLinePointerCancel(event) {
    stopPlaceNumberDrag(event.pointerId);
}

function handlePlaceNumberLineKeyDown(event) {
    const state = GameState.placeNumber;
    const variant = getCurrentPlaceNumberVariant();
    const spanUnits = getPlaceNumberSpanUnits(variant);
    if (!state.currentRoll || !getPlaceNumberOptionById() || state.isGameOver) return;

    const step = event.shiftKey ? variant.keyboardJumpUnits : variant.keyboardStepUnits;
    const currentEstimate = state.estimateUnits ?? Math.round(spanUnits / 2);
    let nextEstimate = currentEstimate;
    let handled = true;

    switch (event.key) {
        case 'ArrowLeft':
        case 'ArrowDown':
            nextEstimate -= step;
            break;
        case 'ArrowRight':
        case 'ArrowUp':
            nextEstimate += step;
            break;
        case 'Home':
            nextEstimate = 0;
            break;
        case 'End':
            nextEstimate = spanUnits;
            break;
        default:
            handled = false;
            break;
    }

    if (!handled) return;

    event.preventDefault();
    setPlaceNumberEstimate(nextEstimate);
}

function togglePlaceNumberHint() {
    const state = GameState.placeNumber;
    if (!state.currentRoll || !getPlaceNumberOptionById() || state.isGameOver) return;

    state.showHint = !state.showHint;
    updatePlaceNumberGuidance();
}

function selectPlaceNumberOption(optionId) {
    const state = GameState.placeNumber;
    if (!state.currentRoll || state.isGameOver) return;

    state.selectedOptionId = optionId;
    updatePlaceNumberDisplay();
}

function evaluatePlaceNumberPlacement(selectedOption, estimateUnits) {
    const variant = getCurrentPlaceNumberVariant();
    const valueUnits = selectedOption.valueUnits;
    const windowData = getPlaceNumberWindow(valueUnits);
    const insideInterval = estimateUnits > windowData.lowerPositionUnits && estimateUnits < windowData.upperPositionUnits;
    const valueLabel = selectedOption.choiceLabel;
    const leftLabel = formatPlaceNumberFeedbackUnits(windowData.left.valueUnits, variant);
    const rightLabel = formatPlaceNumberFeedbackUnits(windowData.right.valueUnits, variant);

    if (insideInterval) {
        return {
            isCorrect: true,
            message: `Placed! ${valueLabel} is in the correct gap and now becomes a new benchmark.`
        };
    }

    return {
        isCorrect: false,
        message: `${valueLabel} needs to sit between ${leftLabel} and ${rightLabel}. Keep your marker inside that gap.`
    };
}

function advancePlaceNumberRound() {
    const state = GameState.placeNumber;
    state.round += 1;
    resetPlaceNumberTurnState({ clearFailedPlacement: true });

    resetPlaceNumberDiceDisplay();
    updatePlaceNumberDisplay();
}

function endPlaceNumberGame(isWin) {
    const state = GameState.placeNumber;
    state.isGameOver = true;
    state.showBenchmarks = true;
    stopPlaceNumberDrag();
    resetPlaceNumberTurnState({ clearFailedPlacement: isWin });

    resetPlaceNumberDiceDisplay();
    updatePlaceNumberDisplay();

    const totalRounds = state.stats.correct + state.stats.incorrect;
    const accuracy = totalRounds > 0 ? Math.round((state.stats.correct / totalRounds) * 100) : 0;

    showEndModal({
        isWin,
        roundsPlayed: Math.max(1, totalRounds),
        onPlayAgain: resetPlaceNumberGame,
        winReason: 'You used every available roll without a mistake and built a complete bank of benchmarks.',
        loseReason: 'The first placement in the wrong gap ended the run. Compare how many numbers you can place before a miss.',
        statsItems: [
            { className: 'correct', value: state.stats.correct, label: 'Placed' },
            { className: 'skipped', value: state.placedNumbers.length + 2, label: 'Benchmarks' },
            { className: 'accuracy', value: `${accuracy}%`, label: 'Accuracy' }
        ]
    });
}

function checkPlaceNumberPlacement() {
    const variant = getCurrentPlaceNumberVariant();
    const state = GameState.placeNumber;
    const selectedOption = getPlaceNumberOptionById();
    if (!state.currentRoll || !selectedOption || state.estimateUnits === null || state.isGameOver) return;

    const roll = state.currentRoll;
    const estimateLabel = formatPlaceNumberHistoryUnits(
        getPlaceNumberValueUnitsForPosition(state.estimateUnits, variant),
        variant
    );
    const decimalLabel = variant.showHistoryDecimalColumn
        ? formatPlaceNumberHistoryDecimalUnits(selectedOption.valueUnits, variant)
        : null;
    const evaluation = evaluatePlaceNumberPlacement(selectedOption, state.estimateUnits);

    if (evaluation.isCorrect) {
        state.placedNumbers.push({
            valueUnits: selectedOption.valueUnits,
            label: selectedOption.markerLabel,
            positionUnits: state.estimateUnits
        });
        state.stats.correct++;

        addToPlaceNumberTable({
            round: state.round,
            roll: roll.display,
            choice: selectedOption.historyLabel,
            decimal: decimalLabel,
            estimate: estimateLabel,
            result: 'Correct'
        });

        showPlaceNumberFeedback(evaluation.message, 'success');

        advancePlaceNumberRound();
        return;
    }

    state.stats.incorrect++;
    state.failedPlacement = {
        valueUnits: selectedOption.valueUnits,
        label: selectedOption.markerLabel,
        positionUnits: state.estimateUnits,
        failed: true
    };
    addToPlaceNumberTable({
        round: state.round,
        roll: roll.display,
        choice: selectedOption.historyLabel,
        decimal: decimalLabel,
        estimate: estimateLabel,
        result: 'Incorrect'
    });

    showPlaceNumberFeedback(evaluation.message, 'error');
    endPlaceNumberGame(false);
}

function rollPlaceNumberDice() {
    const variant = getCurrentPlaceNumberVariant();
    const state = GameState.placeNumber;
    if (state.isGameOver || state.currentRoll) return;

    renderPlaceNumberDice(null, { rolling: true });
    $('#roll-place-number-btn').disabled = true;

    setTimeout(() => {
        const roll = generatePlaceNumberRoll();

        if (!roll) {
            endPlaceNumberGame(true);
            return;
        }

        startPlaceNumberTurn(roll);

        setPlaceNumberDiceDisplay(roll.dice);

        updatePlaceNumberDisplay();

        const availableChoices = formatReadableChoices(roll.options.map(option => option.choiceLabel));
        showPlaceNumberFeedback(
            roll.options.length === 1
                ? variant.rollPromptSingle(availableChoices)
                : variant.rollPromptMultiple(availableChoices),
            'info'
        );
    }, 500);
}

function resetPlaceNumberGame() {
    const state = GameState.placeNumber;
    stopPlaceNumberDrag();
    resetPlaceNumberTurnState({ clearFailedPlacement: true });
    state.round = 1;
    state.placedNumbers = [];
    state.showBenchmarks = false;
    state.isGameOver = false;
    state.stats = { correct: 0, incorrect: 0 };

    const tbody = $('#place-number-table tbody');
    if (tbody) tbody.innerHTML = '';

    resetPlaceNumberDiceDisplay();
    hidePlaceNumberFeedback();
    updatePlaceNumberDisplay();
}

function applyPlaceNumberVariant(variantId) {
    GameState.placeNumber.variant = PLACE_NUMBER_VARIANTS[variantId] ? variantId : 'int_100';
    renderPlaceNumberStaticUI();
    resetPlaceNumberGame();
}

function initPlaceNumberGame() {
    $('#roll-place-number-btn')?.addEventListener('click', rollPlaceNumberDice);
    $('#check-place-number-btn')?.addEventListener('click', checkPlaceNumberPlacement);
    $('#clear-place-marker-btn')?.addEventListener('click', clearPlaceNumberMarker);
    $('#place-hint-toggle')?.addEventListener('click', togglePlaceNumberHint);
    $('#reset-place-number-btn')?.addEventListener('click', async () => {
        if (await confirmProgressLossIfNeeded({ action: 'reset', targetId: 'place-number' })) {
            resetPlaceNumberGame();
        }
    });
    $('#place-show-benchmarks')?.addEventListener('change', (event) => {
        GameState.placeNumber.showBenchmarks = event.currentTarget.checked;
        updatePlaceNumberBenchmarkGuides();
    });
    $('#place-number-line')?.addEventListener('pointerdown', handlePlaceNumberLinePointerDown);
    $('#place-number-line')?.addEventListener('pointermove', handlePlaceNumberLinePointerMove);
    $('#place-number-line')?.addEventListener('pointerup', handlePlaceNumberLinePointerUp);
    $('#place-number-line')?.addEventListener('pointercancel', handlePlaceNumberLinePointerCancel);
    $('#place-number-line')?.addEventListener('lostpointercapture', handlePlaceNumberLinePointerCancel);
    $('#place-number-line')?.addEventListener('keydown', handlePlaceNumberLineKeyDown);
    $('#place-choice-buttons')?.addEventListener('click', (event) => {
        const button = event.target.closest('.place-option-btn');
        if (!button) return;

        const { optionId } = button.dataset;
        if (optionId) {
            selectPlaceNumberOption(optionId);
        }
    });

    applyPlaceNumberVariant(GameState.placeNumber.variant);
}

// ============================================
// Initialize
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initPlayNowButtons();
    initHowToPlay();
    initCustomDiceUI();
    initFractionsGame();
    initDecimatsGame();
    initPlaceNumberGame();
});
