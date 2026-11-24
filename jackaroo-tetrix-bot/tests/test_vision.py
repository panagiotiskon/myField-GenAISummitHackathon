import unittest

import numpy as np

from vision import (
    cell_fills,
    find_slow_button,
    find_yellow_button,
    game_controls_visible,
    locate_piece,
    read_board,
    reference_geometry,
    stack_from_fills,
)


def paint(cells, fill_bgr=(30, 30, 220), home=False):
    """Dark starfield with saturated tiles on the measured grid."""
    geom = reference_geometry()
    image = np.zeros((950, 470, 3), dtype=np.uint8)
    image[:, :] = (12, 10, 14)
    image[:52] = (34, 34, 34)
    image[900:] = (34, 34, 34)
    for x, y in cells:
        x0 = geom.origin_x + x * geom.cell_w
        y0 = geom.origin_y + y * geom.cell_h
        image[y0 + 3 : y0 + geom.cell_h - 3, x0 + 3 : x0 + geom.cell_w - 3] = fill_bgr
    if home:
        image[78:112, 414:468] = (20, 120, 240)
    # White "Score: 0" over the top-left cells. Saturation is zero.
    image[70:88, 8:90] = (240, 240, 240)
    return image


class VisionTests(unittest.TestCase):
    def test_reads_a_j_and_ignores_score_text_and_home_button(self):
        cells = [(0, 0), (0, 1), (1, 1), (2, 1)]
        image = paint(cells, home=True)
        _fills, piece, stack = read_board(image)
        self.assertIsNotNone(piece)
        self.assertEqual(piece["name"], "J")
        self.assertEqual(sorted(piece["cells"]), sorted(cells))
        self.assertEqual(sum(sum(row) for row in stack), 0)

    def test_partial_spawn_is_not_a_piece(self):
        image = paint([(5, 0), (6, 0)])
        fills = cell_fills(image)
        self.assertIsNone(locate_piece(fills))

    def test_stack_excludes_the_live_piece(self):
        live = [(4, 2), (3, 3), (4, 3), (5, 3)]
        locked = [(0, 16), (1, 16), (2, 16)]
        image = paint(live + locked)
        fills, piece, stack = read_board(image)
        self.assertEqual(piece["name"], "T")
        for x, y in locked:
            self.assertEqual(stack[y][x], 1)
        for x, y in live:
            self.assertEqual(stack[y][x], 0)

    def test_home_cell_fill_is_forced_empty(self):
        image = paint([], home=True)
        fills = cell_fills(image)
        self.assertEqual(float(fills[0, 9]), 0.0)

    def test_yellow_and_slow_buttons(self):
        image = np.zeros((950, 470, 3), dtype=np.uint8)
        image[:, :] = (12, 10, 14)
        # Yellow PLAY.
        image[590:658, 130:340] = (20, 200, 240)
        play = find_yellow_button(image)
        self.assertIsNotNone(play)
        self.assertAlmostEqual(play[0], 235, delta=20)
        # Two orange speed buttons, SLOW above MEDIUM.
        image[700:748, 160:300] = (20, 100, 230)
        image[760:808, 160:300] = (20, 90, 220)
        slow = find_slow_button(image)
        self.assertIsNotNone(slow)
        self.assertLess(slow[1], 750)

    def test_game_controls_are_the_bottom_green_buttons(self):
        image = np.zeros((950, 470, 3), dtype=np.uint8)
        self.assertFalse(game_controls_visible(image))
        image[840:890, 10:70] = (20, 220, 40)
        image[840:890, 390:450] = (20, 220, 40)
        self.assertTrue(game_controls_visible(image))

    def test_stack_threshold_ignores_a_faint_cell(self):
        fills = np.zeros((17, 10), dtype=np.float32)
        fills[16, 0] = 0.9
        fills[16, 1] = 0.2
        stack = stack_from_fills(fills, None)
        self.assertEqual(stack[16][0], 1)
        self.assertEqual(stack[16][1], 0)


if __name__ == "__main__":
    unittest.main()
