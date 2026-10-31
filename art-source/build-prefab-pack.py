#!/usr/bin/env python3
"""Build a small, deterministic GLB kit for the Your Own Ghost art direction."""
from __future__ import annotations

import json
import math
import random
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "art" / "prefabs"


def add(a, b): return (a[0] + b[0], a[1] + b[1], a[2] + b[2])
def sub(a, b): return (a[0] - b[0], a[1] - b[1], a[2] - b[2])
def mul(a, s): return (a[0] * s, a[1] * s, a[2] * s)
def dot(a, b): return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
def cross(a, b): return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])
def unit(a):
    length = math.sqrt(max(dot(a, a), 1e-12))
    return mul(a, 1 / length)


class GLB:
    def __init__(self, title: str):
        self.title = title
        self.binary = bytearray()
        self.views = []
        self.accessors = []
        self.meshes = []
        self.nodes = []
        self.materials = []
        self.animations = []
        self.rng = random.Random(7301)

    def material(self, name, color, roughness=0.96, metallic=0.0):
        self.materials.append({
            "name": name,
            "pbrMetallicRoughness": {
                "baseColorFactor": [*color, 1],
                "metallicFactor": metallic,
                "roughnessFactor": roughness,
            },
            "doubleSided": True,
        })
        return len(self.materials) - 1

    def _accessor(self, values, component_type, kind, target=None, bounds=False):
        fmt = {5126: "f", 5123: "H", 5125: "I"}[component_type]
        flat = [v for row in values for v in (row if isinstance(row, (tuple, list)) else (row,))]
        while len(self.binary) % 4:
            self.binary.append(0)
        offset = len(self.binary)
        self.binary.extend(struct.pack("<" + fmt * len(flat), *flat))
        view = {"buffer": 0, "byteOffset": offset, "byteLength": len(self.binary) - offset}
        if target is not None:
            view["target"] = target
        self.views.append(view)
        accessor = {
            "bufferView": len(self.views) - 1,
            "componentType": component_type,
            "count": len(values),
            "type": kind,
        }
        if bounds and values:
            tuples = [v if isinstance(v, (tuple, list)) else (v,) for v in values]
            accessor["min"] = [min(v[i] for v in tuples) for i in range(len(tuples[0]))]
            accessor["max"] = [max(v[i] for v in tuples) for i in range(len(tuples[0]))]
        self.accessors.append(accessor)
        return len(self.accessors) - 1

    def add_mesh(self, name, triangles, material, vertex_variation=0.12):
        positions, normals, colors, indices = [], [], [], []
        for tri in triangles:
            n = unit(cross(sub(tri[1], tri[0]), sub(tri[2], tri[0])))
            variation = 1 + self.rng.uniform(-vertex_variation, vertex_variation)
            for point in tri:
                positions.append(point)
                normals.append(n)
                colors.append((variation, variation, variation, 1))
                indices.append(len(indices))
        pos = self._accessor(positions, 5126, "VEC3", 34962, True)
        nor = self._accessor(normals, 5126, "VEC3", 34962)
        col = self._accessor(colors, 5126, "VEC4", 34962)
        idx = self._accessor(indices, 5123, "SCALAR", 34963)
        self.meshes.append({"name": name, "primitives": [{
            "attributes": {"POSITION": pos, "NORMAL": nor, "COLOR_0": col},
            "indices": idx,
            "material": material,
            "mode": 4,
        }]})
        return len(self.meshes) - 1

    def add_node(self, name, mesh=None, translation=(0, 0, 0), rotation=(0, 0, 0), scale=(1, 1, 1), parent=0):
        node = {"name": name, "translation": list(translation), "scale": list(scale)}
        if any(abs(v) > 1e-9 for v in rotation):
            node["rotation"] = quat_euler(rotation)
        if mesh is not None:
            node["mesh"] = mesh
        self.nodes.append(node)
        index = len(self.nodes) - 1
        if parent is not None:
            self.nodes[parent].setdefault("children", []).append(index)
        return index

    def add_animation(self, name, tracks):
        """Tracks are (node index, path, times, values, accessor kind)."""
        samplers, channels = [], []
        for node, path, times, values, kind in tracks:
            time_accessor = self._accessor(times, 5126, "SCALAR", bounds=True)
            value_accessor = self._accessor(values, 5126, kind)
            samplers.append({"input": time_accessor, "output": value_accessor, "interpolation": "LINEAR"})
            channels.append({"sampler": len(samplers) - 1, "target": {"node": node, "path": path}})
        self.animations.append({"name": name, "samplers": samplers, "channels": channels})

    def write(self, filename, scene_nodes, extras=None):
        while len(self.binary) % 4:
            self.binary.append(0)
        gltf = {
            "asset": {"version": "2.0", "generator": "Your Own Ghost prefab kit", "copyright": "Original project asset"},
            "scene": 0,
            "scenes": [{"name": self.title, "nodes": scene_nodes}],
            "nodes": self.nodes,
            "meshes": self.meshes,
            "materials": self.materials,
            "buffers": [{"byteLength": len(self.binary)}],
            "bufferViews": self.views,
            "accessors": self.accessors,
        }
        if self.animations:
            gltf["animations"] = self.animations
        if extras:
            gltf["asset"]["extras"] = extras
        raw_json = json.dumps(gltf, separators=(",", ":")).encode("utf8")
        raw_json += b" " * ((4 - len(raw_json) % 4) % 4)
        raw_bin = bytes(self.binary)
        total = 12 + 8 + len(raw_json) + 8 + len(raw_bin)
        payload = struct.pack("<4sII", b"glTF", 2, total)
        payload += struct.pack("<I4s", len(raw_json), b"JSON") + raw_json
        payload += struct.pack("<I4s", len(raw_bin), b"BIN\x00") + raw_bin
        path = OUT / filename
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(payload)
        return path


