# Math Games

PaperCSS-styled educational web app for learning fractions through interactive play.

## Current Status

This project currently ships one playable game:

- `Colour in Fractions` — fully playable
- `Colour in Decimats` — placeholder card only, not implemented yet

The app is a static frontend with no build step. The current UI uses a hand-drawn `PaperCSS` theme and `OpenMoji` icons/background decorations.

## Gameplay

In `Colour in Fractions`, the player:

1. Opens the fractions game from the home page or top navigation.
2. Chooses a version:
   - `Without Improper Fractions`
   - `With Improper Fractions`
3. Rolls integer and fraction dice to get a target fraction.
4. Selects fraction bars on the wall to match the target exactly.
5. Checks the result, clears the selection, or skips the turn.

Game flow currently includes:

- up to 3 attempts per round
- correct / incorrect / skipped tracking
- skip confirmation when a valid move still exists
- game history table
- end-of-game summary modal
- custom dice settings saved in `localStorage`

## Feature Highlights

- PaperCSS-based visual theme with custom responsive layout
- OpenMoji icons used across the UI and as low-saturation background decor
- version picker for proper vs improper fraction play
- accessible modals and keyboard-selectable fraction wall cells
- sticky game status bar with round, target, selected total, and counters
- configurable numerator and denominator dice faces
- responsive layout for desktop and mobile

## Tech Notes

- No framework
- No bundler
- No package manager setup
- Main files:
  - `index.html` — page structure and modal markup
  - `styles.css` — PaperCSS overrides, layout, components, responsive styles
  - `script.js` — navigation, modal handling, game state, fraction logic, history, persistence

## Runtime Dependencies

There is no install step, but the page currently loads external assets at runtime:

- `PaperCSS 1.9.2` from `unpkg`
- `OpenMoji` SVG assets from `raw.githubusercontent.com`

Because of that, an internet connection is required for the current visual theme and icons unless those assets are vendored locally later.

## Running Locally

You can open `index.html` directly in a browser, but using a static server is recommended:

```bash
python3 -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000).

## Accessibility

The current app includes:

- a skip link
- keyboard support for fraction-cell selection
- dialog semantics for modals
- live feedback region for round messages

## Known Limitations

- `Colour in Decimats` is not implemented yet
- there is no automated test suite yet
- the project is still organized as a single-page static app, with most logic in one script file

## Attribution

- UI theme inspiration and base styles: [PaperCSS](https://www.getpapercss.com/)
- Icons: [OpenMoji](https://openmoji.org/), licensed under CC BY-SA 4.0

## Project Use

This project is currently positioned as an educational / research prototype.
