# Духолов 3D — общие помощники моделей (выполняются в открытом Blender через bl.mjs).
# Модели: 1 единица = 1 м, основание — на z = 0, «лицом» к −Y (камера карты смотрит с юга). Имена мешей — по ролям:
# stone / wood / gold / water / jet / shard / flame / glow / swirl … — чтобы three.js мог перекрашивать и вращать части.
import bpy, bmesh, math, os
from mathutils import Vector, Matrix

# рабочая папка вне репозитория: ref (рисунки игры), renders, glb, blend; другая — WORK = r"…" перед common.py
ROOT = globals().get('WORK') or os.path.join(os.path.expanduser('~'), 'Blender', 'duholov-3d')
OUTLINE = '#1c1030'  # тёмно-фиолетовая обводка, как у SVG-арта игры


def lin(c):
    """'#rrggbb' (sRGB) → линейный RGB для Blender"""
    c = c.lstrip('#')
    out = []
    for i in (0, 2, 4):
        v = int(c[i:i + 2], 16) / 255
        out.append(v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4)
    return out


def mat(name, color, rough=0.55, metal=0.0, emit=None, strength=0.0, alpha=1.0, cull=True):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = (*lin(color), 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    b.inputs['Emission Color'].default_value = (*lin(emit or '#000000'), 1)
    b.inputs['Emission Strength'].default_value = strength if emit else 0.0
    b.inputs['Alpha'].default_value = alpha
    m.use_backface_culling = cull
    if alpha < 1:
        m.surface_render_method = 'BLENDED'
    return m


def obj_from_bm(name, bm, materials=(), smooth=True):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for m in materials:
        me.materials.append(m)
    if smooth:
        me.shade_smooth()
    o = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(o)
    return o


def lathe(name, profile, segs=48, material=None, smooth=True, close=False):
    """Тело вращения вокруг Z по профилю [(r, z), …] снизу вверх"""
    bm = bmesh.new()
    rings = []
    for r, z in profile:
        ring = []
        for i in range(segs):
            a = 2 * math.pi * i / segs
            ring.append(bm.verts.new((r * math.cos(a), r * math.sin(a), z)))
        rings.append(ring)
    for k in range(len(rings) - 1):
        a, b = rings[k], rings[k + 1]
        for i in range(segs):
            j = (i + 1) % segs
            bm.faces.new((a[i], a[j], b[j], b[i]))
    if close:  # закрыть верх и низ кругами
        bm.faces.new(list(reversed(rings[0])))
        bm.faces.new(rings[-1])
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return obj_from_bm(name, bm, [material] if material else [], smooth)


def prim(kind, name, material=None, smooth=False, **kw):
    """Примитив bpy.ops.mesh.primitive_* в текущую сцену"""
    getattr(bpy.ops.mesh, 'primitive_' + kind + '_add')(**kw)
    o = bpy.context.active_object
    o.name = o.data.name = name
    if material:
        o.data.materials.append(material)
    if smooth:
        o.data.shade_smooth()
    return o


def tube(name, pts, radius, material, sides=8, taper=None, smooth=True):
    """Трубка по ломаной pts (кольца с переносом рамки без скручивания); taper(u) — множитель радиуса, u = 0…1"""
    bm = bmesh.new()
    rings, side = [], None
    n = len(pts)
    for i, p in enumerate(pts):
        p = Vector(p)
        t = (Vector(pts[min(i + 1, n - 1)]) - Vector(pts[max(i - 1, 0)])).normalized()
        if side is None:
            up = Vector((0, 0, 1)) if abs(t.z) < 0.9 else Vector((1, 0, 0))
            side = t.cross(up).normalized()
        else:
            side = (side - t * side.dot(t)).normalized()
        up2 = t.cross(side).normalized()
        r = radius * (taper(i / (n - 1)) if taper else 1)
        rings.append([bm.verts.new(p + (side * math.cos(2 * math.pi * k / sides) + up2 * math.sin(2 * math.pi * k / sides)) * r) for k in range(sides)])
    for k in range(n - 1):
        for j in range(sides):
            bm.faces.new((rings[k][j], rings[k][(j + 1) % sides], rings[k + 1][(j + 1) % sides], rings[k + 1][j]))
    bm.faces.new(list(reversed(rings[0])))
    bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return obj_from_bm(name, bm, [material], smooth)


def crystal(name, material, rx=0.16, ry=0.11, mid=0.12, top=0.28, bot=0.24, sides=6, seed=7):
    """Гранёный кристалл вокруг (0, 0, 0): шестигранная призма с пирамидками сверху и снизу, чуть неровная"""
    import random
    rnd = random.Random(seed)
    bm = bmesh.new()
    rings = []
    for dz in (-mid, mid):
        ring = []
        for k in range(sides):
            a = 2 * math.pi * k / sides + 0.25
            f = 0.88 + 0.24 * rnd.random()
            ring.append(bm.verts.new((rx * f * math.cos(a), ry * f * math.sin(a), dz + 0.02 * (rnd.random() - 0.5))))
        rings.append(ring)
    t = bm.verts.new((0.02, 0.0, mid + top))
    b = bm.verts.new((-0.015, 0.0, -mid - bot))
    lo, hi = rings
    for k in range(sides):
        j = (k + 1) % sides
        bm.faces.new((lo[k], lo[j], hi[j], hi[k]))
        bm.faces.new((hi[k], hi[j], t))
        bm.faces.new((lo[j], lo[k], b))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return obj_from_bm(name, bm, [material], smooth=False)


def sparkle(name, material, loc, size=0.07):
    """Четырёхлучевая искра: два сплющенных ромба крест-накрест"""
    parts = []
    for rot in (0, math.pi / 2):
        bm = bmesh.new()  # октаэдр (8 граней), вытянутый в луч
        vs = [bm.verts.new(p) for p in ((0, 0, 1), (0.18, 0, 0), (0, 0.18, 0), (-0.18, 0, 0), (0, -0.18, 0), (0, 0, -1))]
        for a, b in ((1, 2), (2, 3), (3, 4), (4, 1)):
            bm.faces.new((vs[0], vs[a], vs[b]))
            bm.faces.new((vs[5], vs[b], vs[a]))
        bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(rot, 3, 'Y'))
        bmesh.ops.scale(bm, vec=(size, size, size), verts=bm.verts)
        bmesh.ops.translate(bm, vec=Vector(loc), verts=bm.verts)
        parts.append(obj_from_bm(f'{name}_{int(rot * 10)}', bm, [material], smooth=True))
    return parts


