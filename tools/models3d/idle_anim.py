# «Отдых стоя» (idle, 4,8 с, цикл) для облика из генератора со скелетом Mixamo и анимациями Walking / Running на месте:
# руки опущены вдоль тела (поза из ходьбы, где ступни рядом), колени чуть согнуты, дыхание — грудь и плечи, медленно
# оглядывается, голова чуть наклоняется; FLAME — пламя на голове подрагивает (у беса).
# Запуск (bl.mjs склеивает файлы — имя облика первым, своим файлом): echo "NAME = 'emerald_wayfarer'" > n.py;
# node bl.mjs n.py idle_anim.py. Сцена NAME (импорт ~/Blender/duholov-3d/src/NAME.glb), выгрузка
# ~/Blender/duholov-3d/glb/NAME_anim.glb с анимациями idle, walk, run; дальше — node skinned.mjs … (см. README).
# Облики: ember_imp (Огненный бес, FLAME), emerald_wayfarer (Изумрудная странница).
import bpy, math, os
from mathutils import Quaternion, Vector, Matrix

NAME = globals().get('NAME', 'ember_imp')
FLAME = globals().get('FLAME', NAME == 'ember_imp')
SRC = os.path.join(os.path.expanduser('~'), 'Blender', 'duholov-3d', 'src', NAME + '.glb')
OUT = os.path.join(os.path.expanduser('~'), 'Blender', 'duholov-3d', 'glb', NAME + '_anim.glb')
FPS, DUR = 30, 4.8
M = 'mixamorig:'

old = bpy.data.scenes.get(NAME)
if old:
    for o in list(old.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    bpy.data.scenes.remove(old)
before = set(bpy.data.actions)
sc = bpy.data.scenes.new(NAME)
win = bpy.context.window_manager.windows[0]
win.scene = sc
sc.render.fps = FPS
with bpy.context.temp_override(window=win, scene=sc):
    bpy.ops.import_scene.gltf(filepath=SRC)
arm = next(o for o in sc.objects if o.type == 'ARMATURE')
mine = [a for a in bpy.data.actions if a not in before]  # анимации этого файла (имена могли получить .001)
act = lambda base: next(a for a in mine if a.name.split('.')[0] == base)
WALK, RUN = act('Walking'), act('Running')
arm.animation_data_create()
PB = arm.pose.bones

# кадр ходьбы, где ступни ближе всего друг к другу (руки там опущены вдоль тела)
arm.animation_data.action = WALK
best, bd = 0, 1e9
f0, f1 = WALK.frame_range
for f in range(int(f0), int(f1) + 1):
    sc.frame_set(f)
    d = abs((arm.matrix_world @ PB[M + 'LeftFoot'].head).y - (arm.matrix_world @ PB[M + 'RightFoot'].head).y)
    if d < bd:
        bd, best = d, f
sc.frame_set(best)
UP = {M + n for n in ('Spine', 'Spine1', 'Spine2', 'Neck', 'Head', 'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand')}
base = {b.name: (b.matrix_basis.copy() if b.name in UP else Matrix.Identity(4)) for b in PB}
arm.animation_data.action = None
print('поза рук — из кадра ходьбы', best)


def rot(name, axis, ang):
    """повернуть кость на угол вокруг оси в осях скелета (у покоя): x — вбок, y — вперёд-назад (−Y — вперёд), z — вверх"""
    b = PB[name]
    ax = (b.bone.matrix_local.to_3x3().inverted() @ Vector(axis)).normalized()
    b.rotation_quaternion = b.rotation_quaternion @ Quaternion(ax, ang)


def pose(t):
    for b in PB:
        b.rotation_mode = 'QUATERNION'
        loc, q, sca = base[b.name].decompose()
        b.location, b.rotation_quaternion, b.scale = loc, q, sca
    tau = 2 * math.pi
    br = math.sin(tau * t / 2.4)            # дыхание — 2 вдоха за цикл
    look = math.sin(tau * t / DUR)          # оглядывается — раз за цикл
    PB[M + 'Hips'].location = PB[M + 'Hips'].bone.matrix_local.to_3x3().inverted() @ Vector((0, 0, -0.018 + 0.004 * br))  # чуть присел
    for s in ('Left', 'Right'):  # колени чуть согнуты, ступни — ровно на земле
        rot(M + s + 'UpLeg', (1, 0, 0), -0.1)
        rot(M + s + 'Leg', (1, 0, 0), 0.2)
        rot(M + s + 'Foot', (1, 0, 0), -0.1)
    rot(M + 'Spine1', (1, 0, 0), -0.02 * br)
    rot(M + 'Spine2', (1, 0, 0), -0.025 * br)
    for s, sg in (('Left', 1), ('Right', -1)):
        rot(M + s + 'Shoulder', (0, 1, 0), sg * 0.025 * br)        # плечи поднимаются на вдохе
        rot(M + s + 'Arm', (0, 1, 0), -sg * 0.03 * (0.5 + 0.5 * br))  # руки чуть отходят от тела
        rot(M + s + 'ForeArm', (1, 0, 0), -0.12 - 0.03 * br)       # локти слегка согнуты
    rot(M + 'Neck', (0, 0, 1), 0.22 * look)                           # смотрит по сторонам
    rot(M + 'Head', (0, 0, 1), 0.12 * look)
    rot(M + 'Head', (0, 1, 0), 0.05 * math.sin(tau * t / DUR + 1.2))  # и чуть наклоняет голову
    rot(M + 'Head', (1, 0, 0), -0.03 * br)
    top = M + 'HeadTop_End'  # пламя на голове подрагивает
    if FLAME and top in PB:
        rot(top, (1, 0, 0), 0.06 * math.sin(tau * t / 0.8))
        rot(top, (0, 1, 0), 0.05 * math.sin(tau * t / 1.2 + 0.7))


idle = bpy.data.actions.new(NAME + '_idle')
arm.animation_data.action = idle
n = round(DUR * FPS)
for f in range(n + 1):
    pose(f / FPS)  # последний кадр = первому: цикл без шва
    for b in PB:
        b.keyframe_insert('rotation_quaternion', frame=f)
        b.keyframe_insert('location', frame=f)
idle.use_fake_user = True
arm.animation_data.action = None
for tr in list(arm.animation_data.nla_tracks):
    arm.animation_data.nla_tracks.remove(tr)
for nm, a in (('idle', idle), ('walk', WALK), ('run', RUN)):
    tr = arm.animation_data.nla_tracks.new()
    tr.name = nm
    tr.strips.new(nm, int(a.frame_range[0]), a)
for b in PB:
    b.matrix_basis.identity()
with bpy.context.temp_override(window=win, scene=sc, view_layer=sc.view_layers[0]):
    bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=False, use_active_scene=True, export_animations=True,
                              export_animation_mode='NLA_TRACKS', export_force_sampling=True, export_frame_step=1, export_yup=True,
                              export_apply=False, export_image_format='AUTO')
print('glb:', OUT, os.path.getsize(OUT))
