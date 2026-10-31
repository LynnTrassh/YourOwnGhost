"""Submit each approved image once; resume by task ID, never retry submissions."""
from pathlib import Path
import datetime, hashlib, json, os, subprocess, sys

PACK = Path(__file__).resolve().parent
ENV = {**os.environ, 'NODE_EXTRA_CA_CERTS': '/etc/ssl/cert.pem', 'TRIPO_NO_UPDATE_CHECK': '1'}
PROFILE = 'horror-models-secondary'
manifest = json.loads((PACK / 'manifest.json').read_text())

def task_id(obj):
    if isinstance(obj, dict):
        for key in ('task_id', 'taskId'):
            if isinstance(obj.get(key), str): return obj[key]
        for child in obj.values():
            found = task_id(child)
            if found: return found
    if isinstance(obj, list):
        for child in obj:
            found = task_id(child)
            if found: return found

def run(args, path):
    with path.open('w') as out, path.with_suffix('.stderr.log').open('w') as err:
        result = subprocess.run(['tripo', *args, '--profile', PROFILE, '--json', '--no-open'],
                                cwd=PACK, env=ENV, stdout=out, stderr=err, timeout=1900)
    if result.returncode: raise RuntimeError(f'{path.name}: exit {result.returncode}; inspect log, do not resubmit')
    return json.loads(path.read_text())

action = sys.argv[1]
for asset in manifest['assets']:
    ident = asset['id']
    request = PACK / f'{ident}.submit.json'
    marker = PACK / f'{ident}.submitting.json'
    if action == 'submit':
        if manifest.get('generationHold'): raise RuntimeError('User hold is still active')
        source = PACK / asset['input']
        if hashlib.sha256(source.read_bytes()).hexdigest() != asset['inputSHA256']:
            raise RuntimeError('Approved input changed')
        if not request.exists():
            with marker.open('x') as f:
                json.dump({'asset': ident, 'started': datetime.datetime.now(datetime.timezone.utc).isoformat()}, f)
            run(['make', str(source), '--model', 'tripo-p1', '-p', 'face_limit=6000',
                 '-p', 'texture=true', '-p', 'pbr=false', '-p', 'texture_quality=standard',
                 '--name', ident, '--no-wait', '--no-download', '--yes'], request)
    task = task_id(json.loads(request.read_text()))
    if not task: raise RuntimeError('Missing task ID; inspect history, do not resubmit')
    print(json.dumps({'asset': ident, 'taskId': task, 'action': action}), flush=True)
    if action == 'download':
        output = PACK / 'output' / ident
        output.mkdir(parents=True, exist_ok=True)
        if not (output / 'model.glb').exists():
            run(['task', 'watch', task, '--download', '--out', str(output), '--timeout', '1800'],
                PACK / f'{ident}.watch.json')
        print(json.dumps({'asset': ident, 'bytes': (output / 'model.glb').stat().st_size}), flush=True)
