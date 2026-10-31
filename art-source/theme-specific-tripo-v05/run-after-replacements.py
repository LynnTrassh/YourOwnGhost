from pathlib import Path
import json,subprocess,sys,time
pack=Path(__file__).resolve().parent
original=pack.parent/'room-props-tripo-v02'
assets=json.loads((original/'manifest.json').read_text())['assets']
print('Waiting for the current P1 replacement queue to release its four slots.',flush=True)
while not all((original/'output'/a['id']/'model.glb').exists() for a in assets):
 time.sleep(15)
print('P1 replacement queue finished; starting room-specific models.',flush=True)
raise SystemExit(subprocess.run([sys.executable,str(pack/'run-batches.py')]).returncode)