def quat_euler(rotation):
    x, y, z = (v * 0.5 for v in rotation)
    cx, sx, cy, sy, cz, sz = math.cos(x), math.sin(x), math.cos(y), math.sin(y), math.cos(z), math.sin(z)
    return [sx * cy * cz - cx * sy * sz, cx * sy * cz + sx * cy * sz,
            cx * cy * sz - sx * sy * cz, cx * cy * cz + sx * sy * sz]


def tri_mesh_sphere(subdivisions=1, deform=0.06, seed=1):
    t = (1 + math.sqrt(5)) / 2
    verts = [(-1,t,0),(1,t,0),(-1,-t,0),(1,-t,0),(0,-1,t),(0,1,t),(0,-1,-t),(0,1,-t),(t,0,-1),(t,0,1),(-t,0,-1),(-t,0,1)]
    verts = [unit(v) for v in verts]
    faces = [(0,11,5),(0,5,1),(0,1,7),(0,7,10),(0,10,11),(1,5,9),(5,11,4),(11,10,2),(10,7,6),(7,1,8),(3,9,4),(3,4,2),(3,2,6),(3,6,8),(3,8,9),(4,9,5),(2,4,11),(6,2,10),(8,6,7),(9,8,1)]
    for _ in range(subdivisions):
        midpoints = {}
        def midpoint(a, b):
            key = tuple(sorted((a, b)))
            if key not in midpoints:
                midpoints[key] = len(verts)
                verts.append(unit(mul(add(verts[a], verts[b]), 0.5)))
            return midpoints[key]
        refined = []
        for a,b,c in faces:
            ab, bc, ca = midpoint(a,b), midpoint(b,c), midpoint(c,a)
            refined += [(a,ab,ca),(b,bc,ab),(c,ca,bc),(ab,bc,ca)]
        faces = refined
    rng = random.Random(seed)
    warped = []
    for v in verts:
        amount = rng.uniform(-deform, deform)
        warped.append(mul(v, 1 + amount))
    return [[warped[a], warped[b], warped[c]] for a,b,c in faces]


def ellipsoid(g, name, mat, pos, scale, parent, rotation=(0,0,0), seed=1, deform=.055):
    mesh = g.add_mesh(name, tri_mesh_sphere(2, deform, seed), mat)
    return g.add_node(name, mesh, pos, rotation, scale, parent)


