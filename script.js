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
        stats: { correct: 0, incorrect: 0, missed: 0 }
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
const DEFAULT_DECIMAT_PLACE_DICE = [10, 100, 100, 1000, 1000, 1000];
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

// ============================================
// Local Storage
// ============================================

const STORAGE_KEYS = {
    fractionIntDice: 'mathgames_fraction_int_dice',
    fractionFracDice: 'mathgames_fraction_frac_dice',
    decimatIntDice: 'mathgames_decimat_int_dice',
    decimatPlaceDice: 'mathgames_decimat_place_dice'
};

const FRACTION_DICE_FACE_COUNT = 6;
const DECIMAT_DICE_FACE_COUNT = 6;

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

function saveFractionCustomDice() {
    try {
        localStorage.setItem(STORAGE_KEYS.fractionIntDice, JSON.stringify(GameState.fractions.customIntDice));
        localStorage.setItem(STORAGE_KEYS.fractionFracDice, JSON.stringify(GameState.fractions.customFracDice));
        return true;
    } catch (e) {
        console.error('Error saving dice settings:', e);
        return false;
    }
}

function saveDecimatCustomDice() {
    try {
        localStorage.setItem(STORAGE_KEYS.decimatIntDice, JSON.stringify(GameState.decimats.customIntDice));
        localStorage.setItem(STORAGE_KEYS.decimatPlaceDice, JSON.stringify(GameState.decimats.customPlaceDice));
        return true;
    } catch (e) {
        console.error('Error saving decimat dice settings:', e);
        return false;
    }
}

function loadFractionCustomDice() {
    try {
        const intDice = localStorage.getItem(STORAGE_KEYS.fractionIntDice);
        const fracDice = localStorage.getItem(STORAGE_KEYS.fractionFracDice);

        if (intDice) {
            const parsedIntDice = JSON.parse(intDice);
            if (isValidDiceArray(parsedIntDice, FRACTION_DICE_FACE_COUNT, value => Number.isInteger(value) && value >= 1 && value <= 6)) {
                GameState.fractions.customIntDice = parsedIntDice;
            }
        }

        if (fracDice) {
            const parsedFracDice = JSON.parse(fracDice);
            if (isValidDiceArray(parsedFracDice, FRACTION_DICE_FACE_COUNT, value => FRACTION_DENOMINATOR_OPTIONS.includes(value))) {
                GameState.fractions.customFracDice = parsedFracDice;
            }
        }
    } catch (e) {
        console.error('Error loading fraction dice settings:', e);
    }
}

function loadDecimatCustomDice() {
    try {
        const intDice = localStorage.getItem(STORAGE_KEYS.decimatIntDice);
        const placeDice = localStorage.getItem(STORAGE_KEYS.decimatPlaceDice);

        if (intDice) {
            const parsedIntDice = JSON.parse(intDice);
            if (isValidDiceArray(parsedIntDice, DECIMAT_DICE_FACE_COUNT, value => Number.isInteger(value) && value >= 1 && value <= 6)) {
                GameState.decimats.customIntDice = parsedIntDice;
            }
        }

        if (placeDice) {
            const parsedPlaceDice = JSON.parse(placeDice);
            if (isValidDiceArray(parsedPlaceDice, DECIMAT_DICE_FACE_COUNT, value => DEFAULT_DECIMAT_PLACE_DICE.includes(value))) {
                GameState.decimats.customPlaceDice = parsedPlaceDice;
            }
        }
    } catch (e) {
        console.error('Error loading decimat dice settings:', e);
    }
}

function loadCustomDice() {
    loadFractionCustomDice();
    loadDecimatCustomDice();
}

function resetFractionCustomDice() {
    localStorage.removeItem(STORAGE_KEYS.fractionIntDice);
    localStorage.removeItem(STORAGE_KEYS.fractionFracDice);
    const v = VERSIONS[currentVersion] || VERSIONS.proper;
    GameState.fractions.customIntDice = [...v.intDice];
    GameState.fractions.customFracDice = [...v.fracDice];
}

