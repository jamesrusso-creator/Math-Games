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
        currentRoll: null,
        selectedNumber: null,
        estimate: null,
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
    if (!digits || digits.length < 2) return '-';
    return `${digits[0]} & ${digits[1]}`;
}

function formatPlaceEstimate(value) {
    if (typeof value !== 'number' || Number.isNaN(value)) return '-';

    if (Math.abs(value - Math.round(value)) < 0.001) {
        return `${Math.round(value)}`;
    }

    return value.toFixed(1).replace(/\.0$/, '');
}

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
    return new Promise((resolve) => {
        const modal = $('#version-modal');
        const cancelBtn = $('#version-modal-cancel');
        const options = $$('.version-option');
        let closeModal = () => {};

        const cleanup = () => {
            options.forEach(o => o.removeEventListener('click', onPick));
            cancelBtn.removeEventListener('click', onCancel);
        };

        const finish = (value) => {
            closeModal('action');
            cleanup();
            resolve(value);
        };

        function onPick(e) {
            finish(e.currentTarget.dataset.version);
        }
        function onCancel() { finish(null); }

        options.forEach(o => o.addEventListener('click', onPick));
        cancelBtn.addEventListener('click', onCancel);
        closeModal = openModal(modal, {
            initialFocus: modal.querySelector('.version-option'),
            onDismiss: () => {
                cleanup();
                resolve(null);
            }
        });
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

function navigateToPlaceNumber() {
    showSection('place-number');
    resetPlaceNumberGame();
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
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').slice(1);

            mobileToggle?.setAttribute('aria-expanded', 'false');
            navMenu?.setAttribute('aria-expanded', 'false');

            if (targetId === 'fractions') {
                navigateToFractions();
                return;
            }

            if (targetId === 'decimats') {
                navigateToDecimats();
                return;
            }

            if (targetId === 'place-number') {
                navigateToPlaceNumber();
                return;
            }

            showSection(targetId);
        });
    });

    brandLink?.addEventListener('click', (e) => {
        e.preventDefault();
        mobileToggle?.setAttribute('aria-expanded', 'false');
        navMenu?.setAttribute('aria-expanded', 'false');
        showSection('home');
    });
}

function initPlayNowButtons() {
    $('.play-fractions-btn')?.addEventListener('click', () => navigateToFractions());
    $('.play-decimats-btn')?.addEventListener('click', () => navigateToDecimats());
    $('.play-place-number-btn')?.addEventListener('click', () => navigateToPlaceNumber());
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
            steps: [
                'Roll the two digit dice to get a pair of digits',
                'Choose which two-digit number you want to build from those digits',
                'Click or drag on the number line to estimate where that number belongs from 0 to 100',
                'Use the numbers already on the line as benchmarks for later rounds',
                'The run ends as soon as you place one number incorrectly, so the goal is to last longer than everyone else'
            ]
        }
    };

    function updateHowToPlay(target) {
        const content = HOW_TO_PLAY_CONTENT[target] || HOW_TO_PLAY_CONTENT.fractions;
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
    $('#reset-fractions-btn')?.addEventListener('click', resetFractionsGame);
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
    const feedback = $('#fraction-feedback');
    feedback.textContent = message;
    feedback.className = `feedback-message ${type}`;
    feedback.hidden = false;
}

