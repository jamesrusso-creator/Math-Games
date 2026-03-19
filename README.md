# Math Games - Colour in Fractions

Interactive educational math game for learning fractions through play.

## About

Players roll dice to get a target fraction, then select bars on a fraction wall that sum to that fraction. The game supports two modes:

- **Proper Fractions** — numerator is always less than the denominator (e.g. 2/5, 3/10)
- **Improper Fractions** — numerator can be greater than or equal to the denominator (e.g. 3/2, 4/3)

## Features

- Fraction wall with visual bar selection
- Two game versions with different dice and wall configurations
- Custom dice settings with localStorage persistence
- Up to 3 attempts per round with game history tracking
- Colour-coded result history (correct / incorrect / skipped)
- Skip turn detection (only allowed when no valid selection exists)
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
