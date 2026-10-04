# Источник (5.1.41) — модель владельца из генератора («колодец»: каменная чаша на резном постаменте, в чаше — бирюзовая вода,
# над ней парит осколок Алатыря). Скелет генератора (15 костей у постамента) для анимации не годится — свой, из трёх костей:
#   root    — всё, что стоит (постамент, чаша);
#   crystal — осколок Алатыря (куски сетки выше чаши): парит вверх-вниз, медленно вращается и покачивается;
#   water   — вода (бирюзовая внутренность чаши по текстуре): середина «дышит» вверх-вниз и чуть кружится, у бортика — неподвижна
#             (вес к краю спадает — сетка не рвётся).
# Клип один — idle (4 с, цикл без шва); в игре он же и для walk/run. Сетка и текстура — как есть (лишний шар генератора — прочь).
# Запуск: node bl.mjs spring_anim.py (или в фоне: blender -b --factory-startup --python spring_anim.py), затем
#   node skinned.mjs ~/Blender/duholov-3d/glb/spring_anim.glb spring 1024 --clips=idle:idle,walk:idle,run:idle
import bpy, bmesh, math, os
from mathutils import Quaternion, Vector

NAME = 'spring'
SRC = os.path.join(os.path.expanduser('~'), 'Blender', 'duholov-3d', 'src', 'spring_well.glb')
OUT = os.path.join(os.path.expanduser('~'), 'Blender', 'duholov-3d', 'glb', NAME + '_anim.glb')
FPS, DUR = 30, 4.0
CRYSTAL_Z = 1.25  # всё, что целиком выше, — осколок

