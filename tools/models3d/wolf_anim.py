# Волк (облик wolf — модель владельца из Meshy, автоскелет SmartRig, 51 кость, анимаций нет). Здесь:
#   кости — до 32 (предел M3D): мелкие (середина пясти и кончики пальцев передних лап, пальцы задних, лопатки, кончики ушей, каждая вторая кость хвоста и одна грудная) сливаются
#   с родителем — их веса переходят ему, сетка не меняется;
#   idle — стоит: дышит, оглядывается, поводит ушами, хвост покачивается (4 с);
#   walk — шаг: лапы по очереди (задняя — передняя той же стороны — другая задняя — другая передняя), спина покачивается (1 с);
#   run  — галоп: задние вместе, передние вместе, спина сгибается и разгибается, тело ныряет (0,5 с).
# Волк смотрит в −Y (как Mixamo-герои), лапы — вниз. Повороты — в осях мира: x — вбок, y — вперёд-назад (−Y — вперёд), z — вверх.
# Запуск: node bl.mjs wolf_anim.py — сцена wolf (импорт ~/Blender/duholov-3d/src/wolf.glb), выгрузка
# ~/Blender/duholov-3d/glb/wolf_anim.glb; дальше — node skinned.mjs … wolf 1024 --clips=idle:idle,walk:walk,run:run.
import bpy, bmesh, math, os
from mathutils import Quaternion, Vector

NAME = 'wolf'
SRC = os.path.join(os.path.expanduser('~'), 'Blender', 'duholov-3d', 'src', NAME + '.glb')
OUT = os.path.join(os.path.expanduser('~'), 'Blender', 'duholov-3d', 'glb', NAME + '_anim.glb')
FPS = 30
DROP = ['Bone_031', 'Bone_033', 'Bone_038', 'Bone_040', 'Bone_006', 'Bone_007', 'Bone_012', 'Bone_013', 'Bone_037', 'Bone_044',
        'Bone_003', 'Bone_046', 'Bone_045', 'Bone_049', 'Bone_048', 'Bone_024', 'Bone_022', 'Bone_020', 'Bone_018']
ROOT, SPINE, CHEST = 'Bone_000', ('Bone_001', 'Bone_005', 'Bone_004'), 'Bone_002'
NECK, HEAD, EARS = ('Bone_030', 'Bone_029', 'Bone_028', 'Bone_027'), 'Bone_026', ('Bone_047', 'Bone_050')
TAIL = ('Bone_025', 'Bone_023', 'Bone_021', 'Bone_019')
# лапы: сторона (+1 — x>0), верх, середина, нижняя, кисть/стопа
FRONT = {+1: ('Bone_043', 'Bone_042', 'Bone_041', 'Bone_039'), -1: ('Bone_036', 'Bone_035', 'Bone_034', 'Bone_032')}  # пальцы — от сустава у земли
HIND = {+1: ('Bone_017', 'Bone_016', 'Bone_015', 'Bone_014'), -1: ('Bone_011', 'Bone_010', 'Bone_009', 'Bone_008')}