def box_triangles(size, center=(0,0,0)):
    x,y,z = (v / 2 for v in size)
    cx,cy,cz = center
    faces = [((-x,-y,-z),(x,-y,-z),(x,y,-z),(-x,y,-z)),
             ((x,-y,z),(-x,-y,z),(-x,y,z),(x,y,z)),
             ((-x,-y,z),(-x,-y,-z),(-x,y,-z),(-x,y,z)),
             ((x,-y,-z),(x,-y,z),(x,y,z),(x,y,-z)),
             ((-x,y,-z),(x,y,-z),(x,y,z),(-x,y,z)),
             ((-x,-y,z),(x,-y,z),(x,-y,-z),(-x,-y,-z))]
    out=[]
    for face in faces:
        p=[add(v,(cx,cy,cz)) for v in face]
        out.extend([(p[0],p[1],p[2]),(p[0],p[2],p[3])])
    return out


def add_box(g, name, mat, size, pos, parent, rotation=(0,0,0), seed=5):
    mesh = g.add_mesh(name, box_triangles(size), mat, .1)
    return g.add_node(name, mesh, pos, rotation, (1,1,1), parent)


def cone_triangles(radius=.1, height=.2, sides=5):
    verts=[]
    for i in range(sides):
        a=2*math.pi*i/sides
        verts.append((math.cos(a)*radius,-height/2,math.sin(a)*radius))
    tip=(0,height/2,0); center=(0,-height/2,0); tris=[]
    for i in range(sides):
        j=(i+1)%sides
        tris.append((verts[i],verts[j],tip));tris.append((center,verts[j],verts[i]))
    return tris


def tube_triangles(points, radii, sides=6):
    rings=[]
    for i, p in enumerate(points):
        tangent=unit(sub(points[min(i+1,len(points)-1)],points[max(i-1,0)]))
        guide=(0,0,1) if abs(dot(tangent,(0,0,1)))<.88 else (0,1,0)
        u=unit(cross(tangent,guide));v=unit(cross(tangent,u))
        ring=[]
        for j in range(sides):
            a=2*math.pi*j/sides
            ring.append(add(p,add(mul(u,math.cos(a)*radii[i]),mul(v,math.sin(a)*radii[i]))))
        rings.append(ring)
    tris=[]
    for i in range(len(rings)-1):
        for j in range(sides):
            a,b=rings[i][j],rings[i][(j+1)%sides]
            c,d=rings[i+1][(j+1)%sides],rings[i+1][j]
            tris.extend([(a,b,c),(a,c,d)])
    tris.extend([(rings[0][0],rings[0][j+1],rings[0][j]) for j in range(1,sides-1)])
    last=rings[-1]
    tris.extend([(last[0],last[j],last[j+1]) for j in range(1,sides-1)])
    return tris


def add_tube(g, name, mat, points, radii, parent, seed=2):
    mesh=g.add_mesh(name,tube_triangles(points,radii),mat,.09)
    return g.add_node(name,mesh,parent=parent)


def add_wedge(g, name, mat, width, height, depth, pos, parent, lean=(0,0,0)):
    x=width/2; y=height/2; z=depth/2
    verts=[(-x,-y,-z),(x,-y,-z),(0,y,-z),(-x,-y,z),(x,-y,z),(0,y,z)]
    tris=[]
    for ids in [(0,1,2),(5,4,3),(0,2,5),(0,5,3),(1,4,5),(1,5,2),(0,3,4),(0,4,1)]:
        tris.append(tuple(verts[i] for i in ids))
    mesh=g.add_mesh(name,tris,mat,.08)
    return g.add_node(name,mesh,pos,lean,parent=parent)


