import json,pathlib,collections
root=pathlib.Path(__file__).resolve().parents[3];out=root/'art-source/themed-room-showcase/handoff'
assets=[]
def item(code,name,priority,size,rooms,purpose,parts,notes):
    assets.append(dict(id='theme-'+code+'-v01',code=code,name=name,priority=priority,dimensionsMetresWHD=size,roomIds=rooms.split(),purpose=purpose,deliverableParts=parts,constructionNotes=notes,status='missing-new-request-not-submitted'))
item('stage-deck','模块化主席台／舞台台体','P0',[2.5,.45,2.0],'park-02 park-08','让领奖区高于观众区，建立明确前后与主次。','直段台体一件；端封板可独立；相同模块可拼成5米或7.5米宽。','旧木台面、包边、磨损前裙板；不是奖品柜或供桌。不得把观众椅、灯和背景烘焙成整屋模型。')
item('stage-stairs','主席台侧阶','P0',[1.2,.45,.9],'park-02 park-08','形成可信的登台路径。','三级阶梯一件，每级高.15米、深.30米；左右侧共用。','单独原点、包围盒与踩踏面；正式导航需要程序方接入高差，不能声称原导航自动支持。')
item('lectern','颁奖／讲话讲台','P0',[.65,1.12,.5],'park-02 office-03','提供主持人站位和可读的讲话朝向。','斜面台板、支柱/柜身、底座；独立麦克风插座。','前面朝+Z，讲者站在-Z侧；旧木或褪色漆面；桌子、文件柜不能冒充。')
item('winners-rostrum','一二三名领奖墩','P0',[2.7,.6,.85],'park-02','颁奖空间的核心轮廓，区别演讲厅。','三件独立墩：每件宽.9深.85；高度.4/.6/.3，中央最高；组合宽2.7。','正面留名次标牌区域；数字后加可读贴图，避免生成乱码；这是台上的子物件，与整片主席台分别交付。')
item('trophy','旧奖杯','P0',[.24,.45,.18],'park-02 park-06','明确这里奖励的是奖品，而非普通储物柜。','一件主奖杯；可选低矮杯型后续扩展。','金属杯体与木底座分材质，适度氧化；不带真实赛事、品牌或IP标志；可站稳在领奖墩/陈列台。')
item('turnstile','游乐场三杆检票闸机','P1',[.9,1.0,1.2],'park-01','建立检票与排队动线。','箱体与转杆分节点，保留轴心；先交静态模型。','实际通行宽度单独标明；转杆不可封死唯一入口；互动旋转由程序接入。')
item('service-counter','服务柜台模块','P0',[2.0,1.05,.7],'park-01 office-01 hotel-01 hospital-01','把服务人员区与访客区分开，区别普通书桌。','直段柜台一件；内侧低工作台；可拼接。','前面+Z完整挡板，背面-Z工作面；木质基底与独立饰面材质，供医院/公司/旅馆分别配置；不要求为每主题重做几何。')
item('ticket-window','售票窗口框与开口隔断','P1',[1.6,1.2,.16],'park-01','售票柜台上方形成小窗口、递票口和玻璃隔断。','窗口框、玻璃、下方递票口独立材质/节点。','底部接柜台约1.05米；总高约2.25米；开口真实，不能是一块贴图墙；墙体与门洞由房间模块安排。')
item('ticket-dispenser','机械票券机／票卷座','P1',[.42,.48,.32],'park-01','桌面局部足以识别售票功能。','单件；票卷、出票口可见。','纸卷与机身分材质；不与柜台合并；票面图案原创且不依赖细小乱码。')
item('stage-proscenium','舞台台口框','P1',[5.0,2.7,.35],'park-02 park-08','让舞台拥有台口、侧翼与前后层次。','左右柱与上楣分三件；净宽至少3.6米；布幕复用在制红绒布幔。','整体高度须低于3米天花；不能生成5米高剧院模型再压扁；现有窗帘不等于完整台口。')
item('waiting-bench','医院三联候诊椅','P0',[1.8,.86,.62],'hospital-02 hospital-08','长排连椅的轮廓识别医院候诊，替代零散餐椅。','三联椅一件，座面、横梁、椅脚完整。','旧金属与褪色皮/塑料垫；单座宽约.5；不附人物；和现有木长凳不是同一种功能轮廓。')
item('exam-lamp','落地关节检查灯','P0',[.7,1.85,.7],'hospital-04','检查床旁的定向灯头明确诊疗用途。','底座、立杆、关节臂、灯头分节点；交一份收拢姿态。','实际伸展包围盒另列；灯罩内面可设独立发光材质，光源由程序绑定；现有家用落地灯不能替代。')
item('xray-viewer','壁挂X光观片箱','P1',[.85,.65,.12],'hospital-04 hospital-01','墙面医疗设备形成辅助辨识。','灯箱一件，胶片面独立材质。','只做原创无患者信息图案；不内置闪烁和音效；安装底高约1.35米。')
item('mail-sorter','邮件分拣格柜','P0',[1.8,1.75,.45],'office-06','密集信件格与分拣面明确收发登记功能。','格柜本体；少量信封/包裹可分离。','不能用书柜或普通抽屉柜替代；格口尺度容纳信封；标签留空由项目补文字。')
item('conference-table','会议长桌','P0',[3.2,.76,1.15],'office-03','容纳两侧多人座位，建立会议轴线。','独立长桌；桌面干净，勿自带书纸。','底部可容纳膝部和椅子；现有短文件桌与在制圆餐桌都不等于会议长桌。')
item('office-chair','旧式办公转椅','P1',[.6,1.02,.6],'office-02 office-03 office-05','区分办公座位与家用餐椅。','带可辨认升降/旋转底座的旧办公椅。','先静态；不要电竞椅、未来风或亮塑料；避免与在制木餐椅/软垫餐椅重复命名。')
item('office-divider','工位低隔断模块','P1',[1.4,1.3,.08],'office-02','形成工位单元和视线遮挡，区别书房。','直隔断与落地脚；同一模型重复组合。','布面或磨砂玻璃旧框；不得默默穿过桌面/堵通道；现有医疗屏风不直接替代。')
item('hotel-key-rack','旅馆钥匙格架','P0',[1.2,.85,.16],'hotel-01','墙面号码格与钥匙钩直接识别旅馆前台。','壁挂格架一件；少量钥匙可选独立节点。','号码板留可替换材质；在制钥匙托盘只是桌面小物，不能替代整面格架。')
item('luggage-trolley','旅馆行李推车','P0',[.85,1.75,1.1],'hotel-06 hotel-01','让行李室出现搬运设备及行李组合。','空车一件；上杆、平台、轮子完整；行李箱复用在制模型。','不可把箱子烘焙在整车上；需留转弯和停放空间；医疗推架不直接冒充。')
item('linen-trolley','布草分拣车','P1',[.95,1.05,.58],'hotel-05','布草间需要干净折叠布与待洗布的不同收纳区。','车架及布袋/分层架；床单独立复用在制模型。','旧金属车与厚帆布袋，轮子落地；不重做已有折叠床单/洗衣篮。')
item('place-setting','家庭餐具一人位','P1',[.42,.14,.32],'home-06','让餐桌成为吃饭空间，区别办公文件桌。','盘碗杯与餐具可分拆；组合一份一人位。','瓷面旧但不过度破损；在制茶具托盘不等于完整用餐摆设；桌子复用在制圆餐桌。')
item('offering-vessels','供奉容器与供品组','P1',[.55,.3,.35],'ritual-01 ritual-03 ritual-04 ritual-06','使供桌有明确供奉行为，区别空餐桌。','浅盘、供碗、少量原创供品独立件。','材质克制，非血肉堆；香炉/铜铃/烛台均已有制作计划，不重复制作。')
item('ritual-tablet','原创祭祀牌板','P1',[.3,.65,.12],'ritual-02 ritual-04 ritual-08','给神柜、双像对视和背向阵列明确面向。','有独立底座的牌板一件；正反面明显。','原创抽象符号，别照搬IP或真实文字；可与在制石膏人像择一使用，非所有房间必放。')
item('prize-pegboard','游乐场奖品挂板','P1',[1.6,1.8,.25],'park-02 park-06','挂列奖品形成摊位/奖品区识别，不只是住宅展示柜。','挂板与挂钩一件；奖品单独挂载。','复用在制泰迪熊/布偶/玩具车；不再生成整柜同质玩具；挂点坐标写入交接。')
item('microphone-stand','旧麦克风与立架','P1',[.4,1.5,.4],'park-02 park-08 office-03','补讲话/演出站位，作为讲台旁辅助物。','麦克风、立杆与底座，可分拆。','电缆单独可选；已有线束计划不重复；金属磨损，不附人。')
item('stage-masks','后台演出面具组','P1',[.55,.35,.2],'park-05','让化妆间具备演员工作痕迹。','两至三件原创面具各自导出；可挂可置台。','不是随意鬼脸贴图；背面有佩戴结构；现有普通衣帽和在制小丑威胁不是此工作道具。')
item('craft-tools','儿童手工材料组','P1',[.6,.18,.4],'park-03','把空小桌转成真实手工工作台。','彩纸、笔筒、颜料盒三件；避免带桌生成。','褪色低饱和、可分散；仅一组局部，不铺满桌；现有散页纸堆不直接代替。')
item('meeting-board','会议展示板','P1',[1.8,1.1,.1],'office-03 office-07','作为会议桌的共同注视面。','壁挂软木/白板一件；空白可替换板面。','标签与文稿由项目后加；不含真实公司信息；与在制日历板用途不同。')
item('desk-bell','旅馆前台按铃','P1',[.14,.1,.14],'hotel-01','辅助前台服务关系。','按铃单件，按钮独立可选。','不是本批首要模型；声效/交互由程序接入；不制作现代电器。')
future=[
 {'id':'park-ring-toss-stall','name':'套圈摊位台＋独立瓶/柱靶＋圈','dimensionsMetresWHD':[2.4,1.2,1.2],'reason':'可将通用手工教室调整为实际游艺摊位；台、靶和圈分拆，互动由程序处理。'},
 {'id':'park-coin-ride','name':'投币摇摇马／小型儿童乘骑机','dimensionsMetresWHD':[.9,1.45,1.65],'reason':'提供游乐设备主轮廓；现有木摇马是家用玩具，不能当成投币设施。'},
 {'id':'park-pinball-machine','name':'老式弹球游艺机','dimensionsMetresWHD':[.72,1.8,1.4],'reason':'可将通用员工空间调整为游艺机房；与已有CRT办公电脑不同。'},
 {'id':'park-puppet-booth','name':'木偶小剧场台口／演出箱','dimensionsMetresWHD':[2.4,2.5,.8],'reason':'将帷幕座椅房变为可辨认的小剧场；可复用在制布偶与布幔，演出窗口必须真实。'}]
