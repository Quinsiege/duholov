# Врата Дуата (египетский Разлом): две песчаниковые башни-пилона со скошенными стенами и карнизами
# (бирюзовая полоса), между ними — ворота с карнизом и крылатым солнцем, в проёме — портал с вихрем;
# на пилонах — розовые анхи и тёмные иероглифы; внизу — песок. Лицом к −Y.
# Части: sand, pylon_*, cornice_*, stripe_*, gate_*, lintel, wing_*, sun_disc, ankh_*, glyph*, portal_disc, swirl

sc = new_scene('rift_egypt')
SAND = mat('sandstone', '#dba868', rough=0.8)
SAND_D = mat('sandstone_dark', '#c48a4a', rough=0.85)
SAND_L = mat('sandstone_light', '#ecc58a', rough=0.75)
DUNE = mat('dune', '#e9c58c', rough=0.95)
TEAL = mat('stripe_teal', '#0e7490', rough=0.5)
REVEAL = mat('gate_reveal', '#b9785a', rough=0.8)
GLYPH = mat('glyph_brown', '#5b3413', rough=0.8)
GOLD = mat('gold_bright', '#f7b733', rough=0.35, metal=0.35, emit='#f59e0b', strength=0.15)
PINK = mat('rift_pink', '#f472b6', rough=0.3, emit='#ec4899', strength=1.2)

# песок: низкая дюна под всем
dune = lathe('sand', [(0, 0.09), (1.6, 0.08), (2.25, 0.05), (2.4, 0.0), (0, 0.0)], 40, DUNE)
dune.data.transform(Matrix.Diagonal((1, 0.55, 1, 1)))


# пилоны: внутренняя стена почти отвесная, наружная, передняя и задняя — со скосом
PH = 2.75
solid = []
pylons = []
for sgn in (-1, 1):
    xs = sorted((sgn * 0.62, sgn * 1.95))
    xt = sorted((sgn * 0.64, sgn * 1.62))
    pl = frustum(f'pylon_{sgn}', SAND, xs[0], xs[1], -0.55, 0.55, 0.05, xt[0], xt[1], -0.42, 0.42, PH)
    bevel(pl, 0.02, 2)
    pylons.append(pl)
    cx = sgn * 1.13
    cor = frustum(f'cornice_{sgn}', SAND_L, cx - 0.56, cx + 0.56, -0.47, 0.47, PH, cx - 0.62, cx + 0.62, -0.53, 0.53, PH + 0.3)
    bevel(cor, 0.02, 2)
    solid += [pl, cor]
    box(f'stripe_{sgn}', TEAL, (cx, -0.5, PH + 0.17), (1.08, 0.05, 0.07))

# ворота: косяки, перемычка с крылатым солнцем, карниз
GW, GH, GY0, GY1 = 0.5, 1.95, -0.7, 0.5
for sgn in (-1, 1):
    j = box(f'gate_jamb_{sgn}', SAND_D, (sgn * (GW + 0.11), (GY0 + GY1) / 2, GH / 2 + 0.04), (0.22, GY1 - GY0, GH + 0.02), bev=0.02)
    solid.append(j)
    box(f'gate_reveal_{sgn}', REVEAL, (sgn * (GW - 0.005), (GY0 + GY1) / 2, GH / 2 + 0.04), (0.01, GY1 - GY0 - 0.04, GH - 0.02))
lintel = box('lintel', SAND, (0, (GY0 + GY1) / 2, GH + 0.25), (2 * GW + 0.5, GY1 - GY0, 0.42), bev=0.02)
gcor = frustum('gate_cornice', SAND_L, -0.82, 0.82, GY0 - 0.04, GY1, GH + 0.46, -0.9, 0.9, GY0 - 0.12, GY1 + 0.04, GH + 0.68)
bevel(gcor, 0.02, 2)
solid += [lintel, gcor]
# крылатое солнце: золотой диск и розовые крылья из перьев
yf = GY0 - 0.012
sun = prim('uv_sphere', 'sun_disc', GOLD, smooth=True, segments=16, ring_count=10, radius=0.13, location=(0, yf - 0.02, GH + 0.27))
sun.scale = (1, 0.45, 1)
WZ = GH + 0.27
for sgn in (-1, 1):
    # крыло — плоский веер (выпуклый многоугольник в плоскости XZ), толщиной 0.03 вглубь
    pts = [(0.15, WZ + 0.08), (0.4, WZ + 0.1), (0.64, WZ + 0.05), (0.62, WZ - 0.0), (0.4, WZ - 0.06), (0.15, WZ - 0.1)]
    bm = bmesh.new()
    fr = [bm.verts.new((sgn * x, yf - 0.015, z)) for x, z in pts]
    bk = [bm.verts.new((sgn * x, yf + 0.03, z)) for x, z in pts]
    bm.faces.new(fr)
    bm.faces.new(list(reversed(bk)))
    for k in range(len(pts)):
        j = (k + 1) % len(pts)
        bm.faces.new((fr[k], bk[k], bk[j], fr[j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    w = obj_from_bm(f'wing_{sgn}', bm, [PINK], smooth=False)
    solid.append(w)
    for k, (z0, z1) in enumerate(((WZ + 0.045, WZ + 0.06), (WZ - 0.0, WZ + 0.02), (WZ - 0.05, WZ - 0.02))):
        tube(f'wing_{sgn}_feather_{k}', [(sgn * 0.2, yf - 0.025, z0), (sgn * (0.56 - 0.05 * k), yf - 0.025, z1)], 0.011, GLYPH, sides=4, smooth=False)
# портал в проёме
disc, swirl = portal('portal', center=(0, GY0 + 0.15, GH / 2 + 0.04), w=GW, h=GH / 2, shape='square')

# знаки на пилонах (в плоскости скошенной грани): анх, иероглифы
def stroke(name, pts, m=GLYPH, r=0.024):
    return tube(name, [(x, 0, z) for x, z in pts], r, m, sides=4, smooth=False)

for sgn in (-1, 1):
    cx = sgn * 1.2
    p, n = surface_hit(pylons[0 if sgn < 0 else 1], (cx, -5, 1.4))
    parts = [stroke(f'ankh_{sgn}_loop', [(0.1 * math.cos(t), 0.27 + 0.13 * math.sin(t)) for t in [2 * math.pi * k / 20 for k in range(21)]], PINK, 0.035),
             stroke(f'ankh_{sgn}_bar', [(-0.17, 0.11), (0.17, 0.11)], PINK, 0.035),
             stroke(f'ankh_{sgn}_stem', [(0, 0.14), (0, -0.38)], PINK, 0.035),
             stroke(f'glyph_{sgn}_brow', [(-0.15, 1.06), (-0.05, 1.11), (0.06, 1.1), (0.15, 1.05)]),
             stroke(f'glyph_{sgn}_hook', [(-0.13, 0.94), (0.11, 0.94), (0.11, 0.84)]),
             stroke(f'glyph_{sgn}_cross_v', [(0, 0.55), (0, 0.73)]),
             stroke(f'glyph_{sgn}_cross_h', [(-0.09, 0.64), (0.09, 0.64)]),
             stroke(f'glyph_{sgn}_zig', [(-0.14, -0.66), (0.14, -0.66), (-0.08, -0.82), (0.14, -0.82)])]
    stick(f'signs_{sgn}', parts, p, n, lift=0.03)

outline(dune, 0.03)
for o in solid:
    outline(o, 0.03)

preview_rig(target_z=1.45, dist=8.2, elev=16)
render(ROOT + r'\renders\rift_egypt.png')
export_glb(ROOT + r'\glb\rift_egypt.glb')
save_blend()