old = bpy.data.scenes.get(NAME)
if old:
    for o in list(old.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    bpy.data.scenes.remove(old)
for a in list(bpy.data.actions):
    if a.name.startswith(NAME + '_'):
        bpy.data.actions.remove(a)
sc = bpy.data.scenes.new(NAME)
wins = bpy.context.window_manager.windows  # в фоне (blender --background) окон нет
win = wins[0] if len(wins) else None
if win:
    win.scene = sc


def ctx(**kw):
    """контекст для операторов: окно — если есть, сцена — эта"""
    kw.update(scene=sc, view_layer=sc.view_layers[0])
    if win:
        kw["window"] = win
    return bpy.context.temp_override(**kw)


sc.render.fps = FPS
with ctx():
    bpy.ops.import_scene.gltf(filepath=SRC)
arm = next(o for o in sc.objects if o.type == 'ARMATURE')
me = next(o for o in sc.objects if o.type == 'MESH' and o.find_armature() == arm)

# лишние кости — к родителю (веса — ближайшему оставшемуся предку)
B = arm.data.bones
keep_of = {}
for n in DROP:
    p = B[n].parent
    while p.name in DROP:
        p = p.parent
    keep_of[n] = p.name
G = {g.index: g.name for g in me.vertex_groups}
gi = {g.name: g for g in me.vertex_groups}
for v in me.data.vertices:
    add = {}
    for g in v.groups:
        n = G[g.group]
        if n in keep_of and g.weight > 0:
            add[keep_of[n]] = add.get(keep_of[n], 0) + g.weight
    if not add:
        continue
    have = {G[g.group]: g.weight for g in v.groups}
    for k, x in add.items():
        if k not in gi:
            gi[k] = me.vertex_groups.new(name=k)
        gi[k].add([v.index], have.get(k, 0) + x, 'REPLACE')
for n in DROP:
    if n in gi:
        me.vertex_groups.remove(gi[n])
for o in sc.objects:
    o.select_set(o == arm)
sc.view_layers[0].objects.active = arm
with ctx(active_object=arm, object=arm, selected_objects=[arm], selected_editable_objects=[arm]):
    bpy.ops.object.mode_set(mode='EDIT')
    for n in DROP:
        arm.data.edit_bones.remove(arm.data.edit_bones[n])
    bpy.ops.object.mode_set(mode='OBJECT')
print(f'{NAME}: костей {len(arm.data.bones)} (слито {len(DROP)})')

# лапы срощены: в исходной позе левая и правая касаются (передние — ступнями), у вершин между ними — веса обеих. Вершине —
# веса лап только её стороны (по x), грани-перемычки между левой и правой лапой — прочь (в исходной позе их не видно,
# на шаге — перепонка между лапами)
SIDE = {}
for s in (+1, -1):
    for n in FRONT[s] + HIND[s]:
        SIDE[n] = s
G = {g.index: g.name for g in me.vertex_groups}
gi = {g.name: g for g in me.vertex_groups}
mw = me.matrix_world
# автоскелет вешает на кости лап и далёкое — гриву на шее, спину, передние лапы — на задние бёдра: лапа шагнула — грива
# тянется. Вес кости лапы у вершины выше сустава лапы (плеча, бедра) или дальше FAR от кости — корню лапы (груди у передних,
# пояснице у задних)
from mathutils.geometry import intersect_point_line
FAR = 0.5
aw = arm.matrix_world
seg = {n: (aw @ B[n].head_local, aw @ B[n].tail_local) for n in SIDE}
top = {n: (FRONT if n in sum(FRONT.values(), ()) else HIND)[SIDE[n]][0] for n in SIDE}
base = {n: B[top[n]].parent.name for n in SIDE}
high = {n: (aw @ B[top[n]].head_local).z + 0.05 for n in SIDE}


def seg_d(q, a, b):
    p, t = intersect_point_line(q, a, b)
    t = max(0.0, min(1.0, t))
    return (q - (a + (b - a) * t)).length


nfar = 0
for v in me.data.vertices:
    q = mw @ v.co
    w = {G[g.group]: g.weight for g in v.groups if g.weight > 0}
    move = {n: x for n, x in w.items() if n in SIDE and (q.z > high[n] or seg_d(q, *seg[n]) > FAR)}
    if not move:
        continue
    for n, x in move.items():
        gi[n].remove([v.index])
        k = base[n]
        if k not in gi:
            gi[k] = me.vertex_groups.new(name=k)
        w[k] = w.get(k, 0) + x
        gi[k].add([v.index], w[k], 'REPLACE')
    nfar += 1
print(f'{NAME}: вершин с весами далёких костей лап {nfar}')
dom = []
nfix = 0
for v in me.data.vertices:
    w = {G[g.group]: g.weight for g in v.groups if g.weight > 0}
    ls = {s: sum(x for n, x in w.items() if SIDE.get(n) == s) for s in (+1, -1)}
    if ls[+1] > 0 and ls[-1] > 0:
        x = (mw @ v.co).x
        s = (1 if x > 0 else -1) if abs(x) > 0.01 else max(ls, key=ls.get)
        for n in [n for n in w if SIDE.get(n) == -s]:
            gi[n].remove([v.index])
            w.pop(n)
        nfix += 1
    top = max(w, key=w.get) if w else None
    dom.append(SIDE.get(top, 0))
bm = bmesh.new()
bm.from_mesh(me.data)
bm.faces.ensure_lookup_table()
bad = [f for f in bm.faces if {dom[v.index] for v in f.verts} >= {1, -1}]
n0 = sum(len(f.verts) - 2 for f in bm.faces)
bmesh.ops.delete(bm, geom=bad, context='FACES_ONLY')
n1 = sum(len(f.verts) - 2 for f in bm.faces)
bm.to_mesh(me.data)
bm.free()
me.data.update()
print(f'{NAME}: вершин с весами обеих лап {nfix}; перемычек между лапами {len(bad)} граней; треугольников {n0} → {n1}')

arm.animation_data_create()
arm.animation_data.action = None
PB = arm.pose.bones
A2W = arm.matrix_world.to_3x3()


def rot(name, axis, ang):
    """повернуть кость на угол вокруг оси мира (у покоя)"""
    b = PB[name]
    ax = (b.bone.matrix_local.to_3x3().inverted() @ (A2W.inverted() @ Vector(axis))).normalized()
    b.rotation_quaternion = b.rotation_quaternion @ Quaternion(ax, ang)


def lift(name, dz):
    b = PB[name]
    b.location = b.bone.matrix_local.to_3x3().inverted() @ (A2W.inverted() @ Vector((0, 0, dz)))


X, Y, Z = (1, 0, 0), (0, 1, 0), (0, 0, 1)


def leg(bones, a, up, front):
    """лапа: a — вынос (+ вперёд), up — 0…1 подъём в переносе: передняя сгибает запястье, задняя — скакательный сустав"""
    top, mid, low, paw = bones
    rot(top, X, -a)                      # у лап, что смотрят вниз, вперёд — −X
    # сгибы — мягкие. Лапа к земле выравнивается в запястье (у задней — в скакательном суставе): там веса плавные. Сустав
    # пальцев не поворачивается: у ступни соседние вершины висят то на пальцах, то на пясти, и поворот в нём рвёт ступню
    if front:
        rot(mid, X, 0.2 * up)            # локоть
        rot(low, X, 0.8 * a + 0.45 * up) # запястье: ступня — ровно к земле, в переносе лапа подгибается назад
    else:
        rot(mid, X, 0.3 * up)            # колено
        rot(low, X, 0.8 * a - 0.45 * up) # скакательный: стопа — ровно к земле, в переносе — под себя


def tail(t, amp, up, speed):
    for i, b in enumerate(TAIL):
        rot(b, Z, amp * math.sin(speed * t - 0.7 * i) * (0.6 + 0.2 * i))
        rot(b, X, -up * (1 if i == 0 else 0.3))


def pose(kind, t):
    for b in PB:
        b.rotation_mode = 'QUATERNION'
        b.rotation_quaternion = (1, 0, 0, 0)
        b.location = (0, 0, 0)
    tau = 2 * math.pi
    if kind == 'idle':  # 4 с
        br = math.sin(tau * t / 2.0)                                   # дыхание — дважды за цикл
        rot(SPINE[2], X, 0.012 * br)
        rot(CHEST, X, -0.012 * br)
        look = math.sin(tau * t / 4.0)                                 # оглядывается: влево — вправо
        for i, n in enumerate(NECK):
            rot(n, Z, 0.09 * look)
            rot(n, X, 0.02 * math.sin(tau * t / 4.0 * 2 + 0.5))
        rot(HEAD, Y, 0.05 * look)
        tw = math.exp(-((t % 4.0) - 2.6) ** 2 / 0.006)                 # ухо дёргается
        rot(EARS[0], X, 0.35 * tw)
        rot(EARS[1], X, 0.2 * math.exp(-((t % 4.0) - 0.9) ** 2 / 0.006))
        tail(t, 0.12, 0.0, tau / 4.0)
        lift(ROOT, 0.004 * br)
        return
    T = 1.0 if kind == 'walk' else 0.5
    ph0 = tau * t / T
    if kind == 'walk':
        off = {('H', +1): 0.0, ('F', +1): 0.25, ('H', -1): 0.5, ('F', -1): 0.75}
        aF, aH = 0.38, 0.34
        for s in (+1, -1):
            for kk, bones, A, fr in (('F', FRONT[s], aF, True), ('H', HIND[s], aH, False)):
                ph = ph0 - tau * off[(kk, s)]
                leg(bones, A * math.sin(ph), max(0.0, math.cos(ph)) ** 1.5, fr)
        lift(ROOT, 0.02 * math.cos(2 * ph0))
        rot(ROOT, Y, 0.03 * math.sin(ph0))                             # перекат с боку на бок
        rot(SPINE[0], Z, 0.04 * math.sin(ph0))
        rot(SPINE[2], Z, -0.04 * math.sin(ph0))
        for n in NECK[:2]:
            rot(n, X, -0.03 * math.cos(2 * ph0))                       # голова кивает в такт
        tail(t, 0.15, 0.0, tau / T)
        return
    # галоп: задние почти вместе, передние — через полцикла
    off = {('H', +1): 0.0, ('H', -1): 0.08, ('F', +1): 0.5, ('F', -1): 0.58}
    aF, aH = 0.75, 0.65
    for s in (+1, -1):
        for kk, bones, A, fr in (('F', FRONT[s], aF, True), ('H', HIND[s], aH, False)):
            ph = ph0 - tau * off[(kk, s)]
            leg(bones, A * math.sin(ph), max(0.0, math.cos(ph)), fr)
    flex = math.sin(ph0)                                               # задние вперёд — спина собрана (дугой), назад — вытянута
    rot(SPINE[0], X, -0.13 * flex)
    rot(SPINE[1], X, 0.05 * flex)
    rot(SPINE[2], X, 0.10 * flex)
    rot(ROOT, X, 0.10 * math.sin(ph0 + 1.2))                           # тело клюёт вперёд-назад
    lift(ROOT, 0.07 * (0.5 + 0.5 * math.sin(ph0 - 0.6)))
    rot(ROOT, X, -0.12)                                                # на бегу — ниже к земле
    for n in NECK:
        rot(n, X, 0.06 + 0.05 * math.sin(ph0 + 2.0))                   # голова вытянута вперёд, держит уровень
    for e in EARS:
        rot(e, X, 0.35)                                                # уши прижаты
    tail(t, 0.08, -0.25, tau / T)


tracks = []
for kind, dur in (('idle', 4.0), ('walk', 1.0), ('run', 0.5)):
    a = bpy.data.actions.new(f'{NAME}_{kind}')
    arm.animation_data.action = a
    n = round(dur * FPS)
    for f in range(n + 1):  # последний кадр = первому: цикл без шва
        pose(kind, f / FPS)
        for b in PB:
            b.keyframe_insert('rotation_quaternion', frame=f)
            b.keyframe_insert('location', frame=f)
    a.use_fake_user = True
    tracks.append((kind, a))
arm.animation_data.action = None
for tr in list(arm.animation_data.nla_tracks):
    arm.animation_data.nla_tracks.remove(tr)
for kind, a in tracks:
    tr = arm.animation_data.nla_tracks.new()
    tr.name = kind
    tr.strips.new(kind, 0, a)
for b in PB:
    b.matrix_basis.identity()
with ctx():
    bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=False, use_active_scene=True, export_animations=True,
                              export_animation_mode='NLA_TRACKS', export_force_sampling=True, export_frame_step=1, export_yup=True,
                              export_apply=False, export_image_format='AUTO')
print('glb:', OUT, os.path.getsize(OUT))
