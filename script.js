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
            { denominator: 2, cells: 2 },
            { denominator: 3, cells: 3 },
            { denominator: 4, cells: 4 },
            { denominator: 5, cells: 5 },
            { denominator: 6, cells: 6 },
            { denominator: 8, cells: 8 },
            { denominator: 10, cells: 10 },
            { denominator: 12, cells: 12 }
        ]
    },
    improper: {
        label: 'With Improper Fractions',
        intDice: [1, 2, 2, 3, 3, 4],
        fracDice: [2, 3, 4, 6, 8, 12],
        wallRows: [
            { denominator: 2, cells: 2 },
            { denominator: 3, cells: 3 },
            { denominator: 4, cells: 4 },
            { denominator: 6, cells: 6 },
            { denominator: 8, cells: 8 },
            { denominator: 12, cells: 12 }
        ]
    }
};

let currentVersion = 'proper';

const FEEDBACK_HIDE_DELAY_MS = 2000;
const DICE_ROLL_DURATION_MS = 500;
// 120 is the least common multiple of all supported denominators.
const FRACTION_UNIT_SCALE = 120;

const BACKGROUND_DECOR_ICONS = [
    '2797', // divide
    '1F7F0', // heavy equals sign
    '267E', // infinity
    '2716', // multiply
    '2795', // plus
    '2796', // minus
    '1F3B2', // game die
    '1F3AE', // video game
    '1F579', // joystick
    '1F9E9', // puzzle piece
    '1F9F8', // teddy bear
    '1F4CF', // straight ruler
    '1F4D0' // triangular ruler
];

const BACKGROUND_DECOR_COUNT = 16;
const RESULT_ROW_CLASS_NAMES = {
    Correct: 'result-correct',
    Incorrect: 'result-incorrect',
    'Skipped (Possible)': 'result-skipped-possible',
    'Skipped (Impossible)': 'result-skipped'
};

// Sync initial dice values from default version
GameState.fractions.customIntDice = [...VERSIONS.proper.intDice];
GameState.fractions.customFracDice = [...VERSIONS.proper.fracDice];

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

function fractionToUnits(numerator, denominator) {
    return Math.round((numerator * FRACTION_UNIT_SCALE) / denominator);
}

function formatFractionValue(units) {
    return (units / FRACTION_UNIT_SCALE).toFixed(3);
}

function setFracDiceDisplay(numerator, denominator) {
    const num = $('#fraction-dice .frac-num');
    const den = $('#fraction-dice .frac-den');
    if (num) num.textContent = numerator;
    if (den) den.textContent = denominator;
}

function getFractionCell(rowIndex, cellIndex) {
    return $(`.fraction-cell[data-row="${rowIndex}"][data-cell="${cellIndex}"]`);
}

