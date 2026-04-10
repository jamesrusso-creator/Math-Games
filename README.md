# Math Games - Fractions, Decimats & Place Value

Interactive educational math games for learning fractions, decimals, and place value through play.

## About

The project currently includes three interactive games:

- **Colour in Fractions** — roll fraction dice, then select bars on a fraction wall that sum to the target.
- **Colour in Decimats** — roll a number die and a decimal place-value die, then click Decimat blocks to shade the matching amount.
- **Place That Number** — roll two digit dice, choose the stronger two-digit number, and place it on a 0 to 100 number line in a sudden-death survival run.

The fractions game supports two modes:

- **Proper Fractions** — numerator is always less than the denominator (e.g. 2/5, 3/10)
- **Improper Fractions** — numerator can be greater than or equal to the denominator (e.g. 3/2, 4/3)

## Features

- Fraction wall with visual bar selection
- Two game versions with different dice and wall configurations
- Custom dice settings for Fractions and Decimats with session-only persistence while the page remains open
- Up to 3 attempts per round with game history tracking
- Colour-coded result history (correct / incorrect / skipped)
- Skip turn detection (only allowed when no valid selection exists)
- Decimat board for tenths, hundredths, and thousandths
- Decimats dice defaults based on the PDF activity sheet, with optional custom faces
- Click-to-select Decimats gameplay with result checking and round history
- Double-click breakdown of tenths and hundredths into smaller decimal place-value pieces
- Number-line estimation game based on the "Place That Number" classroom activity
- Two-digit choice strategy that turns correct placements into new benchmarks
- Sudden-death scoring where one incorrect placement ends the run
- Responsive design for mobile and desktop
- Keyboard navigation and screen reader support

## Tech Stack

Pure frontend — no build tools, no frameworks, no dependencies.

- `index.html` — page structure
- `styles.css` — styling and responsive layout
- `script.js` — game logic and state management

## Running Locally

Open `index.html` directly in a browser, or serve with any static server:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Testing

The browser tests for `Colour in Fractions` and `Colour in Decimats` open the app directly from `index.html`, so no dev server is required.

Install the test dependency and run:

```bash
npm install
npm test
```

To generate a coverage report for the browser-tested game logic, run:

```bash
npm run coverage
```

The command writes reports into `coverage/`, including an HTML report at `coverage/index.html`.

## License

Educational use.
