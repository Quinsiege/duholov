# Источник (общий для всех мифологий): каменная чаша на постаменте, светящаяся вода, струя и дуги фонтана,
# над струёй парит осколок Алатыря. Части для three.js: stone_*, gem, gold_*, water, jet, arc_*, shard, spark_*
# (состояния «исчерпан» и «захвачен Навью» — перекраской water/jet/shard и скрытием jet/arc на телефоне)
import random

sc = new_scene('spring')
STONE = mat('spring_stone', '#cfc9ea', rough=0.42)
STONE_D = mat('spring_stone_dark', '#8e86bd', rough=0.5)
GOLD = mat('gold', '#f6c445', rough=0.28, metal=0.85)
GEM = mat('gem_teal', '#14b8a6', rough=0.15, emit='#5eead4', strength=1.6)
WATER = mat('water', '#22c7b4', rough=0.06, emit='#5eead4', strength=0.9, alpha=0.82)
JET = mat('jet', '#a7f3e4', rough=0.1, emit='#99f6e4', strength=1.8, alpha=0.85, cull=False)
SHARD = mat('shard', '#f6f0e0', rough=0.22, emit='#fff7e6', strength=0.35)
SPARK = mat('spark', '#ffffff', emit='#fffbe6', strength=5.0)

# постамент: плоская скруглённая плита, по низу — тёмный пояс
plinth = lathe('stone_plinth', [(0, 0), (0.66, 0), (0.69, 0.025), (0.70, 0.12), (0.67, 0.165), (0.6, 0.175), (0, 0.175)], 32, STONE)
band = lathe('stone_band', [(0, 0), (0.705, 0), (0.715, 0.012), (0.715, 0.05), (0, 0.05)], 32, STONE_D)
# ножка: расширяется книзу, сужается к чаше
stem = lathe('stone_stem', [(0, 0.17), (0.40, 0.17), (0.37, 0.215), (0.24, 0.29), (0.16, 0.38), (0.135, 0.5), (0.15, 0.58), (0.2, 0.62), (0, 0.62)], 20, STONE)
# камень на ножке
gem = prim('ico_sphere', 'gem', GEM, subdivisions=1, radius=1)
gem.scale = (0.07, 0.035, 0.09)
gem.location = (0, -0.155, 0.43)
# чаша: наружная стенка → край → внутренняя стенка до дна
bowl = lathe('stone_bowl', [(0.17, 0.59), (0.33, 0.64), (0.55, 0.72), (0.71, 0.82), (0.80, 0.915), (0.83, 0.975), (0.81, 1.0), (0.77, 0.998),
                            (0.74, 0.97), (0.63, 0.905), (0.42, 0.865), (0.2, 0.852), (0, 0.85)], 36, STONE)
gold_rim = prim('torus', 'gold_rim', GOLD, smooth=True, major_radius=0.785, minor_radius=0.024, major_segments=36, minor_segments=5, location=(0, 0, 0.995))
gold_belt = prim('torus', 'gold_belt', GOLD, smooth=True, major_radius=0.6, minor_radius=0.022, major_segments=32, minor_segments=5, location=(0, 0, 0.74))
# монетки на дне, под водой
rnd = random.Random(3)
for k in range(6):
    a, r = rnd.random() * 2 * math.pi, 0.15 + rnd.random() * 0.4
    c = prim('cylinder', f'gold_coin_{k}', GOLD, vertices=10, radius=0.065, depth=0.014, location=(r * math.cos(a), r * math.sin(a), 0.875 + 0.01 * k))
    c.rotation_euler = (rnd.uniform(-0.25, 0.25), rnd.uniform(-0.25, 0.25), 0)
# вода
water = prim('circle', 'water', WATER, vertices=36, radius=0.745, fill_type='TRIFAN', location=(0, 0, 0.955))
# струя и дуги фонтана с каплями
jet = lathe('jet', [(0.11, 0.95), (0.085, 1.12), (0.062, 1.36), (0.045, 1.55), (0.03, 1.64), (0, 1.67)], 12, JET)
for i, ang in enumerate(math.radians(a) for a in (35, 145, 215, 325)):
    R = 0.66
    S, E = Vector((0, 0, 1.42)), Vector((R * math.cos(ang), R * math.sin(ang), 0.985))
    C = Vector((0.5 * R * math.cos(ang), 0.5 * R * math.sin(ang), 1.66))
    pts = [S * (1 - t) ** 2 + C * 2 * t * (1 - t) + E * t * t for t in [k / 9 for k in range(10)]]
    tube(f'arc_{i}', pts, 0.026, JET, sides=6, taper=lambda u: 1.0 - 0.45 * u)
    prim('ico_sphere', f'arc_drop_{i}', JET, smooth=True, subdivisions=1, radius=0.04, location=E + Vector((0, 0, 0.03)))
# осколок Алатыря над струёй, чуть наклонён (поворот — вокруг своего центра)
shard = crystal('shard', SHARD, rx=0.19, ry=0.13, mid=0.13, top=0.26, bot=0.22)
shard.rotation_euler = (0.0, math.radians(12), math.radians(20))
shard.location = (0, 0, 1.94)
# искры
for i, loc in enumerate(((0.42, -0.1, 2.08), (-0.36, -0.1, 1.84), (0.30, -0.15, 1.48))):
    sparkle(f'spark_{i}', SPARK, loc, size=0.075 if i == 0 else 0.055)

for o in (plinth, stem, bowl):
    outline(o, 0.04)
outline(gem, 0.014)
outline(shard, 0.025)

preview_rig(target_z=1.0, dist=4.6, elev=20)
render(ROOT + r'\renders\spring.png')
export_glb(ROOT + r'\glb\spring.glb')
save_blend()
