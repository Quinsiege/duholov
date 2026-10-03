# Синий дух (модель владельца из Meshy, скелет SmartRig: Bone_000…068) — анимации на месте, ключами по костям:
#   hover — левитация: парит над землёй, плавно поднимается и опускается, руки и ноги свободно дрейфуют;
#   fly   — полёт: корпус наклонён вперёд, ноги отведены назад, руки чуть назад, волна по телу;
#   dash  — усиленный полёт: наклон сильнее, руки и ноги вытянуты назад, ритм чаще.
# Запуск: node bl.mjs spirit_anim.py — сцена spirit_blue (импорт ~/Blender/duholov-3d/src/spirit_blue.glb), выгрузка
# ~/Blender/duholov-3d/glb/spirit_blue_anim.glb; дальше — node skinned.mjs … (см. README).
import bpy, math, os
from mathutils import Quaternion, Vector

SRC = os.path.join(os.path.expanduser('~'), 'Blender', 'duholov-3d', 'src', 'spirit_blue.glb')
OUT = os.path.join(os.path.expanduser('~'), 'Blender', 'duholov-3d', 'glb', 'spirit_blue_anim.glb')
FPS = 30
# кости (по положению в скелете): бёдра, позвоночник снизу вверх, шея и голова, руки (+X — левая персонажа), ноги
HIPS, SPINE, NECK = 'Bone_000', ['Bone_001', 'Bone_005', 'Bone_004', 'Bone_003', 'Bone_002'], ['Bone_018', 'Bone_017']
ARM = {+1: ['Bone_023', 'Bone_022', 'Bone_021', 'Bone_020'], -1: ['Bone_028', 'Bone_027', 'Bone_026', 'Bone_025']}
LEG = {+1: ['Bone_010', 'Bone_009', 'Bone_008'], -1: ['Bone_015', 'Bone_014', 'Bone_013']}

