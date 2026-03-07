/**
 * Math Games - Colour in Fractions
 * Interactive Educational Games
 * 
 * Features:
 * - Fraction Wall game with dice rolling
 * - Custom dice configuration with persistence
 * - Accessibility support (keyboard navigation, screen readers)
 * - Responsive design
 */

// ============================================
// Game State Management
// ============================================

const GameState = {
    // Fractions game state
    fractions: {
        currentRoll: null,
        round: 1,
        score: 0,
        totalShaded: 0,
        history: [],
        rowStates: [], // Tracks used cells in each row
        selectedCells: [], // Currently selected cells in current round
        isSelecting: false, // Whether user is in selection mode
        isGameOver: false,
        // Statistics
        stats: {
            correct: 0,
            incorrect: 0,
            skipped: 0
        },
        // Custom dice values
        customIntDice: [1, 1, 2, 2, 3, 3],
        customFracDice: [4, 5, 6, 8, 10, 12]
    },
};

// Default dice values
const DEFAULT_FRACTION_INT_DICE = [1, 1, 2, 2, 3, 3];
const DEFAULT_FRACTION_FRAC_DICE = [4, 5, 6, 8, 10, 12];


// ============================================
// Utility Functions
// ============================================

function $(selector) {
    return document.querySelector(selector);
}

function $$(selector) {
    return document.querySelectorAll(selector);
}

function randomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function formatFraction(numerator, denominator) {
    return `${numerator}/${denominator}`;
}

function gcd(a, b) {
    return b === 0 ? a : gcd(b, a % b);
}

function simplifyFraction(numerator, denominator) {
    const divisor = gcd(numerator, denominator);
    return {
        numerator: numerator / divisor,
        denominator: denominator / divisor
    };
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

// ============================================
// Local Storage Functions
// ============================================

const STORAGE_KEYS = {
    fractionIntDice: 'mathgames_fraction_int_dice',
    fractionFracDice: 'mathgames_fraction_frac_dice'
};

function saveCustomDice(game) {
    try {
        if (game === 'fractions') {
            localStorage.setItem(STORAGE_KEYS.fractionIntDice, JSON.stringify(GameState.fractions.customIntDice));
            localStorage.setItem(STORAGE_KEYS.fractionFracDice, JSON.stringify(GameState.fractions.customFracDice));
        }
        return true;
    } catch (e) {
        console.error('Error saving dice settings:', e);
        return false;
    }
}

function loadCustomDice() {
    try {
        // Load fraction dice
        const fracIntDice = localStorage.getItem(STORAGE_KEYS.fractionIntDice);
        const fracFracDice = localStorage.getItem(STORAGE_KEYS.fractionFracDice);
        
        if (fracIntDice) {
            GameState.fractions.customIntDice = JSON.parse(fracIntDice);
        }
        if (fracFracDice) {
            GameState.fractions.customFracDice = JSON.parse(fracFracDice);
        }
        
        return true;
    } catch (e) {
        console.error('Error loading dice settings:', e);
        return false;
    }
}

function clearCustomDice(game) {
    try {
        if (game === 'fractions') {
            localStorage.removeItem(STORAGE_KEYS.fractionIntDice);
            localStorage.removeItem(STORAGE_KEYS.fractionFracDice);
            GameState.fractions.customIntDice = [...DEFAULT_FRACTION_INT_DICE];
            GameState.fractions.customFracDice = [...DEFAULT_FRACTION_FRAC_DICE];
        }
        return true;
    } catch (e) {
        console.error('Error clearing dice settings:', e);
        return false;
    }
}

// ============================================
// Navigation
// ============================================

function initNavigation() {
    const navLinks = $$('.nav-link');
    const sections = $$('.section');
    const mobileToggle = $('.mobile-menu-toggle');
    const navMenu = $('.nav-menu');
    
    // Mobile menu toggle
    mobileToggle?.addEventListener('click', () => {
        const expanded = mobileToggle.getAttribute('aria-expanded') === 'true';
        mobileToggle.setAttribute('aria-expanded', !expanded);
        navMenu.setAttribute('aria-expanded', !expanded);
    });
    
    // Navigation links
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').slice(1);
            
            // Update active state
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            // Show target section
            sections.forEach(section => {
                section.hidden = section.id !== targetId;
            });
            
            // Close mobile menu
            mobileToggle?.setAttribute('aria-expanded', 'false');
            navMenu?.setAttribute('aria-expanded', 'false');
            
            // Scroll to top
            window.scrollTo(0, 0);
        });
    });
}

// ============================================
// Play Now Buttons
// ============================================

