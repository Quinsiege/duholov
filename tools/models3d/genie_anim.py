# Самоварный джинн (облик clockwork_genie — модель владельца из Meshy, скелет Mixamo). Анимации Mixamo из файла не годятся:
# в них гнётся корпус-самовар с ручками. Здесь корпус не гнётся (кости позвоночника и плеч — ручек-«ушей» — не трогаются): машут
# маленькие ручки (предплечья и кисти на цепях) и шагают ножки (от колена), а сам самовар движется целиком (кость бёдер — корень):
# подскакивает на каждом шаге, переваливается с ножки на ножку, на бегу наклоняется вперёд; верх-чайник (Head) — с запаздыванием.
#   idle — стоит: «дышит», чуть покачивается, ручки покачиваются (3 с);  walk — шажки, ручки — в противофазе ножкам (1 с);
#   run  — чаще, шире, с наклоном (0,6 с). После — strip_fingers.py (кости пальцев — из рига).
# Запуск: node bl.mjs genie_anim.py — сцена clockwork_genie (импорт ~/Blender/duholov-3d/src/clockwork_genie.glb), выгрузка
# ~/Blender/duholov-3d/glb/clockwork_genie_anim.glb; дальше — node skinned.mjs … (см. README).
import bpy, math, os
from mathutils import Quaternion, Vector

NAME = 'clockwork_genie'
SRC = os.path.join(os.path.expanduser('~'), 'Blender', 'duholov-3d', 'src', NAME + '.glb')
OUT = os.path.join(os.path.expanduser('~'), 'Blender', 'duholov-3d', 'glb', NAME + '_anim.glb')
FPS, M = 30, 'mixamorig:'
ARM = {+1: (M + 'LeftForeArm', M + 'LeftHand'), -1: (M + 'RightForeArm', M + 'RightHand')}
LEG = {+1: (M + 'LeftLeg', M + 'LeftFoot'), -1: (M + 'RightLeg', M + 'RightFoot')}

old = bpy.data.scenes.get(NAME)
if old:
    for o in list(old.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    bpy.data.scenes.remove(old)
for a in list(bpy.data.actions):
    if a.name.startswith(NAME + '_'):
        bpy.data.actions.remove(a)
sc = bpy.data.scenes.new(NAME)
win = bpy.context.window_manager.windows[0]
win.scene = sc
sc.render.fps = FPS
with bpy.context.temp_override(window=win, scene=sc):
    bpy.ops.import_scene.gltf(filepath=SRC)
arm = next(o for o in sc.objects if o.type == 'ARMATURE')
arm.animation_data_create()
arm.animation_data.action = None
PB = arm.pose.bones


def rot(name, axis, ang):
    """повернуть кость на угол вокруг оси в осях скелета (у покоя): x — вбок, y — вперёд-назад (−Y — вперёд), z — вверх"""
    b = PB[name]
    ax = (b.bone.matrix_local.to_3x3().inverted() @ Vector(axis)).normalized()
    b.rotation_quaternion = b.rotation_quaternion @ Quaternion(ax, ang)


def pose(kind, t):
    for b in PB:  # всё — в исходной позе (корпус неподвижен)
        b.rotation_mode = 'QUATERNION'
        b.rotation_quaternion = (1, 0, 0, 0)
        b.location = (0, 0, 0)
    tau = 2 * math.pi

    def body(dz, pitch, roll, top_pitch, top_roll):
        """корпус — целиком (кость бёдер — корень): подскок dz, наклон вперёд pitch, крен roll; ножки — отвесно (обратный поворот
        бёдер ног); верх-чайник (Head) — с запаздыванием top_*. Кости позвоночника не трогаются — самовар не гнётся"""
        hp = PB[M + 'Hips']
        hp.location = hp.bone.matrix_local.to_3x3().inverted() @ Vector((0, 0, dz))
        rot(M + 'Hips', (1, 0, 0), pitch)         # +X — верх вперёд (у ножек, что смотрят вниз, вперёд — −X)
        rot(M + 'Hips', (0, 1, 0), roll)
        for s in ('Left', 'Right'):
            rot(M + s + 'UpLeg', (0, 1, 0), -roll)
            rot(M + s + 'UpLeg', (1, 0, 0), -pitch)
        rot(M + 'Head', (1, 0, 0), top_pitch)
        rot(M + 'Head', (0, 1, 0), top_roll)
    if kind == 'idle':
        s1, s2 = math.sin(tau * t / 3.0), math.sin(tau * t / 3.0 - 0.9)
        body(0.006 * s1, 0.0, 0.012 * math.sin(tau * t / 6.0), 0.02 * s2, 0.02 * math.sin(tau * t / 6.0 - 0.9))  # дышит, чуть покачивается
        for sd, (fa, h) in ARM.items():
            ph = tau * t / 3.0 + (0 if sd > 0 else 1.3)
            rot(fa, (1, 0, 0), 0.12 * math.sin(ph))           # ручки чуть покачиваются вперёд-назад
            rot(fa, (0, 1, 0), -sd * 0.06 * (1 + math.sin(ph + 0.8)))  # и чуть в стороны
            rot(h, (1, 0, 0), 0.15 * math.sin(ph - 0.7))      # кисти — с запаздыванием
        return
    T, legA, armA = (1.0, 0.42, 0.45) if kind == 'walk' else (0.6, 0.62, 0.75)
    run = kind == 'run'
    ph0 = tau * t / T
    # подскок — на каждом шаге (дважды за цикл), переваливается с ножки на ножку, на бегу — наклон вперёд; верх — с запаздыванием
    body((0.03 if run else 0.018) * (0.5 - 0.5 * math.cos(2 * ph0)), (0.1 if run else 0.03) + 0.015 * math.sin(2 * ph0),
         (0.05 if run else 0.07) * math.sin(ph0), (0.06 if run else 0.035) * math.sin(2 * ph0 - 1.0), (0.05 if run else 0.06) * math.sin(ph0 - 0.8))
    for sd, (lg, ft) in LEG.items():
        ph = tau * t / T + (0 if sd > 0 else math.pi)
        a = legA * math.sin(ph)
        rot(lg, (1, 0, 0), -a)                                # ножка вперёд-назад от колена (−X — вперёд)
        rot(ft, (1, 0, 0), 0.5 * a + 0.25 * max(0.0, math.sin(ph + 1.2)) * legA)  # стопа — ровнее к земле, на подъёме носок вниз
    for sd, (fa, h) in ARM.items():
        ph = tau * t / T + (math.pi if sd > 0 else 0)          # ручка — против своей ножки
        rot(fa, (1, 0, 0), -armA * math.sin(ph))
        rot(h, (1, 0, 0), -0.4 * armA * math.sin(ph - 0.6))


tracks = []
for kind, dur in (('idle', 3.0), ('walk', 1.0), ('run', 0.6)):
    a = bpy.data.actions.new(f'{NAME}_{kind}')
    arm.animation_data.action = a
    n = round(dur * FPS)
    for f in range(n + 1):  # последний кадр = первому: цикл без шва
        pose(kind, f / FPS)
        for b in PB:
            b.keyframe_insert('rotation_quaternion', frame=f)
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
with bpy.context.temp_override(window=win, scene=sc, view_layer=sc.view_layers[0]):
    bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=False, use_active_scene=True, export_animations=True,
                              export_animation_mode='NLA_TRACKS', export_force_sampling=True, export_frame_step=1, export_yup=True,
                              export_apply=False, export_image_format='AUTO')
print('glb:', OUT, os.path.getsize(OUT))