def create_creature():
    g=GLB("Patchwork Watcher")
    cloth=g.material("dusty stitched cloth",(.43,.44,.4),.99)
    faded=g.material("old grey patch",(.34,.35,.33),.99)
    charcoal=g.material("seam shadow",(.14,.16,.16),1)
    rust=g.material("faded rust cloth",(.27,.15,.14),.98)
    ivory=g.material("worn button ivory",(.83,.77,.62),.82)
    mouth=g.material("unlit mouth cavity",(.018,.014,.016),1)
    amber=g.material("old amber glass",(.62,.43,.22),.44)
    rose=g.material("clouded rose glass",(.53,.31,.34),.5)
    pupil=g.material("pupil",(.035,.032,.03),.34)
    root=g.add_node("PATCHWORK_WATCHER_ROOT",None,parent=None)
    torso=g.add_node("breathing_torso",None,(0,.92,.035),(0,0,.08),parent=root)
    ellipsoid(g,"rag torso",cloth,(0,0,0),(.25,.54,.22),torso,seed=3,deform=.1)
    ellipsoid(g,"misaligned shoulder patch",rust,(-.12,.16,-.16),(.095,.13,.035),torso,rotation=(0,.04,-.4),seed=4,deform=.12)
    # Deliberately mismatched arms: one reaches too low and the other bends inward.
    add_tube(g,"left sleeve and arm",cloth,[(0,0,0),(-.07,-.19,-.01),(-.02,-.4,-.045),(-.12,-.6,-.08)],[.115,.09,.07,.042],torso)
    add_tube(g,"right sleeve and arm",faded,[(0,0,0),(.15,-.17,-.01),(.27,-.33,-.04),(.20,-.5,-.1),(.28,-.67,-.16)],[.12,.085,.07,.056,.032],torso)
    ellipsoid(g,"left mitten",faded,(-.12,-.62,-.08),(.075,.09,.065),torso,seed=20)
    ellipsoid(g,"right split hand",rust,(.28,-.69,-.16),(.07,.085,.055),torso,seed=21)
    for i in range(3):
        add_tube(g,f"finger {i+1}",cloth,[(.25+i*.025,-.71,-.19),(.27+i*.035,-.78,-.2),(.28+i*.04,-.81,-.2)],[.025,.018,.008],torso)
    # Long, slightly crossed legs; the feet point away from one another.
    add_tube(g,"left crooked leg",faded,[(-.07,-.33,0),(-.13,-.52,.025),(-.08,-.75,.035),(-.15,-.89,-.025)],[.095,.075,.052,.035],torso)
    add_tube(g,"right crooked leg",cloth,[(.09,-.35,0),(.15,-.53,-.015),(.08,-.73,-.02),(.18,-.9,-.1)],[.09,.07,.055,.03],torso)
    ellipsoid(g,"left shoe",charcoal,(-.18,-.9,-.085),(.12,.065,.19),torso,rotation=(0,-.2,.05),seed=24)
    ellipsoid(g,"right shoe",charcoal,(.2,-.91,-.13),(.115,.06,.18),torso,rotation=(0,.35,-.06),seed=25)
    add_tube(g,"tail",rust,[(.12,-.04,.13),(.28,-.16,.23),(.39,-.32,.31),(.32,-.47,.39),(.42,-.56,.45)],[.075,.06,.045,.027,.012],torso)
    # Head sits forward and leans independently, so gameplay can animate the head node.
    head=g.add_node("listening_cat_head",None,(0,1.53,-.035),(0,0,-.06),parent=root)
    ellipsoid(g,"misshapen head",cloth,(0,0,0),(.32,.3,.255),head,rotation=(0,0,.06),seed=7,deform=.13)
    ellipsoid(g,"left ear",faded,(-.205,.22,.005),(.105,.2,.08),head,rotation=(0,0,-.22),seed=8,deform=.08)
    add_wedge(g,"too tall right ear",rust,.16,.39,.09,(.2,.25,0),head,(0,.08,.18))
    ellipsoid(g,"left eye socket",charcoal,(-.13,.025,-.222),(.132,.12,.047),head,seed=9)
    ellipsoid(g,"right eye socket",charcoal,(.145,.005,-.212),(.096,.15,.045),head,seed=10)
    ellipsoid(g,"amber button eye",amber,(-.13,.03,-.259),(.084,.082,.033),head,seed=11,deform=.03)
    ellipsoid(g,"rose button eye",rose,(.15,.015,-.247),(.058,.102,.03),head,seed=12,deform=.03)
    ellipsoid(g,"left pinhole pupil",pupil,(-.11,.025,-.286),(.025,.035,.014),head,seed=13)
    ellipsoid(g,"right pinhole pupil",pupil,(.17,-.005,-.273),(.021,.03,.012),head,seed=14)
    ellipsoid(g,"crooked muzzle",faded,(.015,-.12,-.215),(.17,.105,.08),head,rotation=(0,0,.08),seed=15)
    ellipsoid(g,"stitched mouth opening",mouth,(.015,-.155,-.36),(.145,.105,.035),head,seed=16)
    for i,x in enumerate([-.055,0,.05]):
        mesh=g.add_mesh(f"porcelain tooth {i+1}",cone_triangles(.021,.065,4),ivory,.035)
        g.add_node(f"porcelain tooth {i+1}",mesh,(x,-.15,-.395),(math.pi/2,0,0),(1,1,1),head)
    # A few visible cross stitches make it read as assembled, without graphic gore.
    for i in range(4):
        y=-.18+i*.07
        add_box(g,f"chest stitch {i+1}",ivory,(.055,.012,.012),(.02,y,-.18),torso,rotation=(0,0,.18))
    g.add_animation("slow uneven breathing and listening",[
        (torso,"rotation",[0,.8,1.6,2.4],
         [quat_euler((0,0,.08)),quat_euler((.018,0,.115)),quat_euler((-.012,0,.045)),quat_euler((0,0,.08))],"VEC4"),
        (head,"rotation",[0,.8,1.6,2.4],
         [quat_euler((0,0,-.06)),quat_euler((.025,-.04,.02)),quat_euler((-.02,.035,-.12)),quat_euler((0,0,-.06))],"VEC4"),
    ])
    return g.write("patchwork-watcher-cat.glb",[root],{
        "unit":"meter","height":1.98,"front":"-Z","pivot":"floor center",
        "role":"doorway creature; keep the off-center eyes and asymmetrical limbs",
        "animation":"slow uneven breathing and listening",
    })


