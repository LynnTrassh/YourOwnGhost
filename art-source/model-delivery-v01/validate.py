"""Validate the frozen delivery, without requiring supplier files or credentials."""
from pathlib import Path
import hashlib
import json
import math
import struct

ROOT = Path(__file__).resolve().parents[2]
PACK = Path(__file__).resolve().parent
manifest = json.loads((PACK / 'manifest.json').read_text())
formats = {5120: ('b', 1), 5121: ('B', 1), 5122: ('h', 2),
           5123: ('H', 2), 5125: ('I', 4), 5126: ('f', 4)}
components = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}
report = []
seen = set()
for model in manifest['models']:
    assert model['id'] not in seen
    seen.add(model['id'])
    path = ROOT / ('public' + model['runtimeUrl'])
    data = path.read_bytes()
    assert struct.unpack_from('<III', data) == (0x46546C67, 2, len(data)), path
    assert hashlib.sha256(data).hexdigest() == model['sha256'], path
    assert len(data) == model['bytes']
    chunks = []
    cursor = 12
    while cursor < len(data):
        length, kind = struct.unpack_from('<II', data, cursor)
        assert length % 4 == 0 and cursor + 8 + length <= len(data), path
        chunks.append((kind, data[cursor+8:cursor+8+length]))
        cursor += 8 + length
    assert cursor == len(data) and chunks[0][0] == 0x4E4F534A
    gltf = json.loads(chunks[0][1])
    binary = next(c for kind, c in chunks if kind == 0x004E4942)
    assert len(gltf['buffers']) == 1 and not gltf['buffers'][0].get('uri')
    assert 0 <= len(binary) - gltf['buffers'][0]['byteLength'] <= 3
    for view in gltf['bufferViews']:
        assert view.get('buffer', 0) == 0
        assert 0 <= view.get('byteOffset', 0) <= len(binary) - view['byteLength']

    def values(index):
        a = gltf['accessors'][index]
        assert 'sparse' not in a
        view = gltf['bufferViews'][a['bufferView']]
        fmt, width = formats[a['componentType']]
        count = components[a['type']]
        stride = view.get('byteStride', width * count)
        start = a.get('byteOffset', 0)
        assert a['count'] > 0
        assert start + (a['count']-1)*stride + width*count <= view['byteLength']
        offset = view.get('byteOffset', 0) + start
        return [struct.unpack_from('<' + fmt*count, binary, offset+i*stride)
                for i in range(a['count'])]

    triangles = 0
    vertices = 0
    for mesh in gltf['meshes']:
        for primitive in mesh['primitives']:
            assert primitive.get('mode', 4) == 4
            positions = values(primitive['attributes']['POSITION'])
            vertices += len(positions)
            assert all(math.isfinite(v) for row in positions for v in row)
            for name in ('NORMAL', 'TEXCOORD_0'):
                attribute = values(primitive['attributes'][name])
                assert len(attribute) == len(positions)
                assert all(math.isfinite(v) for row in attribute for v in row)
            indices = values(primitive['indices']) if 'indices' in primitive else [(i,) for i in range(len(positions))]
            assert len(indices) % 3 == 0
            assert all(0 <= row[0] < len(positions) for row in indices)
            triangles += len(indices)//3
            material = gltf['materials'][primitive['material']]
            texture = material['pbrMetallicRoughness']['baseColorTexture']['index']
            assert 0 <= gltf['textures'][texture]['source'] < len(gltf['images'])
    for image in gltf['images']:
        assert not image.get('uri')
        view = gltf['bufferViews'][image['bufferView']]
        offset = view.get('byteOffset', 0)
        payload = binary[offset:offset+view['byteLength']]
        assert (image['mimeType'] == 'image/png' and payload.startswith(b'\x89PNG\r\n\x1a\n')) or (image['mimeType'] == 'image/jpeg' and payload.startswith(b'\xff\xd8'))
    bounds = model['inspection']['runtimeBounds']
    assert all(math.isfinite(v) for side in ('min', 'max', 'size') for v in bounds[side])
    assert abs(bounds['min'][1]) < 1e-5
    assert all(v > 0 for v in bounds['size'])
    assert triangles == model['inspection']['triangles']
    report.append({'id': model['id'], 'result': 'pass', 'triangles': triangles,
                   'vertices': vertices, 'embeddedImages': len(gltf['images']),
                   'bytes': len(data), 'sha256': model['sha256']})
assert not seen.intersection(x['id'] for x in manifest['excluded'])
result = {'models': len(report), 'bytes': sum(x['bytes'] for x in report),
          'validation': 'GLB structure, buffer bounds, finite attributes, indices, embedded textures, hashes, metadata; not visual acceptance',
          'results': report}
(PACK / 'validation.json').write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n')
print(f"Validated {len(report)} textured GLBs, {result['bytes']} bytes")
