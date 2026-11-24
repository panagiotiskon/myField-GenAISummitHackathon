"""Tetromino geometry, line clears, and the placement heuristic."""

from __future__ import annotations

from dataclasses import dataclass

from config import COLS, LINE_CLEAR_REWARD, LOOKAHEAD_WEIGHT, ROWS

# (x, y) with x to the right and y downward. Each tuple is one rotation
# state, normalized so the minimum x and y are 0.
SHAPES: dict[str, tuple[tuple[int, int], ...]] = {
    "I": ((0, 0), (1, 0), (2, 0), (3, 0)),
    "O": ((0, 0), (1, 0), (0, 1), (1, 1)),
    "T": ((1, 0), (0, 1), (1, 1), (2, 1)),
    "S": ((1, 0), (2, 0), (0, 1), (1, 1)),
    "Z": ((0, 0), (1, 0), (1, 1), (2, 1)),
    "J": ((0, 0), (0, 1), (1, 1), (2, 1)),
    "L": ((2, 0), (0, 1), (1, 1), (2, 1)),
}


def rotate_cw(cells: tuple[tuple[int, int], ...] | list[tuple[int, int]]):
    """Clockwise quarter-turn, then shift so min x and min y are 0."""
    turned = [(y, -x) for x, y in cells]
    min_x = min(x for x, _ in turned)
    min_y = min(y for _, y in turned)
    return tuple(sorted((x - min_x, y - min_y) for x, y in turned))


def orientations(name: str) -> list[tuple[int, tuple[tuple[int, int], ...]]]:
    """Unique clockwise rotations of one piece, with the rotation index."""
    cells: tuple[tuple[int, int], ...] = SHAPES[name]
    found: list[tuple[int, tuple[tuple[int, int], ...]]] = []
    seen: set[tuple[tuple[int, int], ...]] = set()
    for index in range(4):
        if cells not in seen:
            seen.add(cells)
            found.append((index, cells))
        cells = rotate_cw(cells)
    return found


def shape_of(cells: list[tuple[int, int]] | tuple[tuple[int, int], ...]):
    """Return (name, rotation index, normalized cells) or None."""
    if len(cells) != 4:
        return None
    normalized = _normalize(cells)
    for name in SHAPES:
        for index, shape in orientations(name):
            if shape == normalized:
                return name, index, shape
    return None


def _normalize(cells):
    min_x = min(x for x, _ in cells)
    min_y = min(y for _, y in cells)
    return tuple(sorted((x - min_x, y - min_y) for x, y in cells))


@dataclass
class Placement:
    name: str
    rotation: int
    shape: tuple[tuple[int, int], ...]
    x: int
    cells: tuple[tuple[int, int], ...]
    lines: int
    value: float


class Board:
    def __init__(self, rows: int = ROWS, cols: int = COLS, grid: list[list[int]] | None = None):
        self.rows = rows
        self.cols = cols
        if grid is None:
            self.grid = [[0] * cols for _ in range(rows)]
        else:
            self.grid = grid

    def clone(self) -> "Board":
        return Board(self.rows, self.cols, [row[:] for row in self.grid])

    def valid(self, cells) -> bool:
        for x, y in cells:
            if x < 0 or x >= self.cols or y < 0 or y >= self.rows:
                return False
            if self.grid[y][x]:
                return False
        return True

    def drop(self, cells: list[tuple[int, int]]) -> list[tuple[int, int]]:
        landed = list(cells)
        while True:
            nxt = [(x, y + 1) for x, y in landed]
            if not self.valid(nxt):
                return landed
            landed = nxt

    def place(self, cells) -> "Board":
        board = self.clone()
        for x, y in cells:
            board.grid[y][x] = 1
        return board

    def clear_lines(self) -> int:
        kept = [row for row in self.grid if not all(row)]
        cleared = self.rows - len(kept)
        empty = [0] * self.cols
        self.grid = [empty[:] for _ in range(cleared)] + kept
        return cleared


def column_heights(grid: list[list[int]]) -> list[int]:
    rows = len(grid)
    cols = len(grid[0]) if rows else 0
    heights = []
    for x in range(cols):
        height = 0
        for y in range(rows):
            if grid[y][x]:
                height = rows - y
                break
        heights.append(height)
    return heights


def count_holes(grid: list[list[int]], heights: list[int]) -> int:
    rows = len(grid)
    holes = 0
    for x, height in enumerate(heights):
        if height == 0:
            continue
        top = rows - height
        for y in range(top + 1, rows):
            if not grid[y][x]:
                holes += 1
    return holes


def bumpiness(heights: list[int]) -> int:
    return sum(abs(heights[i] - heights[i + 1]) for i in range(len(heights) - 1))


def placement_value(board: Board, lines: int, line_reward: float = LINE_CLEAR_REWARD) -> float:
    """+line_clear_reward − aggregate_height − holes − bumpiness − max_height."""
    heights = column_heights(board.grid)
    aggregate = sum(heights)
    holes = count_holes(board.grid, heights)
    bumpy = bumpiness(heights)
    tallest = max(heights) if heights else 0
    return line_reward * lines - aggregate - holes - bumpy - tallest


def best_placement(
    board: Board,
    piece: str,
    next_piece: str | None = None,
    line_reward: float = LINE_CLEAR_REWARD,
    lookahead_weight: float = LOOKAHEAD_WEIGHT,
) -> Placement | None:
    """Search rotations and columns. Optionally add a one-ply lookahead."""
    best: Placement | None = None
    for rotation, shape in orientations(piece):
        width = max(x for x, _ in shape) + 1
        for x in range(board.cols - width + 1):
            spawned = [(x + dx, dy) for dx, dy in shape]
            if not board.valid(spawned):
                continue
            landed = board.drop(spawned)
            placed = board.place(landed)
            lines = placed.clear_lines()
            value = placement_value(placed, lines, line_reward)
            if next_piece:
                follow = best_placement(
                    placed,
                    next_piece,
                    next_piece=None,
                    line_reward=line_reward,
                    lookahead_weight=0.0,
                )
                if follow is not None:
                    value += lookahead_weight * follow.value
            candidate = Placement(
                name=piece,
                rotation=rotation,
                shape=shape,
                x=x,
                cells=tuple(landed),
                lines=lines,
                value=value,
            )
            if best is None or candidate.value > best.value:
                best = candidate
    return best
