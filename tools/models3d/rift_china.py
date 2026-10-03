# Лунные врата (китайский Разлом): красная стена под бирюзовой черепичной крышей с задранными углами и золотой
# балкой, в стене — круглые «лунные» ворота: золотое кольцо с белым пунктиром в тёмно-красной оправе, в нём —
# портал с вихрем и звёздами; спереди — три белых облака-«сянъюнь» с сиреневыми завитками. Лицом к −Y.
# Части: wall*, roof*, ridge, tiles_*, beam_*, gate_ring, gate_rim, dash_*, cloud_*, curl_*, portal_disc, swirl

sc = new_scene('rift_china')
RED = mat('lacquer_red', '#c53030', rough=0.5)
RED_D = mat('lacquer_dark', '#7f1d1d', rough=0.6)
MAROON = mat('gate_maroon', '#4c1414', rough=0.7)
TEAL = mat('roof_teal', '#13887a', rough=0.75)
TEAL_D = mat('roof_teal_dark', '#0b4f47', rough=0.6)
TEAL_L = mat('ridge_teal', '#2fc4a6', rough=0.5)
GOLD = mat('gold_bright', '#f7b733', rough=0.35, metal=0.35, emit='#f59e0b', strength=0.15)
DASH = mat('dash_cream', '#fff7e0', rough=0.5, emit='#fff7e0', strength=0.2)
CLOUD = mat('cloud_white', '#f3efff', rough=0.6, emit='#ede9fe', strength=0.15)
CURL = mat('cloud_curl', '#a78bfa', rough=0.4, emit='#8b5cf6', strength=0.6)
WHITE = mat('orb_white', '#f5f3ff', rough=0.3, emit='#ffffff', strength=0.6)

# стена с тёмными торцевыми столбами и цоколем
WX, WY, WZ = 1.6, 0.25, 2.35
solid = [box('wall', RED, (0, 0, WZ / 2), (2 * WX, 2 * WY, WZ))]
for sgn in (-1, 1):
    solid.append(box(f'wall_post_{sgn}', RED_D, (sgn * (WX - 0.06), 0, WZ / 2), (0.16, 2 * WY + 0.04, WZ)))
solid.append(box('wall_plinth', RED_D, (0, 0, 0.08), (2 * WX + 0.04, 2 * WY + 0.04, 0.16)))
box('beam_front', GOLD, (0, -WY - 0.012, WZ - 0.13), (2 * WX - 0.2, 0.02, 0.055))
box('beam_back', GOLD, (0, WY + 0.012, WZ - 0.13), (2 * WX - 0.2, 0.02, 0.055))

# крыша: вальмовая, с коньком; углы задраны, на концах — завитки; черепица — тёмными рёбрами по скату
XE, YE, ZE, XT, ZT = 1.95, 0.75, WZ, 1.5, 2.95
rf = roof('roof', TEAL, XE, YE, ZE, XT, 0.0, ZT, n=8, rings=4, up=0.26, flare=0.06, power=1.5, thick=0.09, under=TEAL_D, hips=TEAL_D)
ridge = box('ridge', TEAL_L, (0, 0, ZT + 0.03), (2 * XT + 0.24, 0.16, 0.12), bev=0.02)
solid += [rf, ridge]
for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
    tip = Vector((sx * XE * 1.06, sy * YE * 1.06, ZE + 0.26))
    d = Vector((sx, 0, 0))
    tube(f'roof_curl_{sx}_{sy}', [tip + d * a + Vector((0, 0, b)) for a, b in ((0, 0), (0.07, 0.06), (0.09, 0.13), (0.05, 0.19), (0.0, 0.19), (-0.02, 0.14))], 0.036, TEAL_D, sides=6, taper=lambda u: 1.0 - 0.45 * u)
for k in range(9):
    x = -1.36 + 0.34 * k
    pts = []
    for j in range(6):
        p, n = surface_hit(rf, (x, -YE * (1 - j / 5) * 0.98, 10), (0, 0, -1))
        if p:
            pts.append(p + n * 0.015)
    if len(pts) > 2:
        tube(f'tiles_{k}', pts, 0.02, TEAL_D, sides=4, smooth=False)


