"""Real (XTEST) mouse click on the X display, so Chrome moves keyboard focus from its address bar
into the page. CDP clicks reach the page but never change the browser's own focus.
Usage: python3 xclick.py X Y"""
import sys
import time

from Xlib import X, display
from Xlib.ext import xtest

d = display.Display()
x, y = int(sys.argv[1]), int(sys.argv[2])
root = d.screen().root
root.warp_pointer(x, y)
d.sync()
xtest.fake_input(d, X.ButtonPress, 1)
d.sync()
time.sleep(0.05)
xtest.fake_input(d, X.ButtonRelease, 1)
d.sync()