old = bpy.data.scenes.get('spirit_blue')
if old:
    for o in list(old.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    bpy.data.scenes.remove(old)
for a in list(bpy.data.actions):
    if a.name.startswith(('hover', 'fly', 'dash')):
        bpy.data.actions.remove(a)
sc = bpy.data.scenes.new('spirit_blue')
win = bpy.context.window_manager.windows[0]
win.scene = sc
sc.render.fps = FPS
with bpy.context.temp_override(window=win, scene=sc):
    bpy.ops.import_scene.gltf(filepath=SRC)
arm = next(o for o in sc.objects if o.type == 'ARMATURE')
for a in list(bpy.data.actions):  # импорт мог завести пустые действия
    if a.users == 0:
        bpy.data.actions.remove(a)
arm.animation_data_create()
PB = arm.pose.bones


def rot(name, axis, ang):
    """повернуть кость на угол вокруг оси в осях скелета (у покоя): x — вбок (+X), y — вперёд-назад (−Y — вперёд), z — вверх"""
    b = PB[name]
    ax = (b.bone.matrix_local.to_3x3().inverted() @ Vector(axis)).normalized()
    b.rotation_quaternion = b.rotation_quaternion @ Quaternion(ax, ang)


def pose(kind, t):
    """поза к моменту t (секунды): все кости — от покоя"""
    for b in PB:
        b.rotation_mode = 'QUATERNION'
        b.rotation_quaternion = (1, 0, 0, 0)
        b.location = (0, 0, 0)
    tau = 2 * math.pi
    if kind == 'hover':
        T = 2.6
        s, c = math.sin(tau * t / T), math.cos(tau * t / T)
        lift = 0.14 + 0.035 * s                              # парит над землёй и плавно поднимается-опускается
        PB[HIPS].location = PB[HIPS].bone.matrix_local.to_3x3().inverted() @ Vector((0, 0, lift))
        rot(HIPS, (1, 0, 0), 0.04 * c); rot(HIPS, (0, 1, 0), 0.03 * math.sin(tau * t / T + 1.1))
        for i, b in enumerate(SPINE):
            rot(b, (1, 0, 0), 0.025 * math.sin(tau * t / T - 0.5 - 0.3 * i))
        rot(NECK[0], (1, 0, 0), -0.04 * c); rot(NECK[0], (0, 0, 1), 0.06 * math.sin(tau * t / (T * 2)))
        for sd, ch in ARM.items():  # руки чуть в стороны, медленно плывут, кисти — с запаздыванием
            ph = tau * t / T + (0.0 if sd > 0 else 0.9)
            rot(ch[1], (0, 1, 0), -sd * (0.18 + 0.06 * math.sin(ph)))
            rot(ch[1], (1, 0, 0), 0.08 * math.sin(ph + 0.4))
            rot(ch[2], (1, 0, 0), -0.25 - 0.08 * math.sin(ph - 0.6))
            rot(ch[3], (1, 0, 0), 0.12 * math.sin(ph - 1.2))
        for sd, ch in LEG.items():  # ноги свисают, носки вниз, качаются вразнобой
            ph = tau * t / T + (0.0 if sd > 0 else 1.6)
            rot(ch[0], (1, 0, 0), -0.12 - 0.08 * math.sin(ph))
            rot(ch[1], (1, 0, 0), 0.28 + 0.08 * math.sin(ph - 0.7))
            rot(ch[2], (1, 0, 0), 0.35 + 0.1 * math.sin(ph - 1.2))
        return
    fast = kind == 'dash'
    T = 0.8 if fast else 1.3
    s, c = math.sin(tau * t / T), math.cos(tau * t / T)
    tilt = 0.62 if fast else 0.3                            # наклон вперёд (рад): полёт ~17°, усиленный ~36°
    lift = (0.32 if fast else 0.24) + (0.025 if fast else 0.035) * s
    PB[HIPS].location = PB[HIPS].bone.matrix_local.to_3x3().inverted() @ Vector((0, 0, lift))
    rot(HIPS, (1, 0, 0), tilt + 0.03 * c)
    rot(HIPS, (0, 1, 0), (0.05 if fast else 0.06) * math.sin(tau * t / T + 0.5))
    for i, b in enumerate(SPINE):  # волна по позвоночнику
        rot(b, (1, 0, 0), (0.035 if fast else 0.03) * math.sin(tau * t / T - 0.6 * (i + 1)))
    rot(NECK[0], (1, 0, 0), -tilt * 0.55)                      # голова смотрит вперёд, по ходу
    for sd, ch in ARM.items():
        ph = tau * t / T + (0.0 if sd > 0 else math.pi * 0.15)
        if fast:  # руки вытянуты назад вдоль тела, ладони — к телу
            rot(ch[1], (1, 0, 0), 0.9 + 0.06 * math.sin(ph))
            rot(ch[1], (0, 1, 0), -sd * 0.12)
            rot(ch[2], (1, 0, 0), 0.15 + 0.08 * math.sin(ph - 0.5))
            rot(ch[3], (1, 0, 0), 0.2 * math.sin(ph - 1.0))
        else:     # руки чуть назад и в стороны, мягко покачиваются
            rot(ch[1], (1, 0, 0), 0.45 + 0.1 * math.sin(ph))
            rot(ch[1], (0, 1, 0), -sd * (0.25 + 0.05 * math.sin(ph + 0.3)))
            rot(ch[2], (1, 0, 0), -0.2 + 0.1 * math.sin(ph - 0.5))
            rot(ch[3], (1, 0, 0), 0.18 * math.sin(ph - 1.0))
    for sd, ch in LEG.items():  # ноги — назад по ходу, волной (ступни тянутся)
        ph = tau * t / T + (0.0 if sd > 0 else math.pi)
        rot(ch[0], (1, 0, 0), (0.3 if fast else 0.12) + (0.06 if fast else 0.1) * math.sin(ph))
        rot(ch[1], (1, 0, 0), (0.2 if fast else 0.35) + 0.1 * math.sin(ph - 0.8))
        rot(ch[2], (1, 0, 0), 0.5 + 0.15 * math.sin(ph - 1.4))


def bake(kind, dur):
    a = bpy.data.actions.new(kind)
    arm.animation_data.action = a
    n = round(dur * FPS)
    for f in range(n + 1):
        pose(kind, f / FPS)  # последний кадр = первому: цикл без шва
        for b in PB:
            b.keyframe_insert('rotation_quaternion', frame=f)
            if b.name == HIPS:
                b.keyframe_insert('location', frame=f)
    a.use_fake_user = True
    return a


acts = [bake('hover', 2.6), bake('fly', 1.3), bake('dash', 0.8)]
# в glTF — каждое действие отдельной анимацией (по треку NLA на каждое)
arm.animation_data.action = None
for a in acts:
    tr = arm.animation_data.nla_tracks.new()
    tr.name = a.name
    tr.strips.new(a.name, 0, a)
with bpy.context.temp_override(window=win, scene=sc, view_layer=sc.view_layers[0]):
    bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=False, use_active_scene=True, export_animations=True,
                              export_animation_mode='NLA_TRACKS', export_force_sampling=True, export_frame_step=1, export_yup=True,
                              export_apply=False, export_image_format='AUTO')
print('glb:', OUT, os.path.getsize(OUT))