# лунные ворота: тёмно-красная оправа, золотое кольцо с пунктиром, портал
CZ = 1.15
rim = ring_xz('gate_rim', MAROON, 0.8, 1.14, 0.06, 0, -WY + 0.005, CZ)
gold = ring_xz('gate_ring', GOLD, 0.85, 1.07, 0.1, 0, -WY - 0.02, CZ)
solid += [rim, gold]
for k in range(24):
    a = 2 * math.pi * (k + 0.5) / 24
    box(f'dash_{k}', DASH, (0.96 * math.cos(a), -WY - 0.125, CZ + 0.96 * math.sin(a)), (0.075, 0.012, 0.024), rot=(0, -(a + math.pi / 2), 0))
disc, swirl = portal('portal', center=(0, -WY - 0.04, CZ), w=0.82, h=0.82, shape='circle')
for k, (r, a) in enumerate(((0.62, 40), (0.45, 150), (0.7, 205), (0.55, 300), (0.3, 85))):
    s = prim('uv_sphere', f'swirl_star_{k}', WHITE, smooth=True, segments=8, ring_count=6, radius=0.035,
             location=(r * math.cos(math.radians(a)), -0.03, r * math.sin(math.radians(a))))
    s.parent = swirl


# облака: силуэт — верхняя огибающая кругов (крайние касаются земли), выдавлен и скруглён фаской
def cloud(name, circles, cx, cy, depth, curls):
    left, right = min(circles, key=lambda c: c[0] - c[2]), max(circles, key=lambda c: c[0] + c[2])
    x0, x1 = left[0] - left[2], right[0] + right[2]
    pts = [(left[0] + left[2] * math.cos(a), left[1] + left[2] * math.sin(a)) for a in [math.pi * 1.5 - math.pi / 2 * k / 6 for k in range(6)]]
    for k in range(41):
        x = x0 + (x1 - x0) * k / 40
        pts.append((x, max(dz + math.sqrt(max(0.0, r * r - (x - dx) ** 2)) for dx, dz, r in circles if abs(x - dx) <= r + 1e-9)))
    pts += [(right[0] + right[2] * math.cos(a), right[1] + right[2] * math.sin(a)) for a in [-math.pi / 2 * k / 6 for k in range(1, 7)]]
    bm = bmesh.new()
    fr = [bm.verts.new((cx + x, cy - depth / 2, z)) for x, z in pts]
    bk = [bm.verts.new((cx + x, cy + depth / 2, z)) for x, z in pts]
    bm.faces.new(fr)
    bm.faces.new(list(reversed(bk)))
    for k in range(len(pts)):
        j = (k + 1) % len(pts)
        bm.faces.new((fr[k], bk[k], bk[j], fr[j]))
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = obj_from_bm(name, bm, [CLOUD], smooth=False)
    bv = bevel(o, 0.06, 3)
    bv.angle_limit = math.radians(50)
    for i, (dx, dz, r, rot) in enumerate(curls):
        spiral(f'{name}_curl_{i}', CURL, (cx + dx, cy - depth / 2 - 0.025, dz), r=r, turns=1.3, rot=rot, thick=0.026)
    return o

clouds = [cloud('cloud_left', [(-0.42, 0.2, 0.2), (-0.12, 0.33, 0.3), (0.22, 0.28, 0.26), (0.47, 0.17, 0.17)], -1.12, -0.78, 0.3, [(0.02, 0.32, 0.11, 0.5)]),
          cloud('cloud_mid', [(-0.34, 0.16, 0.16), (-0.06, 0.27, 0.25), (0.24, 0.22, 0.2), (0.43, 0.13, 0.13)], 0.0, -1.12, 0.28, [(0.0, 0.25, 0.1, 0.5)]),
          cloud('cloud_right', [(-0.47, 0.17, 0.17), (-0.22, 0.28, 0.26), (0.12, 0.33, 0.3), (0.42, 0.2, 0.2)], 1.12, -0.78, 0.3, [(0.06, 0.32, 0.11, 0.5)])]

for o in solid + clouds:
    outline(o, 0.03)

preview_rig(target_z=1.4, dist=8.6, elev=16)
render(ROOT + r'\renders\rift_china.png')
export_glb(ROOT + r'\glb\rift_china.glb')
save_blend()
