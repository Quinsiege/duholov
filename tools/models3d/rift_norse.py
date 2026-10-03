# Разлом Гиннунгагап (скандинавский): ледяные пики полукругом, в середине — портал-ромб в тёмной раме,
# поверх — зелёные ленты северного сияния; по бокам — рунные столбы под снежными шапками, внизу — снег.
# Лицом к −Y. Части: ice_*, snow_*, frame, aurora_*, pillar_*, rune_*, portal_disc, swirl

sc = new_scene('rift_norse')
ICE = mat('ice', '#7cc4f2', rough=0.15, emit='#bae6fd', strength=0.25)
ICE_L = mat('ice_light', '#dbeafe', rough=0.1, emit='#eff6ff', strength=0.2)
SNOW = mat('snow', '#f1f5f9', rough=0.6)
FRAME = mat('ice_frame', '#1e2a4a', rough=0.6)
AURORA = mat('aurora', '#2dd4bf', rough=0.3, emit='#14b8a6', strength=1.1)
PILLAR = mat('rune_pillar', '#57525e', rough=0.8)
PINK = mat('rift_pink', '#f472b6', rough=0.3, emit='#ec4899', strength=1.2)

# снежный холм
snow = lathe('snow_base', [(0, 0.2), (0.9, 0.18), (1.6, 0.11), (1.95, 0.04), (2.0, 0.0), (0, 0.0)], 32, SNOW)
# ледяные пики полукругом за порталом: (x, y, высота, радиус)
spikes = []
for k, (x, y, h, r) in enumerate(((0, 0.32, 3.05, 0.42), (-0.75, 0.25, 2.55, 0.36), (0.75, 0.25, 2.6, 0.36), (-1.25, 0.15, 1.9, 0.32),
                                    (1.28, 0.15, 1.95, 0.32), (-0.42, 0.45, 2.75, 0.3), (0.45, 0.42, 2.7, 0.3))):
    s = lathe(f'ice_spike_{k}', [(r, 0.05), (r * 0.82, h * 0.55), (r * 0.35, h * 0.88), (0.0, h)], 5, ICE if k % 2 == 0 else ICE_L, smooth=False)
    s.location = (x, y, 0)
    s.rotation_euler = (0, 0, 0.4 * k)
    spikes.append(s)
# портал-ромб в тёмной раме
CZ = 1.45
disc, swirl = portal('portal', center=(0, -0.12, CZ), w=0.72, h=1.12, shape='diamond')
frame = [(0, -0.16, CZ + 1.18), (0.78, -0.16, CZ), (0, -0.16, CZ - 1.18), (-0.78, -0.16, CZ), (0, -0.16, CZ + 1.18)]
tube('frame', frame, 0.075, FRAME, sides=6, smooth=False)
# северное сияние: две волнистые ленты поверх портала
for j, z0 in enumerate((CZ + 0.42, CZ + 0.15)):
    pts = [(-0.55 + 1.1 * u, -0.22, z0 + 0.09 * math.sin(u * 2 * math.pi * 1.2 + j)) for u in [k / 16 for k in range(17)]]
    tube(f'aurora_{j}', pts, 0.035, AURORA, sides=6)
# рунные столбы под снежными шапками
pillars = []
for sgn in (-1, 1):
    x = sgn * 1.55
    p = prim('cylinder', f'pillar_{sgn}', PILLAR, vertices=12, radius=0.32, depth=1.3, location=(x, -0.2, 0.65))
    pillars.append(p)
    cap = prim('uv_sphere', f'snow_cap_{sgn}', SNOW, smooth=True, segments=12, ring_count=6, radius=0.34, location=(x, -0.2, 1.28))
    cap.scale = (1, 1, 0.55)
    yf = -0.2 - 0.325
    tube(f'rune_{sgn}_0', [(x - 0.06, yf, 0.95), (x - 0.06, yf, 0.62)], 0.024, PINK, sides=4, smooth=False)
    tube(f'rune_{sgn}_1', [(x - 0.06, yf, 0.86), (x + 0.07, yf, 0.79)], 0.024, PINK, sides=4, smooth=False)
    tube(f'rune_{sgn}_2', [(x, yf, 0.5), (x + 0.08, yf, 0.42), (x, yf, 0.34), (x - 0.08, yf, 0.42), (x, yf, 0.5)], 0.022, PINK, sides=4, smooth=False)

for o in spikes + pillars + [snow]:
    outline(o, 0.035)

preview_rig(target_z=1.5, dist=7.8, elev=16)
render(ROOT + r'\renders\rift_norse.png')
export_glb(ROOT + r'\glb\rift_norse.glb')
save_blend()
