from pathlib import Path
import json,re
pack=Path(__file__).resolve().parent
source=Path('src/art/themed-room-library.js').read_text()
rooms=[{'id':f'{t}-{n}','theme':t,'name':name} for t,n,name in re.findall(r"room\('([^']+)','([^']+)','([^']+)'",source)]
# Per-room supporting props, in addition to dedicated models with roomIds.
extras={
'hospital-01':['prop-rotary-phone-v01','scene-medicine-bottles-v03'],
'hospital-02':['scene-wheelchair-v03','scene-calendar-board-v03'],
'hospital-03':['scene-hospital-bed-v03','prop-iv-stand-v01','scene-pillow-pair-v03'],
'hospital-04':['scene-stool-metal-v03','prop-medical-cart-v01'],
'hospital-05':['prop-medicine-tray-v01','scene-medicine-bottles-v03'],
'hospital-06':['prop-hanging-coat-v01','prop-tea-tray-v01','scene-folded-linen-v03'],
'hospital-07':['prop-archive-boxes-v01','prop-paper-wave-v01','scene-typewriter-v03'],
'hospital-08':['prop-suitcase-v01','prop-shoes-pair-v01','scene-clothes-hanging-dress-v03'],
'park-01':['prop-wall-clock-v01','prop-rotary-phone-v01'],
'park-02':['scene-red-drapery-v03'],
'park-03':['scene-toy-blocks-v03','prop-toy-train-v01','prop-toy-bench-v01'],
'park-04':['scene-teddy-bear-v03','scene-tricycle-v03','scene-pram-v03'],
'park-05':['prop-clothes-rack-v01','scene-clothes-hanging-dress-v03','prop-felt-hat-v01'],
'park-06':['scene-teddy-bear-v03','prop-rocking-horse-v01'],
'park-07':['prop-wood-radio-v01','scene-electric-fan-v03','scene-coat-raincoat-v03'],
'park-08':['scene-red-drapery-v03','prop-hanging-drape-v01'],
'office-01':['prop-rotary-phone-v01','scene-key-tray-v03'],
'office-02':['prop-computer-desk-v01','prop-cable-wall-v01','prop-cable-ceiling-v01'],
'office-03':['prop-tea-tray-v01','scene-reel-projector-v03'],
'office-04':['prop-archive-stack-v01','prop-archive-boxes-v01'],
'office-05':['scene-writing-bureau-v03','scene-desk-organizer-v03','prop-rotary-phone-v01'],
'office-06':['scene-typewriter-v03','prop-paper-wave-v01'],
'office-07':['prop-hanging-coat-v01','prop-suitcase-v01','scene-desk-organizer-v03'],
'office-08':['prop-books-stack-v01','prop-archive-boxes-v01','scene-calendar-board-v03'],
'home-01':['prop-clothes-rack-v01','prop-shoes-pair-v01','scene-pillow-pair-v03'],
'home-02':['prop-tv-console-v01','scene-sofa-linen-v03','scene-record-player-v03'],
'home-03':['prop-toy-bench-v01','scene-teddy-bear-v03','prop-hanging-mobile-v01'],
'home-04':['scene-typewriter-v03','scene-desk-organizer-v03','prop-books-stack-v01'],
'home-05':['scene-rocking-chair-v03','scene-sewing-machine-v03','scene-music-box-v03'],
'home-06':['prop-tea-tray-v01','scene-sideboard-v03'],
'home-07':['prop-cardboard-box-v01','prop-suitcase-v01','prop-covered-shape-v01'],
'home-08':['scene-clothes-hanging-dress-v03','prop-hanging-drape-v01','scene-pillow-pair-v03'],
'hotel-01':['prop-rotary-phone-v01','prop-pendulum-clock-v01'],
'hotel-02':['prop-suitcase-v01','prop-hanging-coat-v01'],
'hotel-03':['scene-pillow-pair-v03','scene-folded-linen-v03'],
'hotel-04':['scene-sofa-linen-v03','prop-tea-tray-v01','scene-red-drapery-v03'],
'hotel-05':['scene-laundry-basket-v03','scene-folded-linen-v03','scene-mop-bucket-v03'],
'hotel-06':['prop-suitcase-v01','prop-felt-hat-v01','scene-umbrella-stand-v03'],
'hotel-07':['scene-armchair-wingback-v03','scene-sideboard-v03','prop-tea-cart-v01'],
'hotel-08':['prop-crt-tv-v01','prop-clothes-rack-v01','scene-wall-coat-pegs-v03'],
'ritual-01':['scene-incense-burner-v03','prop-candlesticks-v01'],
'ritual-02':['scene-red-drapery-v03','scene-ritual-bell-v03'],
'ritual-03':['scene-candelabrum-v03','prop-dried-flowers-v01'],
'ritual-04':['scene-incense-burner-v03','scene-ritual-bell-v03'],
'ritual-05':['scene-chair-spindle-v03','scene-chair-upholstered-v03','scene-rag-doll-intact-v03'],
'ritual-06':['prop-candle-altar-v01','prop-portrait-frame-v01'],
'ritual-07':['scene-red-drapery-v03','scene-candelabrum-v03'],
'ritual-08':['prop-dried-flowers-v01','prop-candlesticks-v01']}
m=json.loads((pack/'manifest.json').read_text());assets={}
for folder in ['room-props-tripo-v02','scene-assets-tripo-v03','theme-specific-tripo-v05']:
 for a in json.loads((pack.parent/folder/'manifest.json').read_text())['assets']:assets[a['id']]=a
