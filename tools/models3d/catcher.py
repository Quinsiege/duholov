# Ловчий (игрок на карте): фигурка в большом капюшоне — тёмное лицо со светящимися глазами, плащ на золотых шнурах,
# пояс, рукава с перчатками, сапоги; за спиной — колчан со стрелами (красное оперение над левым плечом), как на аватаре.
# Лицом к −Y, ноги на z = 0. Ходьбу и бег делает игра (js/m3d.js) по пустышкам-шарнирам:
#   body — туловище, капюшон, колчан (покачивание, наклон вперёд); arm_p / arm_n — руки от плеч (дети body);
#   leg_p / leg_n — ноги от бёдер. _p — сторона +X (левая рука Ловчего), _n — −X.
# Цвет плаща и глаз игра берёт из облика (Гардероб): материалы catcher_cloak, catcher_cloak_dark, catcher_eyes.

sc = new_scene('catcher')
CLOAK = mat('catcher_cloak', '#6d28d9', rough=0.6)
CLOAK_D = mat('catcher_cloak_dark', '#3b1679', rough=0.7)
FACE = mat('catcher_face', '#160d2b', rough=0.9, emit='#2a1f4a', strength=0.25)
EYES = mat('catcher_eyes', '#5eead4', rough=0.2, emit='#5eead4', strength=1.6)
CORD = mat('catcher_cord', '#f7d77e', rough=0.35, emit='#f7d77e', strength=0.15)
LEATHER = mat('catcher_leather', '#3b2314', rough=0.7)
PANTS = mat('catcher_pants', '#2b2140', rough=0.8)
QUIVER = mat('quiver_leather', '#7c4a1e', rough=0.6)
SHAFT = mat('arrow_shaft', '#c98a4a', rough=0.6)
FLETCH = mat('arrow_fletch', '#ef4444', rough=0.5, cull=False)
EMBLEM = mat('catcher_emblem', '#fde68a', rough=0.3, emit='#f59e0b', strength=0.6)
SHADOW = mat('ground_shadow', '#000000', rough=1.0, alpha=0.28)


def joint(name, loc, parent=None):
    """Пустышка-шарнир: дети вращаются вокруг неё (в игре)"""
    e = bpy.data.objects.new(name, None)
    sc.collection.objects.link(e)
    e.location = loc
    if parent:
        e.parent = parent
        e.matrix_parent_inverse = parent.matrix_world.inverted()
    return e


def child(o, parent):
    o.parent = parent
    o.matrix_parent_inverse = parent.matrix_world.inverted()
    return o


solid = []
# тень на земле
sh = prim('circle', 'shadow', SHADOW, vertices=24, radius=0.34, fill_type='TRIFAN', location=(0, 0.02, 0.004))
sh.scale = (1, 0.8, 1)

# ноги от бёдер: штанина и сапог (носок — вперёд, к −Y)
HIP_Z = 0.5
for s, nm in ((1, 'p'), (-1, 'n')):
    j = joint(f'leg_{nm}', (s * 0.11, 0, HIP_Z))
    bpy.context.view_layer.update()
    leg = tube(f'leg_{nm}_pants', [(s * 0.11, 0, HIP_Z), (s * 0.11, -0.005, 0.2)], 0.075, PANTS, sides=10, taper=lambda u: 1.0 - 0.15 * u)
    boot = prim('uv_sphere', f'leg_{nm}_boot', LEATHER, smooth=True, segments=14, ring_count=8, radius=0.1, location=(s * 0.11, -0.035, 0.085))
    boot.scale = (0.8, 1.3, 0.85)
    cut_below(boot)
    cuff = tube(f'leg_{nm}_boot_top', [(s * 0.11, -0.005, 0.15), (s * 0.11, -0.005, 0.24)], 0.085, LEATHER, sides=10)
    for o in (leg, boot, cuff):
        child(o, j)
    solid += [leg, boot]

# туловище: плащ-колокол, подол, пояс, шнуры
body = joint('body', (0, 0, HIP_Z))
bpy.context.view_layer.update()
robe = lathe('robe', [(0.36, 0.3), (0.35, 0.36), (0.31, 0.52), (0.27, 0.7), (0.255, 0.86), (0.27, 0.97), (0.255, 1.04), (0.2, 1.11), (0.11, 1.16), (0.0, 1.175)], 28, CLOAK)
robe.data.transform(Matrix.Diagonal((1, 0.82, 1, 1)))
hem = lathe('robe_hem', [(0.33, 0.29), (0.37, 0.29), (0.375, 0.33), (0.36, 0.36), (0.33, 0.36)], 28, CLOAK_D, close=True)
hem.data.transform(Matrix.Diagonal((1, 0.82, 1, 1)))
belt = prim('torus', 'belt', LEATHER, smooth=True, major_radius=0.27, minor_radius=0.026, major_segments=24, minor_segments=5, location=(0, 0, 0.72))
belt.scale = (1, 0.82, 1)
buckle = box('belt_buckle', CORD, (0, -0.232, 0.72), (0.07, 0.02, 0.06))
cords = [tube(f'cord_{s}', [(s * 0.025, -0.205, 1.07), (s * 0.06, -0.232, 0.86)], 0.014, CORD, sides=5) for s in (-1, 1)]
for o in [robe, hem, belt, buckle] + cords:
    child(o, body)
