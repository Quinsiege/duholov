# Превью «как на карте»: копии моделей из их сцен рядом на земле, камера сверху под углом (наклон карты в игре)
SRC = (('spring', -3.3), ('shrine_slavic', 0.0), ('rift_slavic', 3.6))

sc = new_scene('lineup')
sc.render.resolution_x, sc.render.resolution_y = 1600, 1000
for name, dx in SRC:
    src = bpy.data.scenes[name]
    copies = {}
    for o in src.objects:
        if o.type not in ('MESH', 'EMPTY'):
            continue
        c = o.copy()
        sc.collection.objects.link(c)
        copies[o.name] = c
    for o in src.objects:
        if o.name in copies and o.parent and o.parent.name in copies:
            copies[o.name].parent = copies[o.parent.name]
    for c in copies.values():
        if not c.parent:
            c.location.x += dx
# земля — как ночная карта
ground = prim('plane', 'ground', mat('ground', '#2b2a3f', rough=0.95), size=30, location=(0, 0, -0.005))

cam_d = bpy.data.cameras.new('lineup_cam')
cam_d.lens = 38
cam = bpy.data.objects.new('lineup_cam', cam_d)
sc.collection.objects.link(cam)
e = math.radians(30)
cam.location = (0, -12.5 * math.cos(e), 1.3 + 12.5 * math.sin(e))
cam.rotation_euler = (Vector((0, 0.3, 1.25)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
sc.camera = cam
for nm, loc, en, col in (('key', (-4, -5, 8), 3.0, '#fff4e0'), ('fill', (6, -3, 4), 1.0, '#c7d2fe'), ('rim', (1, 7, 5), 1.6, '#f0abfc')):
    ld = bpy.data.lights.new('lineup_' + nm, 'SUN')
    ld.energy = en
    ld.color = lin(col)
    lo = bpy.data.objects.new('lineup_' + nm, ld)
    sc.collection.objects.link(lo)
    lo.rotation_euler = (Vector((0, 0, 0)) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
render(ROOT + r'\renders\lineup.png')
save_blend()
