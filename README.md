# Math Games - Colour in Fractions & Decimats

Interactive educational math games for learning fractions and decimals through play.

## About

The project currently includes two interactive games:

- **Colour in Fractions** — roll fraction dice, then select bars on a fraction wall that sum to the target.
- **Colour in Decimats** — roll a number die and a decimal place-value die, then click Decimat blocks to shade the matching amount.

The fractions game supports two modes:

- **Proper Fractions** — numerator is always less than the denominator (e.g. 2/5, 3/10)
- **Improper Fractions** — numerator can be greater than or equal to the denominator (e.g. 3/2, 4/3)

## Features

- Fraction wall with visual bar selection
- Two game versions with different dice and wall configurations
- Custom dice settings with localStorage persistence
- Up to 3 attempts per round with game history tracking
- Colour-coded result history (correct / incorrect / skipped)
- Skip turn detection (only allowed when no valid selection exists)
- Decimat board for tenths, hundredths, and thousandths
- Fixed Decimats dice based on the PDF activity sheet
- Click-to-shade Decimats gameplay with result checking and round history
- Automatic splitting of tenths and hundredths into smaller decimal place-value pieces when needed
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

## License

Educational use.