function formatSelectedCells(cells) {
    const counts = new Map();
    cells.forEach(item => {
        const cell = getFractionCell(item.row, item.cell);
        if (!cell) return;
        const denom = parseInt(cell.dataset.denominator, 10);
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

function createEmptyFractionStats() {
    return { correct: 0, incorrect: 0, skipped: 0, skippedPossible: 0 };
}

function getCurrentVersionConfig() {
    return VERSIONS[currentVersion] || VERSIONS.proper;
}

function clearFractionDiceStorage() {
    localStorage.removeItem(STORAGE_KEYS.fractionIntDice);
    localStorage.removeItem(STORAGE_KEYS.fractionFracDice);
}

function addModalDismissHandlers(modal, onDismiss) {
    function handleBackdrop(e) {
        if (e.target === modal) onDismiss();
    }

    function handleEscape(e) {
        if (e.key === 'Escape') onDismiss();
    }

    modal.addEventListener('click', handleBackdrop);
    document.addEventListener('keydown', handleEscape);

    return () => {
        modal.removeEventListener('click', handleBackdrop);
        document.removeEventListener('keydown', handleEscape);
    };
}

function bindModalTrigger({ trigger, modal, closeButtons = [], initialFocus = null }) {
    let cleanupDismissHandlers = () => {};

    const closeModal = () => {
        modal.hidden = true;
        cleanupDismissHandlers();
        cleanupDismissHandlers = () => {};
    };

    const openModal = () => {
        cleanupDismissHandlers();
        modal.hidden = false;
        initialFocus?.focus();
        cleanupDismissHandlers = addModalDismissHandlers(modal, closeModal);
    };

    trigger?.addEventListener('click', openModal);
    closeButtons.forEach(button => button?.addEventListener('click', closeModal));

    return { openModal, closeModal };
}

function shuffleArray(values) {
    const copy = [...values];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

function initBackgroundDecor() {
    const decor = $('#background-decor');
    if (!decor) return;

    const pool = [];
    while (pool.length < BACKGROUND_DECOR_COUNT) {
        pool.push(...BACKGROUND_DECOR_ICONS);
    }

    const icons = shuffleArray(pool).slice(0, BACKGROUND_DECOR_COUNT);
    decor.innerHTML = '';

    icons.forEach((code) => {
        const cell = document.createElement('span');
        cell.className = 'background-decor-cell';
        cell.style.setProperty('--decor-rotate', `${Math.round((Math.random() * 16) - 8)}deg`);
        cell.style.setProperty('--decor-scale', (0.88 + Math.random() * 0.28).toFixed(2));
        cell.style.setProperty('--decor-shift-x', `${Math.round((Math.random() * 22) - 11)}px`);
        cell.style.setProperty('--decor-shift-y', `${Math.round((Math.random() * 18) - 9)}px`);

        const img = document.createElement('img');
        img.className = 'background-decor-icon';
        img.alt = '';
        // OpenMoji background decor icon, see BACKGROUND_DECOR_ICONS comments above.
        img.src = `https://raw.githubusercontent.com/hfg-gmuend/openmoji/master/color/svg/${code}.svg`;

        cell.appendChild(img);
        decor.appendChild(cell);
    });
}

// ============================================
// Local Storage
// ============================================

const STORAGE_KEYS = {
    fractionIntDice: 'mathgames_fraction_int_dice',
    fractionFracDice: 'mathgames_fraction_frac_dice'
};

const FRACTION_DICE_FACE_COUNT = 6;

function forEachFractionDiceFace(callback) {
    for (let face = 1; face <= FRACTION_DICE_FACE_COUNT; face++) {
        callback({
            face,
            intInput: $(`#frac-int-${face}`),
            fracSelect: $(`#frac-denom-${face}`)
        });
    }
}

function pickRandomValue(values) {
    return values[Math.floor(Math.random() * values.length)];
}

function saveCustomDice() {
    try {
        localStorage.setItem(STORAGE_KEYS.fractionIntDice, JSON.stringify(GameState.fractions.customIntDice));
        localStorage.setItem(STORAGE_KEYS.fractionFracDice, JSON.stringify(GameState.fractions.customFracDice));
        return true;
    } catch (e) {
        console.error('Error saving dice settings:', e);
        return false;
    }
}

function loadCustomDice() {
    try {
        const intDice = localStorage.getItem(STORAGE_KEYS.fractionIntDice);
        const fracDice = localStorage.getItem(STORAGE_KEYS.fractionFracDice);
        if (intDice) GameState.fractions.customIntDice = JSON.parse(intDice);
        if (fracDice) GameState.fractions.customFracDice = JSON.parse(fracDice);
    } catch (e) {
        console.error('Error loading dice settings:', e);
    }
}

function resetCustomDice() {
    clearFractionDiceStorage();
    const v = getCurrentVersionConfig();
    GameState.fractions.customIntDice = [...v.intDice];
    GameState.fractions.customFracDice = [...v.fracDice];
}

// ============================================
// Version Picker
// ============================================

function showVersionPicker() {
    return new Promise((resolve) => {
        const modal = $('#version-modal');
        const cancelBtn = $('#version-modal-cancel');
        const options = $$('.version-option');
        let cleanupDismissHandlers = () => {};

        modal.hidden = false;
        modal.querySelector('.version-option')?.focus();

        function cleanup() {
            modal.hidden = true;
            cleanupDismissHandlers();
            cleanupDismissHandlers = () => {};
            options.forEach(o => o.removeEventListener('click', onPick));
            cancelBtn.removeEventListener('click', onCancel);
        }

        function onPick(e) {
            cleanup();
            resolve(e.currentTarget.dataset.version);
        }
        function onCancel() { cleanup(); resolve(null); }

        options.forEach(o => o.addEventListener('click', onPick));
        cancelBtn.addEventListener('click', onCancel);
        cleanupDismissHandlers = addModalDismissHandlers(modal, onCancel);
    });
}

function applyVersion(version) {
    currentVersion = version;
    const v = getCurrentVersionConfig();

    GameState.fractions.customIntDice = [...v.intDice];
    GameState.fractions.customFracDice = [...v.fracDice];

    clearFractionDiceStorage();

    createFractionWall();
    resetFractionsGame();
    populateFractionDiceInputs();

    const subtitle = version === 'improper' ? '(With Improper Fractions)' : '(Without Improper Fractions)';
    $('#fractions-title').textContent = `Colour in Fractions ${subtitle}`;
}

async function navigateToFractions() {
    const version = await showVersionPicker();
    if (!version) return;

    const navLinks = $$('.nav-link');
    const sections = $$('.section');

    navLinks.forEach(l => l.classList.remove('active'));
    const fractionsNav = $('.nav-link[href="#fractions"]');
    if (fractionsNav) fractionsNav.classList.add('active');

    sections.forEach(section => { section.hidden = section.id !== 'fractions'; });
    window.scrollTo(0, 0);

    applyVersion(version);
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

            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            sections.forEach(section => { section.hidden = section.id !== targetId; });
            window.scrollTo(0, 0);
        });
    });
}