def vcol_mat(name='portal', strength=1.0):
    """Материал по цветам вершин (атрибут Col) — и основа, и свечение; двусторонний (в three.js — без освещения)"""
    m = bpy.data.materials.get(name)
    if m:
        return m
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes['Principled BSDF']
    ca = nt.nodes.new('ShaderNodeVertexColor')
    ca.layer_name = 'Col'
    nt.links.new(ca.outputs['Color'], b.inputs['Base Color'])
    nt.links.new(ca.outputs['Color'], b.inputs['Emission Color'])
    b.inputs['Emission Strength'].default_value = strength
    b.inputs['Roughness'].default_value = 0.4
    m.use_backface_culling = False
    return m


PORTAL_GRAD = [(0.0, '#14072e'), (0.3, '#2e1065'), (0.58, '#7e22ce'), (0.82, '#db2777'), (1.0, '#f9a8d4')]


def _grad(t, stops):
    for (t0, c0), (t1, c1) in zip(stops, stops[1:]):
        if t <= t1:
            k = (t - t0) / (t1 - t0)
            a, b = lin(c0), lin(c1)
            return [a[i] + (b[i] - a[i]) * k for i in range(3)]
    return lin(stops[-1][1])


def portal(prefix='portal', center=(0, 0, 1.5), w=1.0, h=1.0, shape='circle', arms=4, core=0.17, stops=None, arm_mat=None):
    """Портал Разлома: диск в плоскости XZ (лицом к −Y) с переливом от края к центру (цвета вершин) + узел swirl
    (рукава-спирали и белое ядро с крестом — его вращает three.js). shape: circle | square | diamond; w, h — полуразмеры"""
    stops = stops or PORTAL_GRAD
    cx, cy, cz = center
    segs, rings = 32, 6  # на значке карты портал — 60–100 пикселей: больше не нужно
    def place(r, a):
        x, z = math.cos(a), math.sin(a)
        if shape == 'square':
            k = max(abs(x), abs(z))
            x, z = x / k, z / k
        elif shape == 'diamond':
            k = abs(x) + abs(z)
            x, z = x / k, z / k
        return (cx + w * r * x, cy, cz + h * r * z)
    verts, faces, cols = [(cx, cy, cz)], [], [_grad(0, stops)]
    for k in range(1, rings + 1):
        for i in range(segs):
            verts.append(place(k / rings, 2 * math.pi * i / segs + (math.pi / 4 if shape == 'square' else 0)))
            cols.append(_grad(k / rings, stops))
    for i in range(segs):
        faces.append((0, 1 + (i + 1) % segs, 1 + i))
    for k in range(rings - 1):
        o0, o1 = 1 + k * segs, 1 + (k + 1) * segs
        for i in range(segs):
            j = (i + 1) % segs
            faces.append((o0 + i, o0 + j, o1 + j, o1 + i))
    me = bpy.data.meshes.new(prefix + '_disc')
    me.from_pydata(verts, [], faces)
    ca = me.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
    for i, c in enumerate(cols):
        ca.data[i].color = (*c, 1.0)
    me.materials.append(vcol_mat())
    me.shade_smooth()
    disc = bpy.data.objects.new(prefix + '_disc', me)
    bpy.context.scene.collection.objects.link(disc)
    pink = arm_mat or mat('rift_pink', '#f472b6', rough=0.3, emit='#ec4899', strength=1.2)
    swirl = bpy.data.objects.new('swirl', None)
    bpy.context.scene.collection.objects.link(swirl)
    swirl.location = (cx, cy, cz)
    rr = min(w, h) * (0.72 if shape == 'diamond' else 0.9)
    for j in range(arms):
        a0 = j * 2 * math.pi / arms
        pts = [((0.15 + 0.85 * u) * rr * math.cos(a0 + 1.75 * u), -0.04, (0.15 + 0.85 * u) * rr * math.sin(a0 + 1.75 * u)) for u in [s / 13 for s in range(14)]]
        arm = tube(f'swirl_arm_{j}', pts, 0.045 * max(0.7, rr), pink, sides=6, taper=lambda u: 1.0 - 0.6 * u)
        arm.parent = swirl
    core_o = prim('uv_sphere', 'swirl_core', mat('rift_core', '#eceaf2', rough=0.35, emit='#ffffff', strength=0.3), smooth=True,
                  segments=16, ring_count=10, radius=core, location=(0, 0, 0))
    core_o.parent = swirl
    for k, rot in enumerate((math.radians(45), math.radians(-45))):
        x = prim('cube', f'swirl_x_{k}', mat('rift_x', '#9ca3af', rough=0.5), size=1, location=(0, -core * 0.9, 0))
        x.scale = (core * 1.2, 0.02, core * 0.24)
        x.rotation_euler = (0, rot, 0)
        x.parent = swirl
    outline(core_o, 0.02)
    return disc, swirl


