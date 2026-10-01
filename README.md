# Office layout planner

A one-page planner for redesigning a small home office (15′ × 7′10″). The room is modeled from tape measurements: windows, doors, trim, sills and a heater. You can drag furniture around a floor plan, see it in 3D, and get warnings when something doesn't fit.

- **Floor plan:** drag to move, `R` to rotate. Pieces snap to walls and to each other. The plan defaults to "north down", which is the view from the desk; a button flips it.
- **3D view:** updates live, with camera presets. The walls nearest the camera hide so you can see in.
- **Fit checks:** heights count. A desk top that clears a window sill passes; a cabinet taller than the sill pushed against the wall doesn't. Door swings and the light switch are checked too.
- **Candidates:** each piece being considered is modeled from its product listing, with a link and price. You can show or hide any piece.
- **Budget:** totals the shown pieces you'd buy and lists any that have no price yet.
- **Layouts:** save several named options. They're kept in your browser's local storage; use Export for a backup file.

Prices are Wayfair sale prices from the date in each piece's note, so they will go stale.

## Run it

```
python3 serve.py
```

Then open http://localhost:8765/index.html. The server turns off browser caching so a reload always shows the latest `index.html`. The page loads three.js from jsDelivr, so it needs an internet connection.

## Test it

The end-to-end test drives the real page in the [gstack](https://github.com/garrytan/gstack) browser. With the server running:

```
bash tests/run-e2e.sh
```

It starts from a fixed saved layout, prints PASS/FAIL for each check, and ends with `ALL PASS` or `FAILED`. It only touches the test browser's storage.

`tools/wayfair-extract.js` reads the title, price and dimensions from a Wayfair product page open in that browser.