old = bpy.data.scenes.get(NAME)
if old:
    for o in list(old.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    bpy.data.scenes.remove(old)
for a in list(bpy.data.actions):
    if a.name.startswith(NAME + '_'):
        bpy.data.actions.remove(a)
sc = bpy.data.scenes.new(NAME)
wins = bpy.context.window_manager.windows  # в фоне окон нет
win = wins[0] if len(wins) else None
if win:
    win.scene = sc
sc.render.fps = FPS


def ctx(**kw):
    kw.update(scene=sc, view_layer=sc.view_layers[0])
    if win:
        kw['window'] = win
    return bpy.context.temp_override(**kw)


with ctx():
    bpy.ops.import_scene.gltf(filepath=SRC)
for o in list(sc.objects):
    if o.type == 'MESH' and o.name.startswith('Icosphere'):
        bpy.data.objects.remove(o, do_unlink=True)
me = next(o for o in sc.objects if o.type == 'MESH')
gen = [o for o in sc.objects if o.type == 'ARMATURE']
mw = me.matrix_world.copy()
me.parent = None
me.matrix_world = mw
for m in list(me.modifiers):
    me.modifiers.remove(m)
for o in gen:
    bpy.data.objects.remove(o, do_unlink=True)
me.vertex_groups.clear()

# какие вершины — осколок и вода
bm = bmesh.new()
bm.from_mesh(me.data)
bm.verts.ensure_lookup_table()
P = [mw @ v.co for v in bm.verts]
isl = [-1] * len(bm.verts)
k = 0
crystal = set()
for v0 in bm.verts:
    if isl[v0.index] >= 0:
        continue
    st, part = [v0], []
    isl[v0.index] = k
    while st:
        x = st.pop()
        part.append(x.index)
        for e in x.link_edges:
            y = e.other_vert(x)
            if isl[y.index] < 0:
                isl[y.index] = k
                st.append(y)
    if min(P[i].z for i in part) > CRYSTAL_Z:
        crystal.update(part)
    k += 1
uvl = bm.loops.layers.uv.active
img = next(n.image for n in me.data.materials[0].node_tree.nodes if n.type == 'TEX_IMAGE')
W, H = img.size
px = img.pixels[:]


def cyan(uv):
    x = min(W - 1, max(0, int(uv.x * W)))
    y = min(H - 1, max(0, int(uv.y * H)))
    i = (y * W + x) * 4
    r, g, b = px[i:i + 3]
    return b > 0.5 and g > 0.5 and r < 0.6


water = set()
for f in bm.faces:
    c = mw @ f.calc_center_median()
    if c.z < CRYSTAL_Z and math.hypot(c.x, c.y) < 0.36 and cyan(sum((l[uvl].uv for l in f.loops), f.loops[0][uvl].uv * 0) / len(f.loops)):
        water.update(v.index for v in f.verts)
bm.free()
cz = sum(P[i].z for i in crystal) / len(crystal)
cc = Vector((sum(P[i].x for i in crystal) / len(crystal), sum(P[i].y for i in crystal) / len(crystal), cz))
wr = max(math.hypot(P[i].x, P[i].y) for i in water)
wz = min(P[i].z for i in water)
print(f'{NAME}: осколок {len(crystal)} вершин (центр {cc.z:.2f} м), вода {len(water)} вершин (радиус {wr:.2f} м, дно {wz:.2f} м)')

# свой скелет
ad = bpy.data.armatures.new(NAME + '_rig')
arm = bpy.data.objects.new(NAME + '_rig', ad)
sc.collection.objects.link(arm)
for o in sc.objects:
    o.select_set(o == arm)
sc.view_layers[0].objects.active = arm
with ctx(active_object=arm, object=arm, selected_objects=[arm], selected_editable_objects=[arm]):
    bpy.ops.object.mode_set(mode='EDIT')
    eb = ad.edit_bones
    root = eb.new('root'); root.head = (0, 0, 0); root.tail = (0, 0, 0.3)
    b = eb.new('crystal'); b.head = cc; b.tail = cc + Vector((0, 0, 0.12)); b.parent = root
    b = eb.new('water'); b.head = (0, 0, wz); b.tail = (0, 0, wz + 0.1); b.parent = root
    bpy.ops.object.mode_set(mode='OBJECT')
g_root, g_cr, g_wa = (me.vertex_groups.new(name=n) for n in ('root', 'crystal', 'water'))
for v in me.data.vertices:
    i = v.index
    if i in crystal:
        g_cr.add([i], 1.0, 'REPLACE')
        continue
    w = 0.0
    if i in water:
        t = max(0.0, min(1.0, (wr - math.hypot(P[i].x, P[i].y)) / (0.55 * wr)))  # у бортика — 0, к середине — 1
        w = t * t * (3 - 2 * t)
    if w > 0:
        g_wa.add([i], w, 'REPLACE')
    if w < 1:
        g_root.add([i], 1 - w, 'REPLACE')
me.parent = arm
mod = me.modifiers.new('rig', 'ARMATURE')
mod.object = arm

arm.animation_data_create()
PB = arm.pose.bones
A2W = arm.matrix_world.to_3x3()


def rot(name, axis, ang):
    b = PB[name]
    ax = (b.bone.matrix_local.to_3x3().inverted() @ (A2W.inverted() @ Vector(axis))).normalized()
    b.rotation_quaternion = b.rotation_quaternion @ Quaternion(ax, ang)


def lift(name, dz):
    b = PB[name]
    b.location = b.bone.matrix_local.to_3x3().inverted() @ (A2W.inverted() @ Vector((0, 0, dz)))


def pose(t):
    for b in PB:
        b.rotation_mode = 'QUATERNION'
        b.rotation_quaternion = (1, 0, 0, 0)
        b.location = (0, 0, 0)
    tau = 2 * math.pi
    # осколок: парит (один подъём за цикл), оборот за цикл, покачивается
    lift('crystal', 0.045 * math.sin(tau * t / DUR))
    rot('crystal', (0, 0, 1), tau * t / DUR)
    rot('crystal', (1, 0, 0), 0.08 * math.sin(tau * t / DUR * 2 + 0.6))
    # вода: середина «дышит» (дважды за цикл) и чуть кружится
    lift('water', 0.018 * math.sin(tau * t / DUR * 2))
    rot('water', (0, 0, 1), 0.12 * math.sin(tau * t / DUR))


a = bpy.data.actions.new(f'{NAME}_idle')
arm.animation_data.action = a
for f in range(round(DUR * FPS) + 1):  # последний кадр = первому
    pose(f / FPS)
    for b in PB:
        b.keyframe_insert('rotation_quaternion', frame=f)
        b.keyframe_insert('location', frame=f)
a.use_fake_user = True
arm.animation_data.action = None
tr = arm.animation_data.nla_tracks.new()
tr.name = 'idle'
tr.strips.new('idle', 0, a)
for b in PB:
    b.matrix_basis.identity()
with ctx():
    bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=False, use_active_scene=True, export_animations=True,
                              export_animation_mode='NLA_TRACKS', export_force_sampling=True, export_frame_step=1, export_yup=True,
                              export_apply=False, export_image_format='AUTO')
print('glb:', OUT, os.path.getsize(OUT))