for room in rooms:
 room['requiredModels']=list(dict.fromkeys([a['id'] for a in m['assets'] if room['id'] in a.get('roomIds',[])]+extras.get(room['id'],[])))
 room['integrationStatus']='awaiting-model-QA-and-room-owner-integration'
 assert room['requiredModels'] and all(a in assets for a in room['requiredModels'])
result={'source':'src/art/themed-room-library.js; user-confirmed six themes/eight rooms from 设计三间恐怖房间构图','rooms':rooms,'ending':{'intent':'一个人在床上睡觉','assetId':'theme-sleeping-person-v05','integrationStatus':'awaiting-model-and-ending-owner'}}
(pack/'room-coverage.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
lines=['# 六主题48房：对应模型补缺与交接','','根据用户最新要求与“设计三间恐怖房间构图”的六主题确认制作。所有条目是 Tripo 生产资产，逐件验收后注册；本清单不等于已放入房间。新增37件预计1850积分，运行副本预计约130–170MB，源文件单独保留。','','主题布局文件由原对话维护，本任务不覆盖 `themed-room-library.js` / `themed-room-stage.js`。交接时使用真实包围盒重新排位置，不把大件挤入原通用家具槽。所有模型原点为地面中心，统一正面 −Z；该主题样板约定模型面向 +Z，接入需显式旋转180°，避免反向。','','|房间|指定模型|','|---|---|']
for r in rooms:lines.append('|'+r['id']+' '+r['name']+'|'+'、'.join(assets[x]['name'] for x in r['requiredModels'])+'|')
lines+=['','## 终点睡姿人物','','独立人物与薄被组合，闭眼、头枕枕头；不重复生成床架。实际长度目标1.78m，沿床纵轴落在真实床垫支撑面，头端对准床头。角色、枕头、被褥和床垫接触需实机检查；尚未修改终点逻辑。','','## 接入注意','','- 领奖区域必须有真实台座、讲台、奖杯，不能继续用文件桌/柜代替。','- 公司、医院、旅馆接待台分开制作，形制与用途对应。','- 新电脑替换必须保留屏幕独立 `glass` 材质接口，兼容原对话播放器。','- 生成失败/语义不符/多出悬浮组件的模型不发布；已发现并隔离摆钟初版与皮沙发初版。','- 运行中模型表、几何与材质审查记录分别位于各批次 manifest/review；未完成接触检查的不标记正式验收。']
Path('docs/art/theme-model-coverage-v05.md').write_text('\n'.join(lines)+'\n')
print('Mapped',len(rooms),'rooms and ending')
