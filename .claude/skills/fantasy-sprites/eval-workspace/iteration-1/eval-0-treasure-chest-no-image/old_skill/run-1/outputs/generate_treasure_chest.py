#!/usr/bin/env python3
"""
Treasure chest sprite generator - fantasy-sprites skill (purple-blue set).

Draws a 32x32 closed treasure chest:
- Rounded purple wood lid with smooth row-gradient shading
- Purple-blue metal banding (rim + two vertical straps)
- Gold lock plate with dark keyhole (treasure accent per items.md)
- Cream (#e2e0b8) specular highlights
- Transparent background, exported at 1x
"""

from PIL import Image


def lerp(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


# --- Palette (from SKILL.md / example sprites) -------------------------------
OUTLINE     = (11, 3, 40)        # 0b0328 deep dark
WOOD_DARK   = (40, 28, 89)       # 281c59
WOOD_MID    = (61, 52, 103)      # 3d3467
WOOD_LIGHT  = (83, 74, 129)      # 534a81
WOOD_TOP    = (105, 87, 145)     # 695791
METAL_DARK  = (47, 34, 100)      # 2f2264
METAL_MID   = (103, 86, 144)     # 675690
METAL_LIGHT = (128, 126, 179)    # 807eb3
CREAM       = (226, 224, 184)    # e2e0b8 highlight
GOLD_DARK   = (122, 92, 38)
GOLD_MID    = (196, 156, 62)
GOLD_LIGHT  = (236, 212, 130)

W = H = 32
img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
px = img.load()


def put(x, y, c, a=255):
    if 0 <= x < W and 0 <= y < H:
        px[x, y] = (c[0], c[1], c[2], a)


# --- Geometry ----------------------------------------------------------------
# Lid arc: for each row, the left/right extent of the lid
LID_SPAN = {
    4:  (9, 22),
    5:  (6, 25),
    6:  (4, 27),
    7:  (3, 28),
    8:  (2, 29),
    9:  (1, 30), 10: (1, 30), 11: (1, 30), 12: (1, 30), 13: (1, 30),
}
RIM_Y = (14, 15)          # metal rim between lid and body
BODY_Y = range(16, 29)    # body rows
BODY_X = (1, 30)
STRAP_L = (5, 7)          # vertical metal straps (inclusive x ranges)
STRAP_R = (24, 26)
LOCK_X = (13, 18)
LOCK_Y = (12, 19)

def in_strap(x):
    return STRAP_L[0] <= x <= STRAP_L[1] or STRAP_R[0] <= x <= STRAP_R[1]

def in_lock(x, y):
    return LOCK_X[0] <= x <= LOCK_X[1] and LOCK_Y[0] <= y <= LOCK_Y[1]


# --- Lid (wood, vertical gradient, curved) -----------------------------------
for y, (x0, x1) in LID_SPAN.items():
    t = (y - 4) / (13 - 4)                      # 0 top -> 1 bottom
    base = lerp(WOOD_TOP, WOOD_MID, t)
    for x in range(x0, x1 + 1):
        edge = x == x0 or x == x1 or y == 4
        c = base
        # left-lit shading across the curve
        if x <= x0 + 2 and y <= 8:
            c = lerp(base, WOOD_LIGHT, 0.6)
        if x >= x1 - 2:
            c = lerp(base, WOOD_DARK, 0.5)
        if edge:
            c = OUTLINE
        put(x, y, c)

# wood grain lines on lid
for x in range(2, 30):
    if not in_strap(x):
        put(x, 10, lerp(WOOD_MID, WOOD_DARK, 0.55))

# --- Rim (metal lip between lid and body) -------------------------------------
for y in RIM_Y:
    for x in range(0, 32):
        if x in (0, 31):
            put(x, y, OUTLINE)
        elif y == RIM_Y[0]:
            put(x, y, METAL_LIGHT if 2 <= x <= 12 else METAL_MID)
        else:
            put(x, y, METAL_DARK)

# --- Body (wood planks) --------------------------------------------------------
for y in BODY_Y:
    t = (y - 16) / (28 - 16)
    base = lerp(WOOD_MID, WOOD_DARK, t)
    for x in range(BODY_X[0], BODY_X[1] + 1):
        edge = x == BODY_X[0] or x == BODY_X[1] or y == 28
        c = base
        if x <= BODY_X[0] + 2:
            c = lerp(base, WOOD_LIGHT, 0.45)
        if x >= BODY_X[1] - 2:
            c = lerp(base, OUTLINE, 0.35)
        if edge:
            c = OUTLINE
        put(x, y, c)

# plank separation lines
for yline in (20, 24):
    for x in range(2, 30):
        if not in_strap(x):
            put(x, yline, lerp(WOOD_DARK, OUTLINE, 0.45))

# --- Vertical metal straps ------------------------------------------------------
for (sx0, sx1) in (STRAP_L, STRAP_R):
    for y in list(LID_SPAN.keys()) + list(RIM_Y) + list(BODY_Y):
        if y in LID_SPAN:
            x0, x1 = LID_SPAN[y]
            if sx1 < x0 or sx0 > x1:
                continue
        for x in range(sx0, sx1 + 1):
            if y == 28:
                put(x, y, OUTLINE)
                continue
            if x == sx0:
                put(x, y, METAL_LIGHT)
            elif x == sx1:
                put(x, y, METAL_DARK)
            else:
                put(x, y, METAL_MID)
    # rivets (cream glints)
    put(sx0 + 1, 6, CREAM)
    put(sx0 + 1, 18, CREAM)
    put(sx0 + 1, 26, lerp(CREAM, METAL_MID, 0.35))

# --- Lock plate (gold accent) ----------------------------------------------------
for y in range(LOCK_Y[0], LOCK_Y[1] + 1):
    for x in range(LOCK_X[0], LOCK_X[1] + 1):
        edge = (x in (LOCK_X[0], LOCK_X[1])) or (y in (LOCK_Y[0], LOCK_Y[1]))
        if edge:
            put(x, y, GOLD_DARK)
        else:
            t = (y - LOCK_Y[0]) / (LOCK_Y[1] - LOCK_Y[0])
            put(x, y, lerp(GOLD_LIGHT, GOLD_MID, t))
# rounded corners of the lock plate
for (cx, cy) in ((LOCK_X[0], LOCK_Y[0]), (LOCK_X[1], LOCK_Y[0]),
                 (LOCK_X[0], LOCK_Y[1]), (LOCK_X[1], LOCK_Y[1])):
    nx = cx + (1 if cx == LOCK_X[0] else -1)
    base = px[nx, cy][:3]
    put(cx, cy, lerp(GOLD_DARK, OUTLINE, 0.5), a=255)
# keyhole: round top, flared base
put(15, 14, OUTLINE); put(16, 14, OUTLINE)
put(14, 15, OUTLINE); put(15, 15, OUTLINE); put(16, 15, OUTLINE); put(17, 15, OUTLINE)
put(15, 16, OUTLINE); put(16, 16, OUTLINE)
put(14, 17, OUTLINE); put(15, 17, OUTLINE); put(16, 17, OUTLINE); put(17, 17, OUTLINE)
# gold glint
put(14, 13, CREAM)
put(17, 18, lerp(GOLD_LIGHT, CREAM, 0.5))

# --- Cream highlight along the lid arc (top-left light) ---------------------------
for (x, y) in ((9, 5), (10, 5), (11, 5), (12, 5), (7, 6), (8, 6), (5, 7), (6, 7), (4, 8), (4, 9)):
    if not in_strap(x) and not in_lock(x, y):
        put(x, y, lerp(CREAM, WOOD_TOP, 0.35))

# --- Feet ---------------------------------------------------------------------------
for (fx0, fx1) in ((3, 6), (25, 28)):
    for x in range(fx0, fx1 + 1):
        put(x, 29, OUTLINE)
        if fx0 < x < fx1:
            put(x, 28, METAL_DARK)

# --- Soft anti-aliased corner pixels (modern retro smoothing) -----------------------
for (x, y) in ((8, 4), (23, 4), (5, 5), (26, 5), (3, 6), (28, 6), (2, 7), (29, 7), (1, 8), (30, 8)):
    put(x, y, OUTLINE, a=140)
put(0, 14, OUTLINE, a=160); put(31, 14, OUTLINE, a=160)
put(0, 15, OUTLINE, a=160); put(31, 15, OUTLINE, a=160)

OUT = "/Users/jelle.vanelburg/fantasy-sprites/eval-workspace/iteration-1/treasure-chest-no-image/old_skill/outputs/treasure_chest.png"
img.save(OUT)

# 8x preview for inspection only
img.resize((W * 8, H * 8), Image.NEAREST).save(OUT.replace(".png", "_preview_8x.png"))
print("saved", OUT)
