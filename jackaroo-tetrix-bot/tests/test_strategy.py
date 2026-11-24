import unittest

from board import Board
from strategy import choose_move


class ChooseMoveTests(unittest.TestCase):
    def test_empty_well_returns_a_placement_for_a_live_j(self):
        # Spawn-style J, left edge at column 3:
        # .#..
        # ###.
        cells = [(3, 0), (3, 1), (4, 1), (5, 1)]
        stack = [[0] * 10 for _ in range(17)]
        move = choose_move(stack, cells)
        self.assertIsNotNone(move)
        self.assertEqual(move.name, "J")
        self.assertGreaterEqual(move.value, -100)

    def test_unknown_blob_is_not_a_move(self):
        self.assertIsNone(choose_move([[0]], [(0, 0), (1, 0), (2, 0)]))

    def test_stack_is_not_mutated(self):
        stack = [[0] * 10 for _ in range(17)]
        stack[16][0] = 1
        choose_move(stack, [(4, 0), (3, 1), (4, 1), (5, 1)])
        self.assertEqual(stack[16][0], 1)
        self.assertEqual(sum(sum(row) for row in stack), 1)


class BoardSizeTests(unittest.TestCase):
    def test_default_board_matches_the_measured_well(self):
        board = Board()
        self.assertEqual(board.cols, 10)
        self.assertEqual(board.rows, 17)


if __name__ == "__main__":
    unittest.main()
