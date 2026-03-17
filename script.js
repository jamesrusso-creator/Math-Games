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
        history: [],
        rowStates: [],
        selectedCells: [],
        isSelecting: false,
        isGameOver: false,
        attemptsLeft: 3,
        stats: { correct: 0, incorrect: 0, skipped: 0 },
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

// ============================================
// Local Storage
// ============================================

const STORAGE_KEYS = {
    fractionIntDice: 'mathgames_fraction_int_dice',
    fractionFracDice: 'mathgames_fraction_frac_dice'
};

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
    localStorage.removeItem(STORAGE_KEYS.fractionIntDice);
    localStorage.removeItem(STORAGE_KEYS.fractionFracDice);
    const v = VERSIONS[currentVersion] || VERSIONS.proper;
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

    const closeModal = () => { modal.hidden = true; document.removeEventListener('keydown', onEscape); };

    function onEscape(e) {
        if (e.key === 'Escape') closeModal();
    }

    trigger?.addEventListener('click', () => {
        modal.hidden = false;
        closeBtn?.focus();
        document.addEventListener('keydown', onEscape);
    });

    closeBtn?.addEventListener('click', closeModal);
    modal?.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
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

    const closeModal = () => {
        modal.hidden = true;
        document.removeEventListener('keydown', onEscape);
    };
    function onEscape(e) { if (e.key === 'Escape') closeModal(); }

    trigger?.addEventListener('click', () => {
        modal.hidden = false;
        closeBtn?.focus();
        document.addEventListener('keydown', onEscape);
    });
    closeBtn?.addEventListener('click', closeModal);
    modal?.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    populateFractionDiceInputs();

    saveBtn?.addEventListener('click', () => {
        if (!validateFractionDice()) return;

        const intValues = [];
        const fracValues = [];
        for (let i = 1; i <= 6; i++) {
            intValues.push(parseInt($(`#frac-int-${i}`).value));
            fracValues.push(parseInt($(`#frac-denom-${i}`).value));
        }

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

    for (let i = 1; i <= 6; i++) {
        const input = $(`#frac-int-${i}`);
        input?.addEventListener('input', () => validateIntegerInput(input, 1, 6));
    }
}

function showDiceMessage(el, text, autoHide) {
    el.textContent = text;
    el.style.color = 'var(--color-success, #10b981)';
    el.hidden = false;
    if (autoHide) {
        setTimeout(() => { el.hidden = true; el.style.color = ''; }, 2000);
    }
}

function populateFractionDiceInputs() {
    for (let i = 1; i <= 6; i++) {
        const intInput = $(`#frac-int-${i}`);
        const fracSelect = $(`#frac-denom-${i}`);
        if (intInput) intInput.value = GameState.fractions.customIntDice[i - 1];
        if (fracSelect) fracSelect.value = GameState.fractions.customFracDice[i - 1];
    }
}

function validateFractionDice() {
    const errorMsg = $('#fraction-dice-error');
    for (let i = 1; i <= 6; i++) {
        const input = $(`#frac-int-${i}`);
        const value = parseInt(input.value);
        if (isNaN(value) || value < 1 || value > 6) {
            errorMsg.textContent = `Face ${i}: Integer dice must be between 1 and 6.`;
            errorMsg.hidden = false;
            input.focus();
            return false;
        }
    }
    errorMsg.hidden = true;
    return true;
}

function validateIntegerInput(input, min, max) {
    const value = parseInt(input.value);
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

function showEndModal({ isWin, stats, onPlayAgain }) {
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
        icon.textContent = '🎉';
        title.textContent = 'You Win!';
    } else {
        inner.classList.add('modal-lose');
        icon.textContent = '😔';
        title.textContent = 'Game Over';
    }

    statsEl.innerHTML = `
        <p class="modal-reason">${isWin
            ? 'Congratulations! You filled the entire fraction wall!'
            : 'No possible moves remaining with the current dice.'}</p>
        <div class="modal-stat-grid">
            <div class="modal-stat correct"><span class="modal-stat-value">${stats.correct}</span><span class="modal-stat-label">Correct</span></div>
            <div class="modal-stat incorrect"><span class="modal-stat-value">${stats.incorrect}</span><span class="modal-stat-label">Incorrect</span></div>
            <div class="modal-stat skipped"><span class="modal-stat-value">${stats.skipped}</span><span class="modal-stat-label">Skipped</span></div>
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
    };

    playAgainBtn.onclick = () => { closeModal(); onPlayAgain(); };
    closeBtn.onclick = closeModal;

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', handleEscape);
        }
    };
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
        rowDiv.dataset.value = row.value;

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

    GameState.fractions.rowStates = rows.map(() => []);
}

function resetFractionsGame() {
    const state = GameState.fractions;
    state.currentRoll = null;
    state.round = 1;
    state.history = [];
    state.rowStates = state.rowStates.map(() => []);
    state.selectedCells = [];
    state.isSelecting = false;
    state.isGameOver = false;
    state.attemptsLeft = 3;
    state.stats = { correct: 0, incorrect: 0, skipped: 0 };

    $$('.fraction-cell').forEach(cell => {
        cell.classList.remove('shaded', 'selected', 'disabled', 'used');
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
        const intValue = state.customIntDice[Math.floor(Math.random() * 6)];
        const denomValue = state.customFracDice[Math.floor(Math.random() * 6)];

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
        state.rowStates[item.row].push(item.cell);
    });

    state.stats.correct++;

    const selectedDisplay = formatSelectedCells(state.selectedCells);
    const entry = { round: state.round, target: roll.display, selection: selectedDisplay || roll.display, result: 'Correct' };
    state.history.push(entry);
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
    state.history.push(entry);
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

    state.stats.skipped++;
    const entry = { round: state.round, target: roll.display, selection: '-', result: resultLabel };
    state.history.push(entry);
    addToFractionsTable(entry);

    if (resultLabel === 'Skipped (Possible)') {
        showFeedback(`Skipped. ${roll.display} could have been made with remaining bars.`, 'warning');
    } else {
        showFeedback(`Skipped! ${roll.display} cannot be made with remaining bars.`, 'warning');
    }
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
    for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 6; j++) {
            const value = state.customIntDice[i] / state.customFracDice[j];
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
    GameState.fractions.isGameOver = true;
    showEndModal({
        isWin,
        stats: GameState.fractions.stats,
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
    const selectedValue = GameState.fractions.selectedCells.reduce((sum, item) => sum + item.value, 0);
    $('#fraction-selected').textContent = selectedValue.toFixed(3);
    $('#fraction-round').textContent = GameState.fractions.round;
}

function updateStatsDisplay() {
    const stats = GameState.fractions.stats;
    $('#correct-count').textContent = stats.correct;
    $('#incorrect-count').textContent = stats.incorrect;
    $('#skipped-count').textContent = stats.skipped;
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
// Initialize
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initPlayNowButtons();
    initHowToPlay();
    initCustomDiceUI();
    initFractionsGame();
});
