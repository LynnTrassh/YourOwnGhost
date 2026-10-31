"""Reconcile only unsubmitted requests; preserve all existing task identities."""
from pathlib import Path
import json
P=Path(__file__).resolve().parent
path=P/'manifest.json'; old=json.loads(path.read_text())
backup=P/'manifest-before-functional-handoff.json'
if backup.exists():raise SystemExit('Already reconciled; inspect current state rather than replay')
backup.write_text(json.dumps(old,ensure_ascii=False,indent=2)+'\n')
assets={a['id']:a for a in old['assets']}
specs=json.loads(Path('art-source/themed-room-showcase/handoff/missing-models.json').read_text())['newAssetGroups']
style=' Original realistic old institutional interior horror game prop. Detailed textured PBR materials, physically plausible construction, restrained desaturated colours, moderate believable wear. Complete isolated object, no person, room, floor plane, lighting effects, blood, text, logo, cartoon or clay render.'
match={'stage-deck':'theatre-stage','lectern':'ceremony-lectern','winners-rostrum':'award-podium','trophy':'trophy-cup','service-counter':'ticket-counter','ticket-dispenser':'ticket-register','waiting-bench':'waiting-bench','exam-lamp':'exam-lamp','mail-sorter':'mail-sorting-rack','conference-table':'conference-table','office-chair':'office-chair','hotel-key-rack':'hotel-key-rack','luggage-trolley':'luggage-trolley','linen-trolley':'linen-cart','offering-vessels':'offering-bowl','prize-pegboard':'prize-display','stage-masks':'performer-mask','desk-bell':'hotel-service-bell'}
prompts={
 'stage-deck':'A single rectangular modular raised stage platform, 2.5m wide, 2m deep, only 0.45m high. Strong shallow wooden box construction, aged dark oak floorboards on top, worn timber front fascia and four straight vertical sides. Level flat usable top, straight corners and edges for joining identical modules. No steps, stairs, rails, podium, desk, curtains or furniture. Broad low flat platform, not a tall box.',
 'stage-stairs':'One freestanding set of THREE broad wooden stage access steps. Overall width 1.2m, depth 0.9m, height 0.45m. Exactly three flat treads each 0.30m deep and three equal 0.15m risers. Dark aged oak matching a theatre platform, thick solid timber closed risers, straight side cheeks. The top step is at the rear. No platform, handrails, people or surrounding floor.',
 'waiting-bench':'Exactly three connected hospital waiting seats on a single horizontal steel beam, overall 1.8m wide, 0.86m high, 0.62m deep. Three distinct old olive vinyl seat cushions and backrests, two shared steel floor supports, complete structural underside. Worn upholstery and tarnished steel, believable three-person bench. No loose dining chairs or occupants.',
 'exam-lamp':'One vintage floor standing medical examination lamp, 1.85m tall, compact 0.7m footprint. Heavy five-wheel base, vertical steel column, clearly separated articulated joints and folded arm, circular shallow off-white enamel reflector head tilted toward a patient below. Distinct inner reflector and light lens, legible joints suitable for later mesh segmentation. Complete wheeled base. No examination bed, person or light beams.',
 'mail-sorter':'A freestanding old mail sorting pigeonhole cabinet, 1.8m wide, 1.75m high, 0.45m deep. Many clearly OPEN rectangular envelope-size cubbies, thin wooden dividers, lower sorting shelf and sturdy base. Warm worn oak, blank brass label holders. Empty usable cubbies, no books or drawers, not a bookshelf. Finished visible backside.',
 'conference-table':'One long rectangular old conference table, 3.2m wide, 1.15m deep, 0.76m high. Broad clean walnut tabletop, bevelled edge, two inset trestle supports with ample knee clearance on both long sides. Realistic polished wear. Empty tabletop, no papers, books, chairs or equipment. Entire table including underside.',
 'hotel-key-rack':'An old wall mounted hotel key cubby rack, 1.2m wide, 0.85m high, 0.16m deep. Walnut grid with many shallow OPEN key compartments, brass hooks visible inside, blank rectangular replaceable room-number plaques above cubbies. Flat finished back, no wall or reception counter. Do not generate unreadable numbers.',
 'luggage-trolley':'An EMPTY vintage hotel luggage trolley, arched tarnished brass tubular frame and overhead hanging rail, burgundy carpeted low platform, four complete caster wheels. Overall 0.85m wide, 1.75m high, 1.1m deep. Open clear space above platform. NO suitcases, bags, luggage, clothes, people or any cargo. Real load bearing tubes and wheel attachments.',
 'linen-trolley':'An EMPTY old hotel housekeeping linen trolley, 0.95m wide, 1.05m high, 0.58m deep. Worn tubular steel wheeled frame, two empty open shelves on one side and an empty heavy beige canvas laundry bag on the other. Separate visible wheels and fabric texture. No sheets, towels, folded linen, bottles or loose laundry; those are separate assets.',
 'prize-pegboard':'An EMPTY freestanding vintage amusement prize pegboard, 1.6m wide, 1.8m high, 0.25m deep. Faded cream perforated wood board in worn red wooden frame, orderly metal hooks protruding clearly from the front, stable short base feet. NO prizes, stuffed animals, toys, shelves of objects or writing. Blank usable mounting surface.',
 'ticket-dispenser':'One small vintage mechanical paper ticket dispenser, 0.42m wide, 0.48m high, 0.32m deep. Metal housing with a clearly visible paper roll on a spindle, crank handle, toothed cutting edge and narrow ticket exit slot. Separate paper and tarnished metal surfaces. No cash register keyboard, counter, text or logos.',
 'turnstile':'One vintage waist-high three-arm tripod ticket turnstile, 0.9m wide, 1m high, 1.2m deep. Worn enamel cabinet and a separate cylindrical pivot hub with THREE straight stainless-steel radial arms, one horizontal arm. Mechanically plausible hub, complete floor mounting feet. Static stand-alone machine, no gates, crowd or scene.',
 'ticket-window':'One standalone old ticket window partition panel, 1.6m wide, 1.2m high, only 0.16m deep. Aged narrow timber frame, clear glass upper pane, genuine open semicircular speak-through aperture and small lower pass-through ticket opening. View through the openings. No wall, booth, counter, signage or person. Distinguishable glass and wood surfaces.',
 'xray-viewer':'One shallow vintage wall-mounted medical X-ray viewing lightbox, 0.85m wide, 0.65m high, 0.12m deep. Off-white worn enamel frame, separate milky rectangular diffuser panel with one monochrome chest-film silhouette held by top clips, simple switch at lower edge. No patient details, writing, surrounding wall or floor.',
 'office-divider':'One old office workstation partition, 1.4m wide, 1.3m high, 0.08m thick panel with two small stabilising feet. Dusty muted olive woven fabric inset in slender worn grey steel frame. Finished back and front. No desk, office chair, drawers or room.',
 'place-setting':'One complete vintage porcelain dining place setting. Four separate NON-TOUCHING items arranged with small visible gaps: one plain ivory dinner plate, one small soup bowl, one handled drinking cup, one fork-and-spoon pair side by side. Restrained worn ivory glaze and tarnished metal. Overall arrangement 0.42m wide, 0.32m deep, tallest cup 0.14m. No tray, table, food or tea pot. Independent complete undersides.',
 'offering-vessels':'Three separated NON-TOUCHING offering objects with visible gaps: one shallow tarnished brass tray, one small glazed ceramic offering bowl, and one small cluster of wax-like fruit offerings. Muted old brass and dark red-brown ceramic. Whole arrangement about 0.55m wide, 0.35m deep, 0.30m tall. No incense burner, bell, candles, statues or table. Complete usable containers, not fused together.',
 'ritual-tablet':'One original small ritual memorial tablet on a stable wooden pedestal. Overall 0.30m wide, 0.65m high, 0.12m deep. Dark worn wood, narrow vertical board with simple carved abstract geometric relief on the front and a plain finished back. Clearly readable front-back difference. No actual text, deity, borrowed icon, candles or table.',
 'microphone-stand':'One vintage microphone on a slender straight adjustable metal stand and heavy round floor base, total 1.5m high and 0.4m base diameter. Old silver ribbed capsule microphone, visible swivel mounting joint, tarnished steel tube and dull black base. Clear boundaries between head, stem, base for later segmentation. No cable, person or lectern.',
 'stage-masks':'ONE wearable original theatre mask, melancholy adult expression with closed mouth, hollow eye holes, thin painted ivory papier-mache shell, muted brown ageing, short fabric tying straps. Full concave interior visible from the side, genuine wearable mask not a solid head. Height 0.30m, width 0.22m. No bust, stand or second mask.',
 'meeting-board':'One old wall mounted conference whiteboard, 1.8m wide, 1.1m high, 0.10m deep. Blank lightly stained off-white board panel, worn aluminium border, narrow empty marker ledge below, finished flat back. No writing, graphs, calendar, company logo or wall.',
 'desk-bell':'One classic small hotel service desk bell, 0.14m wide and deep, 0.10m high. Tarnished brass dome on a dark round base with distinct central metal push button. Complete stable bottom, no counter, sign or hand.'
}
removed={
 'theme-dining-table-v05':['scene-table-round-v03'],
 'theme-privacy-curtain-v05':['prop-folding-screen-v01'],
 'theme-ritual-vessel-set-v05':['scene-incense-burner-v03','scene-ritual-bell-v03','scene-candelabrum-v03','theme-offering-bowl-v05']}
