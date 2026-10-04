# Святилище ками (японское): спереди — красные тории с табличкой (сиреневый знак), за ними на каменном помосте —
# маленький храм: стены из тёплого дерева, сиреневая решётчатая дверь, тёмная кровля с перекрещенными тиги
# (золотые концы), по карнизу — верёвка симэнава с бумажными сидэ; по бокам — каменные фонари торо
# с сиреневым светом; перед воротами — плоский камень. Лицом к −Y.
# Части: torii_*, platform_*, honden*, door*, roof*, chigi_*, rope*, shide_*, lantern_*, stepping_stone, spark_*

sc = new_scene('shrine_japan')
STONE = mat('shrine_granite', '#a3a3ab', rough=0.8)
STONE_D = mat('shrine_granite_dark', '#5b5862', rough=0.85)
WOOD = mat('honden_wood', '#c88d45', rough=0.6)
WOOD_D = mat('honden_wood_dark', '#6b3f17', rough=0.7)
ROOF = mat('roof_bark', '#3a3640', rough=0.7)
ROOF_E = mat('roof_edge', '#a8a4b0', rough=0.6)
CHIGI = mat('chigi_gray', '#8d8996', rough=0.6)
GOLD = mat('gold_bright', '#f7b733', rough=0.35, metal=0.35, emit='#f59e0b', strength=0.15)
WIN = mat('window_violet', '#c4b5fd', rough=0.3, emit='#a855f7', strength=0.8)
ROPE = mat('rope_straw', '#d6a75c', rough=0.8)
PAPER = mat('shide_paper', '#ffffff', rough=0.5, emit='#ffffff', strength=0.2, cull=False)
VIOLET = mat('sign_violet', '#c084fc', rough=0.3, emit='#a855f7', strength=1.1)
SPARK = mat('spark_violet', '#c4b5fd', emit='#a855f7', strength=1.2)
WHITE = mat('orb_white', '#f5f3ff', rough=0.3, emit='#ffffff', strength=0.6)

# тории спереди, на табличке — сиреневая точка
solid, pc = torii('torii', y=-0.95, px=1.0, h=3.5, span=1.55)
dot = prim('uv_sphere', 'torii_plaque_sign', VIOLET, smooth=True, segments=12, ring_count=8, radius=0.065, location=(pc[0], pc[1] - 0.005, pc[2]))
dot.scale = (1, 0.4, 1)

# помост в две ступени и ступенька спереди
solid += [box('platform_0', STONE, (0, 0.3, 0.09), (1.7, 1.55, 0.18), bev=0.02), box('platform_1', STONE, (0, 0.33, 0.27), (1.45, 1.3, 0.18), bev=0.02),
          box('platform_step', STONE, (0, -0.55, 0.09), (0.6, 0.25, 0.18), bev=0.02)]
# храм: стены, угловые столбы, решётчатая дверь
HZ0, HZ1, HY, HW, HD = 0.36, 1.0, 0.36, 0.55, 0.5
solid.append(box('honden', WOOD, (0, HY, (HZ0 + HZ1) / 2), (2 * HW, 2 * HD, HZ1 - HZ0)))
for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
    solid.append(box(f'honden_post_{sx}_{sy}', WOOD_D, (sx * (HW - 0.03), HY + sy * (HD - 0.03), (HZ0 + HZ1) / 2), (0.08, 0.08, HZ1 - HZ0)))
yd = HY - HD - 0.012
DZ = 0.65
solid.append(box('door', WIN, (0, yd, DZ), (0.4, 0.02, 0.5)))
for k, (x, z, sx, sz) in enumerate(((0, DZ, 0.03, 0.5), (0, DZ - 0.12, 0.4, 0.03), (0, DZ + 0.12, 0.4, 0.03), (-0.2, DZ, 0.04, 0.54), (0.2, DZ, 0.04, 0.54), (0, DZ + 0.26, 0.44, 0.04))):
    box(f'door_bar_{k}', WOOD_D, (x, yd - 0.01, z), (sx, 0.03, sz))
