# Холм сидов (кельтский Разлом): высокий зелёный холм-колокол, в нём — каменный арочный проход, в проёме — портал
# с вихрем и розовый порог; на макушке — розовый трискель, на склонах — светлые уголки травы; по сторонам —
# стоячие камни с розовыми спиралями. Лицом к −Y.
# Части: hill, grass_*, passage_*, doorway, threshold, standing_*, spiral_*, triskele*, orb_*, portal_disc, swirl

sc = new_scene('rift_celtic')
HILL = mat('hill_green', '#22a052', rough=0.85)
GRASS_L = mat('grass_mark', '#bbf7d0', rough=0.6)
STONE = mat('megalith', '#8a8792', rough=0.8)
STONE_D = mat('megalith_dark', '#5c5966', rough=0.85)
DOOR = mat('doorway_dark', '#2a2438', rough=0.9)
PINK = mat('rift_pink', '#f472b6', rough=0.3, emit='#ec4899', strength=1.2)
GLOW = mat('threshold_glow', '#f9a8d4', rough=0.4, emit='#ec4899', strength=0.9)
WHITE = mat('orb_white', '#f5f3ff', rough=0.3, emit='#ffffff', strength=0.6)

# холм: тело вращения «колоколом» (чуть заострённый эллипс), сплюснутое спереди назад
R, H, SY, CY = 2.0, 2.9, 0.7, 0.25
prof = [(0.0, 0.0)] + [(R * (1 - t * t) ** 0.55, H * t) for t in [math.sin(math.pi / 2 * k / 18) for k in range(19)]]  # кольца гуще к макушке
hill = lathe('hill', prof, 40, HILL)
hill.data.transform(Matrix.Diagonal((1, SY, 1, 1)))
hill.data.transform(Matrix.Translation((0, CY, 0)))

# проход: каменные косяки и свод из клиньев, уходящие вглубь холма
AR, SZ, T, YF, YB = 0.52, 1.2, 0.3, -1.5, -0.35
blocks = []
for sgn in (-1, 1):
    for k in range(3):
        blocks.append(box(f'passage_jamb_{sgn}_{k}', STONE if (k + (sgn > 0)) % 2 == 0 else STONE_D,
                          (sgn * (AR + T / 2), (YF + YB) / 2, SZ / 6 + SZ / 3 * k), (T, YB - YF, SZ / 3 - 0.01), bev=0.025))
N = 9
for k in range(N):
    gap = 0.012
    a0, a1 = math.pi * k / N + gap, math.pi * (k + 1) / N - gap
    q = [(AR * math.cos(a0), SZ + AR * math.sin(a0)), ((AR + T) * math.cos(a0), SZ + (AR + T) * math.sin(a0)),
         ((AR + T) * math.cos(a1), SZ + (AR + T) * math.sin(a1)), (AR * math.cos(a1), SZ + AR * math.sin(a1))]
    bm = bmesh.new()
    vf = [bm.verts.new((x, YF, z)) for x, z in q]
    vb = [bm.verts.new((x, YB, z)) for x, z in q]
    bm.faces.new(vf)
    bm.faces.new(list(reversed(vb)))
    for j in range(4):
        n = (j + 1) % 4
        bm.faces.new((vf[j], vb[j], vb[n], vf[n]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    v = obj_from_bm(f'passage_voussoir_{k}', bm, [STONE if k % 2 == 0 else STONE_D], smooth=False)
    bevel(v, 0.02, 2)
    blocks.append(v)
# тёмная глубина проёма (прямоугольник с полукругом) и портал в нём
bm = bmesh.new()
ring = [(AR, 0.0)] + [(AR * math.cos(a), SZ + AR * math.sin(a)) for a in [math.pi * k / 16 for k in range(17)]] + [(-AR, 0.0)]
bm.faces.new([bm.verts.new((x, YF + 0.2, z)) for x, z in ring])
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
door = obj_from_bm('doorway', bm, [DOOR], smooth=False)
door.data.flip_normals()
disc, swirl = portal('portal', center=(0, YF + 0.14, 0.9), w=AR - 0.06, h=0.84, shape='circle')
thr = prim('cylinder', 'threshold', GLOW, smooth=True, vertices=24, radius=1, depth=0.03, location=(0, YF - 0.1, 0.015))
thr.scale = (AR + 0.12, 0.22, 1)

# стоячие камни по сторонам; спирали — на их лицевой грани
stones = []
for sgn in (-1, 1):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for vv in bm.verts:
        k = 0.75 if vv.co.z > 0 else 1.0
        vv.co = Vector((vv.co.x * 0.5 * k, vv.co.y * 0.34 * k, (vv.co.z + 0.5) * 1.3))
    st = obj_from_bm(f'standing_{sgn}', bm, [STONE], smooth=False)
    st.location = (sgn * 1.42, -1.3, 0.0)
    st.rotation_euler = (0, 0, sgn * 0.15)
    bevel(st, 0.05, 2)
    stones.append(st)
    p, n = surface_hit(st, (sgn * 1.42, -5, 0.62))
    stick(f'spiral_{sgn}', [spiral(f'spiral_{sgn}_curl', PINK, (0, 0, 0), r=0.12, turns=2.0, rot=0 if sgn < 0 else math.pi, thick=0.024)], p, n, lift=0.025)

# знаки на холме: трискель на макушке, уголки травы на склонах
p, n = surface_hit(hill, (0, -5, 2.45))
stick('triskele', triskele('triskele_curl', PINK, (0, 0, 0), r=0.13, thick=0.028), p, n, lift=0.03)
for k, (x, z) in enumerate(((-1.01, 2.19), (1.01, 2.19), (-1.43, 1.33), (1.43, 1.33), (-1.72, 0.5), (1.72, 0.5))):
    p, n = surface_hit(hill, (x, -5, z))
    if p:
        stick(f'grass_{k}', [tube(f'grass_mark_{k}', [(-0.1, 0, -0.07), (0, 0, 0.07), (0.1, 0, -0.07)], 0.028, GRASS_L, sides=4, smooth=False)], p, n, lift=0.025)
# огоньки у входа
prim('uv_sphere', 'orb_pink', PINK, smooth=True, segments=12, ring_count=8, radius=0.065, location=(-0.98, -1.65, 1.35))
prim('uv_sphere', 'orb_white', WHITE, smooth=True, segments=12, ring_count=8, radius=0.065, location=(1.0, -1.65, 1.62))

outline(hill, 0.04)
for o in blocks + stones:
    outline(o, 0.03)

preview_rig(target_z=1.35, dist=8.2, elev=16)
render(ROOT + r'\renders\rift_celtic.png')
export_glb(ROOT + r'\glb\rift_celtic.glb')
save_blend()
