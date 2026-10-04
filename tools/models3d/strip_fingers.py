# Убрать из рига кости пальцев (и другие мелкие кости по DROP) у облика в открытой сцене NAME — прямо в Blender, вместе с их
# группами вершин. Автоскелет генератора вешает кости пальцев и на соседнее (корпус, полы плаща у бёдер, волосы), а пальцам —
# бёдра: в исходной позе кисти висят у бёдер, и при движении рук всё это тянется. Вес убранной кости у вершины:
#   рука (пальцы, кисть и предплечье — больше половины её веса, или вершина ближе HAND_R к костям пальцев) — вершина целиком
#   руке: вес пальцев — кисти, случайные веса бедра и корпуса — прочь;
#   иначе (корпус, плащ, волосы) — её собственным костям, пропорционально.
# Кусок сетки (связная часть), у которого больше половины веса — кисть с пальцами (палец, отдельно смоделированный большой палец),
# — целиком руке: автоскелет вешает такие куски и на бедро, у которого кисть висит, — палец оставался у бедра и тянулся полосой.
# Так же — кусок, что лежит у самой кисти (в среднем ближе 2·HAND_R к её костям и вчетверо ближе, чем к остальным), хоть в его
# весе больше бедра, — только если в n.py NEAR = True (джинн: у странницы так к руке уходят куски плаща у кисти).
# Запуск после *_anim.py (сцена уже есть): файл с NAME (и DROP) первым — node bl.mjs n.py strip_fingers.py; затем — выгрузка
# glb той же сцены (в конце этого файла) и skinned.mjs без --drop.
import bpy, bmesh, re, os
from mathutils import Vector
from mathutils.geometry import intersect_point_line

NAME = globals()['NAME']
DROP = re.compile(globals().get('DROP', r'Hand(Thumb|Index|Middle|Ring|Pinky)\d'))
HAND_R = 0.03
NEAR = globals().get('NEAR', False)
sc = bpy.data.scenes[NAME]
win = bpy.context.window_manager.windows[0]
win.scene = sc
arm = next(o for o in sc.objects if o.type == 'ARMATURE')
me = next(o for o in sc.objects if o.type == 'MESH' and o.find_armature() == arm)
B = arm.data.bones
drop = [b.name for b in B if DROP.search(b.name)]
keep_of = {}
for n in drop:  # ближайший оставшийся предок (кисть)
    p = B[n].parent
    while p and DROP.search(p.name):
        p = p.parent
    keep_of[n] = p.name
fa_of = {h: (B[h].parent.name if B[h].parent else None) for h in set(keep_of.values())}  # у кисти — предплечье
segs = {}
for n in drop:  # отрезки костей пальцев в исходной позе (мировые координаты)
    b = B[n]
    segs.setdefault(keep_of[n], []).append((arm.matrix_world @ b.head_local, arm.matrix_world @ b.tail_local))
G = {g.index: g.name for g in me.vertex_groups}
gi = {g.name: g for g in me.vertex_groups}
mw = me.matrix_world


def seg_d(q, a, b):
    if (b - a).length < 1e-9:
        return (q - a).length
    p, t = intersect_point_line(q, a, b)
    t = max(0.0, min(1.0, t))
    return (q - (a + (b - a) * t)).length


# связные куски сетки и доля кисти (с пальцами) в их весе
bm = bmesh.new()
bm.from_mesh(me.data)
bm.verts.ensure_lookup_table()
isl = [-1] * len(bm.verts)
k = 0
for v0 in bm.verts:
    if isl[v0.index] >= 0:
        continue
    st, isl[v0.index] = [v0], k
    while st:
        x = st.pop()
        for e in x.link_edges:
            o = e.other_vert(x)
            if isl[o.index] < 0:
                isl[o.index] = k
                st.append(o)
    k += 1
bm.free()
hand_of = dict(keep_of, **{h: h for h in fa_of})
mass = {}
for v in me.data.vertices:
    m = mass.setdefault(isl[v.index], {})
    for g in v.groups:
        key = hand_of.get(G[g.group], '')
        m[key] = m.get(key, 0) + g.weight
pts = {}
for v in me.data.vertices:
    pts.setdefault(isl[v.index], []).append(mw @ v.co)
for h in fa_of:  # и сама кисть
    segs[h].append((arm.matrix_world @ B[h].head_local, arm.matrix_world @ B[h].tail_local))