function resetDecimatCustomDice() {
    localStorage.removeItem(STORAGE_KEYS.decimatIntDice);
    localStorage.removeItem(STORAGE_KEYS.decimatPlaceDice);
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

        modal.hidden = false;
        modal.querySelector('.version-option').focus();

        function cleanup() {
            modal.hidden = true;
            options.forEach(o => o.removeEventListener('click', onPick));
            cancelBtn.removeEventListener('click', onCancel);
            modal.removeEventListener('click', onBackdrop);
            document.removeEventListener('keydown', onEscape);
        }

        function onPick(e) {
            cleanup();
            resolve(e.currentTarget.dataset.version);
        }
        function onCancel() { cleanup(); resolve(null); }
        function onBackdrop(e) { if (e.target === modal) { cleanup(); resolve(null); } }
        function onEscape(e) { if (e.key === 'Escape') { cleanup(); resolve(null); } }

        options.forEach(o => o.addEventListener('click', onPick));
        cancelBtn.addEventListener('click', onCancel);
        modal.addEventListener('click', onBackdrop);
        document.addEventListener('keydown', onEscape);
    });
}

function applyVersion(version) {
    currentVersion = version;
    const v = VERSIONS[version];

    GameState.fractions.customIntDice = [...v.intDice];
    GameState.fractions.customFracDice = [...v.fracDice];

    localStorage.removeItem(STORAGE_KEYS.fractionIntDice);
    localStorage.removeItem(STORAGE_KEYS.fractionFracDice);

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
    const sections = $$('.section');
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

            showSection(targetId);
        });
    });
}

function initPlayNowButtons() {
    $('.play-fractions-btn')?.addEventListener('click', () => navigateToFractions());
    $('.play-decimats-btn')?.addEventListener('click', () => navigateToDecimats());
}

function initHowToPlay() {
    const triggers = $$('[data-how-to-play-target]');
    const modal = $('#how-to-play-modal');
    const title = $('#how-to-play-title');
    const list = $('#how-to-play-list');
    const closeBtn = $('#how-to-play-close');
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
                'If the roll is larger than the remaining space, the round counts as a missed turn'
            ]
        }
    };

    const closeModal = () => { modal.hidden = true; document.removeEventListener('keydown', onEscape); };

    function onEscape(e) {
        if (e.key === 'Escape') closeModal();
    }

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
            modal.hidden = false;
            closeBtn?.focus();
            document.addEventListener('keydown', onEscape);
        });
    });

    closeBtn?.addEventListener('click', closeModal);
    modal?.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
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
    const panels = {
        fractions: $('#fractions-custom-dice-panel'),
        decimats: $('#decimats-custom-dice-panel')
    };
    const saveBtn = $('#save-fraction-dice');
    const resetBtn = $('#reset-fraction-dice');
    const errorMsg = $('#fraction-dice-error');
    const decimatSaveBtn = $('#save-decimat-dice');
    const decimatResetBtn = $('#reset-decimat-dice');
    const decimatErrorMsg = $('#decimat-dice-error');

    const closeModal = () => {
        modal.hidden = true;
        document.removeEventListener('keydown', onEscape);
    };
    function onEscape(e) { if (e.key === 'Escape') closeModal(); }

    function showCustomDicePanel(target) {
        const panelKey = target === 'decimats' ? 'decimats' : 'fractions';
        Object.entries(panels).forEach(([key, panel]) => {
            if (!panel) return;
            panel.hidden = key !== panelKey;
        });

        if (panelKey === 'decimats') {
            title.textContent = 'Custom Dice Settings: Colour in Decimats';
            if (subtitle) subtitle.textContent = 'Adjust the number die and place-value die faces for the Decimats game.';
        } else {
            title.textContent = 'Custom Dice Settings: Colour in Fractions';
            if (subtitle) subtitle.textContent = 'Adjust the number die and fraction die faces for the Fractions game.';
        }
    }

    triggers.forEach(trigger => {
        trigger.addEventListener('click', () => {
            showCustomDicePanel(trigger.dataset.diceConfigTarget);
            modal.hidden = false;
            closeBtn?.focus();
            document.addEventListener('keydown', onEscape);
        });
    });
    closeBtn?.addEventListener('click', closeModal);
    modal?.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    populateFractionDiceInputs();
    populateDecimatDiceInputs();
    showCustomDicePanel('fractions');

    saveBtn?.addEventListener('click', () => {
        if (!validateFractionDice()) return;

        const intValues = [];
        const fracValues = [];
        forEachFractionDiceFace(({ intInput, fracSelect }) => {
            intValues.push(parseInt(intInput.value, 10));
            fracValues.push(parseInt(fracSelect.value, 10));
        });

        GameState.fractions.customIntDice = intValues;
        GameState.fractions.customFracDice = fracValues;

        if (saveFractionCustomDice()) {
            showDiceMessage(errorMsg, 'Dice settings saved successfully!', true);
        } else {
            showDiceMessage(errorMsg, 'Error saving dice settings. Please try again.', false, false);
        }
    });

    resetBtn?.addEventListener('click', () => {
        resetFractionCustomDice();
        populateFractionDiceInputs();
        showDiceMessage(errorMsg, 'Dice settings reset to default!', true);
    });

    decimatSaveBtn?.addEventListener('click', () => {
        if (!validateDecimatDice()) return;

        const intValues = [];
        const placeValues = [];
        forEachDecimatDiceFace(({ intInput, placeSelect }) => {
            intValues.push(parseInt(intInput.value, 10));
            placeValues.push(parseInt(placeSelect.value, 10));
        });

        GameState.decimats.customIntDice = intValues;
        GameState.decimats.customPlaceDice = placeValues;

        if (saveDecimatCustomDice()) {
            showDiceMessage(decimatErrorMsg, 'Dice settings saved successfully!', true);
        } else {
            showDiceMessage(decimatErrorMsg, 'Error saving dice settings. Please try again.', false, false);
        }
    });

    decimatResetBtn?.addEventListener('click', () => {
        resetDecimatCustomDice();
        populateDecimatDiceInputs();
        showDiceMessage(decimatErrorMsg, 'Dice settings reset to default!', true);
    });

    forEachFractionDiceFace(({ intInput: input }) => {
        input?.addEventListener('input', () => validateIntegerInput(input, 1, 6));
    });

    forEachDecimatDiceFace(({ intInput: input }) => {
        input?.addEventListener('input', () => validateIntegerInput(input, 1, 6));
    });
}