function hideFeedback() {
    $('#fraction-feedback').hidden = true;
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

function addToFractionsTable(entry) {
    const tbody = $('#fractions-table tbody');
    if (!tbody) return;

    const row = document.createElement('tr');
    row.className = getHistoryResultClass(entry.result);

    row.innerHTML = `
        <td>${entry.round}</td>
        <td>${entry.target}</td>
        <td>${entry.selection}</td>
        <td>${entry.result}</td>
    `;
    tbody.prepend(row);
    const scrollContainer = tbody.closest('.history-scroll');
    if (scrollContainer) scrollContainer.scrollTop = 0;
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
    const feedback = $('#decimat-feedback');
    feedback.textContent = message;
    feedback.className = `feedback-message ${type}`;
    feedback.hidden = false;
}

function hideDecimatFeedback() {
    $('#decimat-feedback').hidden = true;
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
    const tbody = $('#decimats-table tbody');
    if (!tbody) return;

    const row = document.createElement('tr');
    row.className = getHistoryResultClass(entry.result);

    row.innerHTML = `
        <td>${entry.round}</td>
        <td>${entry.target}</td>
        <td>${entry.selection}</td>
        <td>${entry.total}</td>
        <td>${entry.result}</td>
    `;

    tbody.prepend(row);
    const scrollContainer = tbody.closest('.history-scroll');
    if (scrollContainer) scrollContainer.scrollTop = 0;
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
    $('#reset-decimats-btn')?.addEventListener('click', resetDecimatsGame);

    resetDecimatsGame();
}

// ============================================
// Place That Number Game
// ============================================

function showPlaceNumberFeedback(message, type) {
    const feedback = $('#place-number-feedback');
    feedback.textContent = message;
    feedback.className = `feedback-message ${type}`;
    feedback.hidden = false;
}

function hidePlaceNumberFeedback() {
    $('#place-number-feedback').hidden = true;
}

function getPlaceNumberRollOptions(leftDigit, rightDigit) {
    const placedValues = new Set(GameState.placeNumber.placedNumbers.map(marker => marker.value));
    const options = [leftDigit * 10 + rightDigit, rightDigit * 10 + leftDigit];

    return [...new Set(options)]
        .filter(value => value > 0 && value < 100 && !placedValues.has(value));
}

function generatePlaceNumberRoll() {
    for (let attempt = 0; attempt < 120; attempt++) {
        const leftDigit = pickRandomValue(PLACE_NUMBER_DIGIT_VALUES);
        const rightDigit = pickRandomValue(PLACE_NUMBER_DIGIT_VALUES);
        const options = getPlaceNumberRollOptions(leftDigit, rightDigit);

        if (options.length > 0) {
            return {
                digits: [leftDigit, rightDigit],
                options
            };
        }
    }

    return null;
}

function getPlaceNumberWindow(value) {
    const sortedMarkers = [...GameState.placeNumber.placedNumbers]
        .sort((a, b) => a.value - b.value);
    const anchors = [
        { value: 0, position: 0 },
        ...sortedMarkers.map(marker => ({ value: marker.value, position: marker.position })),
        { value: 100, position: 100 }
    ];

    let left = anchors[0];
    let right = anchors[anchors.length - 1];

    for (let i = 0; i < anchors.length - 1; i++) {
        if (anchors[i].value < value && value < anchors[i + 1].value) {
            left = anchors[i];
            right = anchors[i + 1];
            break;
        }
    }

    const valueGap = Math.max(1, right.value - left.value);
    const positionGap = Math.max(1, right.position - left.position);
    const ratio = (value - left.value) / valueGap;
    const expectedPosition = left.position + (ratio * positionGap);
    const tolerance = Math.min(
        Math.max(positionGap * 0.18, 3),
        Math.max(2, positionGap * 0.4)
    );

    return { left, right, expectedPosition, tolerance };
}

function describePlaceNumberWindow(value) {
    const { left, right } = getPlaceNumberWindow(value);

    if (left.value === 0 && right.value === 100) {
        return `${value} is using the whole 0 to 100 line. Look for halves, quarters, and tens.`;
    }

    return `${value} should sit between ${left.value} and ${right.value}. Use that gap as your benchmark.`;
}

function updatePlaceNumberGuidance() {
    const state = GameState.placeNumber;
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

    if (state.selectedNumber === null) {
        note.textContent = 'Choose one of the available numbers before you place a marker.';
        syncHintToggle(false);
        return;
    }

    const actionPrompt = state.estimate === null
        ? 'Click or drag on the line to place your marker.'
        : 'Drag on the line to adjust your marker before checking.';

    note.textContent = state.showHint
        ? `${describePlaceNumberWindow(state.selectedNumber)} ${actionPrompt}`
        : actionPrompt;

    syncHintToggle(true);
}

function getPlaceNumberMarkerLane(index) {
    return index % 2 === 0 ? 'upper' : 'lower';
}

function buildPlaceNumberMarker(marker, lane = 'upper', options = {}) {
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
    element.style.left = `${marker.position}%`;
    element.innerHTML = `
        <span class="place-marker-label">${marker.value}</span>
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

    const sortedMarkers = [...state.placedNumbers].sort((a, b) => a.value - b.value);
    sortedMarkers.forEach((marker, index) => {
        const lane = getPlaceNumberMarkerLane(index);
        markersLayer.appendChild(buildPlaceNumberMarker(marker, lane, {
            hideLabel: !state.isGameOver
        }));
    });

    if (state.currentRoll && state.selectedNumber !== null && state.estimate !== null) {
        const previewLane = getPlaceNumberMarkerLane(sortedMarkers.length);
        markersLayer.appendChild(buildPlaceNumberMarker({
            value: state.selectedNumber,
            position: state.estimate,
            preview: true
        }, previewLane));
    }

    if (state.isGameOver && state.failedPlacement) {
        const failedLane = getPlaceNumberMarkerLane(sortedMarkers.length);
        markersLayer.appendChild(buildPlaceNumberMarker(state.failedPlacement, failedLane));
    }

    line.classList.toggle('is-active', Boolean(state.currentRoll) && state.selectedNumber !== null && !state.isGameOver);
    line.classList.toggle('is-dragging', state.isDraggingEstimate);
}

function updatePlaceNumberHistoryVisibility() {
    const historyPanel = $('#place-history-panel');
    if (!historyPanel) return;

    historyPanel.hidden = !GameState.placeNumber.isGameOver;
}

function updatePlaceNumberBenchmarkGuides() {
    const line = $('#place-number-line');
    const labels = $('.place-number-labels');
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
    const buttons = $$('.place-option-btn');

    if (!card) return;

    const resetOptionButton = (button) => {
        if (!button) return;
        button.hidden = true;
        button.dataset.value = '';
        button.textContent = '';
        button.classList.remove('btn-primary');
        button.classList.add('btn-secondary');
    };

    if (!state.currentRoll) {
        card.hidden = true;
        buttons.forEach(resetOptionButton);
        return;
    }

    card.hidden = false;
    message.textContent = state.currentRoll.options.length === 1
        ? 'Only one new number is available from these digits.'
        : 'Choose the number that gives you the best benchmark.';

    buttons.forEach((button, index) => {
        if (!button) return;

        const optionValue = state.currentRoll.options[index];
        if (typeof optionValue !== 'number') {
            resetOptionButton(button);
            return;
        }

        button.hidden = false;
        button.dataset.value = String(optionValue);
        button.textContent = String(optionValue);
        const isSelected = state.selectedNumber === optionValue;
        button.classList.toggle('btn-primary', isSelected);
        button.classList.toggle('btn-secondary', !isSelected);
    });
}

function updatePlaceNumberActionState() {
    const state = GameState.placeNumber;
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
        const canPlaceMarker = hasActiveRoll && state.selectedNumber !== null;
        line.tabIndex = canPlaceMarker ? 0 : -1;
        line.setAttribute('aria-disabled', canPlaceMarker ? 'false' : 'true');
    }

    if (checkBtn) {
        checkBtn.disabled = !(hasActiveRoll && state.selectedNumber !== null && state.estimate !== null);
    }

    if (clearBtn) {
        clearBtn.disabled = state.estimate === null;
    }
}

function updatePlaceNumberDisplay() {
    const state = GameState.placeNumber;
    $('#place-round').textContent = state.round;
    $('#place-digits').textContent = state.currentRoll ? formatDigitRoll(state.currentRoll.digits) : '-';
    $('#place-selected-number').textContent = state.selectedNumber === null ? '-' : state.selectedNumber;
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
    const tbody = $('#place-number-table tbody');
    if (!tbody) return;

    const row = document.createElement('tr');
    row.className = getHistoryResultClass(entry.result);
    row.innerHTML = `
        <td>${entry.round}</td>
        <td>${entry.digits}</td>
        <td>${entry.number}</td>
        <td>${entry.estimate}</td>
        <td>${entry.result}</td>
    `;

    tbody.prepend(row);
    const scrollContainer = tbody.closest('.history-scroll');
    if (scrollContainer) scrollContainer.scrollTop = 0;
}

function setPlaceNumberDiceDisplay(leftValue, rightValue) {
    $('#place-dice-left .dice-face').textContent = leftValue;
    $('#place-dice-right .dice-face').textContent = rightValue;
}

function resetPlaceNumberDiceDisplay() {
    setPlaceNumberDiceDisplay('?', '?');
}

function resetPlaceNumberTurnState({ clearFailedPlacement = false } = {}) {
    const state = GameState.placeNumber;
    state.currentRoll = null;
    state.selectedNumber = null;
    state.estimate = null;
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
    state.selectedNumber = roll.options.length === 1 ? roll.options[0] : null;
}

function setPlaceNumberEstimate(value) {
    const state = GameState.placeNumber;
    if (!state.currentRoll || state.selectedNumber === null || state.isGameOver) return;

    const normalized = Math.round(clampNumber(value, 0, 100) * 2) / 2;
    state.estimate = normalized;
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
    state.estimate = null;
    updatePlaceNumberDisplay();
}

function setPlaceNumberEstimateFromClientX(line, clientX) {
    if (!line) return;
    const surface = line.querySelector('.place-number-line-inner') || line;
    const rect = surface.getBoundingClientRect();
    if (rect.width <= 0) return;

    const ratio = clampNumber((clientX - rect.left) / rect.width, 0, 1);
    setPlaceNumberEstimate(ratio * 100);
}

function handlePlaceNumberLinePointerDown(event) {
    const state = GameState.placeNumber;
    if (!state.currentRoll || state.isGameOver) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    if (state.selectedNumber === null) {
        showPlaceNumberFeedback('Choose one of the two numbers first, then place your marker on the line.', 'info');
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
    if (!state.currentRoll || state.selectedNumber === null || state.isGameOver) return;

    const step = event.shiftKey ? 5 : 0.5;
    const currentEstimate = state.estimate ?? 50;
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
            nextEstimate = 100;
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
    if (!state.currentRoll || state.selectedNumber === null || state.isGameOver) return;

    state.showHint = !state.showHint;
    updatePlaceNumberGuidance();
}

function selectPlaceNumberOption(value) {
    const state = GameState.placeNumber;
    if (!state.currentRoll || state.isGameOver) return;

    state.selectedNumber = value;
    updatePlaceNumberDisplay();
}

function evaluatePlaceNumberPlacement(value, estimate) {
    const windowData = getPlaceNumberWindow(value);
    const insideInterval = estimate > windowData.left.position && estimate < windowData.right.position;
    const difference = Math.abs(estimate - windowData.expectedPosition);

    if (insideInterval && difference <= windowData.tolerance) {
        return {
            isCorrect: true,
            message: `Placed! ${value} sits well on your line and now becomes a new benchmark.`,
            windowData
        };
    }

    if (!insideInterval) {
        return {
            isCorrect: false,
            message: `${value} needs to sit between ${windowData.left.value} and ${windowData.right.value}. Keep your marker inside that gap.`,
            windowData
        };
    }

    const direction = estimate < windowData.expectedPosition ? 'a little farther right' : 'a little farther left';
    return {
        isCorrect: false,
        message: `${value} belongs between ${windowData.left.value} and ${windowData.right.value}. Try moving your marker ${direction}.`,
        windowData
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
        loseReason: 'The first inaccurate placement ended the run. Compare how many numbers you can place before a miss.',
        statsItems: [
            { className: 'correct', value: state.stats.correct, label: 'Placed' },
            { className: 'skipped', value: state.placedNumbers.length + 2, label: 'Benchmarks' },
            { className: 'accuracy', value: `${accuracy}%`, label: 'Accuracy' }
        ]
    });
}

function checkPlaceNumberPlacement() {
    const state = GameState.placeNumber;
    if (!state.currentRoll || state.selectedNumber === null || state.estimate === null || state.isGameOver) return;

    const roll = state.currentRoll;
    const estimateLabel = formatPlaceEstimate(state.estimate);
    const evaluation = evaluatePlaceNumberPlacement(state.selectedNumber, state.estimate);

    if (evaluation.isCorrect) {
        state.placedNumbers.push({
            value: state.selectedNumber,
            position: state.estimate
        });
        state.stats.correct++;

        addToPlaceNumberTable({
            round: state.round,
            digits: formatDigitRoll(roll.digits),
            number: state.selectedNumber,
            estimate: estimateLabel,
            result: 'Correct'
        });

        showPlaceNumberFeedback(evaluation.message, 'success');

        advancePlaceNumberRound();
        return;
    }

    state.stats.incorrect++;
    state.failedPlacement = {
        value: state.selectedNumber,
        position: state.estimate,
        failed: true
    };
    addToPlaceNumberTable({
        round: state.round,
        digits: formatDigitRoll(roll.digits),
        number: state.selectedNumber,
        estimate: estimateLabel,
        result: 'Incorrect'
    });

    showPlaceNumberFeedback(evaluation.message, 'error');
    endPlaceNumberGame(false);
}

function rollPlaceNumberDice() {
    const state = GameState.placeNumber;
    if (state.isGameOver || state.currentRoll) return;

    const leftDie = $('#place-dice-left');
    const rightDie = $('#place-dice-right');

    leftDie.classList.add('rolling');
    rightDie.classList.add('rolling');
    $('#roll-place-number-btn').disabled = true;

    setTimeout(() => {
        const roll = generatePlaceNumberRoll();

        leftDie.classList.remove('rolling');
        rightDie.classList.remove('rolling');

        if (!roll) {
            endPlaceNumberGame(true);
            return;
        }

        startPlaceNumberTurn(roll);

        setPlaceNumberDiceDisplay(roll.digits[0], roll.digits[1]);

        updatePlaceNumberDisplay();

        const availableNumbers = roll.options.join(' or ');
        showPlaceNumberFeedback(
            roll.options.length === 1
                ? `Only ${availableNumbers} is still available from these digits. Place it on the line.`
                : `Choose ${availableNumbers}, then place your number on the line.`,
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
    state.isGameOver = false;
    state.stats = { correct: 0, incorrect: 0 };

    const tbody = $('#place-number-table tbody');
    if (tbody) tbody.innerHTML = '';

    resetPlaceNumberDiceDisplay();
    hidePlaceNumberFeedback();
    updatePlaceNumberDisplay();
}

function initPlaceNumberGame() {
    $('#roll-place-number-btn')?.addEventListener('click', rollPlaceNumberDice);
    $('#check-place-number-btn')?.addEventListener('click', checkPlaceNumberPlacement);
    $('#clear-place-marker-btn')?.addEventListener('click', clearPlaceNumberMarker);
    $('#place-hint-toggle')?.addEventListener('click', togglePlaceNumberHint);
    $('#reset-place-number-btn')?.addEventListener('click', resetPlaceNumberGame);
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

    $$('.place-option-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const value = parseInt(event.currentTarget.dataset.value, 10);
            if (!Number.isNaN(value)) {
                selectPlaceNumberOption(value);
            }
        });
    });

    resetPlaceNumberGame();
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
