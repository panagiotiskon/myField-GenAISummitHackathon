"""Play one local round of Jackaroo Tetrix.

Playwright launches its own Chromium. The bot reads the WebGL canvas, picks
a landing with the starter heuristic, and sends arrow keys and Space.

It does not enter a username, does not open the leaderboard, and blocks the
hosts that would register a round or submit a score. Nothing is sent to the
leaderboard.

By default it waits until you press START in the browser. STOP, or the 120s
clock, ends the round. Ctrl+C stops it as well.
"""

from __future__ import annotations

import argparse
import asyncio
import base64
import sys
import time

import numpy as np

from config import (
    BLOCKED_HOST_MARKERS,
    GAME_URL,
    KEY_GAP_MS,
    ROUND_SECONDS,
    SOFT_DROP_MAX_MS,
    SOFT_DROP_POLL_MS,
    VIEWPORT_HEIGHT,
    VIEWPORT_WIDTH,
)
from strategy import choose_move
from vision import (
    find_slow_button,
    find_yellow_button,
    game_controls_visible,
    geometry_for_canvas,
    piece_identity,
    read_board,
)

CONTROL_CSS = """
#jt-bot-bar {
  position: fixed;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2147483647;
  display: flex;
  gap: 10px;
  align-items: center;
  background: #140c0c;
  color: #fff8e8;
  border: 3px solid #fdcd07;
  border-radius: 14px;
  padding: 8px 12px;
  font: 700 16px/1.2 system-ui, sans-serif;
  box-shadow: 0 8px 24px #000a;
}
#jt-bot-bar button {
  font: 800 18px/1 system-ui, sans-serif;
  border: 0;
  border-radius: 10px;
  padding: 10px 18px;
  cursor: pointer;
}
#jt-start { background: #7dff6b; color: #10200c; }
#jt-stop { background: #ff4d4d; color: #2a0000; }
#jt-status { min-width: 180px; }
"""

INSTALL_CONTROLS = """
() => {
  if (document.getElementById('jt-bot-bar')) return;
  const style = document.createElement('style');
  style.textContent = %s;
  document.documentElement.appendChild(style);
  const hide = document.createElement('style');
  hide.textContent = '.game-overlay,.toggle-btn,.leaderboard-sidebar,.play-timer-badge,.timesup-overlay,.score-notification,.mode-reminder-banner{display:none !important}';
  document.documentElement.appendChild(hide);
  const bar = document.createElement('div');
  bar.id = 'jt-bot-bar';
  bar.innerHTML = '<button id="jt-start" type="button">START</button>'
    + '<button id="jt-stop" type="button">STOP</button>'
    + '<span id="jt-status">Press START</span>';
  document.body.appendChild(bar);
  window.__jtStart = false;
  window.__jtStop = false;
  document.getElementById('jt-start').onclick = () => {
    window.__jtStart = true;
    document.getElementById('jt-status').textContent = 'Starting';
  };
  document.getElementById('jt-stop').onclick = () => {
    window.__jtStop = true;
    document.getElementById('jt-status').textContent = 'Stopping';
  };
}
""" % repr(CONTROL_CSS)

READ_CANVAS = """
() => {
  const src = document.querySelector('#embed-html canvas');
  if (!src || !src.width || !src.height) return null;
  const copy = document.createElement('canvas');
  copy.width = src.width;
  copy.height = src.height;
  const ctx = copy.getContext('2d', { willReadFrequently: true });
  try { ctx.drawImage(src, 0, 0); }
  catch (err) { return null; }
  return copy.toDataURL('image/png');
}
"""


def _blocked(url: str) -> bool:
    host = url.split("/")[2] if "://" in url else url
    return any(marker in host for marker in BLOCKED_HOST_MARKERS)


def _decode_frame(data_url: str) -> np.ndarray | None:
    import cv2

    raw = base64.b64decode(data_url.split(",", 1)[1])
    return cv2.imdecode(np.frombuffer(raw, dtype=np.uint8), cv2.IMREAD_COLOR)


