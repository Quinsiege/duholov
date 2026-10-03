# Ловчий и его облики-скины (LOOK.skin, рисунки — www/js/skins-art.js): общее тело и шарниры походки + свой наряд.
# Лицом к −Y, ноги на z = 0. Шарниры (пустышки) — для походки в игре (js/m3d.js): body — туловище с головой и нарядом;
# arm_p / arm_n — руки от плеч (дети body); leg_p / leg_n — ноги от бёдер (_p — сторона +X). Рука, что держит посох,
# — arm_p_hold: она в группе туловища и не машет.
# Цвет глаз игра берёт из облика у всех нарядов (материал catcher_eyes), цвет плаща — только у обычного (catcher_cloak*).
# Сцены: catcher (обычный — капюшон) и catcher_<скин>. Запуск: SKINS = ['voron'] перед файлом — только эти, иначе все.

from mathutils import Quaternion
SKIN_LIST = ['hood', 'kupala', 'leshiy', 'moroz', 'volhv', 'bogatyr', 'voron', 'navstrazh', 'zharpero', 'knyaz']
HIP_Z, HEAD = 0.5, (0.0, -0.01, 1.32)


def joint(sc, name, loc, parent=None):
    """Пустышка-шарнир: дети вращаются вокруг неё (в игре)"""
    e = bpy.data.objects.new(name, None)
    sc.collection.objects.link(e)
    e.location = loc
    if parent:
        e.parent = parent
        e.matrix_parent_inverse = parent.matrix_world.inverted()
    bpy.context.view_layer.update()
    return e


def child(o, parent):
    o.parent = parent
    o.matrix_parent_inverse = parent.matrix_world.inverted()
    return o


def disc(name, m, p, n, r, depth=0.015, verts=16):
    """Плоский диск в точке p лицом по нормали n"""
    o = prim('cylinder', name, m, smooth=True, vertices=verts, radius=r, depth=depth, location=p)
    o.rotation_mode = 'QUATERNION'
    o.rotation_quaternion = Vector(n).to_track_quat('Z', 'Y')
    return o


def teardrop(name, m, base, tip_dir, length, width, flat=0.45):
    """Капля/перо: тело вращения вдоль tip_dir, сплюснутое по толщине"""
    o = lathe(name, [(0, 0), (width * 0.75, length * 0.12), (width, length * 0.35), (width * 0.7, length * 0.65), (width * 0.25, length * 0.9), (0, length)], 12, m)
    o.scale = (1, flat, 1)
    o.rotation_mode = 'QUATERNION'
    o.rotation_quaternion = Vector(tip_dir).normalized().to_track_quat('Z', 'Y')
    o.location = base
    return o


def hood_shape(name, m):
    o = lathe(name, [(0.0, 1.02), (0.17, 1.05), (0.235, 1.15), (0.255, 1.29), (0.245, 1.42), (0.205, 1.53), (0.135, 1.61), (0.055, 1.67), (0.0, 1.69)], 28, m)
    for v in o.data.vertices:
        v.co.y = v.co.y * 0.95 + 0.02 + max(0.0, v.co.z - 1.38) * 0.35  # макушка уходит назад
    return o