function showDiceMessage(el, text, autoHide, isSuccess = true) {
    if (!el) return;

    el.textContent = text;
    el.style.color = isSuccess ? 'var(--color-success, #10b981)' : 'var(--color-error, #ef4444)';
    el.hidden = false;
    if (autoHide) {
        setTimeout(() => { el.hidden = true; el.style.color = ''; }, 2000);
    }
}

function populateFractionDiceInputs() {
    forEachFractionDiceFace(({ face, intInput, fracSelect }) => {
        if (intInput) intInput.value = GameState.fractions.customIntDice[face - 1];
        if (fracSelect) fracSelect.value = GameState.fractions.customFracDice[face - 1];
    });
}

function populateDecimatDiceInputs() {
    forEachDecimatDiceFace(({ face, intInput, placeSelect }) => {
        if (intInput) intInput.value = GameState.decimats.customIntDice[face - 1];
        if (placeSelect) placeSelect.value = GameState.decimats.customPlaceDice[face - 1];
    });
}

function validateFractionDice() {
    const errorMsg = $('#fraction-dice-error');
    let invalidFace = null;

    forEachFractionDiceFace(({ face, intInput }) => {
        if (invalidFace) return;

        const value = parseInt(intInput.value, 10);
        if (isNaN(value) || value < 1 || value > 6) {
            invalidFace = { face, input: intInput };
        }
    });

    if (invalidFace) {
        showDiceMessage(errorMsg, `Face ${invalidFace.face}: Integer dice must be between 1 and 6.`, false, false);
        invalidFace.input.focus();
        return false;
    }

    errorMsg.hidden = true;
    errorMsg.style.color = '';
    return true;
}

function validateDecimatDice() {
    const errorMsg = $('#decimat-dice-error');
    let invalidFace = null;
    let invalidPlaceFace = null;

    forEachDecimatDiceFace(({ face, intInput, placeSelect }) => {
        if (invalidFace || invalidPlaceFace) return;

        const intValue = parseInt(intInput.value, 10);
        if (isNaN(intValue) || intValue < 1 || intValue > 6) {
            invalidFace = { face, input: intInput };
            return;
        }

        const placeValue = parseInt(placeSelect.value, 10);
        if (![10, 100, 1000].includes(placeValue)) {
            invalidPlaceFace = { face, input: placeSelect };
        }
    });

    if (invalidFace) {
        showDiceMessage(errorMsg, `Face ${invalidFace.face}: Number die values must be between 1 and 6.`, false, false);
        invalidFace.input.focus();
        return false;
    }

    if (invalidPlaceFace) {
        showDiceMessage(errorMsg, `Face ${invalidPlaceFace.face}: Choose 1/10, 1/100, or 1/1000 for the place-value die.`, false, false);
        invalidPlaceFace.input.focus();
        return false;
    }

    errorMsg.hidden = true;
    errorMsg.style.color = '';
    return true;
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

    modal.hidden = false;
    playAgainBtn.focus();

    const closeModal = () => {
        modal.hidden = true;
        fireworks.innerHTML = '';
        playAgainBtn.onclick = null;
        closeBtn.onclick = null;
        modal.removeEventListener('click', handleBackdrop);
        document.removeEventListener('keydown', handleEscape);
    };

    const handleBackdrop = (e) => {
        if (e.target === modal) closeModal();
    };

    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            closeModal();
        }
    };

    playAgainBtn.onclick = () => { closeModal(); onPlayAgain(); };
    closeBtn.onclick = closeModal;
    modal.addEventListener('click', handleBackdrop);
    document.addEventListener('keydown', handleEscape);
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