function initPlayNowButtons() {
    $('.play-fractions-btn')?.addEventListener('click', () => navigateToFractions());
}

function initHowToPlay() {
    const trigger = $('#how-to-play-trigger');
    const modal = $('#how-to-play-modal');
    const closeBtn = $('#how-to-play-close');
    bindModalTrigger({
        trigger,
        modal,
        closeButtons: [closeBtn],
        initialFocus: closeBtn
    });
}

// ============================================
// Custom Dice UI
// ============================================

function initCustomDiceUI() {
    loadCustomDice();

    const trigger = $('#custom-dice-trigger');
    const modal = $('#custom-dice-modal');
    const closeBtn = $('#custom-dice-close');
    const saveBtn = $('#save-fraction-dice');
    const resetBtn = $('#reset-fraction-dice');
    const errorMsg = $('#fraction-dice-error');
    bindModalTrigger({
        trigger,
        modal,
        closeButtons: [closeBtn],
        initialFocus: closeBtn
    });

    populateFractionDiceInputs();

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

        if (saveCustomDice()) {
            showDiceMessage(errorMsg, 'Dice settings saved successfully!', true);
        } else {
            errorMsg.textContent = 'Error saving dice settings. Please try again.';
            errorMsg.hidden = false;
        }
    });

    resetBtn?.addEventListener('click', () => {
        resetCustomDice();
        populateFractionDiceInputs();
        showDiceMessage(errorMsg, 'Dice settings reset to default!', true);
    });

    forEachFractionDiceFace(({ intInput: input }) => {
        input?.addEventListener('input', () => validateIntegerInput(input, 1, 6));
    });
}

function showDiceMessage(el, text, autoHide) {
    el.textContent = text;
    el.style.color = 'var(--color-success, #10b981)';
    el.hidden = false;
    if (autoHide) {
        setTimeout(() => { el.hidden = true; el.style.color = ''; }, FEEDBACK_HIDE_DELAY_MS);
    }
}

