# Обелиск (египетское святилище): высокий песчаниковый обелиск с золотым пирамидионом на двухступенчатом
# основании, на лицевой грани — тёмные иероглифы и светящийся сиреневый картуш с анхом; по сторонам —
# медные чаши на подставках со священным пламенем. Лицом к −Y.
# Части: step_*, obelisk, pyramidion, glyph*, cartouche*, dash_*, stand_*, bowl_*, flame_*_out/in, spark_*

sc = new_scene('shrine_egypt')
SAND = mat('sandstone', '#dba868', rough=0.8)
SAND_D = mat('sandstone_dark', '#c48a4a', rough=0.85)
SAND_L = mat('sandstone_light', '#ecc58a', rough=0.75)
GOLD = mat('gold_bright', '#f7b733', rough=0.35, metal=0.35, emit='#f59e0b', strength=0.15)
GLYPH = mat('glyph_brown', '#5b3413', rough=0.8)
VIOLET = mat('sign_violet', '#c084fc', rough=0.3, emit='#a855f7', strength=1.1)
COPPER = mat('copper', '#c2410c', rough=0.4, metal=0.6)
SPARK = mat('spark_violet', '#c4b5fd', emit='#a855f7', strength=1.2)

# основание в две ступени, на верхней — пунктир
steps = [box('step_low', SAND_D, (0, 0, 0.12), (1.75, 1.45, 0.24), bev=0.02), box('step_high', SAND, (0, 0, 0.36), (1.32, 1.05, 0.24), bev=0.02)]
for k in range(8):
    box(f'dash_{k}', GLYPH, (-0.42 + 0.12 * k, -0.53, 0.36), (0.07, 0.012, 0.025))

# ствол обелиска: усечённая пирамида, сверху — золотой пирамидион
Z0, Z1, B0, B1 = 0.48, 2.66, 0.36, 0.265
bm = bmesh.new()
lo = [bm.verts.new((sx * B0, sy * B0, Z0)) for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
hi = [bm.verts.new((sx * B1, sy * B1, Z1)) for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
bm.faces.new(list(reversed(lo)))
bm.faces.new(hi)
for k in range(4):
    j = (k + 1) % 4
    bm.faces.new((lo[k], lo[j], hi[j], hi[k]))
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
shaft = obj_from_bm('obelisk', bm, [SAND], smooth=False)
bevel(shaft, 0.02, 2)
bm = bmesh.new()
base = [bm.verts.new((sx * 0.285, sy * 0.285, Z1)) for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
tip = bm.verts.new((0, 0, Z1 + 0.52))
bm.faces.new(list(reversed(base)))
for k in range(4):
    bm.faces.new((base[k], base[(k + 1) % 4], tip))
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
pyr = obj_from_bm('pyramidion', bm, [GOLD], smooth=False)

# иероглифы на лицевой грани (координаты — в плоскости грани от её середины)
def stroke(name, pts, m=GLYPH, r=0.022):
    return tube(name, [(x, 0, z) for x, z in pts], r, m, sides=4, smooth=False)

def loop(cx, cz, rx, rz, n=20):
    return [(cx + rx * math.cos(2 * math.pi * k / n), cz + rz * math.sin(2 * math.pi * k / n)) for k in range(n + 1)]

g = [stroke('glyph_0', [(-0.1, 0.88), (0.1, 0.88)]), stroke('glyph_1', [(0, 0.88), (0, 0.78)]),
     stroke('glyph_2', [(0, 0.55), (0, 0.71)]),
     stroke('glyph_eye', [(0.11 * math.cos(t), 0.35 + (0.06 if math.sin(t) > 0 else 0.045) * math.sin(t)) for t in [2 * math.pi * k / 20 for k in range(21)]]),
     prim('uv_sphere', 'glyph_pupil', GLYPH, smooth=True, segments=10, ring_count=6, radius=0.032, location=(0, 0, 0.35)),
     stroke('glyph_3', [(-0.09, 0.15), (0.09, 0.15)]),
     stroke('cartouche', loop(0, -0.27, 0.125, 0.22, 24), VIOLET, 0.026),
     stroke('cartouche_loop', loop(0, -0.14, 0.035, 0.042, 12), VIOLET, 0.018),
     stroke('cartouche_bar', [(-0.07, -0.2), (0.07, -0.2)], VIOLET, 0.018),
     stroke('cartouche_stem', [(0, -0.19), (0, -0.4)], VIOLET, 0.018),
     stroke('glyph_4', [(-0.08, -0.59), (0.08, -0.59), (-0.08, -0.73), (0.08, -0.73)]),
     stroke('glyph_5', [(-0.08, -0.84), (-0.08, -0.96), (0.08, -0.96), (0.08, -0.84)])]
p, n = surface_hit(shaft, (0, -5, (Z0 + Z1) / 2))
stick('glyphs', g, p, n, lift=0.024)

# медные чаши на подставках с пламенем
stands = []
for i, sgn in enumerate((-1, 1)):
    x, y = sgn * 1.12, -0.32
    st = lathe(f'stand_{i}', [(0, 0), (0.17, 0), (0.17, 0.07), (0.1, 0.1), (0.085, 0.5), (0.13, 0.58), (0, 0.58)], 20, SAND_L)
    st.location = (x, y, 0)
    bowl = lathe(f'bowl_{i}', [(0, 0.57), (0.12, 0.57), (0.24, 0.66), (0.28, 0.76), (0.24, 0.76), (0, 0.7)], 20, COPPER)
    bowl.location = (x, y, 0)
    stands += [st, bowl]
    flame(f'flame_{i}', (x, y, 0.72), s=0.95)
prim('ico_sphere', 'spark_0', SPARK, smooth=True, subdivisions=1, radius=0.05, location=(-1.0, -0.5, 1.75))

for o in steps + [shaft, pyr] + stands:
    outline(o, 0.03)

preview_rig(target_z=1.5, dist=7.4, elev=18)
render(ROOT + r'\renders\shrine_egypt.png')
export_glb(ROOT + r'\glb\shrine_egypt.glb')
save_blend()
