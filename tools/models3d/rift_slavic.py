# Разлом (славянский): круглый портал в Навь — диск с переливом от розового края к тёмному центру (цвета вершин),
# четыре розовых рукава-спирали и белое ядро с крестом (узел swirl — его вращает three.js), вокруг — 16 каменных
# зубцов, на четырёх — розовые руны-уголки остриём к центру. Портал стоит вертикально, лицом к −Y.
# Части для three.js: portal_disc (цвета вершин, без освещения), swirl (+ swirl_arm_*, swirl_core, swirl_x_*), stone_*, rune_*

CZ, R = 1.48, 1.08  # центр портала по высоте и радиус диска


sc = new_scene('rift_slavic')
STONE = mat('rift_stone', '#4a4552', rough=0.8)
STONE_D = mat('rift_stone_dark', '#221e29', rough=0.9)
PINK = mat('rift_pink', '#f472b6', rough=0.3, emit='#ec4899', strength=1.2)
# портал с переливом и вихрем (узел swirl) — общий помощник portal()
disc, swirl = portal('portal', center=(0, 0, CZ), w=R, h=R)

# кольцо: тёмный обод за зубцами и 16 каменных зубцов
rim = prim('torus', 'stone_rim', STONE_D, smooth=True, major_radius=R + 0.04, minor_radius=0.09, major_segments=48, minor_segments=6, location=(0, 0, CZ))
rim.rotation_euler = (math.pi / 2, 0, 0)
teeth = []
for i in range(16):
    a = 2 * math.pi * i / 16 + math.pi / 2
    bm = bmesh.new()
    r0, r1, w0, w1, d = R + 0.02, R + 0.34, 0.17, 0.23, 0.17  # клин: уже у портала, шире наружу; толщина ±d
    pts = []
    for (rr, ww) in ((r0, w0), (r1, w1)):
        for sgn in (-1, 1):
            pts.append(Vector((rr * math.cos(a) - sgn * ww * math.sin(a), 0, CZ + rr * math.sin(a) + sgn * ww * math.cos(a))))
    q = [pts[0], pts[1], pts[3], pts[2]]
    vf = [bm.verts.new(p + Vector((0, -d, 0))) for p in q]
    vb = [bm.verts.new(p + Vector((0, d, 0))) for p in q]
    bm.faces.new(vf)
    bm.faces.new(list(reversed(vb)))
    for k in range(4):
        n = (k + 1) % 4
        bm.faces.new((vf[k], vb[k], vb[n], vf[n]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    t = obj_from_bm(f'stone_tooth_{i}', bm, [STONE], smooth=False)
    bevel(t, 0.025, 1)
    teeth.append(t)
    # руны-уголки на четырёх сторонах — остриём к центру
    if i % 4 == 0:
        rc = R + 0.18
        cx, cz = rc * math.cos(a), CZ + rc * math.sin(a)
        inward = Vector((-math.cos(a), 0, -math.sin(a)))
        side = Vector((-math.sin(a), 0, math.cos(a)))
        tip = Vector((cx, -d - 0.012, cz)) + inward * 0.06
        for sgn in (-1, 1):
            end = tip - inward * 0.1 + side * 0.075 * sgn
            mid = (tip + end) / 2
            bar = prim('cube', f'rune_{i}_{sgn}', PINK, size=1, location=mid)
            ln = (end - tip).length
            bar.scale = (ln + 0.035, 0.012, 0.035)
            bar.rotation_euler = (0, -math.atan2((end - tip).z, (end - tip).x), 0)
# подпорки снизу: два валуна
for sgn in (-1, 1):
    st = prim('ico_sphere', f'stone_foot_{sgn}', STONE, subdivisions=1, radius=0.3, location=(sgn * 0.42, 0, 0.16))
    st.scale = (1.3, 0.9, 0.7)
    cut_below(st)

for o in teeth + [rim]:
    outline(o, 0.03)
for o in sc.objects:
    if o.name.startswith('stone_foot'):
        outline(o, 0.03)

preview_rig(target_z=1.45, dist=7.2, elev=16)
render(ROOT + r'\renders\rift_slavic.png')
export_glb(ROOT + r'\glb\rift_slavic.glb')
save_blend()