other = [(arm.matrix_world @ b.head_local, arm.matrix_world @ b.tail_local) for b in B
         if b.use_deform and b.name not in hand_of and b.name not in fa_of.values()]


def mean_d(P, S):
    return sum(min(seg_d(q, a, b) for a, b in S) for q in P) / len(P)


isl_hand = {}
n_near = 0
for i, m in mass.items():
    h = max((x for x in m if x), key=lambda x: m[x], default=None)
    if not h:
        continue
    if m[h] > 0.5 * sum(m.values()):
        isl_hand[i] = h
    elif NEAR and m[h] > 0.02 * sum(m.values()) and len(pts[i]) <= 2000:
        # кусок у самой кисти (большой палец джинна: в весе больше бедра, но лежит у кости кисти, от бедра — далеко)
        dh = mean_d(pts[i], segs[h])
        if dh < 2 * HAND_R and dh < 0.25 * mean_d(pts[i], other):
            isl_hand[i] = h
            n_near += 1
nh = no = ni = 0
for v in me.data.vertices:
    w = {G[g.group]: g.weight for g in v.groups if g.weight > 0}
    if isl[v.index] in isl_hand:  # кусок кисти — целиком руке (вес предплечья остаётся)
        h = isl_hand[isl[v.index]]
        fa = fa_of[h]
        new = {h: sum(x for n, x in w.items() if n != fa)}
        if fa and w.get(fa):
            new[fa] = w[fa]
        for g in list(v.groups):
            gi[G[g.group]].remove([v.index])
        s = sum(new.values()) or 1
        for n, x in new.items():
            gi[n].add([v.index], x / s, 'REPLACE')
        ni += 1
        continue
    loose = {}
    for n in list(w):
        if n in keep_of:
            loose[keep_of[n]] = loose.get(keep_of[n], 0) + w.pop(n)
    if not loose:
        continue
    h, lw = max(loose.items(), key=lambda x: x[1])
    fa = fa_of[h]
    total = lw + sum(w.values()) + sum(x for k, x in loose.items() if k != h)
    q = mw @ v.co
    near = any(seg_d(q, a, b) < HAND_R for a, b in segs.get(h, []))
    if lw + w.get(h, 0) + (w.get(fa, 0) if fa else 0) >= 0.5 * total or not w or near:
        new = {h: lw + w.get(h, 0)}
        if fa and w.get(fa):
            new[fa] = w[fa]
        nh += 1
    else:
        tot = sum(w.values())
        new = {k: x + lw * x / tot for k, x in w.items()}
        no += 1
    for g in list(v.groups):  # переписать веса вершины
        gi[G[g.group]].remove([v.index])
    s = sum(new.values())
    for k, x in new.items():
        if k not in gi:
            gi[k] = me.vertex_groups.new(name=k)
        gi[k].add([v.index], x / s, 'REPLACE')
for n in drop:
    if n in gi:
        me.vertex_groups.remove(gi[n])
# кости — прочь (режим правки скелета)
bpy.ops.object.select_all(action='DESELECT')
arm.select_set(True)
bpy.context.view_layer.objects.active = arm
with bpy.context.temp_override(window=win, active_object=arm, object=arm, selected_objects=[arm], selected_editable_objects=[arm]):
    bpy.ops.object.mode_set(mode='EDIT')
    for n in drop:
        eb = arm.data.edit_bones.get(n)
        if eb:
            arm.data.edit_bones.remove(eb)
    bpy.ops.object.mode_set(mode='OBJECT')
print(f'{NAME}: убрано костей {len(drop)}; куски кисти {len(isl_hand)}, из них по близости {n_near} ({ni} вершин); вершины с весами пальцев — рука {nh}, остальное {no}; костей осталось {len(arm.data.bones)}')
# выгрузка — та же, что у *_anim.py (анимации — треки NLA idle, walk, run)
OUT = os.path.join(os.path.expanduser('~'), 'Blender', 'duholov-3d', 'glb', NAME + '_anim.glb')
for b in arm.pose.bones:
    b.matrix_basis.identity()
with bpy.context.temp_override(window=win, scene=sc, view_layer=sc.view_layers[0]):
    bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=False, use_active_scene=True, export_animations=True,
                              export_animation_mode='NLA_TRACKS', export_force_sampling=True, export_frame_step=1, export_yup=True,
                              export_apply=False, export_image_format='AUTO')
print('glb:', OUT, os.path.getsize(OUT))