# Pipeline references are explicit deduplication guidance, not new generation requests.
pipeline={
'hospital':['scene-hospital-bed-v03','scene-wheelchair-v03','scene-stool-metal-v03','scene-sink-wall-v03','scene-medicine-bottles-v03','prop-iv-stand-v01','prop-folding-screen-v01','prop-medical-cart-v01','prop-medicine-tray-v01'],
'park':['prop-rocking-horse-v01','prop-toy-train-v01','scene-teddy-bear-v03','scene-rag-doll-intact-v03','scene-toy-blocks-v03','scene-red-drapery-v03','scene-reel-projector-v03','prop-clothes-rack-v01','scene-clothes-hanging-dress-v03'],
'office':['prop-crt-computer-v01','prop-computer-desk-v01','prop-rotary-phone-v01','prop-archive-boxes-v01','prop-archive-stack-v01','scene-typewriter-v03','scene-desk-organizer-v03','prop-wall-clock-v01'],
'home':['scene-round-table-v03','scene-sideboard-v03','prop-tea-tray-v01','prop-cradle-v01','scene-pillow-pair-v03','scene-folded-linen-v03','prop-crt-tv-v01','prop-tv-console-v01','scene-record-player-v03'],
'hotel':['prop-suitcase-v01','scene-folded-linen-v03','scene-laundry-basket-v03','scene-key-tray-v03','scene-mop-bucket-v03','scene-wall-coat-pegs-v03','prop-washstand-v01'],
'ritual':['scene-incense-burner-v03','scene-ritual-bell-v03','scene-candelabrum-v03','scene-red-drapery-v03','scene-statue-human-v03','prop-candlesticks-v01','prop-candle-altar-v01','prop-hanging-drape-v01','prop-covered-shape-v01']}
existing=json.loads((out/'existing-pipeline.json').read_text());planned={x['id'] for x in existing['assets']}
assert all(x in planned for ids in pipeline.values() for x in ids)
assert len({a['id'] for a in assets})==len(assets)
package={'version':1,'status':'handoff-request-not-authorized-generation-by-this-chat','scope':'Six themes / 48 draft rooms. New asset briefs, not a declaration that current rooms are complete.','dimensionsOrder':'width,height,depth in metres; proposals, not measured assets','newAssetGroups':assets,'optionalParkCoreAttractions':future,'reusePipelineByTheme':pipeline}
(out/'missing-models.json').write_text(json.dumps(package,ensure_ascii=False,indent=2)+'\n')
print('New groups:',len(assets),collections.Counter(a['priority'] for a in assets),'optional park attractions:',len(future))
