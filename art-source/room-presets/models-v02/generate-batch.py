"""Resume approved Tripo assets by recorded task IDs; never retry a submission."""
from pathlib import Path
import concurrent.futures, datetime, json, os, subprocess, time

ROOT = Path(__file__).resolve().parents[3]
PACK = Path(__file__).resolve().parent
ENV = {**os.environ, 'NODE_EXTRA_CA_CERTS': '/etc/ssl/cert.pem', 'TRIPO_NO_UPDATE_CHECK': '1'}
ASSETS = json.loads((PACK / 'manifest.json').read_text())['assets']

def run(args, path, timeout=1900):
    with path.open('w') as out, path.with_suffix('.stderr.log').open('w') as err:
        result = subprocess.run(args, cwd=ROOT, env=ENV, stdout=out, stderr=err, timeout=timeout)
    if result.returncode:
        raise RuntimeError(f'{path.name}: exit {result.returncode}; inspect stderr')
    return json.loads(path.read_text())

def task_id(value):
    if isinstance(value, dict):
        for key in ('task_id', 'taskId'):
            if isinstance(value.get(key), str):
                return value[key]
        for child in value.values():
            found = task_id(child)
            if found:
                return found
    elif isinstance(value, list):
        for child in value:
            found = task_id(child)
            if found:
                return found

def generate(asset):
    ident = asset['id']
    image = PACK / 'inputs' / f'{ident}.png'
    request = PACK / f'{ident}.submit.json'
    marker = PACK / f'{ident}.submitting.json'
    output = PACK / 'output' / ident
    try:
        if not request.exists():
            if marker.exists():
                raise RuntimeError('Ambiguous previous submission; inspect CLI history, do not resubmit')
            marker.write_text(json.dumps({'asset': ident, 'started': datetime.datetime.now(datetime.timezone.utc).isoformat()}))
            run(['tripo', 'make', str(image), '--model', 'tripo-p1', '-p', 'face_limit=6000', '-p', 'texture=true', '-p', 'pbr=false', '-p', 'texture_quality=standard', '--name', f'dark-v02-{ident}', '--no-wait', '--no-download', '--yes', '--json', '--no-open'], request, 300)
        result = json.loads(request.read_text())
        task = task_id(result)
        if not task:
            raise RuntimeError('No task ID; inspect saved submission, do not resubmit')
        print(json.dumps({'asset':ident,'taskId':task,'status':'watching'}), flush=True)
        output.mkdir(parents=True, exist_ok=True)
        if not (output / 'model.glb').exists():
            run(['tripo','task','watch',task,'--download','--out',str(output),'--json','--no-open','--timeout','1800'], PACK/f'{ident}.watch.json')
        model = output / 'model.glb'
        if not model.exists():
            raise RuntimeError('Model file not returned')
        report = {'asset':ident,'taskId':task,'status':'downloaded','source':str(model.relative_to(ROOT)),'bytes':model.stat().st_size}
        (PACK/f'{ident}.result.json').write_text(json.dumps(report,indent=2)+'\n')
        print(json.dumps(report),flush=True)
        return report
    except Exception as exc:
        report={'asset':ident,'status':'needs-attention','error':str(exc)}
        (PACK/f'{ident}.error.json').write_text(json.dumps(report,indent=2)+'\n')
        print(json.dumps(report),flush=True)
        return report

if __name__ == '__main__':
    pending = {a['id']: a for a in ASSETS}
    futures = []
    deadline = time.monotonic()+3600
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        while pending and time.monotonic()<deadline:
            ready=[a for a in pending.values() if (PACK/'inputs'/f"{a['id']}.json").exists()]
            for a in ready:
                futures.append(pool.submit(generate,a))
                del pending[a['id']]
            if pending:
                time.sleep(8)
        results=[f.result() for f in futures]
    (PACK/'batch-results.json').write_text(json.dumps({'results':results,'missingInputs':list(pending)},indent=2)+'\n')