for ident in removed:
 assert not (P/f'{ident}.submit.json').exists(),ident
 assets.pop(ident,None)
crosswalk=[]
for s in specs:
 code=s['code']
 if code in ('stage-proscenium','craft-tools'):continue
 ident='theme-'+match.get(code,code)+'-v05'
 if ident not in assets:assets[ident]={'id':ident,'name':s['name'],'theme':s['roomIds'][0].split('-')[0],'runtimeIntegrated':False}
 a=assets[ident]
 a.update(specificationId=s['id'],requestedBoundsWHD=s['dimensionsMetresWHD'],deliverableParts=s['deliverableParts'],constructionNotes=s['constructionNotes'],priority=s['priority'])
 if not (P/f'{ident}.submit.json').exists():
  a.update(roomIds=s['roomIds'],targetHeight=s['dimensionsMetresWHD'][1])
  if code in prompts:a['prompt']=prompts[code]+style
 crosswalk.append({'specificationId':s['id'],'assetIds':[ident],'status':'existing-task-needs-spec-review' if (P/f'{ident}.submit.json').exists() else 'queued','notes':s['deliverableParts']})
def add(ident,name,theme,whd,rooms,prompt,spec):
 assert ident not in assets
 assets[ident]={'id':ident,'name':name,'theme':theme,'targetHeight':whd[1],'requestedBoundsWHD':whd,'roomIds':rooms,'prompt':prompt+style,'specificationId':spec,'priority':'P1','runtimeIntegrated':False}
