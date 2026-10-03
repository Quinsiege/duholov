# Сводка всех святилищ и Разломов «как на карте»: сетка 4×4 (в ряду — две мифологии: святилище, Разлом),
# ортокамера сверху под 30°, чтобы размеры сравнивались честно. Первые ряды — дальние (сверху кадра)
ROWS = (('slavic', 'greek'), ('norse', 'celtic'), ('egypt', 'china'), ('aztec', 'japan'))
DX, DY = 5.6, 8.0

sc = new_scene('lineup_all')
sc.render.resolution_x, sc.render.resolution_y = 1800, 1560
for r, pair in enumerate(ROWS):
    for c, (myth, kind) in enumerate([(m, k) for m in pair for k in ('shrine', 'rift')]):
        src = bpy.data.scenes[f'{kind}_{myth}']
        dx, dy = (c - 1.5) * DX, (1.5 - r) * DY
        copies = {}
        for o in src.objects:
            if o.type not in ('MESH', 'EMPTY'):
                continue
            cp = o.copy()
            sc.collection.objects.link(cp)
            copies[o.name] = cp
        for o in src.objects:
            if o.name in copies and o.parent and o.parent.name in copies:
                copies[o.name].parent = copies[o.parent.name]
        for cp in copies.values():
            if not cp.parent:
                cp.location.x += dx
                cp.location.y += dy
prim('plane', 'ground', mat('ground', '#2b2a3f', rough=0.95), size=80, location=(0, 0, -0.005))

cam_d = bpy.data.cameras.new('lineup_all_cam')
cam_d.type = 'ORTHO'
cam_d.ortho_scale = 24.5
cam = bpy.data.objects.new('lineup_all_cam', cam_d)
sc.collection.objects.link(cam)
e = math.radians(30)
target = Vector((0, 0, 1.6))
cam.location = target + Vector((0, -40 * math.cos(e), 40 * math.sin(e)))
cam.rotation_euler = (target - cam.location).to_track_quat('-Z', 'Y').to_euler()
cam_d.clip_end = 200
sc.camera = cam
for nm, loc, en, col in (('key', (-4, -5, 8), 3.0, '#fff4e0'), ('fill', (6, -3, 4), 1.0, '#c7d2fe'), ('rim', (1, 7, 5), 1.6, '#f0abfc')):
    ld = bpy.data.lights.new('lineup_all_' + nm, 'SUN')
    ld.energy = en
    ld.color = lin(col)
    lo = bpy.data.objects.new('lineup_all_' + nm, ld)
    sc.collection.objects.link(lo)
    lo.rotation_euler = (Vector((0, 0, 0)) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
render(ROOT + r'\renders\lineup_all.png')
save_blend()
