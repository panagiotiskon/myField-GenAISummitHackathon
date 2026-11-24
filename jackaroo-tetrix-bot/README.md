# Jackaroo Tetrix bot

A local bot that plays one round of [Jackaroo Tetrix](https://jackarootetrix.web.app/). It launches its own Chromium, reads the playfield from the game canvas, and sends the keyboard. It aims to clear lines and keep the stack low. It does not sign in, does not open the leaderboard, and does not submit a score.

## Setup

From this directory:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
playwright install chromium
```

`opencv-python-headless` works in place of `opencv-python` if you do not want the GUI build.

## Start and stop

```bash
python bot.py
```

Chromium opens the game and waits. Press the green **START** button on the black bar at the top of the window. The bot clicks **PLAY**, then **SLOW**, and plays until one of these happens:

- you press the red **STOP** button
- you press Ctrl+C in the terminal
- the round clock reaches 120 seconds

Nothing starts placing pieces until START. `--auto-start` skips that wait (used for a local check). `--headless` hides the window. `--seconds 20` stops earlier than 120.

```bash
python bot.py --headless --auto-start --seconds 20
```

The window is fixed at 480×960. On a wide window the game letterboxes and the measured grid no longer lines up, so the bot does not resize it.

## What it does

1. Reads pixels from the WebGL canvas (`#embed-html canvas`). The page keeps the drawing buffer, so the bot can copy the canvas without the HTML overlays.
2. Samples a 10×17 grid. A cell is a food tile when its center is saturated. White “Score:” text is not saturated, so it is ignored. The orange home button covers column 9 of row 0; that cell is ignored.
3. Matches the four live cells to I, O, T, S, Z, J, or L.
4. Drops every legal rotation and column in a simulator, clears full rows, and scores

   `line_clear_reward − aggregate_height − holes − bumpiness − max_height`

   with `line_clear_reward = 8` per line. A one-ply lookahead is implemented and stays off, because no separate next-piece panel was visible (see below).
5. Sends Space until the orientation matches, then Left or Right until the column matches, then holds Down to soft-drop. Each key is checked against the next frame.

SLOW is selected on purpose. On that speed a piece takes several seconds to fall, which is enough time to read a frame and move.

## Tests

```bash
python -m unittest discover -s tests
```

The tests use a synthetic grid and the placement search. They do not need the live site.

## Measured on the live game

Viewport 480×960, `device_scale_factor` 1. Canvas buffer **470×950**. Figures below are that buffer, read with `drawImage` (not a screenshot of the HTML overlay).

| Item | Measurement |
| --- | --- |
| Engine | libGDX game on one WebGL canvas. Score and pieces are drawn there. There is no board DOM. |
| Header | Solid gray bar, y = 0–51. |
| Well origin | (0, 52) |
| Cell | 47×46 px (10 columns span the 470 px width; 17 rows end at y = 834) |
| Columns × rows | **10 × 17** (rows 0–16). Row 16 ends where the on-screen buttons start (y = 834). |
| Floor | A piece locks with its bottom on row 16. |
| Move | Left / Right, one column per press. |
| Rotate | Space, clockwise 90°. |
| Down | Soft drop while the key is held. A short tap did not move a full cell. |
| Up | Not a hard drop in a near-floor check. The bot does not send Up. |
| Speed buttons | SLOW, MEDIUM, FAST after PLAY. The bot clicks SLOW. |
| On-screen buttons | Left, right, down, rotate along the bottom. The bot uses the keyboard. |
| Score | White “Score: N” at the top left of the well. |
| Next piece | No separate preview panel. A piece can spawn with its top row clipped by the header, so the bot waits until four cells are visible. |
| Lines | No separate lines counter was visible. Only the score label. |
| Round length | The site’s badge is 120 seconds, and it starts only after a username round is registered. This bot does not register, and it stops itself at 120 seconds. |
| Gravity on SLOW | About three rows per second. Soft drop is several times faster. |

The username dialog and the leaderboard button are hidden with local CSS so they do not cover the canvas. Requests to Firebase, Cloud Functions, and Google Analytics hosts are blocked, including websockets to those hosts. The bot never types a username and never calls the score submission path.

## What was run here

`python -m unittest discover -s tests` — 19 tests, covering rotation, line clears, the heuristic (including a forced I-piece clear), and vision on a painted grid.

A 20-second headless round was run against the live site (`python bot.py --headless --auto-start --seconds 20`). The bot clicked PLAY, then SLOW, and planned three placements. At the end of that round the canvas still showed **Score: 0**. No line cleared, so the game's point values were not observed. That is not a leaderboard result and not a claim that the heuristic is tuned.

## Not verified

- The in-game point table (what a single, double, or tetris is worth). The on-canvas “Score:” value was not OCR’d, and no full 120 second round was scored against the site’s timer.
- Whether Up, or any other key, is a hard drop from the top of the well.
- Whether a top-out shows a game-over screen the bot should click. The bot stops on the clock or STOP either way.
- MEDIUM and FAST speeds, and any viewport other than 480×960.
- Wall-kick rules. The bot re-reads the board after Space and slides to the column it can actually reach.
- A next-piece preview. Lookahead stays unused until one can be read reliably.
