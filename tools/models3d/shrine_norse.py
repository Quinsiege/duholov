# Рунный камень (скандинавское святилище): высокий камень со скруглённым верхом, по краю — красный змей-лента
# в белую полоску, в середине — светящиеся сиреневые руны; на травяном холме, перед камнем — треножная жаровня
# со священным пламенем. Лицом к −Y. Части: grass_*, soil, stone, serpent*, rune_*, brazier_*, flame_out/in, spark_*

sc = new_scene('shrine_norse')
GRASS = mat('grass', '#3f7d22', rough=0.85)
GRASS_L = mat('grass_light', '#84cc16', rough=0.7)
SOIL = mat('soil', '#4a2e14', rough=0.9)
STONE = mat('runestone', '#8f8b98', rough=0.75)
RED = mat('serpent_red', '#dc2626', rough=0.5)
WHITE = mat('serpent_white', '#fde2e2', rough=0.5)
RUNE = mat('rune_violet', '#c084fc', rough=0.3, emit='#a855f7', strength=1.2)
COPPER = mat('copper', '#c2410c', rough=0.4, metal=0.6)
IRON = mat('iron_dark', '#2b2420', rough=0.7)
SPARK = mat('spark_violet', '#c4b5fd', emit='#a855f7', strength=1.2)

# холм: зелёный купол с полоской земли по краю
mound = lathe('grass_mound', [(0, 0.44), (0.55, 0.41), (1.0, 0.31), (1.3, 0.16), (1.42, 0.06), (0, 0.06)], 32, GRASS, close=False)
soil = lathe('soil', [(0, 0), (1.44, 0), (1.45, 0.03), (1.42, 0.07), (0, 0.07)], 32, SOIL)
for k, (x, y) in enumerate(((-1.0, -0.62), (1.05, -0.55), (-0.5, -1.0), (0.75, -0.95))):
    for j in range(3):
        b = prim('cone', f'grass_blade_{k}_{j}', GRASS_L, vertices=4, radius1=0.035, radius2=0.0, depth=0.22, location=(x + (j - 1) * 0.05, y, 0.36 - 0.12 * abs(x) / 1.05))
        b.rotation_euler = (0.15 * (j - 1), 0.3 * (j - 1), 0)

# камень: силуэт со скруглённым верхом, вытянутый по Y
W, Z0, Z1, D = 0.66, 0.3, 2.08, 0.46
outline_pts = [(-W, Z0)] + [(W * math.cos(a), Z1 + W * math.sin(a)) for a in [math.pi - math.pi * k / 16 for k in range(17)]] + [(W, Z0)]
bm = bmesh.new()
front = [bm.verts.new((x, -D / 2, z)) for x, z in outline_pts]
back = [bm.verts.new((x, D / 2, z)) for x, z in outline_pts]
bm.faces.new(front)
bm.faces.new(list(reversed(back)))
n = len(outline_pts)
for k in range(n):
    j = (k + 1) % n
    bm.faces.new((front[k], back[k], back[j], front[j]))
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
stone = obj_from_bm('stone', bm, [STONE], smooth=False)
bevel(stone, 0.06, 2)
# змей-лента по краю камня, в белую полоску
band = [(x * 0.8, -D / 2 - 0.02, Z0 + 0.05 + (z - Z0) * 0.97) for x, z in outline_pts]
side = [Z0 + 0.1 + (Z1 - Z0 - 0.1) * k / 8 for k in range(8)]  # прямые бока — тоже частыми точками, чтобы и на них были полоски
band = [(-W * 0.8, -D / 2 - 0.02, z) for z in side] + [(W * 0.8 * math.cos(a), -D / 2 - 0.02, Z1 + W * 0.8 * math.sin(a)) for a in [math.pi - math.pi * k / 20 for k in range(21)]] + [(W * 0.8, -D / 2 - 0.02, z) for z in reversed(side)]
tube('serpent', band, 0.055, RED, sides=6)
for k in range(1, len(band) - 1, 2):  # через сегмент; черта — поперёк ленты
    p, q = Vector(band[k]), Vector(band[k + 1])
    mid = (p + q) / 2
    s = box(f'serpent_stripe_{k}', WHITE, (mid.x, mid.y - 0.052, mid.z), (0.11, 0.03, 0.035), rot=(0, -(math.atan2(q.z - p.z, q.x - p.x) + math.pi / 2), 0))
# руны: штрихи на лицевой грани
yf = -D / 2 - 0.035
def stroke(name, a, b, r=0.028):
    tube(name, [(a[0], yf, a[1]), (b[0], yf, b[1])], r, RUNE, sides=4, smooth=False)
stroke('rune_f_0', (-0.22, 1.72), (-0.22, 2.12)); stroke('rune_f_1', (-0.22, 2.1), (-0.06, 1.98)); stroke('rune_f_2', (-0.22, 1.95), (-0.06, 1.83))
stroke('rune_r_0', (0.1, 1.72), (0.1, 2.12)); stroke('rune_r_1', (0.1, 2.1), (0.24, 1.98)); stroke('rune_r_2', (0.24, 1.98), (0.1, 1.9)); stroke('rune_r_3', (0.1, 1.9), (0.24, 1.72))
for k, (a, b) in enumerate((((0, 1.62), (0.13, 1.48)), ((0.13, 1.48), (0, 1.34)), ((0, 1.34), (-0.13, 1.48)), ((-0.13, 1.48), (0, 1.62)), ((0, 1.34), (0, 1.12)))):
    stroke(f'rune_o_{k}', a, b)
stroke('rune_y_0', (0, 0.72), (0, 1.02)); stroke('rune_y_1', (0, 0.9), (-0.16, 1.05)); stroke('rune_y_2', (0, 0.9), (0.16, 1.05))
# жаровня на треноге и пламя
BX, BY, BZ = 0, -0.72, 0.86
for k in range(3):
    a = 2 * math.pi * k / 3 + math.pi / 2
    tube(f'brazier_leg_{k}', [(BX + 0.06 * math.cos(a), BY + 0.06 * math.sin(a), BZ - 0.05), (BX + 0.28 * math.cos(a), BY + 0.28 * math.sin(a), 0.28)], 0.022, IRON, sides=5, smooth=False)
bowl = lathe('brazier_bowl', [(0.0, BZ - 0.06), (0.16, BZ - 0.05), (0.27, BZ + 0.02), (0.3, BZ + 0.08), (0.26, BZ + 0.08), (0.0, BZ + 0.04)], 20, COPPER)
bowl.location = (BX, BY, 0)
flame('flame', (BX, BY, BZ + 0.05), s=0.95)
for i, loc in enumerate(((-0.62, -0.7, 1.15), (0.55, -0.62, 1.4))):
    prim('ico_sphere', f'spark_{i}', SPARK, smooth=True, subdivisions=1, radius=0.045, location=loc)

for o in (mound, stone, bowl):
    outline(o, 0.035)
outline(soil, 0.03)

preview_rig(target_z=1.35, dist=6.8, elev=18)
render(ROOT + r'\renders\shrine_norse.png')
export_glb(ROOT + r'\glb\shrine_norse.glb')
save_blend()
