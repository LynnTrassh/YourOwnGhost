"""Rebuild function-sized PCM clips from copied A Gift source WAVs. Requires numpy."""
from pathlib import Path
import wave, json, hashlib
import numpy as np
HERE=Path(__file__).resolve().parent
OUT=HERE.parents[1]/'public/art/audio/foley-v01'
SOURCES=HERE/'sources'
# Original source time, seconds; no whole-recording acceleration/pitch changes.
CUTS=[
 ('door-move','SFX26_DoorOpen_v04b3_source.wav',1.76,.50,'Only while the door angle changes; stop on block, reversal, sealing or completion.'),
 ('door-shut','SFX27_DoorClose_v04a_tail_source.wav',.96,.24,'At actual closed angle only, never on close request.'),
 ('locked-latch','SFX07_LockTurn_v01_source.wav',.89,.18,'One failed locked-door interaction; debounce 250ms.'),
 ('flashlight','SFX03_LightClick_source.wav',0,.12,'Immediately after an accepted flashlight toggle.'),
 ('pickup','SFX01_GenericHandling_v01_source.wav',.10,.28,'Once after successful fuse pickup; not a failed interaction.'),
 ('bed-rise','SFX19_BedRise_v04a_source.wav',.94,.24,'Once after seated-to-standing state change.'),
]
for i,t in enumerate([.14,.89,1.64,2.39],1):
 CUTS.append((f'step-wood-{i}','SFX22_AdultStepsWood_v02_source.wav',t,.32,'One post-collision stride event; round-robin variants; no input-only triggering.'))
for i in range(1,5):
 CUTS.append((f'step-hard-{i}',f'SFX25_MotherStep_{i:02}_source.wav',0,.32,'Hard-surface single footstep candidate; verify floor material and character weight by listening.'))

def read(p):
 with wave.open(str(p),'rb') as w:
  assert w.getsampwidth()==2 and w.getcomptype()=='NONE'
  rate=w.getframerate();data=np.frombuffer(w.readframes(w.getnframes()),dtype='<i2').reshape(-1,w.getnchannels()).mean(axis=1)/32768
 return rate,data

def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()

OUT.mkdir(parents=True,exist_ok=True)
items=[]
for name,source,start,duration,trigger in CUTS:
 p=SOURCES/source;sr,x=read(p)
 cut=x[round(start*sr):round((start+duration)*sr)].copy()
 assert len(cut)==round(duration*sr)
 # Remove residual DC, tame clipping, retain variation (at most +12 dB boost).
 cut-=cut.mean();peak=float(abs(cut).max());gain=min(4, .35/max(peak,1e-8));cut*=gain
 fadein=max(2,round(.002*sr));fadeout=max(2,round(.020*sr))
 cut[:fadein]*=np.linspace(0,1,fadein);cut[-fadeout:]*=np.linspace(1,0,fadeout)
 target=OUT/(name+'.wav')
 pcm=np.round(np.clip(cut,-1,1)*32767).astype('<i2')
 with wave.open(str(target),'wb') as w:
  w.setnchannels(1);w.setsampwidth(2);w.setframerate(sr);w.writeframes(pcm.tobytes())
 items.append(dict(id=name,url='/art/audio/foley-v01/'+target.name,bus='world',authoredDuration=len(cut)/sr,loop=False,
  source='sources/'+source,sourceSHA256=sha(p),sourceStart=start,sourceEnd=round(start+duration,6),gainDB=round(20*np.log10(gain),3),
  peakDB=round(20*np.log10(max(abs(pcm).max()/32768,1e-8)),3),sampleRate=sr,channels=1,sha256=sha(target),trigger=trigger,
  status='trimmed-measured-not-listened-not-wired'))
(HERE/'manifest.json').write_text(json.dumps({'sourceProject':'/Users/lingyan/Documents/GameDev/A_Gift_for_the_living',
 'sourceDirectory':'SourceAssets/Shared/SFX/Candidates/2026-10-05_FullMix_v01/sources','items':items},ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'files':len(items),'bytes':sum((OUT/(i['id']+'.wav')).stat().st_size for i in items),'durations':{i['id']:i['authoredDuration'] for i in items}},indent=2))