add('theme-stage-pillar-v05','舞台台口立柱','park',[.45,2.7,.35],['park-02','park-08'],'One slender straight old theatre proscenium upright column, 2.7m tall, 0.45m wide, 0.35m deep. Worn dark red painted timber, modest gold carved edging, rectangular stable foot and flat top connection. A COMPLETE single pillar, no arch, lintel, curtain or second pillar. Symmetric design reusable on either side.','theme-stage-proscenium-v01')
add('theme-stage-lintel-v05','舞台台口上楣','park',[5,.35,.35],['park-02','park-08'],'One long straight horizontal wooden proscenium lintel beam, 5m long, 0.35m high and deep. Worn dark red painted timber matching theatre pillars, restrained faded gold decorative front edging, flat ends and back for attachment. Single horizontal beam only, no pillars, curtains or arch opening.','theme-stage-proscenium-v01')
crosswalk.append({'specificationId':'theme-stage-proscenium-v01','assetIds':['theme-stage-pillar-v05','theme-stage-lintel-v05'],'status':'queued','notes':'两侧复用立柱，独立上楣；组合高度与净宽需验收'})
craft=[('paper','褪色手工彩纸',[.28,.025,.22],'A small loose stack of faded muted red, ochre, green and blue coloured craft paper sheets, staggered corners, very thin individual paper layers, slightly curled edges. No text, books or other supplies.'),('pencil-cup','手工彩笔筒',[.10,.18,.10],'One small worn cylindrical tin pencil cup holding six coloured pencils and two short paintbrushes, distinguishable wood shafts and bristles, muted ochre tin. No other objects.'),('paint-box','旧水彩颜料盒',[.24,.035,.15],'One open small old metal watercolour paint box, hinged lid opened flat beside a tray containing eight separate faded pigment pans, visible brush groove. Detailed pigment stains inside, dull dark metal outside. No labels or other supplies.')]
ids=[]
for suffix,name,size,prompt in craft:
 ident='theme-craft-'+suffix+'-v05';add(ident,name,'park',size,['park-03'],prompt,'theme-craft-tools-v01');ids.append(ident)