def build(skin):
    sc = new_scene('catcher' if skin == 'hood' else 'catcher_' + skin)
    EYES = mat('catcher_eyes', '#5eead4', rough=0.2, emit='#5eead4', strength=1.6)
    VOID = mat('catcher_face', '#160d2b', rough=0.9, emit='#2a1f4a', strength=0.25)
    SKIN = mat('catcher_skin', '#f1c9a5', rough=0.65)
    SKIN_D = mat('catcher_skin_dark', '#d9a27e', rough=0.7)
    LEATHER = mat('catcher_leather', '#3b2314', rough=0.7)
    GOLD = mat('catcher_emblem', '#f59e0b', rough=0.3, emit='#f59e0b', strength=0.35)
    MARK = mat('catcher_emblem_mark', '#7c2d12', rough=0.6)
    SHADOW = mat('ground_shadow', '#000000', rough=1.0, alpha=0.28)
    # одежда облика: плащ, его тень (подол, обшлага), штаны, сапоги, перчатки (None — руки голые), пояс
    PAL = {
        'hood': (('catcher_cloak', '#6d28d9'), ('catcher_cloak_dark', '#3b1679'), '#2b2140', '#3b2314', '#3b2314', '#3b2314'),
        'kupala': (('kupala_shirt', '#f3ead8'), ('kupala_red', '#b91c1c'), '#7c2d12', '#a16207', None, '#b91c1c'),
        'leshiy': (('leshiy_moss', '#4d7c0f'), ('leshiy_moss_dark', '#2f4f0a'), '#3f2a1c', '#3f2a1c', '#4a3220', '#5b3a1e'),
        'moroz': (('moroz_ice', '#7cb7f0'), ('moroz_snow', '#f1f5f9'), '#1e3a5f', '#e2e8f0', '#e2e8f0', '#1e3a8a'),
        'volhv': (('volhv_robe', '#e5e7eb'), ('volhv_red', '#b91c1c'), '#9ca3af', '#7c4a1e', None, '#b91c1c'),
        'bogatyr': (('bogatyr_mail', '#9ca3af'), ('bogatyr_mail_dark', '#6b7280'), '#7f1d1d', '#5b3a1e', '#5b3a1e', '#7c4a1e'),
        'voron': (('voron_feather', '#211b33'), ('voron_purple', '#6d28d9'), '#18122a', '#18122a', '#18122a', '#3b2a5c'),
        'navstrazh': (('navstrazh_robe', '#3b0f75'), ('navstrazh_green', '#22c55e'), '#1e0b3d', '#1e0b3d', '#1e0b3d', '#14532d'),
        'zharpero': (('zharpero_gold', '#f59e0b'), ('zharpero_red', '#dc2626'), '#7c2d12', '#7c2d12', '#9a3412', '#b45309'),
        'knyaz': (('knyaz_kaftan', '#7f1d1d'), ('knyaz_gold', '#eab308'), '#3f1d1d', '#5b3a1e', None, '#eab308'),
    }[skin]
    (cn, cc), (dn, dc), pants, boots, gloves, beltc = PAL
    CLOAK = mat(cn, cc, rough=0.35 if skin == 'moroz' else 0.6, emit=cc if skin == 'zharpero' else None, strength=0.25)
    CLOAK_D = mat(dn, dc, rough=0.6, emit=dc if skin in ('navstrazh',) else None, strength=0.8)
    PANTS = mat(f'{skin}_pants', pants, rough=0.8)
    BOOTS = mat(f'{skin}_boots', boots, rough=0.7)
    HANDS = mat(f'{skin}_gloves', gloves, rough=0.7) if gloves else SKIN
    BELT = mat(f'{skin}_belt', beltc, rough=0.6, metal=0.4 if skin == 'knyaz' else 0.0)
    solid = []
    sh = prim('circle', 'shadow', SHADOW, vertices=24, radius=0.34, fill_type='TRIFAN', location=(0, 0.02, 0.004))
    sh.scale = (1, 0.8, 1)

    # ноги от бёдер: штанина и сапог (носок — вперёд, к −Y)
    for s, nm in ((1, 'p'), (-1, 'n')):
        j = joint(sc, f'leg_{nm}', (s * 0.11, 0, HIP_Z))
        leg = tube(f'leg_{nm}_pants', [(s * 0.11, 0, HIP_Z), (s * 0.11, -0.005, 0.2)], 0.075, PANTS, sides=10, taper=lambda u: 1.0 - 0.15 * u)
        boot = prim('uv_sphere', f'leg_{nm}_boot', BOOTS, smooth=True, segments=14, ring_count=8, radius=0.1, location=(s * 0.11, -0.035, 0.085))
        boot.scale = (0.8, 1.3, 0.85)
        cut_below(boot)
        top = tube(f'leg_{nm}_boot_top', [(s * 0.11, -0.005, 0.15), (s * 0.11, -0.005, 0.24)], 0.085, BOOTS, sides=10)
        for o in (leg, boot, top):
            child(o, j)
        solid += [leg, boot]

    # туловище: плащ (у Волхва и Купальского — до пят), подол, пояс; оберег — на груди
    body = joint(sc, 'body', (0, 0, HIP_Z))
    long = skin in ('volhv', 'kupala', 'knyaz')
    hem_z = 0.16 if long else 0.3
    robe = lathe('robe', [(0.36 if not long else 0.34, hem_z), (0.35, hem_z + 0.06), (0.31, 0.52), (0.27, 0.7), (0.255, 0.86), (0.27, 0.97), (0.255, 1.04), (0.2, 1.11), (0.11, 1.16), (0.0, 1.175)], 28, CLOAK)
    robe.data.transform(Matrix.Diagonal((1, 0.82, 1, 1)))
    r0 = 0.36 if not long else 0.34
    hem = lathe('robe_hem', [(r0 - 0.03, hem_z - 0.01), (r0 + 0.01, hem_z - 0.01), (r0 + 0.015, hem_z + 0.03), (r0, hem_z + 0.06), (r0 - 0.03, hem_z + 0.06)], 28, CLOAK_D, close=True)
    hem.data.transform(Matrix.Diagonal((1, 0.82, 1, 1)))
    belt = prim('torus', 'belt', BELT, smooth=True, major_radius=0.27, minor_radius=0.026, major_segments=24, minor_segments=5, location=(0, 0, 0.72))
    belt.scale = (1, 0.82, 1)
    for o in (robe, hem, belt):
        child(o, body)
    solid += [robe, hem, belt]
    p, n = surface_hit(robe, (0, -2, 1.05))
    em = disc('emblem', GOLD, p + n * 0.012, n, 0.055, depth=0.022, verts=20)
    child(em, body)
    solid.append(em)
    for k in range(3):  # оберег: шестилучевой знак на золотом круге
        a = math.pi * k / 3
        bar = box(f'emblem_mark_{k}', MARK, p + n * 0.025, (0.075, 0.008, 0.012))
        bar.rotation_mode = 'QUATERNION'
        bar.rotation_quaternion = n.to_track_quat('-Y', 'Z') @ Quaternion((0, 1, 0), a)
        child(bar, body)

    def put(o):
        child(o, body)
        return o

    def hood_head(m, rim_m):
        """капюшон, тёмное лицо в окантовке, глаза"""
        hood = put(hood_shape('hood', m))
        face = put(prim('uv_sphere', 'face', VOID, smooth=True, segments=20, ring_count=12, radius=0.15, location=(0, -0.155, 1.33)))
        face.scale = (1.0, 0.55, 1.08)
        rim_pts = []
        for a in [2 * math.pi * k / 24 for k in range(25)]:
            q, nq = surface_hit(hood, (0.158 * math.sin(a), -2, 1.33 + 0.168 * math.cos(a)))
            rim_pts.append(q + nq * 0.006)
        put(tube('hood_rim', rim_pts, 0.024, rim_m, sides=6))
        for s in (-1, 1):
            e = put(prim('uv_sphere', f'eye_{s}', EYES, smooth=True, segments=12, ring_count=8, radius=0.03, location=(s * 0.055, -0.232, 1.335)))
            e.scale = (1.35, 0.5, 0.85)
        solid.append(hood)
        return hood

    def face_head(beard=None, brows='#6b4a2e'):
        """человеческая голова: лицо, глаза (светятся, как на рисунке), нос, брови"""
        head = put(prim('uv_sphere', 'head', SKIN, smooth=True, segments=20, ring_count=12, radius=0.16, location=HEAD))
        head.scale = (1, 0.95, 1.05)
        for s in (-1, 1):
            e = put(prim('uv_sphere', f'eye_{s}', EYES, smooth=True, segments=12, ring_count=8, radius=0.025, location=(s * 0.055, -0.158, 1.34)))
            e.scale = (1.3, 0.5, 0.9)
            put(tube(f'brow_{s}', [(s * 0.03, -0.155, 1.385), (s * 0.085, -0.142, 1.38)], 0.011, mat(f'{skin}_brows', brows, rough=0.8), sides=4, smooth=False))
        put(prim('uv_sphere', 'nose', SKIN_D, smooth=True, segments=10, ring_count=6, radius=0.02, location=(0, -0.168, 1.305)))
        solid.append(head)
        return head

    # ---------- наряд облика ----------
    if skin == 'hood':
        hood_head(CLOAK, CLOAK_D)
        for s in (-1, 1):  # золотые шнуры — от оберега вниз
            put(tube(f'cord_{s}', [p + n * 0.01 + Vector((s * 0.02, 0, -0.04)), (s * 0.06, -0.232, 0.86)], 0.013, mat('catcher_cord', '#f7d77e', rough=0.35, emit='#f7d77e', strength=0.15), sides=5))
        # колчан за спиной наискосок, стрелы с красным оперением — над левым плечом (+X)
        q0, q1 = Vector((-0.12, 0.24, 0.74)), Vector((0.2, 0.27, 1.13))
        solid.append(put(tube('quiver', [q0, q1], 0.065, mat('quiver_leather', '#7c4a1e', rough=0.6), sides=10)))
        d = (q1 - q0).normalized()
        FLETCH = mat('arrow_fletch', '#ef4444', rough=0.5, cull=False)
        for k, off in enumerate((Vector((-0.025, 0.0, 0.0)), Vector((0.03, 0.01, -0.01)))):
            a0, a1 = q1 + off - d * 0.05, q1 + off + d * (0.24 + 0.04 * k)
            put(tube(f'arrow_{k}', [a0, a1], 0.011, mat('arrow_shaft', '#c98a4a', rough=0.6), sides=5))
            for jx, side in enumerate((Vector((0.035, 0, 0)), Vector((-0.035, 0, 0)))):
                bm = bmesh.new()
                bm.faces.new([bm.verts.new(q) for q in (a1 - d * 0.015, a1 - d * 0.1, a1 - d * 0.1 + side, a1 - d * 0.03 + side * 0.9)])
                put(obj_from_bm(f'arrow_{k}_fletch_{jx}', bm, [FLETCH], smooth=False))

    elif skin == 'kupala':
        face_head(brows='#a0723f')
        HAIR = mat('kupala_hair', '#e2b866', rough=0.6)
        hair = put(prim('uv_sphere', 'hair', HAIR, smooth=True, segments=20, ring_count=12, radius=0.172, location=(0, 0.012, 1.345)))
        hair.scale = (1.02, 1.0, 1.04)
        # срез спереди — лицо открыто: остаются затылок и макушка
        bpy.context.view_layer.update()
        me = hair.data
        me.transform(hair.matrix_basis)
        hair.matrix_basis = Matrix.Identity(4)
        child(hair, body)
        bm = bmesh.new(); bm.from_mesh(me)
        bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(0, -0.075, 1.30), plane_no=(0, -0.6, -0.8), clear_outer=True)
        bm.to_mesh(me); bm.free()
        solid.append(hair)
        for s in (-1, 1):  # пряди у щёк
            put(tube(f'hair_lock_{s}', [(s * 0.15, -0.04, 1.4), (s * 0.165, -0.06, 1.27), (s * 0.15, -0.05, 1.15)], 0.035, HAIR, sides=8, taper=lambda u: 1.0 - 0.4 * u))
        braid = [Vector((0, 0.16, 1.3 - 0.09 * k)) for k in range(6)]
        put(tube('hair_braid', braid, 0.04, HAIR, sides=8, taper=lambda u: 1.0 - 0.35 * u))
        for k in range(1, 6):
            b = put(prim('uv_sphere', f'hair_braid_knot_{k}', HAIR, smooth=True, segments=10, ring_count=6, radius=0.042 - 0.004 * k, location=braid[k]))
        put(tube('mouth', [(-0.03, -0.157, 1.255), (0, -0.162, 1.247), (0.03, -0.157, 1.255)], 0.008, mat('kupala_lips', '#c2410c', rough=0.6), sides=4))
        for s in (-1, 1):
            put(prim('uv_sphere', f'cheek_{s}', mat('kupala_cheek', '#fda4af', rough=0.7), smooth=True, segments=8, ring_count=6, radius=0.025, location=(s * 0.09, -0.14, 1.29))).scale = (1, 0.4, 0.7)
        # венок: зелёное кольцо, цветы, сверху — светящийся цветок папоротника
        wr = put(prim('torus', 'wreath', mat('kupala_leaves', '#4d7c0f', rough=0.7), smooth=True, major_radius=0.165, minor_radius=0.03, major_segments=24, minor_segments=6, location=(0, 0.0, 1.44)))
        wr.rotation_euler = (math.radians(-12), 0, 0)
        cols = [('kupala_daisy', '#ffffff'), ('kupala_cornflower', '#2563eb'), ('kupala_poppy', '#dc2626')]
        for k in range(12):
            a = 2 * math.pi * k / 12
            nm, c = cols[k % 3]
            loc = Vector((0.165 * math.sin(a), -0.165 * math.cos(a) * math.cos(math.radians(12)), 1.44 + 0.165 * math.cos(a) * math.sin(math.radians(12))))
            put(prim('uv_sphere', f'wreath_flower_{k}', mat(nm, c, rough=0.5), smooth=True, segments=10, ring_count=6, radius=0.035, location=loc)).scale = (1, 1, 0.7)
        FERN = mat('kupala_fern', '#fde047', rough=0.3, emit='#f97316', strength=1.6)
        for k in range(5):
            a = 2 * math.pi * k / 5
            put(teardrop(f'fern_petal_{k}', FERN, Vector((0, 0.0, 1.53)), (math.sin(a) * 0.9, -0.15, math.cos(a) * 0.9 + 0.35), 0.11, 0.035, flat=0.5))
        put(prim('uv_sphere', 'fern_core', mat('kupala_fern_core', '#fff7ed', emit='#fde047', strength=1.5), smooth=True, segments=10, ring_count=6, radius=0.03, location=(0, -0.01, 1.54)))
        put(prim('torus', 'collar', CLOAK_D, smooth=True, major_radius=0.12, minor_radius=0.022, major_segments=20, minor_segments=5, location=(0, 0, 1.15)))

    elif skin == 'leshiy':
        hood = hood_head(CLOAK, CLOAK_D)
        LUMP = [mat('leshiy_moss_light', '#65a30d', rough=0.8), CLOAK_D]
        for k, (x, z) in enumerate(((-0.2, 1.2), (0.21, 1.25), (-0.17, 1.47), (0.18, 1.5), (-0.07, 1.62), (0.09, 1.6), (-0.23, 1.33), (0.235, 1.38))):
            q, nq = surface_hit(hood, (x, -2, z))
            if q:
                put(prim('uv_sphere', f'moss_{k}', LUMP[k % 2], smooth=True, segments=10, ring_count=6, radius=0.045, location=q + nq * 0.01)).scale = (1, 0.7, 1)
        BARK = mat('leshiy_antler', '#7c5a3a', rough=0.7)
        for s in (-1, 1):  # оленьи рога с отростками
            beam = [Vector((s * 0.1, 0.1, 1.6)), Vector((s * 0.2, 0.12, 1.75)), Vector((s * 0.26, 0.1, 1.9)), Vector((s * 0.33, 0.12, 2.0))]
            put(tube(f'antler_{s}', beam, 0.022, BARK, sides=6, taper=lambda u: 1.0 - 0.5 * u))
            for t0, d in ((1, (s * 0.02, -0.05, 0.12)), (2, (s * -0.06, 0.0, 0.12))):
                put(tube(f'antler_{s}_tine_{t0}', [beam[t0], beam[t0] + Vector(d)], 0.016, BARK, sides=5, taper=lambda u: 1.0 - 0.6 * u))
        for k in range(10):  # листья по подолу
            a = 2 * math.pi * k / 10
            put(teardrop(f'leaf_{k}', LUMP[0], Vector((0.36 * math.sin(a), -0.36 * 0.82 * math.cos(a), 0.31)), (math.sin(a) * 0.4, -math.cos(a) * 0.4, -1), 0.1, 0.04, flat=0.3))

    elif skin == 'moroz':
        hood = hood_head(CLOAK, CLOAK_D)
        ICE = mat('moroz_crystal', '#bae6fd', rough=0.15, emit='#e0f2fe', strength=0.45)
        for k, (x, z, h) in enumerate(((0, 1.66, 0.24), (-0.09, 1.63, 0.18), (0.09, 1.63, 0.18), (-0.17, 1.56, 0.13), (0.17, 1.56, 0.13))):
            q, nq = surface_hit(hood, (x, -2, z))
            c = put(crystal(f'ice_spike_{k}', ICE, rx=0.035, ry=0.025, mid=0.02, top=h, bot=0.03, seed=11 + k))
            c.location = q + nq * 0.02
            c.rotation_mode = 'QUATERNION'
            c.rotation_quaternion = (nq + Vector((0, 0, 1.4))).normalized().to_track_quat('Z', 'Y')
        put(prim('torus', 'snow_collar', CLOAK_D, smooth=True, major_radius=0.2, minor_radius=0.04, major_segments=20, minor_segments=6, location=(0, -0.01, 1.08))).scale = (1, 0.85, 1)

    elif skin == 'volhv':
        face_head(brows='#f1f5f9')
        WHITE = mat('volhv_beard', '#f1f5f9', rough=0.7)
        beard = put(teardrop('beard', WHITE, Vector((0, -0.11, 1.3)), (0, -0.25, -1), 0.42, 0.13, flat=0.55))
        for s in (-1, 1):
            put(tube(f'mustache_{s}', [(0, -0.172, 1.275), (s * 0.06, -0.165, 1.26), (s * 0.085, -0.15, 1.22)], 0.018, WHITE, sides=6, taper=lambda u: 1.0 - 0.5 * u))
        put(prim('uv_sphere', 'hair_back', WHITE, smooth=True, segments=16, ring_count=10, radius=0.165, location=(0, 0.04, 1.33))).scale = (1.02, 0.9, 1.0)
        hat = put(lathe('hat', [(0.0, 1.38), (0.175, 1.38), (0.17, 1.45), (0.12, 1.65), (0.06, 1.85), (0.0, 1.98)], 20, mat('volhv_hat', '#e5e7eb', rough=0.55)))
        solid.append(hat)
        put(prim('torus', 'hat_band', CLOAK_D, smooth=True, major_radius=0.172, minor_radius=0.022, major_segments=20, minor_segments=5, location=(0, 0, 1.41)))
        RUNE = mat('volhv_rune', '#3b82f6', rough=0.4, emit='#2563eb', strength=0.5)
        for k, (a, b) in enumerate((((-0.03, 1.72), (-0.03, 1.56)), ((-0.03, 1.66), (0.04, 1.6)), ((0.0, 1.52), (0.04, 1.47)), ((0.04, 1.47), (0.08, 1.52)))):
            q0, n0 = surface_hit(hat, (a[0], -2, a[1]))
            q1, n1 = surface_hit(hat, (b[0], -2, b[1]))
            put(tube(f'hat_rune_{k}', [q0 + n0 * 0.008, q1 + n1 * 0.008], 0.011, RUNE, sides=4, smooth=False))
        for x in (-0.05, 0.05):  # красная вышивка по полам
            q0, n0 = surface_hit(robe, (x, -2, 1.0))
            q1, n1 = surface_hit(robe, (x * 1.4, -2, 0.22))
            put(tube(f'robe_trim_{x}', [q0 + n0 * 0.008, q1 + n1 * 0.008], 0.016, CLOAK_D, sides=4, smooth=False))

    elif skin == 'bogatyr':
        face_head(brows='#5b3a1e')
        BEARD = mat('bogatyr_beard', '#7c4a1e', rough=0.75)
        put(teardrop('beard', BEARD, Vector((0, -0.115, 1.28)), (0, -0.3, -1), 0.2, 0.1, flat=0.6))
        for s in (-1, 1):
            put(tube(f'mustache_{s}', [(0, -0.172, 1.275), (s * 0.06, -0.165, 1.26), (s * 0.08, -0.155, 1.23)], 0.016, BEARD, sides=6, taper=lambda u: 1.0 - 0.5 * u))
        # кольчужный бармица-капюшон вокруг лица и шелом с золотым ободом, наносником и шпилем
        coif = lathe('coif', [(0.0, 1.0), (0.22, 1.03), (0.25, 1.13), (0.22, 1.22), (0.18, 1.29)], 20, CLOAK, close=False)
        bm = bmesh.new(); bm.from_mesh(coif.data)  # спереди открыта: борода — поверх кольчуги
        bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(0, -0.09, 0), plane_no=(0, -1, 0), clear_outer=True)
        bm.to_mesh(coif.data); bm.free()
        put(coif)
        solid.append(coif)
        STEEL = mat('bogatyr_steel', '#cbd5e1', rough=0.25, metal=0.7)
        helm = put(lathe('helmet', [(0.0, 1.36), (0.18, 1.36), (0.18, 1.42), (0.15, 1.52), (0.09, 1.63), (0.035, 1.72), (0.0, 1.76)], 20, STEEL))
        solid.append(helm)
        GOLDM = mat('bogatyr_gold', '#f59e0b', rough=0.3, metal=0.5, emit='#f59e0b', strength=0.15)
        put(prim('torus', 'helmet_rim', GOLDM, smooth=True, major_radius=0.182, minor_radius=0.022, major_segments=24, minor_segments=5, location=(0, 0, 1.39)))
        put(tube('helmet_spire', [(0, 0, 1.74), (0, 0, 1.86)], 0.014, GOLDM, sides=6))
        put(prim('uv_sphere', 'helmet_knob', GOLDM, smooth=True, segments=10, ring_count=6, radius=0.025, location=(0, 0, 1.87)))
        put(box('helmet_nasal', STEEL, (0, -0.18, 1.33), (0.025, 0.02, 0.12)))
        # алое корзно за спиной, застёжка — на правом плече (−X)
        RED = mat('bogatyr_cloak', '#b91c1c', rough=0.6)
        cape = lathe('cape', [(0.37, 0.34), (0.36, 0.6), (0.345, 0.85), (0.335, 1.0), (0.3, 1.1), (0.2, 1.17), (0.12, 1.2)], 24, RED)  # шире плеч: видно спереди
        cape.data.transform(Matrix.Diagonal((1.08, 0.9, 1, 1)))
        bm = bmesh.new(); bm.from_mesh(cape.data)
        bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(0, -0.13, 0), plane_no=(0, -1, 0), clear_outer=True)  # корзно — со спины и на плечах
        bm.to_mesh(cape.data); bm.free()
        cape.data.transform(Matrix.Translation((0, 0.03, 0)))
        solid.append(put(cape))
        put(disc('cape_brooch', GOLDM, Vector((-0.2, -0.13, 1.1)), (0, -1, 0.3), 0.045, depth=0.02))
        put(prim('uv_sphere', 'cape_brooch_gem', mat('bogatyr_gem', '#dc2626', emit='#ef4444', strength=0.4), smooth=True, segments=8, ring_count=6, radius=0.018, location=(-0.2, -0.15, 1.105)))

    elif skin == 'voron':
        hood = hood_head(CLOAK, CLOAK_D)
        BEAK = mat('voron_beak', '#3f3a52', rough=0.4)
        beak = put(lathe('beak', [(0.0, 0.0), (0.045, 0.02), (0.04, 0.12), (0.015, 0.22), (0.0, 0.25)], 10, BEAK))
        beak.scale = (1.0, 1.0, 1.0)
        beak.rotation_euler = (math.radians(115), 0, 0)  # ось тела вращения — вперёд и чуть вниз
        beak.location = (0, -0.2, 1.3)
        solid.append(beak)
        for s in (-1, 1):  # кольца глазниц маски
            put(prim('torus', f'mask_ring_{s}', CLOAK_D, smooth=True, major_radius=0.035, minor_radius=0.01, major_segments=14, minor_segments=4, location=(s * 0.055, -0.235, 1.34))).rotation_euler = (math.radians(90), 0, 0)
        q, nq = surface_hit(hood, (0.08, -2, 1.6))  # перо-рог на макушке
        put(teardrop('crest', CLOAK_D, q, (0.35, 0.2, 1), 0.2, 0.035, flat=0.5))
        FEATH = mat('voron_feather_dark', '#140f22', rough=0.7)
        for k in range(16):  # накидка из перьев по плечам
            a = 2 * math.pi * (k + 0.5) / 16
            base = Vector((0.24 * math.sin(a), -0.24 * 0.82 * math.cos(a), 1.02))
            put(teardrop(f'cape_feather_{k}', FEATH, base, (math.sin(a) * 0.45, -math.cos(a) * 0.45, -1), 0.2, 0.05, flat=0.3))
        for k in range(14):  # и по подолу
            a = 2 * math.pi * (k + 0.5) / 14
            put(teardrop(f'hem_feather_{k}', FEATH, Vector((0.35 * math.sin(a), -0.35 * 0.82 * math.cos(a), 0.36)), (math.sin(a) * 0.3, -math.cos(a) * 0.3, -1), 0.12, 0.045, flat=0.3))

    elif skin == 'navstrazh':
        hood = hood_head(CLOAK, CLOAK_D)
        BONE = mat('navstrazh_bone', '#efe7d6', rough=0.6)
        mask = put(prim('uv_sphere', 'skull_mask', BONE, smooth=True, segments=18, ring_count=12, radius=0.13, location=(0, -0.18, 1.32)))
        mask.scale = (1.0, 0.5, 1.12)
        solid.append(mask)
        HOLE = mat('navstrazh_hole', '#120a1f', rough=0.9)
        for s in (-1, 1):
            put(prim('uv_sphere', f'mask_socket_{s}', HOLE, smooth=True, segments=10, ring_count=6, radius=0.034, location=(s * 0.05, -0.236, 1.34))).scale = (1.25, 0.35, 0.95)
        for k in range(5):  # зашитый рот
            x = -0.04 + 0.02 * k
            put(tube(f'mask_stitch_{k}', [(x, -0.238, 1.245), (x, -0.236, 1.215)], 0.006, HOLE, sides=4, smooth=False))
        put(tube('mask_mouth', [(-0.05, -0.238, 1.23), (0.05, -0.238, 1.23)], 0.006, HOLE, sides=4, smooth=False))
        FLAME = mat('navstrazh_flame', '#4ade80', rough=0.3, emit='#22c55e', strength=1.4, alpha=0.9)
        for s in (-1, 1):  # рога и навье пламя у их корней
            horn = [Vector((s * 0.2, -0.02, 1.48)), Vector((s * 0.3, -0.06, 1.55)), Vector((s * 0.33, -0.1, 1.67)), Vector((s * 0.27, -0.12, 1.76))]
            put(tube(f'horn_{s}', horn, 0.04, BONE, sides=8, taper=lambda u: 1.0 - 0.8 * u))
            put(teardrop(f'nav_flame_{s}', FLAME, Vector((s * 0.24, 0.04, 1.42)), (s * 0.3, 0.1, 1), 0.2, 0.055, flat=0.6))

    elif skin == 'zharpero':
        hood = hood_head(CLOAK, CLOAK_D)
        FIRE = mat('zharpero_feather', '#f97316', rough=0.4, emit='#ea580c', strength=0.7)
        RIM = mat('zharpero_rim', '#fde047', rough=0.3, emit='#facc15', strength=0.5)
        GEM = mat('zharpero_gem', '#dc2626', rough=0.2, emit='#ef4444', strength=0.6)
        for k in range(7):  # венец из огненных перьев
            a = math.radians(-60 + 20 * k)
            q, nq = surface_hit(hood, (0.16 * math.sin(a), -2, 1.5 + 0.1 * math.cos(a)))
            d = Vector((math.sin(a) * 0.55, -0.15, 1.0))
            f = put(teardrop(f'crown_feather_{k}', FIRE, q + nq * 0.01, d, 0.22 - 0.03 * abs(k - 3) / 3, 0.05, flat=0.4))
            put(prim('uv_sphere', f'crown_gem_{k}', GEM, smooth=True, segments=8, ring_count=6, radius=0.018, location=q + nq * 0.02 + d.normalized() * (0.12 - 0.02 * abs(k - 3) / 3)))
        put(prim('torus', 'crown_band', RIM, smooth=True, major_radius=0.2, minor_radius=0.018, major_segments=24, minor_segments=5, location=(0, -0.02, 1.46))).rotation_euler = (math.radians(-35), 0, 0)
        for k in range(12):  # перья по подолу
            a = 2 * math.pi * (k + 0.5) / 12
            put(teardrop(f'hem_feather_{k}', FIRE, Vector((0.35 * math.sin(a), -0.35 * 0.82 * math.cos(a), 0.36)), (math.sin(a) * 0.3, -math.cos(a) * 0.3, -1), 0.13, 0.05, flat=0.3))

    elif skin == 'knyaz':
        face_head(brows='#4a2e1a')
        BEARD = mat('knyaz_beard', '#5b3a1e', rough=0.75)
        put(teardrop('beard', BEARD, Vector((0, -0.115, 1.28)), (0, -0.3, -1), 0.17, 0.095, flat=0.6))
        for s in (-1, 1):
            put(tube(f'mustache_{s}', [(0, -0.172, 1.275), (s * 0.06, -0.165, 1.26), (s * 0.08, -0.155, 1.24)], 0.015, BEARD, sides=6, taper=lambda u: 1.0 - 0.5 * u))
        FUR = mat('knyaz_sable', '#3f2a1c', rough=0.95)
        put(prim('torus', 'hat_fur', FUR, smooth=True, major_radius=0.16, minor_radius=0.06, major_segments=24, minor_segments=8, location=(0, 0.0, 1.42)))
        GOLDM = mat('knyaz_gold_metal', '#f59e0b', rough=0.3, metal=0.5, emit='#f59e0b', strength=0.15)
        dome = put(lathe('hat_dome', [(0.0, 1.42), (0.15, 1.42), (0.15, 1.5), (0.12, 1.6), (0.06, 1.66), (0.0, 1.68)], 20, GOLDM))
        solid.append(dome)
        for k, c in enumerate(('#dc2626', '#16a34a', '#dc2626', '#16a34a', '#dc2626')):
            a = math.radians(-60 + 30 * k)
            q, nq = surface_hit(dome, (0.11 * math.sin(a), -2, 1.55))
            put(prim('uv_sphere', f'hat_gem_{k}', mat(f'knyaz_gem_{c[1:]}', c, rough=0.2, emit=c, strength=0.4), smooth=True, segments=8, ring_count=6, radius=0.02, location=q + nq * 0.008))
        put(prim('uv_sphere', 'hat_finial', mat('knyaz_sapphire', '#1d4ed8', rough=0.15, emit='#3b82f6', strength=0.5), smooth=True, segments=10, ring_count=8, radius=0.03, location=(0, 0, 1.71)))
        barmy = put(prim('torus', 'barmy', GOLDM, smooth=True, major_radius=0.2, minor_radius=0.05, major_segments=28, minor_segments=8, location=(0, 0, 1.1)))
        barmy.scale = (1, 0.88, 0.55)
        solid.append(barmy)
        for k in range(7):
            a = math.radians(-75 + 25 * k)
            put(prim('uv_sphere', f'barmy_gem_{k}', mat('knyaz_gem_dc2626' if k % 2 == 0 else 'knyaz_gem_16a34a', '#dc2626' if k % 2 == 0 else '#16a34a', rough=0.2, emit='#dc2626' if k % 2 == 0 else '#16a34a', strength=0.4), smooth=True, segments=8, ring_count=6, radius=0.018, location=(0.2 * math.sin(a), -0.2 * 0.88 * math.cos(a) - 0.02, 1.11)))

    # руки от плеч: рукав (у Волхва и Купальского — широкий), обшлаг, кисть; у Волхва левая (+X) держит посох и не машет
    wide = skin in ('volhv', 'kupala', 'knyaz')
    for s, nm in ((1, 'p'), (-1, 'n')):
        SH = (s * 0.215, 0.0, 1.0)
        hold = skin == 'volhv' and s > 0
        j = joint(sc, f'arm_{nm}' + ('_hold' if hold else ''), SH, parent=body)
        shoulder = prim('uv_sphere', f'arm_{nm}_shoulder', CLOAK, smooth=True, segments=16, ring_count=10, radius=0.088, location=SH)
        end = (s * 0.29, -0.022, 0.7) if not hold else (s * 0.3, -0.12, 0.78)
        sleeve = tube(f'arm_{nm}_sleeve', [SH, ((SH[0] + end[0]) / 2 + s * 0.01, (SH[1] + end[1]) / 2, (SH[2] + end[2]) / 2), end], 0.072, CLOAK, sides=12, taper=lambda u: 1.0 + (0.5 if wide else 0.28) * u)
        cuff_e = Vector(end) + (Vector(end) - Vector(SH)).normalized() * 0.05
        cuff = tube(f'arm_{nm}_cuff', [Vector(end) - (Vector(end) - Vector(SH)).normalized() * 0.02, cuff_e], 0.098 if not wide else 0.11, CLOAK_D, sides=12)
        hand = prim('uv_sphere', f'arm_{nm}_hand', HANDS, smooth=True, segments=12, ring_count=8, radius=0.058, location=cuff_e + (Vector(end) - Vector(SH)).normalized() * 0.04)
        for o in (shoulder, sleeve, cuff, hand):
            child(o, j)
        solid += [shoulder, sleeve, cuff, hand]
        if hold:  # посох с огоньком — в левой руке
            hp = hand.location
            STAFF = mat('volhv_staff', '#8b5a2b', rough=0.7)
            staff = tube('staff', [hp + Vector((0, 0, -0.6)), hp + Vector((0, 0, 1.15))], 0.025, STAFF, sides=8)
            child(staff, j)
            solid.append(staff)
            top = hp + Vector((0, 0, 1.15))
            child(put_flame := lathe('staff_flame', [(0, 0), (0.05, 0.02), (0.06, 0.06), (0.045, 0.11), (0.02, 0.16), (0, 0.19)], 12,
                                     mat('volhv_flame', '#fdba74', rough=0.3, emit='#f97316', strength=1.6, alpha=0.92)), j)
            put_flame.location = top

    for o in solid:
        outline(o, 0.025)
    preview_rig(target_z=0.95, dist=4.8, elev=18)
    render(ROOT + rf'\renders\{sc.name}.png')
    export_glb(ROOT + rf'\glb\{sc.name}.glb')


for _skin in globals().get('SKINS') or SKIN_LIST:
    build(_skin)
save_blend()
