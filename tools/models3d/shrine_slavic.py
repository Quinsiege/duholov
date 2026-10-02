# Капище (славянское святилище): два резных идола-столба с лицами, балка с завитками, флажок, знак-коловрат,
# костёр со священным сиреневым пламенем на каменной площадке. Лицом к −Y.
# Части для three.js: stone_*, wood_*, eye_*, gold_*, flag, sign, log_*, flame_out, flame_in, spark_*

sc = new_scene('shrine_slavic')
STONE_D = mat('shrine_stone_dark', '#3b3848', rough=0.75)
STONE = mat('shrine_stone', '#8d8a9c', rough=0.65)
WOOD = mat('wood', '#a8642d', rough=0.6)
WOOD_D = mat('wood_dark', '#3b1f0e', rough=0.8)
TAN = mat('wood_tan', '#efc27a', rough=0.5)
EYE = mat('eye_violet', '#a78bfa', rough=0.3, emit='#a855f7', strength=0.9)
FLAG = mat('flag_violet', '#b794f6', rough=0.5, emit='#a78bfa', strength=0.4, cull=False)
SIGN = mat('sign_violet', '#c084fc', rough=0.3, emit='#a855f7', strength=1.1)
FLAME_O = mat('flame_out', '#8b5cf6', rough=0.2, emit='#8b5cf6', strength=1.3, alpha=0.9)
FLAME_I = mat('flame_in', '#f5f3ff', rough=0.2, emit='#ede9fe', strength=1.6)
SPARK = mat('spark_violet', '#c4b5fd', emit='#a855f7', strength=1.2)

# площадка: тёмное нижнее кольцо, светлый камень, тёмная середина
base_lo = lathe('stone_base', [(0, 0), (1.42, 0), (1.47, 0.03), (1.47, 0.12), (1.40, 0.15), (0, 0.15)], 40, STONE_D)
base_hi = lathe('stone_top', [(0, 0.14), (1.30, 0.14), (1.32, 0.17), (1.30, 0.24), (1.24, 0.26), (0, 0.26)], 40, STONE)
hearth = lathe('stone_hearth', [(0, 0.255), (0.92, 0.255), (0.9, 0.275), (0, 0.275)], 32, STONE_D)
# зарубки на камне по кругу
for k in range(10):
    a = 2 * math.pi * (k + 0.5) / 10
    n = prim('cube', f'stone_notch_{k}', STONE_D, size=1, location=(1.12 * math.cos(a), 1.12 * math.sin(a), 0.262))
    n.scale = (0.05, 0.16, 0.01)
    n.rotation_euler = (0, 0, a + math.pi / 2)

posts = []
for side in (-1, 1):
    x = 1.0 * side
    # столб-идол: цилиндр со скруглённой макушкой под балкой
    post = lathe(f'wood_post_{"l" if side < 0 else "r"}', [(0.25, 0.24), (0.26, 0.5), (0.255, 1.6), (0.25, 2.25), (0.235, 2.38), (0.18, 2.48), (0.0, 2.52)], 16, WOOD)
    post.location.x = x
    posts.append(post)
    # тёмные желобки и жёлтый зигзаг
    for z in (1.08, 1.72, 2.26):
        g = prim('torus', f'wood_groove_{side}_{z}', WOOD_D, smooth=True, major_radius=0.258, minor_radius=0.022, major_segments=12, minor_segments=3, location=(x, 0, z))
    zig = []
    for k in range(25):
        a = 2 * math.pi * k / 24
        zig.append((x + 0.262 * math.cos(a), 0.262 * math.sin(a), 1.40 + (0.09 if k % 2 else -0.09)))
    tube(f'gold_zigzag_{side}', zig, 0.024, TAN, sides=5)
    # лицо: два светящихся глаза и улыбка (к −Y)
    for ex in (-0.085, 0.085):
        e = prim('ico_sphere', f'eye_{side}_{ex}', EYE, smooth=True, subdivisions=1, radius=0.055, location=(x + ex, -0.235, 2.02))
        e.scale = (1, 0.45, 1)
    smile = [(x + 0.11 * math.cos(t), -0.248 - 0.012 * math.sin(t), 1.9 - 0.045 * math.sin(t)) for t in [math.pi * (0.15 + 0.7 * u / 6) for u in range(7)]]
    tube(f'wood_smile_{side}', smile, 0.016, WOOD_D, sides=5)

