# Врата ёкаев (японский Разлом): большие красные тории, между столбами — портал с вихрем, на табличке — розовый
# знак «◎»; по бокам — японские сосны с плоскими бирюзовыми кронами-подушками, у сосен — розовые блуждающие огни
# хитодама; внизу стелется полупрозрачный туман. Лицом к −Y.
# Части: torii_*, pine_*, wisp_*, mist_*, portal_disc, swirl

sc = new_scene('rift_japan')
PINE = mat('pine_teal', '#11806f', rough=0.7)
PINE_L = mat('pine_teal_light', '#1aa38d', rough=0.65)
TRUNK = mat('pine_trunk', '#4a2c17', rough=0.8)
PINK = mat('rift_pink', '#f472b6', rough=0.3, emit='#ec4899', strength=1.2)
WISP = mat('wisp_pink', '#f9a8d4', rough=0.2, emit='#ec4899', strength=1.3, alpha=0.9)
WISP_IN = mat('wisp_core', '#fdf2f8', rough=0.2, emit='#fce7f3', strength=1.4)
MIST = mat('mist', '#f5f3ff', rough=0.9, emit='#ede9fe', strength=0.3, alpha=0.38)

# тории и портал между столбами (до нижней балки)
solid, pc = torii('torii', y=0.0, px=1.0, h=3.3, span=1.95)
ring_xz('torii_plaque_ring', PINK, 0.055, 0.085, 0.02, pc[0], pc[1], pc[2], segs=24)
prim('uv_sphere', 'torii_plaque_dot', PINK, smooth=True, segments=10, ring_count=6, radius=0.03, location=(pc[0], pc[1] - 0.01, pc[2]))
NB = 3.3 - 0.82 - 0.085
disc, swirl = portal('portal', center=(0, -0.01, (0.3 + NB) / 2), w=0.85, h=(NB - 0.3) / 2, shape='square')


# сосны: изогнутый ствол, ветви и кроны-подушки (сплюснутые эллипсоиды; сверху — светлая «шапка»)
def pine(prefix, x, y, top, pads):
    pts = [(x + 0.06 * math.sin(3 * t), y, top * t) for t in [k / 8 for k in range(9)]]
    parts = [tube(f'{prefix}_trunk', pts, 0.09, TRUNK, sides=8, taper=lambda u: 1.0 - 0.4 * u)]
    for k, (dx, z, rx, rz) in enumerate(pads):
        tube(f'{prefix}_branch_{k}', [(x + 0.05 * math.sin(3 * z / top), y, z - 0.12), (x + dx * 0.8, y, z - 0.04)], 0.045, TRUNK, sides=6)
        p = prim('uv_sphere', f'{prefix}_pad_{k}', PINE, smooth=True, segments=14, ring_count=7, radius=1, location=(x + dx, y, z))
        p.scale = (rx, rx * 0.8, rz)
        cap = prim('uv_sphere', f'{prefix}_pad_{k}_top', PINE_L, smooth=True, segments=12, ring_count=6, radius=1, location=(x + dx - rx * 0.12, y - rx * 0.1, z + rz * 0.45))
        cap.scale = (rx * 0.62, rx * 0.48, rz * 0.6)
        parts.append(p)
    return parts

for sgn in (-1, 1):
    solid += pine(f'pine_{sgn}_front', sgn * 1.78, -0.35, 2.6, ((sgn * -0.1, 2.55, 0.5, 0.17), (sgn * 0.12, 1.95, 0.58, 0.19), (sgn * -0.08, 1.35, 0.6, 0.2)))
    solid += pine(f'pine_{sgn}_back', sgn * 1.32, 0.5, 1.95, ((sgn * 0.05, 1.9, 0.42, 0.15), (sgn * -0.08, 1.3, 0.48, 0.16)))
    # блуждающий огонь: капля, заострённая кверху
    x, y, z = sgn * 1.55, -0.85, 1.05
    w = lathe(f'wisp_{sgn}', [(0, 0), (0.07, 0.02), (0.1, 0.08), (0.08, 0.16), (0.04, 0.24), (0, 0.3)], 14, WISP)
    w.location = (x, y, z)
    wi = lathe(f'wisp_{sgn}_core', [(0, 0.03), (0.045, 0.05), (0.05, 0.1), (0.03, 0.15), (0, 0.18)], 10, WISP_IN)
    wi.location = (x, y - 0.04, z)
    solid.append(w)

# туман у земли: полупрозрачные сплюснутые клубы
for k, (x, y, sx, sz) in enumerate(((-2.05, -0.45, 0.55, 0.22), (-1.4, -0.8, 0.62, 0.26), (-0.55, -0.7, 0.5, 0.2), (0.25, -0.85, 0.6, 0.24), (1.05, -0.7, 0.5, 0.2),
                                    (1.75, -0.75, 0.6, 0.25), (2.25, -0.3, 0.45, 0.2), (-0.9, 0.35, 0.6, 0.22), (0.8, 0.4, 0.62, 0.24))):
    m = prim('uv_sphere', f'mist_{k}', MIST, smooth=True, segments=12, ring_count=6, radius=1, location=(x, y, sz * 0.25))
    m.scale = (sx, sx * 0.6, sz)

for o in solid:
    outline(o, 0.03)

preview_rig(target_z=1.6, dist=9.2, elev=16)
render(ROOT + r'\renders\rift_japan.png')
export_glb(ROOT + r'\glb\rift_japan.glb')
save_blend()
