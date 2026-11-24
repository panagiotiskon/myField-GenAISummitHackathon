import unittest

from board import (
    SHAPES,
    Board,
    best_placement,
    bumpiness,
    column_heights,
    count_holes,
    placement_value,
    rotate_cw,
    shape_of,
)


class RotateTests(unittest.TestCase):
    def test_clockwise_j_is_a_known_j_rotation(self):
        turned = rotate_cw(SHAPES["J"])
        found = shape_of(turned)
        self.assertIsNotNone(found)
        self.assertEqual(found[0], "J")
        self.assertNotEqual(turned, tuple(sorted(SHAPES["J"])))

    def test_four_turns_restore_i_and_o_stays_square(self):
        cells = SHAPES["I"]
        for _ in range(4):
            cells = rotate_cw(cells)
        self.assertEqual(cells, tuple(sorted(SHAPES["I"])))
        self.assertEqual(rotate_cw(SHAPES["O"]), tuple(sorted(SHAPES["O"])))

    def test_shape_of_rejects_a_partial_piece(self):
        self.assertIsNone(shape_of([(0, 0), (1, 0)]))


class ClearTests(unittest.TestCase):
    def test_full_row_drops_the_cells_above_it(self):
        board = Board(rows=4, cols=4)
        board.grid[3] = [1, 1, 1, 1]
        board.grid[2][0] = 1
        self.assertEqual(board.clear_lines(), 1)
        self.assertEqual(board.grid[3][0], 1)
        self.assertEqual(sum(sum(row) for row in board.grid), 1)

    def test_drop_lands_on_the_floor_and_on_a_stack(self):
        board = Board(rows=6, cols=4)
        landed = board.drop([(0, 0), (1, 0), (0, 1), (1, 1)])
        self.assertEqual(max(y for _x, y in landed), 5)
        board.grid[5] = [1, 1, 1, 1]
        landed = board.drop([(0, 0), (1, 0)])
        self.assertTrue(all(y == 4 for _x, y in landed))


class HeuristicTests(unittest.TestCase):
    def test_formula_penalises_holes_height_and_bumps(self):
        board = Board(rows=4, cols=3)
        board.grid[3] = [1, 0, 1]
        board.grid[2] = [1, 0, 0]
        heights = column_heights(board.grid)
        self.assertEqual(heights, [2, 0, 1])
        self.assertEqual(count_holes(board.grid, heights), 0)
        self.assertEqual(bumpiness(heights), 3)
        # One hole under a cap.
        board.grid[2][1] = 1
        board.grid[3][1] = 0
        heights = column_heights(board.grid)
        self.assertEqual(count_holes(board.grid, heights), 1)
        value = placement_value(board, lines=2, line_reward=8)
        self.assertEqual(value, 16 - sum(heights) - 1 - bumpiness(heights) - max(heights))

    def test_search_takes_a_line_clear_with_the_i_piece(self):
        board = Board()
        board.grid[board.rows - 1] = [0, 0, 0, 0, 1, 1, 1, 1, 1, 1]
        chosen = best_placement(board, "I")
        self.assertIsNotNone(chosen)
        self.assertEqual(chosen.x, 0)
        self.assertEqual(chosen.lines, 1)
        self.assertGreater(chosen.value, 0)

    def test_lookahead_runs_and_stays_in_bounds(self):
        chosen = best_placement(Board(), "T", next_piece="O")
        self.assertIsNotNone(chosen)
        xs = [x for x, _y in chosen.cells]
        ys = [y for _x, y in chosen.cells]
        self.assertTrue(all(0 <= x < 10 for x in xs))
        self.assertTrue(all(0 <= y < 17 for y in ys))


if __name__ == "__main__":
    unittest.main()
