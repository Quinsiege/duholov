# Разлом (5.1.41) — модель владельца из генератора: каменное кольцо с рунами, в нём — портал-вихрь (отдельные куски сетки:
# лицевой и тыльный диск). Скелет генератора для анимации не годится — свой из двух костей:
#   root   — всё, что стоит (кольцо, камни, ленты);
#   portal — диск портала (куски сетки, что широки и высоки, как проём, а толщиной — тонкий диск): вращается по часовой стрелке,
#            если смотреть спереди (модель смотрит в −Y), — оборот за TURN секунд, цикл без шва.
# Клип один — idle; в игре он же и для walk/run. Сетка и текстура — как есть (лишний шар генератора — прочь).
# Запуск: NAME — вид модели (rift_<мифология>), исходник — ~/Blender/duholov-3d/src/<NAME>.glb:
#   node bl.mjs n.py rift_anim.py   (в n.py — NAME = 'rift_slavic'), или в фоне (NAME — из окружения RIFT):
#   RIFT=rift_slavic blender -b --factory-startup --python rift_anim.py
# затем node skinned.mjs ~/Blender/duholov-3d/glb/<NAME>_anim.glb <NAME> 1024 --clips=idle:idle,walk:idle,run:idle
import bpy, bmesh, math, os
from mathutils import Quaternion, Vector

NAME = globals().get('NAME') or os.environ.get('RIFT', 'rift_slavic')
SRC = os.path.join(os.path.expanduser('~'), 'Blender', 'duholov-3d', 'src', NAME + '.glb')
OUT = os.path.join(os.path.expanduser('~'), 'Blender', 'duholov-3d', 'glb', NAME + '_anim.glb')
FPS, TURN = 30, 4.0

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
mw = me.matrix_world.copy()
me.parent = None
me.matrix_world = mw
for m in list(me.modifiers):
    me.modifiers.remove(m)
for o in [o for o in sc.objects if o.type == 'ARMATURE']:
    bpy.data.objects.remove(o, do_unlink=True)
me.vertex_groups.clear()

# куски сетки; портал — широкие и высокие (как проём), но тонкие по глубине
bm = bmesh.new()
bm.from_mesh(me.data)
bm.verts.ensure_lookup_table()
P = [mw @ v.co for v in bm.verts]
isl = [-1] * len(bm.verts)
portal = set()
k = 0
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
    lo = [min(P[i][a] for i in part) for a in range(3)]
    hi = [max(P[i][a] for i in part) for a in range(3)]
    if hi[0] - lo[0] > 0.45 and hi[2] - lo[2] > 0.45 and hi[1] - lo[1] < 0.2:
        portal.update(part)
    k += 1
bm.free()
xs, zs = [P[i].x for i in portal], [P[i].z for i in portal]
pc = Vector(((min(xs) + max(xs)) / 2, sum(P[i].y for i in portal) / len(portal), (min(zs) + max(zs)) / 2))
print(f'{NAME}: портал {len(portal)} вершин, центр {tuple(round(c, 2) for c in pc)}, ширина {max(xs) - min(xs):.2f} м')

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
    b = eb.new('portal'); b.head = pc; b.tail = pc + Vector((0, -0.15, 0)); b.parent = root  # кость — по оси портала (к зрителю)
    bpy.ops.object.mode_set(mode='OBJECT')
g_root, g_p = me.vertex_groups.new(name='root'), me.vertex_groups.new(name='portal')
for v in me.data.vertices:
    (g_p if v.index in portal else g_root).add([v.index], 1.0, 'REPLACE')
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


a = bpy.data.actions.new(f'{NAME}_idle')
arm.animation_data.action = a
for f in range(round(TURN * FPS) + 1):  # последний кадр = первому (полный оборот)
    for b in PB:
        b.rotation_mode = 'QUATERNION'
        b.rotation_quaternion = (1, 0, 0, 0)
        b.location = (0, 0, 0)
    # по часовой стрелке для зрителя спереди (он — со стороны −Y): поворот вокруг +Y на +угол ведёт верх (+Z) вправо (+X)
    rot('portal', (0, 1, 0), 2 * math.pi * f / (TURN * FPS))
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