solid += [robe, hem, belt]

# капюшон: «яйцо» с макушкой, отведённой назад; спереди — тёмное лицо в окантовке, глаза светятся
hood = lathe('hood', [(0.0, 1.02), (0.17, 1.05), (0.235, 1.15), (0.255, 1.29), (0.245, 1.42), (0.205, 1.53), (0.135, 1.61), (0.055, 1.67), (0.0, 1.69)], 28, CLOAK)
for v in hood.data.vertices:
    v.co.y = v.co.y * 0.95 + 0.02 + max(0.0, v.co.z - 1.38) * 0.35  # макушка уходит назад
face = prim('uv_sphere', 'face', FACE, smooth=True, segments=20, ring_count=12, radius=0.15, location=(0, -0.155, 1.33))
face.scale = (1.0, 0.55, 1.08)
# окантовка лица — по поверхности капюшона (луч спереди в каждую точку овала)
rim_pts = []
for a in [2 * math.pi * k / 24 for k in range(25)]:
    p, n = surface_hit(hood, (0.158 * math.sin(a), -2, 1.33 + 0.168 * math.cos(a)))
    rim_pts.append(p + n * 0.006)
rim = tube('hood_rim', rim_pts, 0.024, CLOAK_D, sides=6)
eyes = []
for s in (-1, 1):
    e = prim('uv_sphere', f'eye_{s}', EYES, smooth=True, segments=12, ring_count=8, radius=0.03, location=(s * 0.055, -0.232, 1.335))
    e.scale = (1.35, 0.5, 0.85)
    eyes.append(e)
p, n = surface_hit(hood, (0, -2, 1.56))  # эмблема (оберег) — на лбу капюшона, по его скату
emblem = prim('cylinder', 'emblem', EMBLEM, smooth=True, vertices=16, radius=0.04, depth=0.015, location=p + n * 0.008)
emblem.rotation_mode = 'QUATERNION'
emblem.rotation_quaternion = n.to_track_quat('Z', 'Y')
for o in [hood, face, rim, emblem] + eyes:
    child(o, body)
solid += [hood]

# колчан за спиной наискосок, стрелы с красным оперением — над левым плечом (+X)
q0, q1 = Vector((-0.12, 0.24, 0.74)), Vector((0.2, 0.27, 1.13))  # наискосок: стрелы — над левым плечом
quiver = tube('quiver', [q0, q1], 0.065, QUIVER, sides=10)
child(quiver, body)
solid.append(quiver)
d = (q1 - q0).normalized()
for k, off in enumerate((Vector((-0.025, 0.0, 0.0)), Vector((0.03, 0.01, -0.01)))):
    a0, a1 = q1 + off - d * 0.05, q1 + off + d * (0.24 + 0.04 * k)
    child(tube(f'arrow_{k}', [a0, a1], 0.011, SHAFT, sides=5), body)
    for j, side in enumerate((Vector((0.035, 0, 0)), Vector((-0.035, 0, 0)))):
        bm = bmesh.new()
        pts = [a1 - d * 0.015, a1 - d * 0.1, a1 - d * 0.1 + side, a1 - d * 0.03 + side * 0.9]
        vs = [bm.verts.new(p) for p in pts]
        bm.faces.new(vs)
        fl = obj_from_bm(f'arrow_{k}_fletch_{j}', bm, [FLETCH], smooth=False)
        child(fl, body)

# руки от плеч (дети туловища): рукав, обшлаг, перчатка
for s, nm in ((1, 'p'), (-1, 'n')):
    # плечо — круглое, наполовину в плаще: рука растёт из него (шарнир — в его центре, рука качается из плеча);
    # рукав — от плеча вниз и чуть в сторону, к обшлагу шире, как у плаща
    SH = (s * 0.215, 0.0, 1.0)
    j = joint(f'arm_{nm}', SH, parent=body)
    bpy.context.view_layer.update()
    shoulder = prim('uv_sphere', f'arm_{nm}_shoulder', CLOAK, smooth=True, segments=16, ring_count=10, radius=0.088, location=SH)
    sleeve = tube(f'arm_{nm}_sleeve', [SH, (s * 0.255, -0.008, 0.85), (s * 0.29, -0.022, 0.7)], 0.072, CLOAK, sides=12, taper=lambda u: 1.0 + 0.28 * u)
    cuff = tube(f'arm_{nm}_cuff', [(s * 0.287, -0.021, 0.72), (s * 0.293, -0.024, 0.665)], 0.098, CLOAK_D, sides=12)
    hand = prim('uv_sphere', f'arm_{nm}_hand', LEATHER, smooth=True, segments=12, ring_count=8, radius=0.06, location=(s * 0.296, -0.026, 0.625))
    for o in (shoulder, sleeve, cuff, hand):
        child(o, j)
    solid += [shoulder, sleeve, cuff, hand]

for o in solid:
    outline(o, 0.025)

preview_rig(target_z=0.9, dist=4.6, elev=18)
render(ROOT + r'\renders\catcher.png')
export_glb(ROOT + r'\glb\catcher.glb')
save_blend()