# балка: брус с приподнятыми концами и завитками
lintel = prim('cube', 'wood_lintel', WOOD, size=1, location=(0, 0, 2.6))
lintel.scale = (2.6, 0.42, 0.28)
bevel(lintel, 0.04, 2)
for side in (-1, 1):
    tip = prim('cube', f'wood_tip_{side}', WOOD, size=1, location=(side * 1.42, 0, 2.66))
    tip.scale = (0.36, 0.38, 0.22)
    tip.rotation_euler = (0, side * math.radians(-18), 0)
    bevel(tip, 0.035, 2)
    # завиток: спираль вверх-наружу
    sp = []
    for k in range(22):
        t = k / 21
        ang = math.radians(-60) + t * math.radians(380)
        r = 0.17 * (1 - 0.72 * t)
        sp.append((side * (1.58 + 0.06 + r * math.cos(ang) * 1.0), 0.0, 2.92 + r * math.sin(ang)))
    tube(f'wood_curl_{side}', sp, 0.05, WOOD_D, sides=6, taper=lambda u: 1.0 - 0.55 * u)
# насечки по брусу (светлый пунктир)
for k in range(9):
    d = prim('cube', f'gold_dash_{k}', TAN, size=1, location=(-0.96 + 0.24 * k, -0.215, 2.62))
    d.scale = (0.11, 0.02, 0.035)
# флажок на древке
pole = prim('cylinder', 'wood_pole', WOOD_D, vertices=8, radius=0.025, depth=0.72, location=(0, 0, 3.08))
bm = bmesh.new()
v = [bm.verts.new(p) for p in ((0.02, 0, 3.42), (0.48, 0, 3.27), (0.02, 0, 3.12))]
f = bm.faces.new(v)
bmesh.ops.solidify(bm, geom=[f], thickness=0.025)
flag = obj_from_bm('flag', bm, [FLAG], smooth=False)
# знак-коловрат под балкой: круг с крестом
ring = prim('torus', 'sign_ring', SIGN, smooth=True, major_radius=0.17, minor_radius=0.03, major_segments=24, minor_segments=6, location=(0, -0.05, 2.17))
ring.rotation_euler = (math.pi / 2, 0, 0)
for rot in (0, math.pi / 2):
    bar = prim('cube', f'sign_bar_{int(rot * 10)}', SIGN, size=1, location=(0, -0.05, 2.17))
    bar.scale = (0.3, 0.05, 0.05)
    bar.rotation_euler = (0, rot, 0)
# костёр: два бревна крест-накрест и пламя
for k, a in enumerate((math.radians(25), math.radians(-25))):
    lg = prim('cylinder', f'log_{k}', WOOD_D, vertices=8, radius=0.07, depth=0.95, location=(0, 0, 0.35 + 0.03 * k))
    lg.rotation_euler = (math.pi / 2, 0, a + math.pi / 2)
flame_o = lathe('flame_out', [(0.0, 0.3), (0.2, 0.36), (0.26, 0.5), (0.22, 0.68), (0.14, 0.86), (0.06, 1.02), (0.0, 1.12)], 16, FLAME_O)
flame_i = lathe('flame_in', [(0.0, 0.34), (0.11, 0.38), (0.13, 0.48), (0.1, 0.6), (0.05, 0.72), (0.0, 0.78)], 12, FLAME_I)
flame_i.location.y = -0.08
# искры
for i, loc in enumerate(((-0.42, -0.1, 1.55), (0.36, -0.15, 1.78), (0.15, 0.1, 1.3))):
    prim('ico_sphere', f'spark_{i}', SPARK, smooth=True, subdivisions=1, radius=0.045 if i else 0.06, location=loc)

for o in posts + [base_lo, base_hi, lintel, flag, pole]:
    outline(o, 0.04)
for o in sc.objects:
    if o.name.startswith(('wood_tip', 'log_')):
        outline(o, 0.03)
outline(ring, 0.015)

preview_rig(target_z=1.55, dist=7.4, elev=18)
render(ROOT + r'\renders\shrine_slavic.png')
export_glb(ROOT + r'\glb\shrine_slavic.glb')
save_blend()