def create_doll():
    g=GLB("Sewn Nursery Doll")
    cloth=g.material("faded cream cotton",(.53,.5,.44),.99)
    patch=g.material("washed blue patch",(.25,.32,.32),.99)
    seam=g.material("thread and seams",(.19,.2,.19),1)
    button=g.material("mismatched buttons",(.67,.43,.22),.55)
    black=g.material("button holes",(.035,.035,.032),.45)
    root=g.add_node("SEWN_DOLL_ROOT",None,parent=None)
    body=g.add_node("rag body",None,(0,.42,0),parent=root)
    ellipsoid(g,"sagging doll body",cloth,(0,0,0),(.15,.21,.105),body,seed=31,deform=.12)
    ellipsoid(g,"blue repair patch",patch,(-.04,.02,-.09),(.07,.09,.025),body,seed=32)
    head=g.add_node("large lopsided doll head",None,(.015,.78,-.015),(0,0,.1),parent=root)
    ellipsoid(g,"cloth head",cloth,(0,0,0),(.19,.18,.16),head,seed=33,deform=.13)
    ellipsoid(g,"left button eye",button,(-.065,.02,-.145),(.043,.05,.025),head,seed=34)
    ellipsoid(g,"right button eye",patch,(.077,-.015,-.137),(.035,.061,.023),head,seed=35)
    ellipsoid(g,"left eye hole",black,(-.06,.02,-.166),(.012,.021,.009),head,seed=36)
    ellipsoid(g,"right eye hole",black,(.08,-.015,-.157),(.011,.024,.008),head,seed=37)
    add_tube(g,"overstitched smile",seam,[(-.07,-.08,-.145),(0,-.105,-.16),(.065,-.075,-.143)],[.008,.009,.007],head)
    add_tube(g,"long left arm",cloth,[(-.1,.12,0),(-.22,.02,-.02),(-.29,-.14,-.06)],[.05,.035,.022],body)
    add_tube(g,"short right arm",patch,[(.1,.12,0),(.2,.08,-.02),(.16,-.06,-.04)],[.044,.03,.018],body)
    add_tube(g,"left leg",patch,[(-.06,-.16,0),(-.08,-.28,-.01),(-.14,-.38,-.04)],[.052,.038,.024],body)
    add_tube(g,"right leg",cloth,[(.055,-.16,0),(.1,-.27,.01),(.08,-.36,-.05)],[.05,.036,.021],body)
    g.add_animation("small suspended sway",[
        (root,"rotation",[0,1,2,3,4],
         [quat_euler((0,0,-.035)),quat_euler((0,0,.04)),quat_euler((0,0,-.025)),quat_euler((0,0,.035)),quat_euler((0,0,-.035))],"VEC4")
    ])
    return g.write("sewn-nursery-doll.glb",[root],{
        "unit":"meter","height":.96,"front":"-Z","pivot":"floor center",
        "role":"shelf, bed, or chair prop; button eyes and stitches are separate meshes",
    })


