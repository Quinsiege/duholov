# Храм (греческое святилище): мраморный храм на трёх ступенях — четыре колонны с каннелюрами, антаблемент
# с триглифами, фронтон с сиреневым медальоном и акротериями; внутри — тёмно-сиреневая глубина; перед колоннами —
# алтарь со священным пламенем. Лицом к −Y. Части: marble_*, inner, medal, flame_out/in, spark_*

sc = new_scene('shrine_greek')
MARBLE = mat('marble', '#ebe8f0', rough=0.45)
MARBLE_D = mat('marble_shade', '#b9b4c6', rough=0.55)
SLOT = mat('marble_slot', '#4b4458', rough=0.8)
INNER = mat('inner_violet', '#2e1659', rough=0.9, emit='#4c1d95', strength=0.35)
VIOLET = mat('sign_violet', '#c084fc', rough=0.3, emit='#a855f7', strength=1.1)
SPARK = mat('spark_violet', '#c4b5fd', emit='#a855f7', strength=1.2)

steps = [box(f'marble_step_{k}', MARBLE if k % 2 == 0 else MARBLE_D, (0, 0, 0.07 + 0.14 * k), (3.0 - 0.3 * k, 2.0 - 0.25 * k, 0.14), bev=0.015) for k in range(3)]
inner = box('inner', INNER, (0, 0.42, 1.22), (2.05, 0.1, 1.62))
cols = []
for i, x in enumerate((-0.9, -0.3, 0.3, 0.9)):
    cols += column(f'marble_col_{i}', MARBLE, x, -0.32, 0.42, 1.62, r=0.13)
ent = box('marble_entablature', MARBLE, (0, 0.02, 2.19), (2.5, 1.3, 0.3), bev=0.02)
for k in range(6):
    box(f'marble_slot_{k}', SLOT, (-0.95 + 0.38 * k, -0.635, 2.19), (0.07, 0.02, 0.18))
cornice = box('marble_cornice', MARBLE_D, (0, 0.02, 2.38), (2.72, 1.42, 0.08), bev=0.01)
ped = prism('marble_pediment', MARBLE, 2.66, 0.6, 1.3, (0, 0.02, 2.42))
medal = prim('cylinder', 'medal', VIOLET, vertices=20, radius=0.11, depth=0.04, location=(0, -0.64, 2.62))
medal.rotation_euler = (math.pi / 2, 0, 0)
top = prim('ico_sphere', 'marble_acro_top', MARBLE, subdivisions=0, radius=1, location=(0, 0.02, 3.13))
top.scale = (0.12, 0.06, 0.17)
# алтарь с пламенем перед колоннами
altar = box('marble_altar', MARBLE, (0, -0.62, 0.66), (0.62, 0.5, 0.48), bev=0.02)
box('marble_altar_top', MARBLE_D, (0, -0.62, 0.93), (0.74, 0.6, 0.07), bev=0.01)
for k in range(2):
    box(f'marble_altar_line_{k}', SLOT, (0, -0.875, 0.6 + 0.14 * k), (0.5, 0.01, 0.018))
flame('flame', (0, -0.62, 0.965), s=1.0)
for i, loc in enumerate(((-0.55, -0.75, 1.55), (0.45, -0.7, 1.85))):
    prim('ico_sphere', f'spark_{i}', SPARK, smooth=True, subdivisions=1, radius=0.05, location=loc)

for o in steps + [ent, ped, altar, cornice]:
    outline(o, 0.035)
for o in cols:
    outline(o, 0.03)
outline(medal, 0.015)

preview_rig(target_z=1.5, dist=7.6, elev=18)
render(ROOT + r'\renders\shrine_greek.png')
export_glb(ROOT + r'\glb\shrine_greek.glb')
save_blend()
