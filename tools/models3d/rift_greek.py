# Врата Аида (греческий Разлом): портик храма у тёмной скалы — две колонны, антаблемент с розовым меандром,
# фронтон с розовым медальоном; между колоннами — квадратный портал с вихрем. Лицом к −Y.
# Части: rock, marble_*, meander, medal_*, portal_disc, swirl

sc = new_scene('rift_greek')
MARBLE = mat('marble', '#ebe8f0', rough=0.45)
MARBLE_D = mat('marble_shade', '#b9b4c6', rough=0.55)
ROCK = mat('rock_dark', '#2c2833', rough=0.9)
ROCK_L = mat('rock_line', '#4a4552', rough=0.9)
PINK = mat('rift_pink', '#f472b6', rough=0.3, emit='#ec4899', strength=1.2)
WHITE = mat('rift_core', '#eceaf2', rough=0.35, emit='#ffffff', strength=0.3)

# скала за портиком: низкий купол из крупных граней
rock = prim('ico_sphere', 'rock', ROCK, subdivisions=2, radius=1, location=(0, 0.45, 0.2))
rock.scale = (1.95, 0.75, 1.95)
cut_below(rock)  # купол — только над землёй
for k, (x, z, a) in enumerate(((-1.45, 1.0, 0.5), (-1.55, 0.55, -0.3), (1.5, 0.9, -0.5), (1.4, 0.45, 0.3))):
    box(f'rock_line_{k}', ROCK_L, (x, -0.2, z), (0.28, 0.04, 0.05), rot=(0, a, 0))
steps = [box(f'marble_step_{k}', MARBLE if k == 0 else MARBLE_D, (0, -0.35, 0.06 + 0.12 * k), (3.1 - 0.3 * k, 1.1 - 0.15 * k, 0.12), bev=0.012) for k in range(2)]
cols = []
for i, x in enumerate((-1.0, 1.0)):
    cols += column(f'marble_col_{i}', MARBLE, x, -0.35, 0.24, 1.95, r=0.16)
    for sgn in (-1, 1):
        prim('uv_sphere', f'marble_stud_{i}_{sgn}', WHITE, smooth=True, segments=10, ring_count=6, radius=0.07, location=(x + sgn * 0.17, -0.55, 2.24))
disc, swirl = portal('portal', center=(0, -0.3, 1.22), w=0.78, h=0.95, shape='square')
ent = box('marble_entablature', MARBLE, (0, -0.3, 2.42), (2.8, 0.85, 0.42), bev=0.02)
# меандр: розовая «ломаная» по фасаду
pts = []
x = -1.22
while x <= 1.22:
    pts += [(x, -0.74, 2.33), (x, -0.74, 2.5), (x + 0.1, -0.74, 2.5), (x + 0.1, -0.74, 2.38), (x + 0.05, -0.74, 2.38)]
    pts += [(x + 0.05, -0.74, 2.33), (x + 0.2, -0.74, 2.33)]
    x += 0.2
tube('meander', [p for p in pts if p[0] <= 1.26], 0.016, PINK, sides=4, smooth=False)
cornice = box('marble_cornice', MARBLE_D, (0, -0.3, 2.66), (3.0, 0.95, 0.08), bev=0.01)
ped = prism('marble_pediment', MARBLE, 2.96, 0.62, 0.9, (0, -0.3, 2.7))
ring = prim('torus', 'medal_ring', PINK, smooth=True, major_radius=0.12, minor_radius=0.035, major_segments=20, minor_segments=6, location=(0, -0.77, 2.92))
ring.rotation_euler = (math.pi / 2, 0, 0)
dot = prim('uv_sphere', 'medal_dot', WHITE, smooth=True, segments=12, ring_count=8, radius=0.07, location=(0, -0.77, 2.92))

for o in steps + [ent, ped, cornice, rock]:
    outline(o, 0.035)
for o in cols:
    outline(o, 0.03)
outline(ring, 0.012)

preview_rig(target_z=1.5, dist=7.8, elev=16)
render(ROOT + r'\renders\rift_greek.png')
export_glb(ROOT + r'\glb\rift_greek.glb')
save_blend()