def spiral(name, material, center, r=0.12, turns=2.0, rot=0.0, thick=0.02, normal_y=-1):
    """Плоская спираль-трубка в плоскости XZ (на лицевой стороне, к −Y); rot — поворот рисунка"""
    cx, cy, cz = center
    pts = []
    for k in range(int(16 * turns) + 1):
        t = k / (16 * turns)
        a = rot + 2 * math.pi * turns * t
        pts.append((cx + r * t * math.cos(a), cy, cz + r * t * math.sin(a)))
    return tube(name, pts, thick, material, sides=4, taper=lambda u: 0.7 + 0.3 * u)


def triskele(prefix, material, center, r=0.1, thick=0.02):
    """Трискель: три спирали вокруг общего центра"""
    cx, cy, cz = center
    out = []
    for k in range(3):
        a = math.pi / 2 + 2 * math.pi * k / 3
        out.append(spiral(f'{prefix}_{k}', material, (cx + r * 0.9 * math.cos(a), cy, cz + r * 0.9 * math.sin(a)), r=r, turns=1.6, rot=a + math.pi, thick=thick))
    return out


def flame(prefix, loc, s=1.0, outer='#8b5cf6', inner='#f5f3ff', glow='#8b5cf6'):
    """Священное пламя: внешний язык (полупрозрачный, светится) и белая сердцевина; loc — основание"""
    fo = mat('flame_out', outer, rough=0.2, emit=glow, strength=1.3, alpha=0.9)
    fi = mat('flame_in', inner, rough=0.2, emit='#ede9fe', strength=1.6)
    x, y, z = loc
    o = lathe(prefix + '_out', [(0.0, 0), (0.2 * s, 0.06 * s), (0.26 * s, 0.2 * s), (0.22 * s, 0.38 * s), (0.14 * s, 0.56 * s), (0.06 * s, 0.72 * s), (0.0, 0.82 * s)], 16, fo)
    o.location = (x, y, z)
    i = lathe(prefix + '_in', [(0.0, 0.04 * s), (0.11 * s, 0.08 * s), (0.13 * s, 0.18 * s), (0.1 * s, 0.3 * s), (0.05 * s, 0.42 * s), (0.0, 0.48 * s)], 12, fi)
    i.location = (x, y - 0.08 * s, z)
    return o, i


def box(name, material, loc, size, rot=(0, 0, 0), bev=0.0):
    """Брусок с центром loc и полными размерами size (x, y, z)"""
    o = prim('cube', name, material, size=1, location=loc)
    o.scale = size
    o.rotation_euler = rot
    if bev:
        bevel(o, bev, 2)
    return o