# кровля: конёк от фасада вглубь, низкие концы; на фасаде — перекрещенные тиги с золотыми концами
RZ0, RZ1, RT = 0.96, 1.6, 0.34
rf = roof('roof', ROOF, 0.75, 0.75, RZ0, 0.0, RT, RZ1, n=10, rings=6, up=0.05, flare=0.03, power=1.3, thick=0.08, under=ROOF_E)
rf.location.y = HY
solid.append(rf)
CL, CA = 0.5, math.radians(32)
for sgn in (-1, 1):
    c = box(f'chigi_{sgn}', CHIGI, (sgn * 0.1, HY - RT, RZ1 + 0.14), (0.07, 0.05, CL), rot=(0, sgn * CA, 0))
    solid.append(c)
    solid.append(prim('uv_sphere', f'chigi_{sgn}_tip', GOLD, smooth=True, segments=12, ring_count=8, radius=0.045,
                      location=(sgn * (0.1 + CL / 2 * math.sin(CA)), HY - RT, RZ1 + 0.14 + CL / 2 * math.cos(CA))))
solid.append(prim('cylinder', 'roof_katsuogi', GOLD, vertices=10, radius=0.028, depth=0.14, location=(0, HY - RT - 0.06, RZ1 - 0.1)))
# симэнава по карнизу и две бумажные молнии сидэ
yr = HY - HD - 0.05
rope = [(x, yr, 0.87 - 0.05 * (1 - (x / 0.55) ** 2)) for x in [-0.55 + 1.1 * k / 16 for k in range(17)]]
tube('rope', rope, 0.045, ROPE, sides=8)
for k in range(1, 16, 2):
    x, y, z = rope[k]
    tube(f'rope_band_{k}', [(x - 0.012, y, z), (x + 0.012, y, z)], 0.05, WOOD_D, sides=8, smooth=False)
for sgn in (-1, 1):
    x0 = sgn * 0.3
    zz = [(0, 0), (0.06, -0.05), (-0.03, -0.1), (0.06, -0.17), (-0.03, -0.22), (0.05, -0.29)]
    tube(f'shide_{sgn}', [(x0 + dx, yr - 0.03, 0.83 + dz) for dx, dz in zz], 0.02, PAPER, sides=4, smooth=False)

# каменные фонари торо
for sgn in (-1, 1):
    x, y = sgn * 0.6, -0.42
    parts = [box(f'lantern_{sgn}_foot', STONE_D, (x, y, 0.04), (0.28, 0.28, 0.08), bev=0.01),
             prim('cylinder', f'lantern_{sgn}_post', STONE, vertices=10, radius=0.055, depth=0.36, location=(x, y, 0.26)),
             box(f'lantern_{sgn}_shelf', STONE, (x, y, 0.46), (0.26, 0.26, 0.05), bev=0.01),
             box(f'lantern_{sgn}_box', STONE, (x, y, 0.6), (0.22, 0.22, 0.22), bev=0.01)]
    cap = prim('cone', f'lantern_{sgn}_cap', STONE_D, vertices=4, radius1=0.22, radius2=0.03, depth=0.14, location=(x, y, 0.78))
    cap.rotation_euler = (0, 0, math.pi / 4)
    parts += [cap, prim('uv_sphere', f'lantern_{sgn}_knob', STONE_D, smooth=True, segments=10, ring_count=6, radius=0.045, location=(x, y, 0.88))]
    solid += parts
    box(f'lantern_{sgn}_light', WIN, (x, y - 0.112, 0.6), (0.13, 0.01, 0.13))
    flame(f'lantern_{sgn}_flame', (x, y - 0.13, 0.53), s=0.22)
st = prim('cylinder', 'stepping_stone', STONE_D, smooth=True, vertices=24, radius=1, depth=0.04, location=(0, -1.42, 0.02))
st.scale = (0.38, 0.22, 1)
solid.append(st)
for i, (loc, m) in enumerate((((-0.42, -0.3, 1.95), SPARK), ((0.5, -0.15, 2.1), WHITE))):
    prim('ico_sphere', f'spark_{i}', m, smooth=True, subdivisions=1, radius=0.045, location=loc)

for o in solid:
    outline(o, 0.03)

preview_rig(target_z=1.7, dist=9.0, elev=18)
render(ROOT + r'\renders\shrine_japan.png')
export_glb(ROOT + r'\glb\shrine_japan.glb')
save_blend()
