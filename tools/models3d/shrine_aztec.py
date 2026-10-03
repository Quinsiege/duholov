# Теокалли (ацтекское святилище): ступенчатая пирамида в четыре яруса с крутой лестницей между перилами, наверху —
# храм с сиреневым арочным входом, красным фризом с бирюзовым меандром и зубцами; на кровле — тёмная жаровня
# с большим священным пламенем. Лицом к −Y. Части: tier_*, stair_*, rail_*, temple, door*, frieze*, fret_*, merlon_*,
# brazier, flame_out/in, spark_*

sc = new_scene('shrine_aztec')
STONE = mat('aztec_stone', '#c8a06a', rough=0.8)
STONE_L = mat('aztec_stone_light', '#dcb987', rough=0.75)
STONE_D = mat('aztec_stone_dark', '#8f6a3c', rough=0.85)
STAIR = mat('aztec_stair', '#ecd3a2', rough=0.7)
RAIL = mat('aztec_rail', '#a8834f', rough=0.8)
RED = mat('frieze_red', '#b91c1c', rough=0.6)
TEAL = mat('fret_teal', '#2dd4bf', rough=0.4, emit='#14b8a6', strength=0.4)
DOOR = mat('door_violet', '#a970f5', rough=0.4, emit='#7c3aed', strength=0.7)
DARK = mat('brazier_dark', '#1f1a24', rough=0.8)
SPARK = mat('spark_violet', '#c4b5fd', emit='#a855f7', strength=1.2)

# ярусы: усечённые пирамиды (полуширина низа, полуширина верха, низ, верх)
solid = []
for k, (b0, b1, z0, z1) in enumerate(((1.45, 1.36, 0.0, 0.45), (1.2, 1.11, 0.45, 0.9), (0.95, 0.86, 0.9, 1.35), (0.72, 0.64, 1.35, 1.8))):
    t = frustum(f'tier_{k}', STONE, -b0, b0, -b0, b0, z0, -b1, b1, -b1, b1, z1 - 0.06)
    lip = frustum(f'tier_{k}_lip', STONE_D, -b1 - 0.02, b1 + 0.02, -b1 - 0.02, b1 + 0.02, z1 - 0.06, -b1, b1, -b1, b1, z1)  # тёмный бортик по верху яруса
    bevel(t, 0.02, 2)
    solid += [t, lip]
# лестница: ступени от земли до верхнего яруса, по бокам — перила
N, TOP, Y0, Y1 = 14, 1.8, -1.62, -0.7
for k in range(N):
    hw = 0.31 - 0.06 * k / (N - 1)
    yf = Y0 + (Y1 - Y0) * k / N
    solid.append(box(f'stair_{k}', STAIR, (0, (yf - 0.3) / 2, (k + 0.5) * TOP / N), (2 * hw, -0.3 - yf, TOP / N)))
for sgn in (-1, 1):
    solid.append(tube(f'rail_{sgn}', [(sgn * 0.36, Y0 - 0.02, 0.05), (sgn * 0.29, Y1 - 0.02, TOP + 0.06)], 0.055, RAIL, sides=4, smooth=False))

# храм: стены, арочный вход, фриз с меандром, зубцы
TZ0, TZ1, TW = 1.8, 2.44, 0.56
solid.append(box('temple', STONE_L, (0, 0, (TZ0 + TZ1) / 2), (2 * TW, 2 * TW, TZ1 - TZ0)))
yd = -TW - 0.012
arch = [(-0.2, TZ0), (-0.2, TZ0 + 0.3)] + [(-0.2 * math.cos(math.pi * s / 12), TZ0 + 0.3 + 0.2 * math.sin(math.pi * s / 12)) for s in range(1, 12)] + [(0.2, TZ0 + 0.3), (0.2, TZ0)]
bm = bmesh.new()
bm.faces.new([bm.verts.new((x, yd, z)) for x, z in arch])
door = obj_from_bm('door', bm, [DOOR], smooth=False)
if door.data.polygons[0].normal.y > 0:
    door.data.flip_normals()
tube('door_frame', [(x, yd - 0.01, z) for x, z in arch], 0.04, DARK, sides=6, smooth=False)
FZ0, FZ1, FW = TZ1, TZ1 + 0.24, 0.63
solid.append(box('frieze', RED, (0, 0, (FZ0 + FZ1) / 2), (2 * FW, 2 * FW, FZ1 - FZ0)))
fz = (FZ0 + FZ1) / 2
for sgn in (-1, 1):  # ступенчатый меандр — по половине фриза
    pts = [(-0.56, fz + 0.06), (-0.46, fz + 0.06), (-0.46, fz - 0.06), (-0.34, fz - 0.06), (-0.34, fz + 0.06), (-0.22, fz + 0.06), (-0.22, fz - 0.06), (-0.1, fz - 0.06)]
    tube(f'fret_{sgn}', [(sgn * -x, -FW - 0.015, z) for x, z in pts], 0.022, TEAL, sides=4, smooth=False)
for k, (x, y) in enumerate(((-0.54, -0.54), (-0.22, -0.54), (0.22, -0.54), (0.54, -0.54), (-0.54, 0.54), (-0.22, 0.54), (0.22, 0.54), (0.54, 0.54), (-0.54, 0), (0.54, 0))):
    solid.append(box(f'merlon_{k}', STONE_L, (x, y, FZ1 + 0.085), (0.15, 0.15, 0.17), bev=0.015))
# жаровня и пламя на кровле
solid.append(box('brazier', DARK, (0, 0, FZ1 + 0.05), (0.48, 0.48, 0.1), bev=0.01))
flame('flame', (0, 0, FZ1 + 0.09), s=1.3)
prim('ico_sphere', 'spark_0', SPARK, smooth=True, subdivisions=1, radius=0.05, location=(-0.5, -0.35, 3.45))

for o in solid:
    outline(o, 0.03)

preview_rig(target_z=1.7, dist=8.6, elev=18)
render(ROOT + r'\renders\shrine_aztec.png')
export_glb(ROOT + r'\glb\shrine_aztec.glb')
save_blend()
