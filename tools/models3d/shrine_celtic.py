# Каменный круг (кельтское святилище): трилит — два высоких камня и изогнутая перемычка с сиреневым трискелем,
# спирали на камнях; вокруг на зелёном круге — стоячие камни, в середине — священное пламя в кольце очага.
# Лицом к −Y. Части: grass, stone_*, spiral_*, triskele_*, hearth_*, flame_out/in, spark_*

sc = new_scene('shrine_celtic')
GRASS = mat('grass_celtic', '#15803d', rough=0.85)
GRASS_D = mat('grass_dark', '#064e3b', rough=0.9)
STONE = mat('megalith', '#8a8792', rough=0.8)
STONE_D = mat('megalith_dark', '#5c5966', rough=0.85)
VIOLET = mat('sign_violet', '#c084fc', rough=0.3, emit='#a855f7', strength=1.1)
SPARK = mat('spark_violet', '#c4b5fd', emit='#a855f7', strength=1.2)

base = lathe('grass', [(0, 0.16), (1.55, 0.16), (1.62, 0.12), (1.62, 0.04), (1.58, 0.0), (0, 0.0)], 36, GRASS)
rim = lathe('grass_rim', [(1.5, 0.0), (1.64, 0.0), (1.66, 0.06), (1.62, 0.13), (1.5, 0.13)], 36, GRASS_D)


def megalith(name, x, y, h, w=0.42, d=0.36, lean=0.0, turn=0.0, m=STONE):
    """Стоячий камень: брусок, сужающийся кверху, со скруглёнными гранями"""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        k = 0.78 if v.co.z > 0 else 1.0
        v.co = Vector((v.co.x * w * k, v.co.y * d * k, (v.co.z + 0.5) * h))
    o = obj_from_bm(name, bm, [m], smooth=False)
    o.location = (x, y, 0.1)
    o.rotation_euler = (lean, 0, turn)
    bevel(o, 0.05, 2)
    return o


stones = [megalith('stone_left', -0.62, 0.05, 2.25, w=0.46), megalith('stone_right', 0.62, 0.05, 2.25, w=0.46)]
# перемычка: плита поперёк двух камней
lintel = prim('cube', 'stone_lintel', STONE, size=1, location=(0, 0.05, 2.5))
lintel.scale = (1.95, 0.44, 0.34)
bevel(lintel, 0.04, 2)
stones.append(lintel)
# малые камни круга: спереди по бокам (как на значке) и позади
for k, (x, y, h, lean, turn) in enumerate(((-1.32, -0.55, 1.2, 0.0, 0.2), (-1.15, -0.85, 0.95, 0.05, -0.1), (1.32, -0.55, 1.2, 0.0, -0.2),
                                           (1.15, -0.85, 0.95, 0.05, 0.1), (-1.1, 0.95, 1.0, -0.05, 0.4), (1.1, 0.95, 1.0, -0.05, -0.4))):
    stones.append(megalith(f'stone_small_{k}', x, y, h, w=0.3, d=0.26, lean=lean, turn=turn, m=STONE if k % 2 == 0 else STONE_D))
# знаки: трискель на перемычке, спирали на камнях
triskele('triskele', VIOLET, (0, -0.19, 2.55), r=0.085)
spiral('spiral_left', VIOLET, (-0.62, -0.19, 1.62), r=0.12, turns=2.2)
spiral('spiral_right', VIOLET, (0.62, -0.19, 1.62), r=0.12, turns=2.2, rot=math.pi)
spiral('spiral_small_1', VIOLET, (-1.15, -0.99, 0.5), r=0.085, turns=2.0)
spiral('spiral_small_3', VIOLET, (1.15, -0.99, 0.5), r=0.085, turns=2.0, rot=math.pi)
# очаг: кольцо камней и пламя
for k in range(7):
    a = 2 * math.pi * k / 7
    h = prim('ico_sphere', f'hearth_{k}', STONE_D, subdivisions=1, radius=0.11, location=(0.27 * math.cos(a), -0.25 + 0.2 * math.sin(a), 0.2))
    h.scale = (1.2, 1, 0.6)
flame('flame', (0, -0.25, 0.2), s=1.05)
for i, loc in enumerate(((-0.28, -0.4, 1.35), (0.32, -0.35, 1.6))):
    prim('ico_sphere', f'spark_{i}', SPARK, smooth=True, subdivisions=1, radius=0.045, location=loc)

for o in stones + [base]:
    outline(o, 0.035)

preview_rig(target_z=1.4, dist=7.2, elev=18)
render(ROOT + r'\renders\shrine_celtic.png')
export_glb(ROOT + r'\glb\shrine_celtic.glb')
save_blend()
