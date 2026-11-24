"""Read the playfield from a canvas frame.

The game draws onto one WebGL canvas and does not expose a board API.
Occupied cells are food tiles: high saturation against a dark starfield.
White HUD text ("Score: N") has no saturation, so it is ignored.
"""

from __future__ import annotations

import numpy as np

from board import shape_of
from config import (
    CELL_FILL_MIN,
    CELL_H,
    CELL_W,
    COLS,
    HOME_CELL,
    ORIGIN_X,
    ORIGIN_Y,
    PIECE_SCORE_MIN,
    REF_CANVAS_HEIGHT,
    REF_CANVAS_WIDTH,
    ROWS,
    STACK_FILL,
)

try:
    import cv2
except ImportError:  # pragma: no cover - exercised only when opencv is missing
    cv2 = None


class Geometry:
    def __init__(self, origin_x, origin_y, cell_w, cell_h, cols, rows, home_cell):
        self.origin_x = origin_x
        self.origin_y = origin_y
        self.cell_w = cell_w
        self.cell_h = cell_h
        self.cols = cols
        self.rows = rows
        self.home_cell = home_cell

    @property
    def playfield(self):
        return (
            self.origin_x,
            self.origin_y,
            self.origin_x + self.cols * self.cell_w,
            self.origin_y + self.rows * self.cell_h,
        )


def reference_geometry() -> Geometry:
    return Geometry(ORIGIN_X, ORIGIN_Y, CELL_W, CELL_H, COLS, ROWS, HOME_CELL)


def geometry_for_canvas(width: int, height: int) -> Geometry:
    """Scale the measured grid when the canvas is only slightly off 470×950.

    A wide window letterboxes the game, so callers should keep the viewport
    fixed. Scaling is only for a pixel or two of canvas-size drift.
    """
    if width <= 0 or height <= 0:
        return reference_geometry()
    sx = width / REF_CANVAS_WIDTH
    sy = height / REF_CANVAS_HEIGHT
    home_x, home_y = HOME_CELL
    return Geometry(
        origin_x=int(round(ORIGIN_X * sx)),
        origin_y=int(round(ORIGIN_Y * sy)),
        cell_w=max(1, int(round(CELL_W * sx))),
        cell_h=max(1, int(round(CELL_H * sy))),
        cols=COLS,
        rows=ROWS,
        home_cell=(home_x, home_y),
    )


def _require_cv():
    if cv2 is None:
        raise RuntimeError("opencv is not installed")


def saturation_mask(image: np.ndarray) -> np.ndarray:
    """True where a pixel belongs to a food tile rather than the starfield or HUD."""
    _require_cv()
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    return (hsv[:, :, 1] > 50) & (hsv[:, :, 2] > 45)


def cell_fills(image: np.ndarray, geom: Geometry | None = None) -> np.ndarray:
    """Fraction of each cell's inner area that is a food tile. Shape (rows, cols)."""
    geom = geom or reference_geometry()
    mask = saturation_mask(image)
    fills = np.zeros((geom.rows, geom.cols), dtype=np.float32)
    pad_y = max(4, int(geom.cell_h * 0.18))
    pad_x = max(4, int(geom.cell_w * 0.18))
    for y in range(geom.rows):
        for x in range(geom.cols):
            x0 = geom.origin_x + x * geom.cell_w
            y0 = geom.origin_y + y * geom.cell_h
            sub = mask[y0 + pad_y : y0 + geom.cell_h - pad_y, x0 + pad_x : x0 + geom.cell_w - pad_x]
            fills[y, x] = float(sub.mean()) if sub.size else 0.0
    hx, hy = geom.home_cell
    if 0 <= hy < geom.rows and 0 <= hx < geom.cols:
        fills[hy, hx] = 0.0
    return fills


def _halo(fills: np.ndarray, cells: list[tuple[int, int]]) -> float:
    occupied = set(cells)
    total = 0.0
    seen = set()
    rows, cols = fills.shape
    for x, y in cells:
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if (nx, ny) in occupied or (nx, ny) in seen:
                continue
            if nx < 0 or ny < 0 or nx >= cols or ny >= rows:
                continue
            seen.add((nx, ny))
            total += float(fills[ny, nx])
    return total


