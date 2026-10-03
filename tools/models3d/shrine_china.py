# Пагода (китайское святилище): три яруса красных стен под бирюзовыми кровлями с задранными углами
# и золотыми балками; на нижнем ярусе — стрельчатый проём со священным пламенем, выше — сиреневые решётчатые
# окна; со шпиля — золотые диски и сиреневая сфера; с углов нижней кровли свисают красные фонари.
# Лицом к −Y. Части: base, wall_*, roof_*, trim_*, window_*, door*, spire*, disc_*, orb, lantern_*, flame_out/in, spark_*

sc = new_scene('shrine_china')
STONE = mat('base_stone', '#a8a29e', rough=0.8)
RED = mat('lacquer_red', '#c53030', rough=0.5)
RED_D = mat('lacquer_dark', '#7f1d1d', rough=0.6)
TEAL = mat('roof_teal', '#13887a', rough=0.75)
TEAL_D = mat('roof_teal_dark', '#0b4f47', rough=0.6)
GOLD = mat('gold_bright', '#f7b733', rough=0.35, metal=0.35, emit='#f59e0b', strength=0.15)
POLE = mat('pole_brown', '#7c3a12', rough=0.6)
VIOLET = mat('sign_violet', '#c084fc', rough=0.3, emit='#a855f7', strength=1.1)
WIN = mat('window_violet', '#c4b5fd', rough=0.3, emit='#a855f7', strength=0.8)
INNER = mat('inner_violet', '#2e1659', rough=0.9, emit='#4c1d95', strength=0.35)
SPARK = mat('spark_violet', '#c4b5fd', emit='#a855f7', strength=1.2)
WHITE = mat('orb_white', '#f5f3ff', rough=0.3, emit='#ffffff', strength=0.6)

solid = [box('base', STONE, (0, 0, 0.11), (2.2, 2.0, 0.22), bev=0.03)]
# ярусы: (полуширина стены, низ, верх стены, карниз: полуразмер, высота, верх кровли: полуразмер, высота)
TIERS = ((0.72, 0.22, 1.15, 1.05, 1.1, 0.55, 1.32), (0.57, 1.2, 2.05, 0.88, 2.0, 0.42, 2.2), (0.44, 2.1, 2.8, 0.72, 2.75, 0.08, 3.12))
roofs = []
for k, (hw, z0, z1, xe, ze, xt, zt) in enumerate(TIERS):
    solid.append(box(f'wall_{k}', RED, (0, 0, (z0 + z1) / 2), (2 * hw, 2 * hw, z1 - z0)))
    for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1)):  # тёмные угловые столбы
        solid.append(box(f'wall_{k}_post_{sx}_{sy}', RED_D, (sx * (hw - 0.03), sy * (hw - 0.03), (z0 + z1) / 2), (0.09, 0.09, z1 - z0)))
    box(f'trim_{k}', GOLD, (0, 0, ze - 0.05), (2 * hw + 0.26, 2 * hw + 0.26, 0.05))
    r = roof(f'roof_{k}', TEAL, xe, xe, ze, xt, xt, zt, n=7, rings=4, up=0.2 - 0.03 * k, flare=0.1, power=1.5, thick=0.08, under=TEAL_D, close=(k == 2), hips=TEAL_D)
    roofs.append(r)
    for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1)):  # завитки на концах карниза
        tip = Vector((sx * xe * 1.1, sy * xe * 1.1, ze + 0.2 - 0.03 * k))
        d = Vector((sx, sy, 0)).normalized()
        tube(f'roof_{k}_curl_{sx}_{sy}', [tip + d * a + Vector((0, 0, b)) for a, b in ((0, 0), (0.06, 0.05), (0.08, 0.11), (0.05, 0.16), (0.0, 0.16), (-0.02, 0.12))], 0.032, TEAL_D, sides=6, taper=lambda u: 1.0 - 0.45 * u)