def prism(name, material, base_w, height, depth, loc):
    """Треугольная призма (фронтон): основание base_w по X, высота по Z, толщина depth по Y; loc — середина основания"""
    bm = bmesh.new()
    x, y, z = loc
    f = [bm.verts.new((x - base_w / 2, y - depth / 2, z)), bm.verts.new((x + base_w / 2, y - depth / 2, z)), bm.verts.new((x, y - depth / 2, z + height))]
    b = [bm.verts.new((v.co.x, v.co.y + depth, v.co.z)) for v in f]
    bm.faces.new(f)
    bm.faces.new(list(reversed(b)))
    for k in range(3):
        n = (k + 1) % 3
        bm.faces.new((f[k], b[k], b[n], f[n]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return obj_from_bm(name, bm, [material], smooth=False)


def column(prefix, material, x, y, z0, h, r=0.16, flutes=16):
    """Античная колонна: база, ствол с каннелюрами (грани), капитель-плита"""
    shaft = prim('cylinder', prefix + '_shaft', material, vertices=flutes, radius=r, depth=h - 0.24, location=(x, y, z0 + h / 2))
    base = box(prefix + '_base', material, (x, y, z0 + 0.06), (r * 2.6, r * 2.6, 0.12), bev=0.02)
    cap = box(prefix + '_cap', material, (x, y, z0 + h - 0.06), (r * 2.8, r * 2.8, 0.12), bev=0.02)
    return shaft, base, cap


def cut_below(o, z=0.0):
    """Срезать всё ниже земли и закрыть срез: на карте под землёй ничего не прячется (только для объектов без родителя)"""
    me = o.data
    me.transform(o.matrix_basis)  # не matrix_world: она обновляется лениво и не знает только что заданный масштаб
    o.matrix_basis = Matrix.Identity(4)
    bm = bmesh.new()
    bm.from_mesh(me)
    bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(0, 0, z), plane_no=(0, 0, 1), clear_inner=True)
    edges = [e for e in bm.edges if e.is_boundary]
    if edges:
        bmesh.ops.holes_fill(bm, edges=edges)
    bm.to_mesh(me)
    bm.free()
    return o


def frustum(name, m, x0, x1, y0, y1, z0, xt0, xt1, yt0, yt1, z1):
    """Брус со скошенными стенами: низ [x0..x1]×[y0..y1] на z0, верх [xt0..xt1]×[yt0..yt1] на z1"""
    bm = bmesh.new()
    lo = [bm.verts.new(v) for v in ((x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0))]
    hi = [bm.verts.new(v) for v in ((xt0, yt0, z1), (xt1, yt0, z1), (xt1, yt1, z1), (xt0, yt1, z1))]
    bm.faces.new(list(reversed(lo)))
    bm.faces.new(hi)
    for k in range(4):
        j = (k + 1) % 4
        bm.faces.new((lo[k], lo[j], hi[j], hi[k]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return obj_from_bm(name, bm, [m], smooth=False)


def ring_xz(name, m, r_in, r_out, depth, cx, y_back, cz, segs=48):
    """Плоское кольцо в плоскости XZ: задняя грань на y_back, толщина depth к −Y"""
    o = lathe(name, [(r_in, 0), (r_out, 0), (r_out, depth), (r_in, depth), (r_in, 0)], segs, m, smooth=False)
    o.rotation_euler = (math.pi / 2, 0, 0)
    o.location = (cx, y_back, cz)
    return o


def roof(name, material, xe, ye, ze, xt, yt, zt, n=16, rings=10, up=0.25, flare=0.1, power=1.8, thick=0.07, under=None, close=False, hips=None, hip_r=0.03):
    """Кровля с загнутыми углами (Китай, Япония): от карниза (полуразмеры xe×ye на высоте ze) вогнутым скатом
    к верху (xt×yt на zt; yt = 0 — конёк). Углы карниза задраны на up и вынесены наружу на flare (доля);
    толщина — Solidify вниз, низ и торцы — материалом under. n — точек на сторону; hips — материал рёбер вальм
    (тёмные гребни от углов к верху: без них скаты сливаются)"""
    if hips:
        for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
            pts = []
            for k in range(9):
                t = k / 8
                X, Y = xe + (xt - xe) * t, ye + (yt - ye) * t
                c = (1 - t) ** 2
                pts.append((sx * X * (1 + flare * c), sy * Y * (1 + flare * c), ze + (zt - ze) * t ** power + up * c + hip_r * 0.6))
            tube(f'{name}_hip_{sx}_{sy}', pts, hip_r, hips, sides=6)
    bm = bmesh.new()
    rows = []
    for k in range(rings + 1):
        t = k / rings
        X, Y = xe + (xt - xe) * t, ye + (yt - ye) * t
        z = ze + (zt - ze) * t ** power
        row = []
        for i in range(4 * n):
            side, u = i // n, -1 + 2 * (i % n) / n
            px, py = ((u, -1), (1, u), (-u, 1), (-1, -u))[side]
            c = abs(u) ** 6 * (1 - t) ** 2  # «угловатость»: 1 в углу карниза, к коньку и к середине стороны — 0
            row.append(bm.verts.new((X * px * (1 + flare * c), Y * py * (1 + flare * c), z + up * c)))
        rows.append(row)
    for k in range(rings):
        a, b = rows[k], rows[k + 1]
        for i in range(4 * n):
            j = (i + 1) % (4 * n)
            bm.faces.new((a[i], a[j], b[j], b[i]))
    if close and yt > 0:
        bm.faces.new(rows[-1])
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = obj_from_bm(name, bm, [material] + ([under] if under else []), smooth=False)
    if sum(f.normal.z for f in o.data.polygons) < 0:  # открытая поверхность: нормали — наружу (вверх)
        o.data.flip_normals()
    s = o.modifiers.new('thick', 'SOLIDIFY')
    s.thickness = thick
    s.offset = -1.0
    if under:
        s.material_offset = 1
        s.material_offset_rim = 1
    return o


def beam_xz(name, material, pts, y, depth, height):
    """Брус прямоугольного сечения вдоль кривой в плоскости XZ (pts — [(x, z)], по центру сечения): кругом
    прямоугольник depth (по Y) × height (по нормали к кривой)"""
    bm = bmesh.new()
    rings = []
    n = len(pts)
    for i, (x, z) in enumerate(pts):
        ax, az = pts[max(i - 1, 0)]
        bx, bz = pts[min(i + 1, n - 1)]
        tx, tz = bx - ax, bz - az
        ln = math.hypot(tx, tz)
        nx, nz = -tz / ln, tx / ln
        rings.append([bm.verts.new((x + nx * sh * height / 2, y + sd * depth / 2, z + nz * sh * height / 2))
                      for sh, sd in ((-1, -1), (-1, 1), (1, 1), (1, -1))])
    for k in range(n - 1):
        for j in range(4):
            m = (j + 1) % 4
            bm.faces.new((rings[k][j], rings[k][m], rings[k + 1][m], rings[k + 1][j]))
    bm.faces.new(list(reversed(rings[0])))
    bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return obj_from_bm(name, bm, [material], smooth=False)


def torii(prefix, y=0.0, px=1.04, h=3.2, span=1.55):
    """Красные тории: чёрные башмаки, чуть сужающиеся столбы, нижняя балка нуки, верхняя симаки и чёрная
    кровельная касаги с задранными концами, между балками — табличка в золотой рамке.
    Возвращает (детали для обводки, центр лицевой стороны таблички)"""
    red = mat('torii_red', '#c42b2b', rough=0.5)
    black = mat('torii_black', '#232027', rough=0.6)
    gold = mat('gold_bright', '#f7b733', rough=0.35, metal=0.35, emit='#f59e0b', strength=0.15)
    parts = []
    for sgn in (-1, 1):
        parts.append(prim('cylinder', f'{prefix}_base_{sgn}', black, vertices=16, radius=0.2, depth=0.28, location=(sgn * px, y, 0.14)))
        p = lathe(f'{prefix}_pillar_{sgn}', [(0.15, 0.28), (0.125, h - 0.4)], 16, red, smooth=True, close=True)
        p.location = (sgn * px, y, 0)
        parts.append(p)
    zn, zs = h - 0.82, h - 0.3
    parts.append(box(f'{prefix}_nuki', red, (0, y, zn), (2 * (px + 0.42), 0.15, 0.17), bev=0.01))
    sw = span - 0.12  # симаки изогнута вместе с касаги — без щели под задранными концами
    parts.append(beam_xz(f'{prefix}_shimaki', red, [(sw * u, zs + 0.15 * abs(sw * u / span) ** 3) for u in [k / 11 - 1 for k in range(23)]], y, 0.2, 0.2))
    pts = [(span * u, h - 0.1 + 0.15 * abs(u) ** 3) for u in [k / 12 - 1 for k in range(25)]]
    parts.append(beam_xz(f'{prefix}_kasagi', black, pts, y, 0.28, 0.2))
    zp = (zn + zs) / 2
    parts.append(box(f'{prefix}_plaque', gold, (0, y, zp), (0.38, 0.1, 0.33), bev=0.01))
    box(f'{prefix}_plaque_face', black, (0, y - 0.05, zp), (0.29, 0.02, 0.24))
    return parts, (0, y - 0.065, zp)


def surface_hit(o, origin, direction=(0, 1, 0)):
    """Точка и нормаль поверхности o по лучу из origin (мировые координаты). Звать до outline(): луч видит и обводку"""
    bpy.context.view_layer.update()
    mw = o.matrix_world
    inv = mw.inverted()
    ok, loc, nor, _ = o.ray_cast(inv @ Vector(origin), (inv.to_3x3() @ Vector(direction)).normalized())
    if not ok:
        return None, None
    return mw @ loc, (inv.transposed().to_3x3() @ nor).normalized()


def stick(name, objs, loc, normal, lift=0.01):
    """Прилепить плоские детали (построены вокруг (0, 0, 0) в плоскости XZ, лицом к −Y) к поверхности: в точку loc лицом по normal"""
    e = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(e)
    n = Vector(normal).normalized()
    e.location = Vector(loc) + n * lift
    e.rotation_mode = 'QUATERNION'
    e.rotation_quaternion = n.to_track_quat('-Y', 'Z')
    for o in objs:
        o.parent = e
    return e


def bevel(o, width=0.02, segs=2):
    m = o.modifiers.new('bevel', 'BEVEL')
    m.width = width
    m.segments = segs
    m.limit_method = 'ANGLE'
    return m


def outline(o, thickness=0.022):
    """Мультяшная обводка «вывернутой оболочкой»: Solidify с перевёрнутыми нормалями и материалом обводки
    (только передние грани — в glTF doubleSided=false, three.js рисует её как контур)"""
    om = bpy.data.materials.get('outline')
    if not om:  # неосвещаемая: чёрная основа без блика, свой цвет — свечением (в three.js — MeshBasicMaterial)
        om = mat('outline', '#000000', rough=1.0, emit=OUTLINE, strength=1.0)
        om.node_tree.nodes.get('Principled BSDF').inputs['Specular IOR Level'].default_value = 0.0
    om.use_backface_culling = True
    if om.name not in [m.name for m in o.data.materials if m]:
        o.data.materials.append(om)
    idx = [m.name for m in o.data.materials].index(om.name)
    s = o.modifiers.new('outline', 'SOLIDIFY')
    s.thickness = thickness
    s.offset = 1.0
    s.use_flip_normals = True
    s.use_rim = False
    s.material_offset = idx
    s.material_offset_rim = idx
    return s


def new_scene(name):
    """Своя сцена на модель: пересоздаётся с нуля, становится активной в окне"""
    old = bpy.data.scenes.get(name)
    if old:
        for o in list(old.objects):
            bpy.data.objects.remove(o, do_unlink=True)
        bpy.data.scenes.remove(old)
    sc = bpy.data.scenes.new(name)
    win = bpy.context.window_manager.windows[0]
    win.scene = sc
    sc.render.engine = 'BLENDER_EEVEE_NEXT'
    sc.render.resolution_x = sc.render.resolution_y = 900
    sc.render.film_transparent = False
    sc.eevee.taa_render_samples = 48
    sc.view_settings.view_transform = 'Standard'  # цвета как в SVG, без «киношного» сжатия
    w = bpy.data.worlds.get('duholov') or bpy.data.worlds.new('duholov')
    w.use_nodes = True
    bg = w.node_tree.nodes.get('Background')
    bg.inputs['Color'].default_value = (*lin('#2a2340'), 1)
    bg.inputs['Strength'].default_value = 0.6
    sc.world = w
    return sc


def preview_rig(target_z=1.0, dist=6.5, elev=24, light=True):
    """Камера 3/4 (как значки игры) и три источника света — только для превью, в GLB не идут"""
    sc = bpy.context.scene
    e = math.radians(elev)
    cam_d = bpy.data.cameras.new('preview_cam')
    cam_d.lens = 50
    cam = bpy.data.objects.new('preview_cam', cam_d)
    sc.collection.objects.link(cam)
    cam.location = (0, -dist * math.cos(e), target_z + dist * math.sin(e))
    d = Vector((0, 0, target_z)) - cam.location
    cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    sc.camera = cam
    if light:
        for nm, kind, loc, en, col in (('key', 'SUN', (-3, -4, 6), 3.2, '#fff4e0'), ('fill', 'SUN', (5, -2, 3), 1.1, '#c7d2fe'),
                                       ('rim', 'SUN', (1, 6, 4), 2.0, '#f0abfc')):
            ld = bpy.data.lights.new('preview_' + nm, kind)
            ld.energy = en
            ld.color = lin(col)
            lo = bpy.data.objects.new('preview_' + nm, ld)
            sc.collection.objects.link(lo)
            lo.location = loc
            lo.rotation_euler = (Vector((0, 0, target_z)) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    return cam


def render(path):
    sc = bpy.context.scene
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True, scene=sc.name)
    print('рендер:', path)


def export_glb(path):
    """Только меши своей сцены (без превью-камеры и света), модификаторы применены, Y вверх"""
    sc = bpy.context.scene
    win = bpy.context.window_manager.windows[0]
    with bpy.context.temp_override(window=win, scene=sc, view_layer=sc.view_layers[0]):
        bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=False, use_active_scene=True, export_apply=True,
                                  export_cameras=False, export_lights=False, export_yup=True, export_texcoords=False)
    tris = 0
    dg = bpy.context.evaluated_depsgraph_get()
    for o in sc.objects:
        if o.type == 'MESH':
            me = o.evaluated_get(dg).to_mesh()
            me.calc_loop_triangles()
            tris += len(me.loop_triangles)
            o.evaluated_get(dg).to_mesh_clear()
    print('glb:', path, os.path.getsize(path), 'байт,', tris, 'треугольников (с обводкой)')


def _base(name):
    """Имя без суффикса Blender .001 (имена объектов общие на весь файл — в каждой сцене свой суффикс)"""
    import re
    return re.sub(r'\.\d{3}$', '', name)


def export_m3d(path):
    """Модель для игры (www/models/*.m3d): свой компактный формат вместо GLB.
    Без обводки (её рисует игра — тот же приём «вывернутой оболочки» в шейдере, толщина берётся у модификатора outline),
    позиции — int16 в рамке модели, нормали — int8, цвета вершин (портал) — sRGB u8, индексы — u16 на часть.
    Части группируются: (группа анимации, материал, толщина обводки, метка). Группы: static | spin (вихрь портала —
    дети пустышки swirl, вращение вокруг оси портала) | flicker (пламя) | bob (огоньки) | float (осколок) | twinkle (искры).
    Метка jet — струя и дуги Источника (у исчерпанного их не видно)."""
    import struct, json
    sc = bpy.context.scene
    bpy.context.view_layer.update()
    groups, gid = [{'t': 'static'}], {}

    def group(key, kind, o, **kw):
        if key not in gid:
            gid[key] = len(groups)
            groups.append(dict(t=kind, o=[round(v, 4) for v in o.matrix_world.translation], **kw))
        return gid[key]

    obj_group = {}
    for s in sc.objects:
        if s.type == 'EMPTY' and _base(s.name) == 'swirl':
            g = group(s.name, 'spin', s, ax=[0, -1, 0])
            for c in s.children_recursive:
                obj_group[c.name] = g
    meshes = [o for o in sc.objects if o.type == 'MESH']
    for o in meshes:
        if o.name in obj_group:
            continue
        b = _base(o.name)
        if 'flame' in b and (b.endswith('_out') or b.endswith('_in')):
            pre = b.rsplit('_', 1)[0]
            src = next((x for x in meshes if _base(x.name) == pre + '_out'), o)
            obj_group[o.name] = group(pre, 'flicker', src)
        elif b.startswith('wisp_'):
            pre = '_'.join(b.split('_')[:2])
            src = next((x for x in meshes if _base(x.name) == pre), o)
            obj_group[o.name] = group(pre, 'bob', src)
        elif b == 'shard':
            obj_group[o.name] = group(b, 'float', o)
        elif b.startswith('spark_'):
            obj_group[o.name] = group(b, 'twinkle', o)
    # обводку — выключить на время экспорта (её толщину запомнить)
    ol_of, off = {}, []
    for o in meshes:
        for m in o.modifiers:
            if m.type == 'SOLIDIFY' and m.name.startswith('outline'):
                ol_of[o.name] = round(m.thickness, 4)
                if m.show_viewport:
                    m.show_viewport = False
                    off.append(m)
            elif m.type == 'BEVEL' and m.show_viewport:  # фаска на значке карты меньше пикселя, а вершин с ней — втрое больше
                m.show_viewport = False
                off.append(m)
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    mats, mat_ix = [], {}

    def mat_of(m):
        if m.name in mat_ix:
            return mat_ix[m.name]
        b = m.node_tree.nodes.get('Principled BSDF')
        vc = any(n.type == 'VERTEX_COLOR' for n in m.node_tree.nodes)
        es = b.inputs['Emission Strength'].default_value
        info = {'n': _base(m.name), 'c': [round(v, 4) for v in (b.inputs['Base Color'].default_value[:3] if not vc else (1, 1, 1))],
                'e': [round(v * es, 4) for v in (b.inputs['Emission Color'].default_value[:3] if not vc else (1, 1, 1))],
                'a': round(b.inputs['Alpha'].default_value, 3), 'ro': round(b.inputs['Roughness'].default_value, 3),
                'mt': round(b.inputs['Metallic'].default_value, 3), 'ds': 0 if m.use_backface_culling else 1, 'vc': 1 if vc else 0}
        mat_ix[m.name] = len(mats)
        mats.append(info)
        return mat_ix[m.name]

    prims = {}  # (группа, материал, обводка, метка) → {'v': [(p, n, c)], 'k': {ключ вершины: индекс}, 'i': []}
    r_xy, h_max = 0.0, 0.0

    def srgb8(x):
        x = max(0.0, min(1.0, x))
        return int(round(255 * (x * 12.92 if x <= 0.0031308 else 1.055 * x ** (1 / 2.4) - 0.055)))

    try:
        for o in meshes:
            g = obj_group.get(o.name, 0)
            piv = Vector(groups[g]['o']) if g else Vector((0, 0, 0))
            ol = ol_of.get(o.name, 0.0)
            b = _base(o.name)
            tag = 'jet' if (b == 'jet' or b.startswith('arc_')) else ''
            oe = o.evaluated_get(dg)
            if max(oe.dimensions) < 0.06:  # мельче 6 см — на значке карты меньше пикселя (бусины Камня Солнца и т. п.)
                continue
            me = oe.to_mesh()
            me.calc_loop_triangles()
            mw = oe.matrix_world.copy()
            nmx = mw.to_3x3().inverted_safe().transposed()
            cn = me.corner_normals
            col = me.color_attributes.get('Col')
            # сглаживание по углу (как Auto Smooth 30°): в одной точке нормали одного материала, расходящиеся меньше чем на 30°,
            # усредняются — у кривых поверхностей из плоских граней (кровли, склоны) вершины общие: втрое меньше вершин и мягче свет;
            # рёбра острее 30° (коробки, кристаллы, грани обелиска) остаются острыми
            nrm_of, by_v = {}, {}
            for tri in me.loop_triangles:
                for li in tri.loops:
                    by_v.setdefault((me.loops[li].vertex_index, tri.material_index), []).append(li)
            for lis in by_v.values():
                cl = []
                for li in lis:
                    n = (nmx @ cn[li].vector).normalized()
                    for c in cl:
                        if n.dot(c[1]) >= 0.866:
                            c[0] += n
                            c[2].append(li)
                            break
                    else:
                        cl.append([n.copy(), n, [li]])
                for s, _, ls in cl:
                    s = s.normalized()
                    for li in ls:
                        nrm_of[li] = s
            for tri in me.loop_triangles:
                m = me.materials[tri.material_index] if tri.material_index < len(me.materials) else None
                if m is None or _base(m.name) == 'outline':
                    continue
                mi = mat_of(m)
                key = (g, mi, ol if not mats[mi]['vc'] else 0.0, tag)
                pr = prims.setdefault(key, {'v': [], 'k': {}, 'i': []})
                for li in tri.loops:
                    vi = me.loops[li].vertex_index
                    pw = mw @ me.vertices[vi].co
                    r_xy, h_max = max(r_xy, math.hypot(pw.x, pw.y)), max(h_max, pw.z)
                    p = pw - piv
                    n = nrm_of[li]
                    c = None
                    if col is not None and mats[mi]['vc']:
                        cc = col.data[vi].color if col.domain == 'POINT' else col.data[li].color
                        c = (srgb8(cc[0]), srgb8(cc[1]), srgb8(cc[2]), 255)
                    vk = (round(p.x, 4), round(p.y, 4), round(p.z, 4), round(n.x, 2), round(n.y, 2), round(n.z, 2), c)
                    ix = pr['k'].get(vk)
                    if ix is None:
                        ix = pr['k'][vk] = len(pr['v'])
                        pr['v'].append((p, n, c))
                    pr['i'].append(ix)
            oe.to_mesh_clear()
    finally:
        for m in off:
            m.show_viewport = True
        bpy.context.view_layer.update()
    allp = [v[0] for pr in prims.values() for v in pr['v']]
    lo = [min(p[i] for p in allp) for i in range(3)]
    hi = [max(p[i] for p in allp) for i in range(3)]
    sc_q = [max(hi[i] - lo[i], 1e-6) / 65535 for i in range(3)]
    pos, nrm, cols, idx, out = bytearray(), bytearray(), bytearray(), bytearray(), []
    nv = 0
    for (g, mi, ol, tag), pr in sorted(prims.items(), key=lambda kv: (mats[kv[0][1]]['a'] < 1, kv[0][0], kv[0][1])):
        vs = pr['v']
        if len(vs) > 65535:
            raise ValueError('часть больше 65535 вершин')
        has_c = vs[0][2] is not None
        ent = {'g': g, 'm': mi, 'v': [nv, len(vs)], 'i': [len(idx) // 2, len(pr['i'])]}
        if ol:
            ent['ol'] = ol
        if tag:
            ent['tag'] = tag
        if has_c:
            ent['c'] = len(cols) // 4
        for p, n, c in vs:
            pos += struct.pack('<4h', *[int(round((p[i] - lo[i]) / sc_q[i])) - 32768 for i in range(3)], 0)
            nrm += struct.pack('<4b', *[max(-127, min(127, int(round(n[i] * 127)))) for i in range(3)], 0)
            if has_c:
                cols += struct.pack('<4B', *c)
        idx += struct.pack(f'<{len(pr["i"])}H', *pr['i'])
        if len(idx) % 4:
            idx += b'\0\0'
        nv += len(vs)
        out.append(ent)
    head = {'v': 1, 'name': sc.name, 'q': [round(x, 6) for x in lo] + [x for x in sc_q], 'r': round(r_xy, 3), 'h': round(h_max, 3),
            'mats': mats, 'groups': groups, 'prims': out,
            'buf': {'pos': 0, 'nrm': len(pos), 'col': len(pos) + len(nrm), 'idx': len(pos) + len(nrm) + len(cols), 'len': len(pos) + len(nrm) + len(cols) + len(idx)}}
    js = json.dumps(head, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
    js += b' ' * (-len(js) % 4)
    with open(path, 'wb') as f:
        f.write(b'M3D1' + struct.pack('<I', len(js)) + js + pos + nrm + cols + idx)
    ntri = sum(len(pr['i']) for pr in prims.values()) // 3
    print(f'm3d: {path} {os.path.getsize(path)} байт, {nv} вершин, {ntri} треугольников, {len(out)} частей, групп {len(groups)}')


def save_blend():
    """Всё — в один файл: по сцене на модель (их видно в списке сцен Blender)"""
    bpy.ops.wm.save_as_mainfile(filepath=ROOT + r'\blend\duholov3d.blend')
    print('сохранено:', ROOT + r'\blend\duholov3d.blend')