def locate_piece(fills: np.ndarray, geom: Geometry | None = None):
    """Match the live tetromino against fill ratios.

    Returns a dict with name, rotation, cells (x, y), x, y, score — or None
    when no four-cell shape clears the threshold. Partial spawns clipped by
    the header fail the per-cell minimum and return None.
    """
    geom = geom or reference_geometry()
    from board import orientations, SHAPES

    found = []
    for name in SHAPES:
        for rotation, shape in orientations(name):
            width = max(x for x, _ in shape) + 1
            height = max(y for _, y in shape) + 1
            for y in range(geom.rows - height + 1):
                for x in range(geom.cols - width + 1):
                    cells = [(x + dx, y + dy) for dx, dy in shape]
                    samples = [float(fills[cy, cx]) for cx, cy in cells]
                    if min(samples) < CELL_FILL_MIN:
                        continue
                    score = sum(samples) - 0.45 * _halo(fills, cells)
                    if score < PIECE_SCORE_MIN:
                        continue
                    if not _is_floating(fills, cells):
                        continue
                    found.append(
                        {
                            "name": name,
                            "rotation": rotation,
                            "cells": cells,
                            "x": x,
                            "y": y,
                            "score": score,
                            "shape": shape,
                        }
                    )
    if not found:
        return None
    # The live piece is the highest floating match. A shape inside the stack
    # is lower, and usually not floating.
    found.sort(key=lambda item: (item["y"], -item["score"]))
    return found[0]


def _is_floating(fills: np.ndarray, cells: list[tuple[int, int]]) -> bool:
    """True when the shape still has room to fall."""
    rows = fills.shape[0]
    occupied = set(cells)
    for x, y in cells:
        below = y + 1
        if below >= rows:
            return False
        if (x, below) in occupied:
            continue
        if float(fills[below, x]) >= 0.5:
            return False
    return True


def stack_from_fills(fills: np.ndarray, piece_cells: list[tuple[int, int]] | None) -> list[list[int]]:
    """Locked cells: clearly full, and not part of the live piece."""
    rows, cols = fills.shape
    piece = set(piece_cells or [])
    grid = [[0] * cols for _ in range(rows)]
    for y in range(rows):
        for x in range(cols):
            if (x, y) in piece:
                continue
            if float(fills[y, x]) >= STACK_FILL:
                grid[y][x] = 1
    return grid


def read_board(image: np.ndarray, geom: Geometry | None = None):
    """Return (fills, piece or None, stack grid)."""
    geom = geom or geometry_for_canvas(image.shape[1], image.shape[0])
    fills = cell_fills(image, geom)
    piece = locate_piece(fills, geom)
    cells = piece["cells"] if piece else None
    stack = stack_from_fills(fills, cells)
    return fills, piece, stack


def piece_identity(cells: list[tuple[int, int]]):
    """Normalized shape id used to see whether a rotation landed."""
    found = shape_of(cells)
    if found is None:
        return None
    _name, _index, shape = found
    return shape


def game_controls_visible(image: np.ndarray) -> bool:
    """True when the in-game buttons are on screen.

    Those four green buttons sit at the lower left and the lower right.
    The how-to screen's FAST button is centered, so a single green blob
    in the middle does not count.
    """
    _require_cv()
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    if hsv.shape[0] < 900:
        return False
    band = hsv[830:900]
    green = (band[:, :, 0] > 35) & (band[:, :, 0] < 90) & (band[:, :, 1] > 80)
    left = float(green[:, :150].mean()) > 0.01
    right = float(green[:, 320:].mean()) > 0.01
    return left and right


def _filled_button(contour, y_min, y_max, w_range, h_range):
    x, y, w, h = cv2.boundingRect(contour)
    if not (y_min <= y <= y_max and w_range[0] <= w <= w_range[1] and h_range[0] <= h <= h_range[1]):
        return None
    area = cv2.contourArea(contour)
    if w * h <= 0 or area / (w * h) < 0.45:
        return None
    return y, x + w / 2, y + h / 2


def find_yellow_button(image: np.ndarray):
    """PLAY on the title screen. Ignores the thin yellow frame on the how-to card."""
    _require_cv()
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    mask = cv2.inRange(hsv, (15, 100, 150), (40, 255, 255))
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    best = None
    for contour in contours:
        found = _filled_button(contour, 520, 760, (140, 280), (40, 100))
        if found is None:
            continue
        if best is None or found[0] < best[0]:
            best = found
    if best is None:
        return None
    return best[1], best[2]


def find_slow_button(image: np.ndarray):
    """Top filled orange speed button, below the how-to card.

    SLOW sits above MEDIUM. Food tiles and the home button are smaller or higher.
    """
    _require_cv()
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    mask = cv2.inRange(hsv, (5, 140, 140), (22, 255, 255))
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    buttons = []
    for contour in contours:
        found = _filled_button(contour, 640, 820, (100, 180), (35, 70))
        if found is not None:
            buttons.append(found)
    if not buttons:
        return None
    buttons.sort()
    _top, cx, cy = buttons[0]
    return cx, cy


def read_score_text_region(image: np.ndarray, geom: Geometry | None = None) -> np.ndarray:
    """Crop where 'Score: N' is drawn. The bot does not OCR this by default."""
    geom = geom or reference_geometry()
    y0 = geom.origin_y
    y1 = min(image.shape[0], geom.origin_y + geom.cell_h + 8)
    x1 = min(image.shape[1], geom.cell_w * 4)
    return image[y0:y1, 0:x1].copy()
