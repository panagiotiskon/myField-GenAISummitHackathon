"""Choose a landing column and rotation for the live piece."""

from __future__ import annotations

from board import Board, Placement, best_placement, shape_of


def choose_move(
    stack: list[list[int]],
    piece_cells: list[tuple[int, int]],
    next_piece: str | None = None,
) -> Placement | None:
    """Return the best landing for the piece currently on the board.

    `stack` is the locked well (1 = filled) and does not include the live piece.
    `next_piece` is used only when a preview was actually read.
    """
    identified = shape_of(piece_cells)
    if identified is None:
        return None
    name, _rotation, _shape = identified
    board = Board(grid=[row[:] for row in stack])
    return best_placement(board, name, next_piece=next_piece)
