"""Measured constants for Jackaroo Tetrix on a fixed viewport.

Geometry was measured from the WebGL canvas buffer (not the CSS overlay)
at viewport 480×960 with device_scale_factor 1. The canvas buffer was
470×950. Do not retune the weights from a guessed score; they are the
starter heuristic from the task.
"""

GAME_URL = "https://jackarootetrix.web.app/"

# Playwright window. The game letterboxes on wide viewports, so the bot
# keeps this size and reads the canvas buffer, which then matches 1:1.
VIEWPORT_WIDTH = 480
VIEWPORT_HEIGHT = 960

# Canvas buffer the measurements below belong to.
REF_CANVAS_WIDTH = 470
REF_CANVAS_HEIGHT = 950

# Gray header occupies y=0..51. The well starts on the next pixel.
ORIGIN_X = 0
ORIGIN_Y = 52
CELL_W = 47
CELL_H = 46
COLS = 10
ROWS = 17

# Column 9, row 0 sits under the orange home button, so it cannot be read.
HOME_CELL = (9, 0)

# Round length shown by the site once a registered round is armed.
ROUND_SECONDS = 120

# Starter heuristic. line_clear_reward is added once per cleared row.
# The other terms are subtracted.
LINE_CLEAR_REWARD = 8.0
LOOKAHEAD_WEIGHT = 0.5

# Vision: a cell counts toward a piece only when its inner fill is at least this.
CELL_FILL_MIN = 0.35
# Minimum total fill across the four cells of a matched piece.
PIECE_SCORE_MIN = 2.4
# Cells at least this full, and not part of the live piece, are the stack.
STACK_FILL = 0.62

# Keyboard. Down is a soft drop while held (measured), not a one-cell step.
KEY_GAP_MS = 70
SOFT_DROP_POLL_MS = 40
SOFT_DROP_MAX_MS = 900

# Hosts that serve the leaderboard, accounts, and score submission.
# The bot never calls them. The game canvas is static hosting.
BLOCKED_HOST_MARKERS = (
    "firebaseio.com",
    "firebaseapp.com",
    "firebasestorage.app",
    "googleapis.com",
    "cloudfunctions.net",
    "google-analytics.com",
    "googletagmanager.com",
    "firebaseinstallations.googleapis.com",
)