def create_chair():
    g=GLB("Crooked Dining Chair")
    wood=g.material("water-worn dark wood",(.28,.23,.18),.97)
    edge=g.material("exposed pale wood",(.4,.33,.25),.95)
    cloth=g.material("dusty seat fabric",(.31,.29,.3),.99)
    root=g.add_node("CROOKED_CHAIR_ROOT",None,(0,.47,0),parent=None)
    for sx in (-1,1):
        for sz in (-1,1):
            start=(sx*.19,-.45,sz*.19)
            end=(sx*.23,.18,sz*.22)
            points=[start,((start[0]+end[0])*.5,-.12,(start[2]+end[2])*.5),end]
            mesh=g.add_mesh(f"tapered leg {sx} {sz}",tube_triangles(points,[.034,.028,.022],5),wood)
            g.add_node(f"tapered leg {sx} {sz}",mesh,parent=root)
    add_box(g,"scarred seat",wood,(.5,.09,.48),(0,.2,0),root,rotation=(.01,0,-.025))
    add_box(g,"collapsed seat pad",cloth,(.41,.06,.37),(0,.275,-.01),root,rotation=(.015,0,.035))
    # The back leans and one side rises higher, like a repaired household object.
    for sx, height, lean in [(-1,.74,-.055),(1,.82,-.105)]:
        pts=[(sx*.2,.23,.19),(sx*.2,.47,.2),(sx*.2,height,.25)]
        mesh=g.add_mesh(f"leaning back post {sx}",tube_triangles(pts,[.035,.028,.026],5),edge)
        g.add_node(f"leaning back post {sx}",mesh,parent=root)
    for i,y in enumerate([.43,.62]):
        add_box(g,f"uneven back slat {i+1}",wood,(.42,.09,.055),(0,y,.21),root,rotation=(0,0,.025 if i else -.04))
    add_box(g,"old repair brace",edge,(.06,.31,.05),(.18,.47,.16),root,rotation=(0,0,-.12))
    add_box(g,"one missing paint strip",edge,(.018,.28,.012),(-.11,.44,.241),root,rotation=(0,0,.04))
    return g.write("crooked-dining-chair.glb",[root],{
        "unit":"meter","height":1.31,"front":"-Z","pivot":"floor center",
        "bounds":[-.28,.28,0,1.31,-.28,.27],
        "role":"old-house dressing; deliberately repaired, worn, and slightly asymmetrical",
    })


if __name__ == "__main__":
    for path in (create_creature(), create_doll(), create_chair()):
        print(f"{path.relative_to(ROOT)}  {path.stat().st_size:,} bytes")
    manifest = {
        "version": 1,
        "units": "meters",
        "front": "-Z",
        "pivot": "floor center",
        "assets": [
            {
                "id": "patchwork-watcher-cat",
                "path": "/art/prefabs/patchwork-watcher-cat.glb",
                "category": "creature",
                "bounds": {"min": [-.45, 0, -.55], "max": [.45, 1.98, .55]},
                "animations": ["slow uneven breathing and listening"],
            },
            {
                "id": "sewn-nursery-doll",
                "path": "/art/prefabs/sewn-nursery-doll.glb",
                "category": "prop",
                "bounds": {"min": [-.3, 0, -.2], "max": [.3, .96, .2]},
                "animations": ["small suspended sway"],
            },
            {
                "id": "crooked-dining-chair",
                "path": "/art/prefabs/crooked-dining-chair.glb",
                "category": "furniture",
                "bounds": {"min": [-.28, 0, -.28], "max": [.28, 1.31, .28]},
                "animations": [],
            },
        ],
    }
    manifest_path = OUT / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
    print(f"{manifest_path.relative_to(ROOT)}  manifest")
