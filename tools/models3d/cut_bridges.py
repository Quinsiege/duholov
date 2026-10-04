# Перемычки сетки — прочь. Генератор «сваривает» сетку там, где в исходной позе части касаются друг друга (кисть — пояса и полы
# плаща у бёдра): между ними — грани в доли миллиметра. Рука отходит — такая грань растягивается в десятки раз и видна полоской.
# Удаляются только перемычки руки: грани, у которых одна вершина — рука (больше всего веса — кисть или предплечье), другая — нет,
# и что в анимациях сцены NAME (треки NLA idle, walk, run) растягиваются больше K раз (ребро против исходной позы). В исходной
# позе их площадь — около нуля; полы плаща и прочие грани, что тянутся на бегу законно, не трогаются. Затем — выгрузка glb, как у strip_fingers.py.
# Запуск: node bl.mjs n.py cut_bridges.py (в n.py — NAME), после strip_fingers.py.
import bpy, bmesh, os

NAME = globals()['NAME']
K = globals().get('K', 3.0)
ARM = ('Hand', 'ForeArm')
sc = bpy.data.scenes[NAME]
win = bpy.context.window_manager.windows[0]
win.scene = sc
arm = next(o for o in sc.objects if o.type == 'ARMATURE')
me = next(o for o in sc.objects if o.type == 'MESH' and o.find_armature() == arm)
ad = arm.animation_data
mutes = [(tr, tr.mute) for tr in ad.nla_tracks]
for tr, _ in mutes:
    tr.mute = True


def coords():
    dg = bpy.context.evaluated_depsgraph_get()
    ob = me.evaluated_get(dg)
    m = ob.to_mesh()
    out = [v.co.copy() for v in m.vertices]
    ob.to_mesh_clear()
    return out


ad.action = None
for b in arm.pose.bones:
    b.matrix_basis.identity()
sc.frame_set(0)
rest = coords()
G = {g.index: g.name for g in me.vertex_groups}
is_arm = [any(a in G[max(v.groups, key=lambda g: g.weight).group] for a in ARM) if len(v.groups) else False for v in me.data.vertices]
polys = [tuple(p.vertices) for p in me.data.polygons]
mixed = [len({is_arm[i] for i in vs}) > 1 for vs in polys]
worst = [1.0] * len(polys)
for act in [st.action for tr, _ in mutes for st in tr.strips]:
    ad.action = act
    f0, f1 = act.frame_range
    for f in range(int(f0), int(f1) + 1, 2):
        sc.frame_set(f)
        P = coords()
        for i, vs in enumerate(polys):
            for a, b in zip(vs, vs[1:] + vs[:1]):
                k = (P[a] - P[b]).length / max((rest[a] - rest[b]).length, 1e-4)
                if k > worst[i]:
                    worst[i] = k
ad.action = None
for tr, mu in mutes:
    tr.mute = mu
bad = {i for i, k in enumerate(worst) if k > K and mixed[i]}
bm = bmesh.new()
bm.from_mesh(me.data)
bm.faces.ensure_lookup_table()
n0 = sum(len(f.verts) - 2 for f in bm.faces)
bmesh.ops.delete(bm, geom=[bm.faces[i] for i in sorted(bad)], context='FACES_ONLY')
n1 = sum(len(f.verts) - 2 for f in bm.faces)
bm.to_mesh(me.data)
bm.free()
me.data.update()
print(f'{NAME}: перемычек руки удалено {len(bad)} граней (растяжение больше ×{K:g}); треугольников {n0} → {n1}')
OUT = os.path.join(os.path.expanduser('~'), 'Blender', 'duholov-3d', 'glb', NAME + '_anim.glb')
for b in arm.pose.bones:
    b.matrix_basis.identity()
with bpy.context.temp_override(window=win, scene=sc, view_layer=sc.view_layers[0]):
    bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=False, use_active_scene=True, export_animations=True,
                              export_animation_mode='NLA_TRACKS', export_force_sampling=True, export_frame_step=1, export_yup=True,
                              export_apply=False, export_image_format='AUTO')
print('glb:', OUT, os.path.getsize(OUT))