class Bot:
    def __init__(self, headless: bool, auto_start: bool, seconds: float):
        self.headless = headless
        self.auto_start = auto_start
        self.seconds = seconds
        self.page = None
        self.stopped = False
        self.expected_lines = 0
        self.pieces = 0
        self.geom = None

    async def run(self) -> int:
        from playwright.async_api import async_playwright

        async with async_playwright() as playwright:
            browser = await playwright.chromium.launch(headless=self.headless)
            page = await browser.new_page(
                viewport={"width": VIEWPORT_WIDTH, "height": VIEWPORT_HEIGHT},
                device_scale_factor=1,
            )
            self.page = page
            await self._install_routes(page)
            print(f"Opening {GAME_URL}")
            await page.goto(GAME_URL, wait_until="domcontentloaded", timeout=60000)
            await page.wait_for_selector("#embed-html canvas", timeout=30000)
            await page.evaluate(INSTALL_CONTROLS)
            if self.auto_start:
                await page.evaluate("window.__jtStart = true")
            else:
                print("Press the green START button in the game window. STOP ends the round.")
            await self._wait_until_started()
            if self.stopped:
                await browser.close()
                return 0
            await self._enter_game()
            await self._play_round()
            await self._set_status("Stopped")
            print(
                f"Stopped. Pieces the bot tried to place: {self.pieces}. "
                f"Line clears the search expected (not the on-screen score): {self.expected_lines}."
            )
            await page.wait_for_timeout(400)
            await browser.close()
        return 0

    async def _install_routes(self, page) -> None:
        async def handle(route):
            if _blocked(route.request.url):
                await route.abort()
            else:
                await route.continue_()

        await page.route("**/*", handle)

        if hasattr(page, "route_web_socket"):
            # HTTP routing does not see websockets. Connect everything except
            # the leaderboard hosts, which are never handed a server socket.
            def handle_socket(ws):
                if not _blocked(ws.url):
                    ws.connect_to_server()

            await page.route_web_socket("**/*", handle_socket)

    async def _wait_until_started(self) -> None:
        while not self.stopped:
            flags = await self.page.evaluate("[window.__jtStart === true, window.__jtStop === true]")
            if flags[1]:
                self.stopped = True
                return
            if flags[0]:
                return
            await self.page.wait_for_timeout(100)

    async def _stopped_now(self) -> bool:
        if self.stopped:
            return True
        try:
            if await self.page.evaluate("window.__jtStop === true"):
                self.stopped = True
        except Exception:
            self.stopped = True
        return self.stopped

    async def _set_status(self, text: str) -> None:
        try:
            await self.page.evaluate(
                "(t) => { const n = document.getElementById('jt-status'); if (n) n.textContent = t; }",
                text,
            )
        except Exception:
            pass

    async def _frame(self):
        data = await self.page.evaluate(READ_CANVAS)
        if not data:
            return None
        image = _decode_frame(data)
        if image is None:
            return None
        self.geom = geometry_for_canvas(image.shape[1], image.shape[0])
        return image

    async def _click_canvas(self, point) -> None:
        if point is None:
            return
        box = await self.page.locator("#embed-html canvas").first.bounding_box()
        if not box or self.geom is None:
            return
        image = await self._frame()
        if image is None:
            return
        sx = box["width"] / image.shape[1]
        sy = box["height"] / image.shape[0]
        await self.page.mouse.click(box["x"] + point[0] * sx, box["y"] + point[1] * sy)

    async def _enter_game(self) -> None:
        await self._set_status("Entering game")
        for _ in range(20):
            if await self._stopped_now():
                return
            image = await self._frame()
            if image is None:
                await self.page.wait_for_timeout(200)
                continue
            # The title logo can look like tiles. Trust the screen only when
            # the in-game buttons are up and the speed menu is gone.
            if game_controls_visible(image):
                print(f"Canvas {image.shape[1]}×{image.shape[0]}. Playfield is up.")
                return
            slow = find_slow_button(image)
            if slow is not None:
                print("Clicking SLOW. Down is a soft drop on this screen; SLOW leaves time to read the board.")
                await self._click_canvas(slow)
                await self.page.wait_for_timeout(900)
                continue
            play = find_yellow_button(image)
            if play is not None:
                print("Clicking PLAY.")
                await self._click_canvas(play)
                await self.page.wait_for_timeout(800)
                continue
            await self.page.wait_for_timeout(200)
        print("Could not find PLAY, SLOW, or a live piece.")

    async def _focus_canvas(self) -> None:
        await self.page.locator("#embed-html canvas").first.evaluate(
            "el => { el.tabIndex = 0; el.focus(); }"
        )

    async def _tap(self, key: str) -> None:
        await self._focus_canvas()
        await self.page.keyboard.press(key)
        await self.page.wait_for_timeout(KEY_GAP_MS)

    async def _play_round(self) -> None:
        deadline = time.monotonic() + self.seconds
        await self._focus_canvas()
        print(f"Round clock started ({self.seconds:.0f}s).")
        last_cells = None
        while not await self._stopped_now():
            left = deadline - time.monotonic()
            if left <= 0:
                print("Round clock finished.")
                self.stopped = True
                break
            await self._set_status(f"{left:0.0f}s  pieces {self.pieces}")
            image = await self._frame()
            if image is None:
                await self.page.wait_for_timeout(40)
                continue
            _fills, piece, stack = read_board(image, self.geom)
            if piece is None or piece["y"] > 8:
                # Wait until a piece is high enough that we still have time to move it.
                # A piece already on the stack is left alone.
                await self.page.wait_for_timeout(30)
                continue
            signature = tuple(sorted(piece["cells"]))
            if signature == last_cells:
                await self.page.wait_for_timeout(40)
                continue
            last_cells = signature
            placement = choose_move(stack, piece["cells"])
            if placement is None:
                await self.page.wait_for_timeout(30)
                continue
            self.pieces += 1
            self.expected_lines += placement.lines
            print(
                f"Piece {piece['name']} at x={piece['x']} y={piece['y']} "
                f"-> x={placement.x} rot={placement.rotation} "
                f"value={placement.value:.1f} expected_lines={placement.lines}"
            )
            await self._steer(piece, placement)
            await self._soft_drop(placement)

    async def _steer(self, piece, placement) -> None:
        target_shape = placement.shape
        for _ in range(4):
            if await self._stopped_now():
                return
            if piece_identity(piece["cells"]) == target_shape:
                break
            await self._tap("Space")
            piece = await self._current_piece() or piece
        if piece_identity(piece["cells"]) != target_shape:
            return
        for _ in range(12):
            if await self._stopped_now():
                return
            fresh = await self._current_piece()
            if fresh is None:
                return
            piece = fresh
            if piece["name"] != placement.name or piece["y"] > 10:
                return
            dx = placement.x - piece["x"]
            if dx == 0:
                return
            await self._tap("ArrowRight" if dx > 0 else "ArrowLeft")

    async def _current_piece(self):
        image = await self._frame()
        if image is None:
            return None
        _fills, piece, _stack = read_board(image, self.geom)
        return piece

    async def _soft_drop(self, placement) -> None:
        """Hold Down until the piece reaches the planned row, or the cap."""
        target_y = min(y for _x, y in placement.cells)
        await self._focus_canvas()
        await self.page.keyboard.down("ArrowDown")
        started = time.monotonic()
        seen_low = False
        try:
            while (time.monotonic() - started) * 1000 < SOFT_DROP_MAX_MS:
                if await self._stopped_now():
                    return
                piece = await self._current_piece()
                if piece is not None:
                    if piece["y"] >= 6:
                        seen_low = True
                    if piece["y"] >= target_y:
                        return
                    if seen_low and piece["y"] <= 2:
                        return
                await self.page.wait_for_timeout(SOFT_DROP_POLL_MS)
        finally:
            await self.page.keyboard.up("ArrowDown")


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Local Jackaroo Tetrix bot")
    parser.add_argument("--headless", action="store_true", help="Run Chromium headless")
    parser.add_argument(
        "--auto-start",
        action="store_true",
        help="Start the round without waiting for the START button",
    )
    parser.add_argument(
        "--seconds",
        type=float,
        default=ROUND_SECONDS,
        help=f"Stop when this many seconds of play have elapsed (default {ROUND_SECONDS})",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(sys.argv[1:] if argv is None else argv)
    bot = Bot(headless=args.headless, auto_start=args.auto_start, seconds=args.seconds)
    try:
        return asyncio.run(bot.run())
    except KeyboardInterrupt:
        print("Stopped from the terminal.")
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
