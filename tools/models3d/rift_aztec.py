# Камень Солнца (ацтекский Разлом): стоящий резной каменный диск на ступенчатом постаменте; за ним — восемь
# лучей-треугольников (бирюзовые и рыжие через один); на внешнем поясе — 20 тёмных знаков (4 по сторонам света —
# розовые), ниже — пояс точек и бирюзовый пунктир, в утопленной середине — портал с вихрем. Лицом к −Y.
# Части: pedestal_*, cradle, stone_*, ray_*, glyph_*, line_*, dot_*, dash_*, portal_disc, swirl

sc = new_scene('rift_aztec')
STONE = mat('sunstone', '#d3c6a6', rough=0.8)
STONE_D = mat('sunstone_dark', '#8f846c', rough=0.85)
PED = mat('pedestal_stone', '#7d7466', rough=0.85)
BLOCK = mat('glyph_block', '#4b4650', rough=0.7)
LINE = mat('carve_line', '#2b2630', rough=0.8)
TEAL = mat('ray_teal', '#0f9b8e', rough=0.6)
ORANGE = mat('ray_orange', '#c2410c', rough=0.6)
DASH = mat('fret_teal', '#2dd4bf', rough=0.4, emit='#14b8a6', strength=0.4)
PINK = mat('rift_pink', '#f472b6', rough=0.3, emit='#ec4899', strength=1.2)

CZ, R = 2.0, 1.14
# постамент: две ступени и ложе под диск
solid = [box('pedestal_0', PED, (0, 0, 0.11), (2.4, 1.3, 0.22), bev=0.02), box('pedestal_1', PED, (0, 0, 0.32), (1.6, 0.95, 0.2), bev=0.02),
         box('cradle', STONE_D, (0, 0, 0.67), (0.8, 0.55, 0.5), bev=0.02)]
# диск: внешний пояс, утопленный внутренний, тёмная середина за порталом
solid += [ring_xz('stone_outer', STONE, 0.86, R, 0.3, 0, 0.15, CZ), ring_xz('stone_inner', STONE, 0.6, 0.86, 0.26, 0, 0.15, CZ),
          ring_xz('stone_back', STONE_D, 0.0, 0.6, 0.2, 0, 0.15, CZ)]
# лучи за диском
for k in range(8):
    a = math.radians(22.5 + 45 * k)
    r = prism(f'ray_{k}', TEAL if k % 2 == 0 else ORANGE, 0.52, 0.68, 0.12, (0, 0.02, 0.95))
    r.rotation_euler = (0, math.pi / 2 - a, 0)
    r.location = (0, 0, CZ)
    solid.append(r)
# внешний пояс: 20 знаков (по сторонам света — розовые) и резная линия
for k in range(20):
    a = 2 * math.pi * k / 20
    solid.append(box(f'glyph_{k}', PINK if k % 5 == 0 else BLOCK, (1.0 * math.cos(a), -0.17, CZ + 1.0 * math.sin(a)), (0.15, 0.05, 0.15), rot=(0, -a, 0), bev=0.012))
ring_xz('line_outer', LINE, 0.86, 0.885, 0.02, 0, -0.149, CZ)
# внутренний пояс: точки и бирюзовый пунктир на тёмном кольце
for k in range(28):
    a = 2 * math.pi * (k + 0.5) / 28
    prim('uv_sphere', f'dot_{k}', LINE, smooth=True, segments=8, ring_count=6, radius=0.024, location=(0.78 * math.cos(a), -0.115, CZ + 0.78 * math.sin(a)))
ring_xz('line_inner', LINE, 0.615, 0.695, 0.02, 0, -0.109, CZ)
for k in range(24):
    a = 2 * math.pi * (k + 0.5) / 24
    box(f'dash_{k}', DASH, (0.655 * math.cos(a), -0.133, CZ + 0.655 * math.sin(a)), (0.06, 0.012, 0.022), rot=(0, -(a + math.pi / 2), 0))
disc, swirl = portal('portal', center=(0, -0.08, CZ), w=0.6, h=0.6, shape='circle')

for o in solid:
    outline(o, 0.03)

preview_rig(target_z=1.75, dist=8.6, elev=16)
render(ROOT + r'\renders\rift_aztec.png')
export_glb(ROOT + r'\glb\rift_aztec.glb')
save_blend()