# окна (спереди и по бокам) на втором и третьем ярусах
def window(name, k, zc, face):
    hw = TIERS[k][0] + 0.012
    loc, size, bars = {'front': ((0, -hw, zc), (0.28, 0.02, 0.22), ((0.025, 0.03, 0.22), (0.28, 0.03, 0.025))),
                       'left': ((-hw, 0, zc), (0.02, 0.28, 0.22), ((0.03, 0.025, 0.22), (0.03, 0.28, 0.025))),
                       'right': ((hw, 0, zc), (0.02, 0.28, 0.22), ((0.03, 0.025, 0.22), (0.03, 0.28, 0.025)))}[face]
    w = box(name, WIN, loc, size)
    solid.append(w)
    for j, b in enumerate(bars):
        box(f'{name}_bar_{j}', RED_D, loc, b)
    for j, (dx, dz) in enumerate(((0, 0.11), (0, -0.11))):
        box(f'{name}_frame_{j}', RED_D, (loc[0], loc[1], zc + dz), (size[0] + 0.02 if face == 'front' else 0.03, size[1] + 0.02 if face != 'front' else 0.03, 0.03))

for k, zc in ((1, 1.64), (2, 2.45)):
    for face in ('front', 'left', 'right'):
        window(f'window_{k}_{face}', k, zc, face)

# стрельчатый проём нижнего яруса с пламенем
yd = -TIERS[0][0] - 0.012
arch = [(-0.23, 0.22), (-0.23, 0.66)] + [(-0.23 + 0.23 * math.sin(math.pi / 2 * s / 6), 0.66 + 0.22 * (1 - math.cos(math.pi / 2 * s / 6)) ** 0.8) for s in range(1, 7)]
arch = arch + [(-x, z) for x, z in reversed(arch)]
bm = bmesh.new()
bm.faces.new([bm.verts.new((x, yd, z)) for x, z in arch])
door = obj_from_bm('door', bm, [INNER], smooth=False)
if door.data.polygons[0].normal.y > 0:
    door.data.flip_normals()
tube('door_frame', [(x, yd - 0.01, z) for x, z in arch], 0.035, RED_D, sides=6, smooth=False)
flame('flame', (0, yd - 0.12, 0.22), s=0.66)

# шпиль: шест, золотые диски, сиреневая сфера
spire = prim('cylinder', 'spire', POLE, vertices=10, radius=0.045, depth=0.85, location=(0, 0, 3.45))
solid.append(spire)
for k, (z, r) in enumerate(((3.27, 0.17), (3.44, 0.13), (3.59, 0.1))):
    solid.append(prim('cylinder', f'disc_{k}', GOLD, smooth=True, vertices=20, radius=r, depth=0.05, location=(0, 0, z)))
solid.append(prim('uv_sphere', 'orb', VIOLET, smooth=True, segments=16, ring_count=10, radius=0.09, location=(0, 0, 3.93)))

# фонари с углов нижней кровли
for sgn in (-1, 1):
    x, y = sgn * 1.08, -1.08
    tube(f'lantern_{sgn}_cord', [(x, y, 1.22), (x, y, 1.05)], 0.012, RED_D, sides=4, smooth=False)
    body = prim('uv_sphere', f'lantern_{sgn}', RED, smooth=True, segments=16, ring_count=10, radius=0.11, location=(x, y, 0.9))
    body.scale = (1, 1, 1.3)
    glow = prim('uv_sphere', f'lantern_{sgn}_glow', WIN, smooth=True, segments=12, ring_count=8, radius=0.06, location=(x, y - 0.075, 0.9))
    glow.scale = (0.85, 0.5, 1.3)
    caps = [prim('cylinder', f'lantern_{sgn}_cap_{j}', GOLD, vertices=12, radius=0.065, depth=0.04, location=(x, y, z)) for j, z in enumerate((1.05, 0.75))]
    solid += [body] + caps

for i, (loc, m) in enumerate((((0.58, -0.7, 2.98), WHITE), ((-0.62, -0.75, 2.1), SPARK))):
    prim('ico_sphere', f'spark_{i}', m, smooth=True, subdivisions=1, radius=0.045, location=loc)

for o in solid + roofs:
    outline(o, 0.03)

preview_rig(target_z=1.9, dist=9.0, elev=18)
render(ROOT + r'\renders\shrine_china.png')
export_glb(ROOT + r'\glb\shrine_china.glb')
save_blend()