crosswalk.append({'specificationId':'theme-craft-tools-v01','assetIds':ids,'status':'queued','notes':'彩纸、笔筒、颜料盒分别生成，不带桌'})
add('theme-performer-mask-smile-v05','后台浅笑面具','park',[.22,.30,.13],['park-05'],'ONE original wearable theatre mask, subtle unsettling small closed-mouth smile, hollow eye holes, thin faded terra-cotta painted papier-mache shell, fabric tying straps. Complete hollow concave back, not a solid head. No bust, stand, second mask or character costume.','theme-stage-masks-v01')
next(x for x in crosswalk if x['specificationId']=='theme-stage-masks-v01')['assetIds'].append('theme-performer-mask-smile-v05')
first=['theme-theatre-stage-v05','theme-stage-stairs-v05','theme-waiting-bench-v05','theme-exam-lamp-v05','theme-mail-sorting-rack-v05','theme-conference-table-v05','theme-hotel-key-rack-v05','theme-luggage-trolley-v05']
submitted=[a for a in assets.values() if (P/f"{a['id']}.submit.json").exists()]
rest=[a for a in assets.values() if a not in submitted and a['id'] not in first]
ordered=submitted+[assets[i] for i in first]+rest
old['assets']=ordered;old['generationHold']=False;old.pop('holdReason',None)
old['estimatedCredits']=len(ordered)*50;old['remainingEstimatedCredits']=sum(not (P/f"{a['id']}.submit.json").exists() for a in ordered)*50
old['reconciliation']='2026-10-31 latest planning handoff; keep existing tasks, only alter unsubmitted requests, separate stage and stairs, empty cargo props, reuse known duplicates.'
path.write_text(json.dumps(old,ensure_ascii=False,indent=2)+'\n')
(P/'functional-crosswalk.json').write_text(json.dumps({'groups':crosswalk,'reusedInsteadOfGeneration':removed,'pendingSpecReview':['theme-award-podium-v05','theme-ceremony-lectern-v05','theme-trophy-cup-v05','theme-ticket-counter-v05'],'optionalAmusementBatch':'not-added'},ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'assets':len(ordered),'alreadySubmitted':len(submitted),'newRequests':len(ordered)-len(submitted),'remainingEstimatedCredits':old['remainingEstimatedCredits'],'groups':len(crosswalk)},ensure_ascii=False))
