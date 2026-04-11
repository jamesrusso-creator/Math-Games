# Math Games

Interactive browser-based math games for fractions, decimals, and number-line estimation.

## Included Games

The project currently includes three games:

- **Colour in Fractions** — roll fraction dice, then shade bars on a fraction wall that add up to the target.
- **Colour in Decimats** — roll a number die and a place-value die, then select or split Decimat blocks to make the matching decimal amount.
- **Place That Number** — a survival number-line game where each correct placement becomes a new benchmark for later rounds.

## Game Versions

`Colour in Fractions` has two selectable versions:

- **Without Improper Fractions** — the numerator stays smaller than the denominator.
- **With Improper Fractions** — the numerator can be equal to or larger than the denominator.

`Place That Number` has three selectable versions:

- **INTEGER / 0 to 100** — two digit dice on a 0 to 100 number line.
- **INTEGER / 0 to 1000** — three digit dice on a 0 to 1000 number line.
- **FRACTION / 0 to 6** — two dice from 1 to 6, arranged as a fraction and placed on a 0 to 6 line.

## Current Feature Set

- Pure frontend app with no build step for gameplay
- Version picker for Fractions and Place That Number
- Session-only custom dice settings for Fractions and Decimats
- Round history tables for all three games
- Skip tracking and possible/impossible skip detection for Fractions and Decimats
- Decimat block splitting from tenths to hundredths to thousandths
- Keyboard-accessible interaction across the games
- `Place That Number` benchmark-based survival gameplay across integer and fraction variants
- Mixed-fraction history formatting for `Placed At` in Place That Number

## Project Structure

- `index.html` — page structure, game sections, and modal markup
- `styles.css` — layout, component styling, and responsive behavior
- `script.js` — game state, rules, DOM updates, and interaction logic
- `tests/` — Playwright-driven browser regression tests

## Running Locally

You can open `index.html` directly in a browser, or serve the folder with any static server:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Testing

The regression suite opens `index.html` directly, so a dev server is not required.

Install dependencies and run the full browser suite:

```bash
npm install
npm test
```

The current test suite covers:

- `Colour in Fractions`
- `Colour in Decimats`
- `Place That Number`

To generate a browser-side coverage report for `script.js`, run:

```bash
npm run coverage
```

Coverage output is written into `coverage/`, including an HTML report at `coverage/index.html`.

## License

Educational use.
