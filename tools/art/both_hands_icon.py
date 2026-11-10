#!/usr/bin/env python3
# The Both Hands perk icon (0.19): the Hot Swap Wick with a sword drawn into its open hand.
# Run: python3 tools/art/both_hands_icon.py art/icons/perks/hot-swap.png art/icons/perks/both-hands.png
import sys, math
from PIL import Image, ImageDraw, ImageFilter, ImageChops
src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGBA'); W = im.size[0]; a = im.split()[3]
d = ImageDraw.Draw(a)
# the "swap" tick marks by the open hand go: a sword stands there instead
d.polygon([(120, 380), (240, 380), (240, 480), (215, 520), (120, 520)], fill=0)
K = 4; big = Image.new('L', (W * K, W * K), 0); g = ImageDraw.Draw(big)
hx, hy, ang = 232, 512, math.radians(-24)   # the hand, and the blade's lean (up and to the left)
def P(along, across):  # along the blade from the hand, across it
    ux, uy = math.sin(ang), -math.cos(ang); vx, vy = math.cos(ang), math.sin(ang)
    return ((hx + ux * along + vx * across) * K, (hy + uy * along + vy * across) * K)
g.polygon([P(-70, -15), P(-70, 15), P(40, 15), P(40, -15)], fill=255)                      # grip
g.ellipse([P(-88, 0)[0] - 26 * K, P(-88, 0)[1] - 26 * K, P(-88, 0)[0] + 26 * K, P(-88, 0)[1] + 26 * K], fill=255)  # pommel
g.polygon([P(40, -78), P(40, 78), P(74, 78), P(74, -78)], fill=255)                        # guard
g.polygon([P(96, -40), P(96, 40), P(360, 40), P(430, 0), P(360, -40)], fill=255)           # blade
g.line([P(120, 0), P(350, 0)], fill=0, width=9 * K)                                        # the fuller
sword = big.resize((W, W), Image.LANCZOS)
keep = a.point(lambda v: 255 if v > 40 else 0).filter(ImageFilter.MaxFilter(25))            # Wick, grown: the dark line between
sword = ImageChops.multiply(sword, ImageChops.invert(keep))
a = ImageChops.lighter(a, sword)
Image.merge('RGBA', (Image.new('L', im.size, 255),) * 3 + (a,)).save(out)