function populateFractionDiceInputs() {
    forEachFractionDiceFace(({ face, intInput, fracSelect }) => {
        if (intInput) intInput.value = GameState.fractions.customIntDice[face - 1];
        if (fracSelect) fracSelect.value = GameState.fractions.customFracDice[face - 1];
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
        errorMsg.textContent = `Face ${invalidFace.face}: Integer dice must be between 1 and 6.`;
        errorMsg.hidden = false;
        invalidFace.input.focus();
        return false;
    }

    errorMsg.hidden = true;
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

function showEndModal({ isWin, stats, roundsPlayed, onPlayAgain }) {
    const modal = $('#game-modal');
    const inner = $('#modal-inner');
    const fireworks = $('#fireworks-container');
    const icon = $('#modal-icon');
    const title = $('#modal-title');
    const statsEl = $('#modal-stats');
    const playAgainBtn = $('#modal-play-again');
    const closeBtn = $('#modal-close');
    let cleanupDismissHandlers = () => {};

    inner.classList.remove('modal-win', 'modal-lose');
    fireworks.hidden = true;
    fireworks.innerHTML = '';

    const totalAttempts = stats.correct + stats.incorrect;
    const accuracy = totalAttempts > 0 ? Math.round((stats.correct / totalAttempts) * 100) : 0;

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
        icon.textContent = 'Victory';
        title.textContent = 'Fraction Wall Complete';
    } else {
        inner.classList.add('modal-lose');
        icon.textContent = 'Round Ended';
        title.textContent = 'No Moves Left';
    }

    statsEl.innerHTML = `
        <div class="modal-summary">
            <p class="modal-reason">${isWin
                ? 'You filled the entire fraction wall and cleared every possible space.'
                : 'No more fractions can be made with the bars that remain.'}</p>
            <p class="modal-rounds">
                <span class="modal-rounds-label">Rounds played</span>
                <span class="modal-rounds-value">${roundsPlayed}</span>
            </p>
        </div>
        <div class="modal-stat-grid">
            <div class="modal-stat correct"><span class="modal-stat-value">${stats.correct}</span><span class="modal-stat-label">Correct</span></div>
            <div class="modal-stat incorrect"><span class="modal-stat-value">${stats.incorrect}</span><span class="modal-stat-label">Incorrect</span></div>
            <div class="modal-stat skipped"><span class="modal-stat-value">${stats.skipped}</span><span class="modal-stat-label">Skipped (Impossible)</span></div>
            <div class="modal-stat skipped-possible"><span class="modal-stat-value">${stats.skippedPossible}</span><span class="modal-stat-label">Skipped (Possible)</span></div>
            <div class="modal-stat accuracy"><span class="modal-stat-value">${accuracy}%</span><span class="modal-stat-label">Accuracy</span></div>
        </div>
    `;

    modal.hidden = false;
    playAgainBtn.focus();

    const closeModal = () => {
        modal.hidden = true;
        fireworks.innerHTML = '';
        playAgainBtn.onclick = null;
        closeBtn.onclick = null;
        cleanupDismissHandlers();
        cleanupDismissHandlers = () => {};
    };

    playAgainBtn.onclick = () => { closeModal(); onPlayAgain(); };
    closeBtn.onclick = closeModal;
    cleanupDismissHandlers = addModalDismissHandlers(modal, closeModal);
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
    const rows = getCurrentVersionConfig().wallRows;

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
            cell.dataset.units = fractionToUnits(1, row.denominator);
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

function resetActiveFractionRound() {
    const state = GameState.fractions;
    deselectSelectedCells();
    state.currentRoll = null;
    state.isSelecting = false;
    state.attemptsLeft = 3;
}

function resetFractionsGame() {
    const state = GameState.fractions;
    state.round = 1;
    state.isGameOver = false;
    state.stats = createEmptyFractionStats();
    resetActiveFractionRound();

    $$('.fraction-cell').forEach(cell => {
        cell.classList.remove('selected', 'used');
    });

    const tbody = $('#fractions-table tbody');
    if (tbody) tbody.innerHTML = '';

    updateFractionDisplay();
    updateStatsDisplay();
    hideFeedback();

    resetRoundUI();
    setDiceLocked(false);
}

function rollFractionDice() {
    const state = GameState.fractions;
    if (state.isGameOver || state.isSelecting) return;

    const diceInt = $('#fraction-dice-int');
    const diceFrac = $('#fraction-dice');

    $('#roll-fraction-btn').disabled = true;
    setDiceLocked(true);
    diceInt.classList.add('rolling');
    diceFrac.classList.add('rolling');

    setTimeout(() => {
        const intValue = pickRandomValue(state.customIntDice);
        const denomValue = pickRandomValue(state.customFracDice);

        state.currentRoll = {
            numerator: intValue,
            denominator: denomValue,
            display: formatFraction(intValue, denomValue),
            units: fractionToUnits(intValue, denomValue)
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
    }, DICE_ROLL_DURATION_MS);
}

function handleCellSelection(rowIndex, cellIndex) {
    const state = GameState.fractions;
    if (!state.isSelecting || state.isGameOver) return;

    const cell = getFractionCell(rowIndex, cellIndex);
    if (!cell || cell.classList.contains('used')) return;

    const selectedIndex = state.selectedCells.findIndex(
        item => item.row === rowIndex && item.cell === cellIndex
    );

    if (selectedIndex === -1) {
        cell.classList.add('selected');
        state.selectedCells.push({
            row: rowIndex,
            cell: cellIndex,
            units: parseInt(cell.dataset.units, 10)
        });
    } else {
        cell.classList.remove('selected');
        state.selectedCells.splice(selectedIndex, 1);
    }

    $('#check-result-btn').disabled = state.selectedCells.length === 0;
    updateFractionDisplay();
}

function clearSelection() {
    deselectSelectedCells();
    $('#check-result-btn').disabled = true;
    updateFractionDisplay();
}

function deselectSelectedCells() {
    const state = GameState.fractions;
    state.selectedCells.forEach(item => {
        const cell = getFractionCell(item.row, item.cell);
        if (cell) cell.classList.remove('selected');
    });
    state.selectedCells = [];
}

function getSelectedUnits() {
    return GameState.fractions.selectedCells.reduce((sum, item) => sum + item.units, 0);
}

function checkResult() {
    const state = GameState.fractions;
    if (!state.isSelecting || !state.currentRoll) return;

    const targetUnits = state.currentRoll.units;
    const selectedUnits = getSelectedUnits();

    if (selectedUnits === targetUnits) {
        handleCorrectAnswer();
    } else {
        handleIncorrectAnswer();
    }
}

function handleCorrectAnswer() {
    const state = GameState.fractions;
    const roll = state.currentRoll;

    state.selectedCells.forEach(item => {
        const cell = getFractionCell(item.row, item.cell);
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

    if (canMakeFraction(roll.units)) {
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

    let cleanupDismissHandlers = () => {};

    const closeModal = () => {
        modal.hidden = true;
        cleanupDismissHandlers();
        cleanupDismissHandlers = () => {};
        yesBtn.onclick = null;
        cancelBtn.onclick = null;
    };

    modal.hidden = false;
    cancelBtn.focus();

    yesBtn.onclick = () => {
        closeModal();
        onConfirm();
    };
    cancelBtn.onclick = closeModal;
    cleanupDismissHandlers = addModalDismissHandlers(modal, closeModal);
}

// ============================================
// Fraction Possibility Check (subset sum)
// ============================================

function getAvailableFractionUnits() {
    return Array.from($$('.fraction-cell:not(.used)'), (cell) => parseInt(cell.dataset.units, 10));
}

function buildReachableFractionSums(maxTargetUnits) {
    const reachable = new Uint8Array(maxTargetUnits + 1);
    reachable[0] = 1;

    getAvailableFractionUnits().forEach((units) => {
        for (let sum = maxTargetUnits - units; sum >= 0; sum--) {
            if (reachable[sum]) {
                reachable[sum + units] = 1;
            }
        }
    });

    return reachable;
}

function canMakeFraction(targetUnits) {
    if (targetUnits <= 0) return true;
    const reachable = buildReachableFractionSums(targetUnits);
    return reachable[targetUnits] === 1;
}

function hasAnyPossibleFraction() {
    const state = GameState.fractions;
    const targetUnits = new Set();

    for (const numerator of state.customIntDice) {
        for (const denominator of state.customFracDice) {
            targetUnits.add(fractionToUnits(numerator, denominator));
        }
    }

    const maxTargetUnits = Math.max(...targetUnits);
    const reachable = buildReachableFractionSums(maxTargetUnits);
    return Array.from(targetUnits).some((units) => reachable[units] === 1);
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
    resetActiveFractionRound();

    resetRoundUI();

    updateFractionDisplay();
    updateStatsDisplay();

    if (isFractionWallFull()) {
        endFractionsGame(true);
    } else if (!hasAnyPossibleFraction()) {
        endFractionsGame(false);
    }
}

function resetRoundUI() {
    $('#fraction-action-buttons').hidden = true;
    $('#check-result-btn').disabled = true;
    $('#fraction-wall').classList.remove('selecting');
    $('#roll-fraction-btn').disabled = false;
    setFracDiceDisplay('?', '?');
    $('#fraction-dice-int .dice-face').textContent = '?';
    $('#current-fraction').textContent = '-';
}

function endFractionsGame(isWin) {
    GameState.fractions.isGameOver = true;
    const roundsPlayed = GameState.fractions.round - 1;
    showEndModal({
        isWin,
        stats: GameState.fractions.stats,
        roundsPlayed: Math.max(1, roundsPlayed),
        onPlayAgain: resetFractionsGame
    });
}

// ============================================
// Dice Lock
// ============================================

function setDiceLocked(locked) {
    const panel = $('#fractions-custom-dice-panel');
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
            notice.textContent = 'Dice settings cannot be changed during an active game. Start a new game to modify.';
            panel.prepend(notice);
        }
        notice.hidden = false;
    } else if (notice) {
        notice.hidden = true;
    }
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
    $('#fraction-selected').textContent = formatFractionValue(getSelectedUnits());
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
    row.className = RESULT_ROW_CLASS_NAMES[entry.result] || '';

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
// Initialize
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initBackgroundDecor();
    initNavigation();
    initPlayNowButtons();
    initHowToPlay();
    initCustomDiceUI();
    initFractionsGame();
});