function initPlayNowButtons() {
    const fractionsBtn = $('.play-fractions-btn');
    const navLinks = $$('.nav-link');
    const sections = $$('.section');
    
    fractionsBtn?.addEventListener('click', () => {
        // Update nav active state
        navLinks.forEach(l => l.classList.remove('active'));
        const fractionsNav = $('.nav-link[href="#fractions"]');
        if (fractionsNav) fractionsNav.classList.add('active');
        
        // Show fractions section
        sections.forEach(section => {
            section.hidden = section.id !== 'fractions';
        });
        
        // Scroll to top
        window.scrollTo(0, 0);
    });
    
}

// ============================================
// Instructions Toggle
// ============================================

function initInstructions() {
    const toggles = $$('.instructions-toggle');
    
    toggles.forEach(toggle => {
        toggle.addEventListener('click', () => {
            const expanded = toggle.getAttribute('aria-expanded') === 'true';
            const contentId = toggle.getAttribute('aria-controls');
            const content = $(`#${contentId}`);
            
            toggle.setAttribute('aria-expanded', !expanded);
            content.hidden = expanded;
        });
    });
}

// ============================================
// Custom Dice Functions
// ============================================

function initCustomDice() {
    // Load saved dice values
    loadCustomDice();
    
    // Initialize Fractions custom dice UI
    initFractionCustomDice();
    
}

function initFractionCustomDice() {
    const toggle = $('.custom-dice-toggle[aria-controls="fractions-custom-dice-panel"]');
    const panel = $('#fractions-custom-dice-panel');
    const saveBtn = $('#save-fraction-dice');
    const resetBtn = $('#reset-fraction-dice');
    const errorMsg = $('#fraction-dice-error');
    
    // Toggle panel
    toggle?.addEventListener('click', () => {
        const expanded = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', !expanded);
        panel.hidden = expanded;
    });
    
    // Populate inputs with current values
    populateFractionDiceInputs();
    
    // Save button
    saveBtn?.addEventListener('click', () => {
        if (validateFractionDice()) {
            // Get values from inputs
            const intValues = [];
            const fracValues = [];
            
            for (let i = 1; i <= 6; i++) {
                const intInput = $(`#frac-int-${i}`);
                const fracSelect = $(`#frac-denom-${i}`);
                
                intValues.push(parseInt(intInput.value));
                fracValues.push(parseInt(fracSelect.value));
            }
            
            // Update game state
            GameState.fractions.customIntDice = intValues;
            GameState.fractions.customFracDice = fracValues;
            
            // Save to localStorage
            if (saveCustomDice('fractions')) {
                errorMsg.textContent = 'Dice settings saved successfully!';
                errorMsg.style.color = 'var(--color-success, #10b981)';
                errorMsg.hidden = false;
                
                setTimeout(() => {
                    errorMsg.hidden = true;
                    errorMsg.style.color = '';
                }, 2000);
            } else {
                errorMsg.textContent = 'Error saving dice settings. Please try again.';
                errorMsg.hidden = false;
            }
        }
    });
    
    // Reset button
    resetBtn?.addEventListener('click', () => {
        clearCustomDice('fractions');
        populateFractionDiceInputs();
        errorMsg.textContent = 'Dice settings reset to default!';
        errorMsg.style.color = 'var(--color-success, #10b981)';
        errorMsg.hidden = false;
        
        setTimeout(() => {
            errorMsg.hidden = true;
            errorMsg.style.color = '';
        }, 2000);
    });
    
    // Add input validation listeners
    for (let i = 1; i <= 6; i++) {
        const intInput = $(`#frac-int-${i}`);
        intInput?.addEventListener('input', () => {
            validateIntegerInput(intInput, 1, 6);
        });
    }
}

function populateFractionDiceInputs() {
    for (let i = 1; i <= 6; i++) {
        const intInput = $(`#frac-int-${i}`);
        const fracSelect = $(`#frac-denom-${i}`);
        
        if (intInput) {
            intInput.value = GameState.fractions.customIntDice[i - 1];
        }
        if (fracSelect) {
            fracSelect.value = GameState.fractions.customFracDice[i - 1];
        }
    }
}