function showSkipConfirmModal(onConfirm) {
    const modal = $('#skip-confirm-modal');
    const yesBtn = $('#skip-confirm-yes');
    const cancelBtn = $('#skip-confirm-cancel');

    modal.hidden = false;
    cancelBtn.focus();

    const closeModal = () => {
        modal.hidden = true;
        yesBtn.onclick = null;
        cancelBtn.onclick = null;
        document.removeEventListener('keydown', onEscape);
    };

    function onEscape(e) {
        if (e.key === 'Escape') closeModal();
    }

    yesBtn.onclick = () => {
        closeModal();
        onConfirm();
    };
    cancelBtn.onclick = closeModal;
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', onEscape);
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
    state.round++;
    state.currentRoll = null;
    state.selectedCells = [];
    state.isSelecting = false;

    $('#fraction-action-buttons').hidden = true;
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

function addToFractionsTable(entry) {
    const tbody = $('#fractions-table tbody');
    if (!tbody) return;

    const row = document.createElement('tr');
    if (entry.result === 'Correct') row.className = 'result-correct';
    else if (entry.result === 'Incorrect') row.className = 'result-incorrect';
    else if (entry.result === 'Skipped (Possible)') row.className = 'result-skipped-possible';
    else row.className = 'result-skipped';

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
    $('#decimat-missed-count').textContent = stats.missed;
}

function addToDecimatsTable(entry) {
    const tbody = $('#decimats-table tbody');
    if (!tbody) return;

    const row = document.createElement('tr');
    if (entry.result === 'Correct') row.className = 'result-correct';
    else if (entry.result === 'Incorrect') row.className = 'result-incorrect';
    else row.className = 'result-skipped';

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
    state.stats = { correct: 0, incorrect: 0, missed: 0 };

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

function clearPendingDecimatRoll() {
    const state = GameState.decimats;
    state.currentRoll = null;
    state.selectedCellIds = [];
    state.isSelecting = false;
    state.attemptsLeft = 3;
    resetDecimatDiceDisplay();
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
    const remainingUnits = 1000 - state.totalUnits;

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

        if (state.currentRoll.units > remainingUnits) {
            state.stats.missed++;
            addToDecimatsTable({
                round: state.round,
                target: `${state.currentRoll.fractionDisplay} (${state.currentRoll.decimalDisplay})`,
                selection: '-',
                total: formatDecimalFromUnits(state.totalUnits, 3, true),
                result: 'Missed Turn'
            });
            updateDecimatStatsDisplay();
            showDecimatFeedback(
                `${state.currentRoll.decimalDisplay} is greater than the remaining ${formatDecimalFromUnits(remainingUnits, 3, true)}. This round is a missed turn.`,
                'warning'
            );
            nextDecimatRound();
            return;
        }

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
            { className: 'skipped', value: state.stats.missed, label: 'Missed' },
            { className: 'accuracy', value: `${accuracy}%`, label: 'Accuracy' }
        ]
    });
}

function nextDecimatRound() {
    if (GameState.decimats.totalUnits >= 1000) {
        endDecimatsGame(true);
        return;
    }

    if (!hasAnyPossibleDecimatRoll()) {
        endDecimatsGame(false);
        return;
    }

    GameState.decimats.round += 1;
    clearPendingDecimatRoll();
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

function initDecimatsGame() {
    $('#roll-decimat-btn')?.addEventListener('click', rollDecimatDice);
    $('#check-decimat-btn')?.addEventListener('click', checkDecimatResult);
    $('#clear-decimat-selection-btn')?.addEventListener('click', () => clearDecimatSelection());
    $('#reset-decimats-btn')?.addEventListener('click', resetDecimatsGame);

    resetDecimatsGame();
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
});