function validateFractionDice() {
    const errorMsg = $('#fraction-dice-error');
    
    for (let i = 1; i <= 6; i++) {
        const intInput = $(`#frac-int-${i}`);
        const value = parseInt(intInput.value);
        
        if (isNaN(value) || value < 1 || value > 6) {
            errorMsg.textContent = `Face ${i}: Integer dice must be between 1 and 6.`;
            errorMsg.hidden = false;
            intInput.focus();
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
// Modal Functions
// ============================================

function showModal(title, message, onPlayAgain) {
    const modal = $('#game-modal');
    const modalTitle = $('#modal-title');
    const modalMessage = $('#modal-message');
    const playAgainBtn = $('#modal-play-again');
    const closeBtn = $('#modal-close');
    
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    modal.hidden = false;
    
    // Focus trap
    modal.querySelector('button').focus();
    
    const closeModal = () => {
        modal.hidden = true;
        playAgainBtn.onclick = null;
        closeBtn.onclick = null;
    };
    
    playAgainBtn.onclick = () => {
        closeModal();
        onPlayAgain();
    };
    
    closeBtn.onclick = closeModal;
    
    // Close on backdrop click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
    
    // Close on Escape key
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
}

// ============================================
// Fractions Game - New Logic
// ============================================

function initFractionsGame() {
    const rollBtn = $('#roll-fraction-btn');
    const resetBtn = $('#reset-fractions-btn');
    const checkBtn = $('#check-result-btn');
    const skipBtn = $('#skip-turn-btn');
    const clearBtn = $('#clear-selection-btn');
    
    rollBtn?.addEventListener('click', rollFractionDice);
    resetBtn?.addEventListener('click', resetFractionsGame);
    checkBtn?.addEventListener('click', checkResult);
    skipBtn?.addEventListener('click', skipTurn);
    clearBtn?.addEventListener('click', clearSelection);
    
    createFractionWall();
    resetFractionsGame();
}

function createFractionWall() {
    const wall = $('#fraction-wall');
    if (!wall) return;
    
    wall.innerHTML = '';
    
    // Define rows with denominators
    const rows = [
        { denominator: 2, cells: 2, value: 1/2 },
        { denominator: 3, cells: 3, value: 1/3 },
        { denominator: 4, cells: 4, value: 1/4 },
        { denominator: 5, cells: 5, value: 1/5 },
        { denominator: 6, cells: 6, value: 1/6 },
        { denominator: 8, cells: 8, value: 1/8 },
        { denominator: 10, cells: 10, value: 1/10 },
        { denominator: 12, cells: 12, value: 1/12 }
    ];
    
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
            
            // Add click handler for selection
            cell.addEventListener('click', () => handleCellSelection(rowIndex, i));
            
            // Add keyboard handler
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
    
    // Initialize row states
    GameState.fractions.rowStates = rows.map(() => []);
}

function resetFractionsGame() {
    GameState.fractions.currentRoll = null;
    GameState.fractions.round = 1;
    GameState.fractions.score = 0;
    GameState.fractions.totalShaded = 0;
    GameState.fractions.history = [];
    GameState.fractions.rowStates = GameState.fractions.rowStates.map(() => []);
    GameState.fractions.selectedCells = [];
    GameState.fractions.isSelecting = false;
    GameState.fractions.isGameOver = false;
    GameState.fractions.stats = { correct: 0, incorrect: 0, skipped: 0 };
    
    // Clear visual state
    $$('.fraction-cell').forEach(cell => {
        cell.classList.remove('shaded', 'selected', 'disabled', 'used');
    });
    
    // Clear table
    const tbody = $('#fractions-table tbody');
    if (tbody) tbody.innerHTML = '';
    
    // Reset displays
    updateFractionDisplay();
    updateStatsDisplay();
    hideFeedback();
    
    // Reset dice display
    $('#fraction-dice .dice-face').textContent = '?';
    $('#fraction-dice-int .dice-face').textContent = '?';
    $('#current-fraction').textContent = '-';
    
    // Hide action buttons
    $('#fraction-action-buttons').hidden = true;
    
    // Remove selecting mode
    $('#fraction-wall').classList.remove('selecting');
    
    // Enable roll button
    $('#roll-fraction-btn').disabled = false;
}

function rollFractionDice() {
    if (GameState.fractions.isGameOver || GameState.fractions.isSelecting) return;
    
    const diceInt = $('#fraction-dice-int');
    const diceFrac = $('#fraction-dice');
    const rollBtn = $('#roll-fraction-btn');
    
    rollBtn.disabled = true;
    diceInt.classList.add('rolling');
    diceFrac.classList.add('rolling');
    
    setTimeout(() => {
        // Roll using custom dice values
        const intIndex = Math.floor(Math.random() * 6);
        const intValue = GameState.fractions.customIntDice[intIndex];
        const denomValue = GameState.fractions.customFracDice[intIndex];
        
        // Calculate fraction value
        const fractionValue = intValue / denomValue;
        
        const roll = {
            numerator: intValue,
            denominator: denomValue,
            display: formatFraction(intValue, denomValue),
            value: fractionValue
        };
        
        GameState.fractions.currentRoll = roll;
        GameState.fractions.isSelecting = true;
        GameState.fractions.selectedCells = [];
        
        $('#fraction-dice-int .dice-face').textContent = intValue;
        $('#fraction-dice .dice-face').textContent = denomValue;
        $('#current-fraction').textContent = roll.display;
        
        diceInt.classList.remove('rolling');
        diceFrac.classList.remove('rolling');
        
        // Show action buttons
        $('#fraction-action-buttons').hidden = false;
        $('#check-result-btn').disabled = true;
        
        // Enable selection mode
        $('#fraction-wall').classList.add('selecting');
        
        // Update instruction
        showFeedback(`Select bars that sum to ${roll.display}, then click "Check Result"`, 'info');
        
        updateFractionDisplay();
    }, 500);
}

function handleCellSelection(rowIndex, cellIndex) {
    if (!GameState.fractions.isSelecting || GameState.fractions.isGameOver) return;
    
    const cell = $(`.fraction-cell[data-row="${rowIndex}"][data-cell="${cellIndex}"]`);
    if (!cell) return;
    
    // Check if cell is already used
    if (cell.classList.contains('used')) return;
    
    const cellKey = `${rowIndex}-${cellIndex}`;
    const selectedIndex = GameState.fractions.selectedCells.findIndex(
        item => item.row === rowIndex && item.cell === cellIndex
    );
    
    if (selectedIndex === -1) {
        // Select cell
        cell.classList.add('selected');
        const value = parseFloat(cell.dataset.value);
        GameState.fractions.selectedCells.push({ row: rowIndex, cell: cellIndex, value: value });
    } else {
        // Deselect cell
        cell.classList.remove('selected');
        GameState.fractions.selectedCells.splice(selectedIndex, 1);
    }
    
    // Enable/disable check button based on selection
    $('#check-result-btn').disabled = GameState.fractions.selectedCells.length === 0;
    
    updateFractionDisplay();
}

function clearSelection() {
    // Clear all selected cells
    GameState.fractions.selectedCells.forEach(item => {
        const cell = $(`.fraction-cell[data-row="${item.row}"][data-cell="${item.cell}"]`);
        if (cell) cell.classList.remove('selected');
    });
    
    GameState.fractions.selectedCells = [];
    $('#check-result-btn').disabled = true;
    updateFractionDisplay();
}

function checkResult() {
    if (!GameState.fractions.isSelecting || !GameState.fractions.currentRoll) return;
    
    const targetValue = GameState.fractions.currentRoll.value;
    const selectedValue = GameState.fractions.selectedCells.reduce((sum, item) => sum + item.value, 0);
    
    // Compare with small tolerance for floating point
    const isCorrect = Math.abs(selectedValue - targetValue) < 0.0001;
    
    if (isCorrect) {
        // Correct answer
        handleCorrectAnswer();
    } else {
        // Incorrect answer
        handleIncorrectAnswer(selectedValue);
    }
}

function handleCorrectAnswer() {
    const roll = GameState.fractions.currentRoll;
    
    // Mark selected cells as used
    GameState.fractions.selectedCells.forEach(item => {
        const cell = $(`.fraction-cell[data-row="${item.row}"][data-cell="${item.cell}"]`);
        if (cell) {
            cell.classList.remove('selected');
            cell.classList.add('used');
        }
        // Add to row states
        GameState.fractions.rowStates[item.row].push(item.cell);
    });
    
    // Update stats
    GameState.fractions.stats.correct++;
    GameState.fractions.score += roll.numerator;
    GameState.fractions.totalShaded += roll.value;
    
    const selectedDisplay = formatSelectedCells(GameState.fractions.selectedCells);
    
    const historyEntry = {
        round: GameState.fractions.round,
        target: roll.display,
        selection: selectedDisplay || roll.display,
        result: 'Correct'
    };
    GameState.fractions.history.push(historyEntry);
    addToFractionsTable(historyEntry);
    
    // Show success feedback
    showFeedback(`Correct! ${roll.display} = ${selectedDisplay}`, 'success');
    
    // Move to next round
    nextRound();
}

function handleIncorrectAnswer(selectedValue) {
    const roll = GameState.fractions.currentRoll;
    
    // Update stats
    GameState.fractions.stats.incorrect++;
    
    const selectedDisplay = formatSelectedCells(GameState.fractions.selectedCells);
    
    const selectedSum = formatFraction(Math.round(selectedValue * 12), 12);
    showFeedback(`Incorrect! Your selection: ${selectedDisplay} = ${selectedSum}, but target is ${roll.display}. Try again!`, 'error');
    
    // Clear selection but keep the same target
    clearSelection();
    
    updateStatsDisplay();
}

function skipTurn() {
    if (!GameState.fractions.isSelecting || !GameState.fractions.currentRoll) return;
    
    const roll = GameState.fractions.currentRoll;
    
    // Check if it's possible to make the target fraction
    if (canMakeFraction(roll.value)) {
        // Can make it, don't allow skip
        showFeedback('Please try again! It is possible to make this fraction.', 'warning');
        return;
    }
    
    // Cannot make it, allow skip
    GameState.fractions.stats.skipped++;
    
    // Add to history
    const historyEntry = {
        round: GameState.fractions.round,
        target: roll.display,
        selection: '-',
        result: 'Skipped (Impossible)'
    };
    GameState.fractions.history.push(historyEntry);
    addToFractionsTable(historyEntry);
    
    // Show feedback
    showFeedback(`Skipped! ${roll.display} cannot be made with remaining bars.`, 'warning');
    
    // Move to next round
    nextRound();
}

function canMakeFraction(targetValue) {
    // Get all available bars (not used)
    const availableBars = [];
    $$('.fraction-cell:not(.used)').forEach(cell => {
        availableBars.push({
            row: parseInt(cell.dataset.row),
            cell: parseInt(cell.dataset.cell),
            value: parseFloat(cell.dataset.value)
        });
    });
    
    // Use subset sum algorithm to check if target can be made
    return canMakeSum(availableBars, targetValue, 0);
}

function canMakeSum(bars, target, index) {
    // Base cases
    if (Math.abs(target) < 0.0001) return true;
    if (target < 0 || index >= bars.length) return false;
    
    // Try including current bar
    if (canMakeSum(bars, target - bars[index].value, index + 1)) return true;
    
    // Try excluding current bar
    if (canMakeSum(bars, target, index + 1)) return true;
    
    return false;
}

function nextRound() {
    GameState.fractions.round++;
    GameState.fractions.currentRoll = null;
    GameState.fractions.selectedCells = [];
    GameState.fractions.isSelecting = false;
    
    // Update UI
    $('#fraction-action-buttons').hidden = true;
    $('#fraction-wall').classList.remove('selecting');
    $('#roll-fraction-btn').disabled = false;
    $('#fraction-dice .dice-face').textContent = '?';
    $('#fraction-dice-int .dice-face').textContent = '?';
    $('#current-fraction').textContent = '-';
    
    updateFractionDisplay();
    updateStatsDisplay();
    
    // Check if game over (no more possible moves)
    if (!hasAnyPossibleFraction()) {
        endFractionsGame();
    }
}

function hasAnyPossibleFraction() {
    // Check if any custom dice combination can be made
    for (let i = 0; i < 6; i++) {
        const numerator = GameState.fractions.customIntDice[i];
        const denominator = GameState.fractions.customFracDice[i];
        const value = numerator / denominator;
        
        if (canMakeFraction(value)) return true;
    }
    return false;
}

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
    $('#correct-count').textContent = GameState.fractions.stats.correct;
    $('#incorrect-count').textContent = GameState.fractions.stats.incorrect;
    $('#skipped-count').textContent = GameState.fractions.stats.skipped;
}

function addToFractionsTable(entry) {
    const tbody = $('#fractions-table tbody');
    if (!tbody) return;
    
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${entry.round}</td>
        <td>${entry.target}</td>
        <td>${entry.selection}</td>
        <td>${entry.result}</td>
    `;
    tbody.appendChild(row);
    
    // Scroll to bottom
    row.scrollIntoView({ behavior: 'smooth' });
}

function endFractionsGame() {
    GameState.fractions.isGameOver = true;
    
    const stats = GameState.fractions.stats;
    const totalAttempts = stats.correct + stats.incorrect;
    const accuracy = totalAttempts > 0 ? Math.round((stats.correct / totalAttempts) * 100) : 0;
    
    showModal(
        'Game Over!',
        `Game completed!\n\nCorrect: ${stats.correct}\nIncorrect: ${stats.incorrect}\nSkipped: ${stats.skipped}\nAccuracy: ${accuracy}%`,
        resetFractionsGame
    );
}

// ============================================
// Initialize Game
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initPlayNowButtons();
    initInstructions();
    initCustomDice();
    initFractionsGame();
});
