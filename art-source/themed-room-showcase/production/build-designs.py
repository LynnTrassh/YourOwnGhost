"""Authored room briefs; this script serializes choices, never generates random layouts."""
import json
from pathlib import Path
root=Path(__file__).resolve().parents[3]
# id | normal function | hero | secondary groups | composition | reveal rule | ceiling | light | required new models
rows='''
hospital-01|登记、初步问诊、等候分流|分诊柜台与登记电话|候诊双席；病历归档；洗手消毒|柜台横切后半部，访客右进、护士左出，左后高柜密而入口疏|第一眼是空接诊位；侧移看到所有待诊椅朝向无人侧门|磨损吸音板网格，柜台上方两条灯，通风口偏后|冷白工作灯照台面，入口留低暖反光|theme-hospital-triage-counter-v05,theme-waiting-bench-v05
hospital-02|等候叫号、轮椅停靠|两排三联候诊椅|轮椅空位；挂钟；候诊私物角|椅列沿两墙，中间1.4米通道，尽头一席独立|先读到统一候诊方向；尽头孤椅反向对墙，挂钟在其上|纵向灯槽延伸至尽头，最后一格不亮|青白灯分两段，孤椅靠手电发现|theme-waiting-bench-v05
hospital-03|四床隔离病房|两组病床、屏风与输液架|床头物品；入口洗漱；尾端空床|5×10米纵深，左右床组错开，末端留1.2米轮廓间隙|先看正常床组；屏风后空床横向偏转，输液架仍向原床位|沿床列两条轨道，旧顶板与封住的检修口|中性床头亮区，最深床位冷暗|scene-hospital-bed-v03,prop-folding-screen-v01,prop-iv-stand-v01
hospital-04|体格检查与器械操作|检查床、工作灯、器械推车|观片区；洗手池；医师圆凳|检查床偏左，右侧器械操作环，入口与床尾直通|灯头指向床旁空地；走近才发现床面位于光斑之外|工作光集中于后半部，管线沿墙入顶|白色窄工作光，药柜只吃反光|lighting-floor-lamp,theme-xray-viewer-v05,scene-hospital-bed-v03
hospital-05|药品存取、配药核对|小抽屉药柜与配药推车|药瓶托盘；记录台；封存药箱|两侧柜墙夹配药台，近端一侧退让，柜密台疏|抽屉从近到远由闭到微开，最末格无标签|低矮灯带与旧通风网，电线只在配药区外露|柜号处冷白，台面微暖，禁止全屋绿滤镜|theme-pharmacy-drawers-v05,furniture-instrument-trolley
hospital-06|夜班短休、换衣与值守|折叠感单床与衣帽组|沙发茶桌；收音机；值守电话|睡眠左后、会客右后，衣帽位近门，中央通行|电话与收音机朝向空床；回望看见外套挡住一把椅子|普通旧抹灰顶，灯罩偏茶桌，局部水痕|桌灯暖光，床位中性暗部|prop-clothes-rack-v01,prop-wood-radio-v01,prop-rotary-phone-v01
hospital-07|病案编号、调阅与封存|连续档案架和整理台|成组档案盒；手推记录车；待销毁纸箱|两列高柜构成断续巷道，末端整理台偏右，左侧空墙|档案盒朝向逐段转开；终点整理台只留下空白记录位置|灯具按编号跨柜列布置，顶角有静态线束|台面高对比，侧柜轮廓光|prop-archive-boxes-v01,prop-archive-stack-v01
hospital-08|患者私人物品登记与保管|带箱包的保管台与分区储物|鞋帽衣物；登记册；家属等待椅|物品密集左后，登记台居中偏后，右侧留等待区|成对鞋之间少一只；衣物和箱子均指向空等待椅|柜区旧顶板，等待区单盏灯，暗处无悬空家具|保管台中性光、等待椅暗暖|prop-suitcase-v01,prop-shoes-pair-v01,prop-clothes-rack-v01
park-01|售票、付款、检票|售票柜台、机械售票机与人工验票桌|排队边界；票务柜；人工验票位|柜台在后半部，排队沿右边折返，员工从左侧进柜后|先读到售票口；靠近发现票据出口朝员工一侧|雨棚式横梁与检修盖，窗上方低灯|售票窗暖白，排队区褪色冷光|theme-ticket-counter-v05,theme-ticket-register-v05,furniture-document-table
park-02|颁奖、主持、观众观看|主席台、侧阶、讲话台、三级领奖位|两列观众席；侧翼奖品；帷幕后台|10×10米，前低后高，中央1.6米观众通道，侧阶在左翼|入口先看台体；走近发现领奖位空着，唯一观众椅朝入口|舞台框与三条顶部横梁，观众顶面低亮|舞台暖白焦点，观众席中性暗，奖杯细高光|theme-stage-deck-v06,theme-stage-stairs-v06,theme-ceremony-lectern-v05,theme-award-podium-v05,theme-trophy-cup-v05
park-03|雨天室内游艺|两排旧街机与兑换小桌|奖品陈列；维修箱；独立等候凳|5×10米，街机错列，近景一机背挡侧视，尽头留空|先见机器屏幕反光；尽头一台转向墙面，座位仍向通道|低槽灯与电缆沿机列上方走线|低饱和蓝绿机光，兑换台一点暖光|theme-arcade-cabinet-v05,theme-prize-display-v05
park-04|走失儿童与家属临时等候|低儿童桌、玩具与成人陪坐席|婴儿车；登记电话；外套挂位|低家具在中心偏后，两侧成人座位形成开口围合|玩具围着空儿童椅；近看发现车轮全朝出口|旧彩色吊饰只在儿童角上方，主通道净高不变|儿童区柔暖，登记角冷白|scene-pram-v03,scene-teddy-bear-v03,prop-toy-train-v01
park-05|演员化妆、换装、道具存放|双梳妆台与衣帽架|台面面具；折叠服装；候场空椅|镜台分前后，衣物集中一侧，留纵向化妆通道|先看到面具正面；侧移才见另一面具反扣在镜前|镜灯导线贴顶角，中央不挂舞台灯|镜前暖白局部，衣物区低冷补光|theme-performer-mask-v05,prop-clothes-rack-v01,scene-clothes-hanging-dress-v03
park-06|兑奖礼品储存与打包|奖品层架、玩具箱、打包台|纸箱；散落玩具；待领礼物|近端箱堆较高，中段让出视廊，远端单件奖品孤立|重复奖品由整齐到密集，最后一件朝向墙|仓储裸顶横梁，单一送风管沿通道|脏暖顶灯分段照箱面，远端小冷光|theme-prize-display-v05,prop-cardboard-box-v01,scene-teddy-bear-v03
park-07|员工交班、用餐、换衣|圆餐桌与打卡记录位|外套帽子；茶具；沙发休息|餐桌左后，换衣右侧，休息近门，互不堵动线|桌边四个日用品对应三张椅子；缺席位靠墙|普通抹灰顶加旧排风扇，不用游艺装饰|暖白生活光，侧门冷反光|scene-round-table-v03,prop-clothes-rack-v01,prop-tea-tray-v01
park-08|小型木偶或演员候场演出|低舞台与可绕行帷幕|观众椅；道具台；后台衣物|前半观众、后半舞台，侧翼能看到帷幕后空位|从正面只能见帷幕；侧移发现表演道具都朝后台|台口框、上楣与沿帷幕轨道，实际有顶|台口暗红暖光，后台中性狭缝光|theme-stage-deck-v06,theme-stage-stairs-v06,theme-performer-mask-v05,theme-stage-pillar-v05,theme-stage-lintel-v05
 office-01|访客登记与员工分流|公司接待柜台、电话与标识板|访客座席；文件归档；衣帽位|柜台横向压后景，访客右侧等待，员工从左侧进|电话朝访客位，登记簿却朝无人墙面|规则办公顶板，前台灯与访客灯分区|冷白前台，访客位低暖|theme-office-reception-v05,prop-rotary-phone-v01
 office-02|夜班文员集中工作|成组电脑工位与文件桌|文件推置；候诊私物角；主管独桌|5×10米，工位两两相向，中间1.4米走道|前三台电脑一致朝内，末端一台面向来人|灯条沿桌列，线缆贴墙顶，后端一格熄灭|中性灯、低蓝屏幕反光，通道保持可读|prop-computer-desk-v01,theme-office-chair-v05
 office-03|会议讨论、展示与记录|长会议桌、两侧座席、会议板|会议电话；侧边资料柜；茶水位|长桌压纵轴，左侧四席右侧两席，尽头展示面|第一眼识别会议；走到桌侧发现空位对应仍摆好的资料|长灯与桌同轴，侧顶板有维修色差|桌面中性白，展示板微冷，座位暗一档|theme-conference-table-v05,theme-meeting-board-v05
 office-04|密集档案封存与调阅|高档案架与末端调阅桌|档案盒；分期纸箱；手写记录|5×10米，两侧柜密、中央清晰，两处柜列留缺口|入口只见高柜，深处出现一张不合柜列方向的读档椅|连续低灯槽，旧消防管仅作静态建筑|纸面暖白，柜后深绿灰|prop-archive-boxes-v01,prop-archive-stack-v01,scene-typewriter-v03
 office-05|管理者办公及小范围会客|主书桌、主管椅、侧会客组|电话；书墙；衣帽位|书桌后退、左后书墙高密，右侧沙发三角低密|主桌朝访客，会客椅却朝书柜空格|办公室平顶与边缘暗槽，桌上灯有真实灯体|桌灯暖、会客中性、书柜暗|scene-armchair-wingback-v03,prop-rotary-phone-v01,scene-sideboard-v03
 office-06|收件、分拣、登记、取件|格口分拣架与包裹交接台|收件箱；打字机；待取包裹|后墙格口，左进件右取件，工作台前后分别可站|格口越靠右越满，最底一格完全空却被灯照亮|横向灯照格口，不在通道悬挂低物|格口中性顶光，登记桌低暖|theme-mail-sorting-rack-v05,scene-typewriter-v03,prop-cardboard-box-v01
 office-07|离职访谈、签字、私物交还|双人谈话桌与私物纸箱|资料柜；旁听孤椅；衣帽角|谈话桌在右后，左侧开放退路，第三席靠入口|先见正常两人对坐；回头看到第三椅正对刚走过的门|方形顶板，照明只覆盖谈话桌不铺满屋|桌面中性、入口暖暗|prop-cardboard-box-v01,prop-clothes-rack-v01,scene-desk-organizer-v03
 office-08|停用资料阅览与复制|阅读长桌与独立复印机|书柜；待归档车；旧电脑查询|低阅读区横向，高柜收后墙，右侧复制区独立|阅读位全部朝内，复印机出纸口独自朝墙|阅读灯条成排，复印角顶板更黄旧|阅读白光与复印角青灰对比|theme-photocopier-v05,prop-computer-desk-v01,prop-archive-boxes-v01
home-01|独居者睡眠、梳洗、收纳|单床、床头灯与镜台|衣帽鞋；私人旧书；行李角|左睡右梳洗，近门收纳，床边有连续可走带|镜前空椅对应床上折痕，回望衣物像一个站立轮廓|旧抹灰顶，角落水痕，不做全屋吊顶|床头暖、镜台中性、衣帽区暗|prop-clothes-rack-v01,prop-shoes-pair-v01,prop-books-stack-v01
home-02|会客、看电视、喝茶|沙发、茶几、电视形成观看三角|唱机；书柜；单人扶手椅|沙发左后、电视右侧、茶几居间，入口留偏右动线|从入口读到电视关系；单椅却看向没有物件的墙角|家用顶灯与细木顶线，少量不对称修补|电视冷光、沙发暖灯，空间中性|prop-tv-console-v01,prop-tea-tray-v01,scene-record-player-v03
home-03|两个孩子的睡眠与游戏|双床与各自玩具、书桌|玩具架；三轮车；悬吊玩具|双床对称但一侧玩具密，一侧过分干净|先读同样床位，第二眼发现所有玩具朝向空的一侧|吊饰只在一床上方，另一床上方只留挂点|玩具区柔暖，空床略冷|prop-hanging-mobile-v01,scene-teddy-bear-v03,scene-tricycle-v03
home-04|家庭阅读与写作|窗边书桌和包角书柜|打字机；旧书堆；阅读椅|高书墙在左、桌面在后右、近门阅读椅作前景|沿书背走向桌面，桌上打字机对着窗外空白|沿窗天花浅色修补，书柜顶保留阴影|窗冷、台灯暖，书背无平铺打亮|scene-typewriter-v03,prop-books-stack-v01
home-05|老人起居、缝补与收音|低软榻、摇椅、缝纫角|针线篮；收音机；枯花|低床左后、缝补右后、摇椅靠窗，中央偏左通行|先见生活痕迹，细看收音机与针线都朝向空摇椅|发黄抹灰顶，一盏乳白灯罩，梁角局部受潮|偏暖旧灯，窗边中性冷|scene-rocking-chair-v03,scene-sewing-machine-v03,theme-sewing-basket-v05
home-06|家庭吃饭、备餐与餐具收纳|真正圆餐桌、三椅与餐边柜|茶具托盘；空座；墙钟|圆桌偏中央后方，餐边柜左后，右侧完整经过|茶具朝向没有椅子的空席，空席与门轴对齐|餐桌上方吊灯，周边平顶留暗|餐桌暖白，柜中玻璃弱反光|scene-round-table-v03,theme-china-cabinet-v05
home-07|跨年代旧物储藏|箱包、旧电视、衣帽与旧家具三层堆组|唱机旧书；玩具；覆盖物|5×10米，近端高密压迫，中段转折，尽头单件小物|由可辨生活旧物进入堆积，最后只剩一只朝入口的玩具|裸露顶线与水痕沿堆积方向延伸|入口低暖、旧物深处冷反光、尽头单点|prop-suitcase-v01,prop-cardboard-box-v01,prop-covered-shape-v01,scene-teddy-bear-v03
home-08|新婚卧室与双人梳洗|半帘四柱床、双人物件镜台|行李；折叠床单；空衣架|床占左后高体量，镜台右后，前半留出换衣空间|先见床幔；近镜发现两个日用品位置只对应一把椅子|床幔顶与房顶分离，灯避开帘布投影|床幔暖侧光、镜前中性，不铺红滤镜|prop-empty-hanger-v01,scene-folded-linen-v03,prop-suitcase-v01
hotel-01|入住登记、取钥匙、短时等候|旅馆前台、钥匙格架与服务铃|行李停放；访客双席；登记电话|前台后横向、钥匙墙正对入口，等候在左，行李在右|入口先读旅馆钥匙；走近发现一个空格正被独立照亮|前台压低局部顶棚，等候顶更暗|黄暖前台、钥匙格中性高光|theme-hotel-reception-v05,theme-hotel-key-rack-v05,theme-hotel-service-bell-v05
hotel-02|短住睡眠、行李与临时书写|铁床、窄书桌与落地行李|旅行箱；鞋；挂衣位|一床一桌分两侧，行李在床尾外侧，中央直通|标准短住房，行李箱朝门却鞋尖朝床|平顶有旧风口，床顶小面积水痕|床头暖，书桌冷，中央暗|prop-suitcase-v01,prop-shoes-pair-v01
hotel-03|双人短住与独立置物|双床、床头柜与两个行李位|折叠床单；收音机；镜面|左右床对称，中间通道，两边私物数量不等|走近发现一床全套折好，另一床只有空行李位|两床顶面灯区对称，只有一边正常反光|两盏同温床灯但一边亮度低|scene-folded-linen-v03,prop-suitcase-v01
hotel-04|套房会客、睡眠与梳妆|前厅沙发组、后厅四柱床|双人镜台；旅行箱；衣帽|5×10米，前低后高，侧边连续行走串两区|会客区正常；走入后看到床幔遮住唯一镜面反射方向|前后两段顶面分区，床顶帘架独立|前厅低暖、床边中性、帘后暗|prop-tea-tray-v01,prop-suitcase-v01,prop-clothes-rack-v01
hotel-05|洁净布草储存、折叠、周转|布草层架、叠布工作台与空布草车|脏衣篮；备用枕头；清洁工具|干净左墙、工作台后方、周转车右前，中央可推行|整齐布草逐层减少，最后一格只剩一个枕头|仓储浅顶，通风口向脏衣区，灯条跨工作台|中性工作光，深柜灰暗|theme-linen-cart-v05,scene-folded-linen-v03,scene-laundry-basket-v03,scene-pillow-pair-v03
hotel-06|退房暂存行李与领取|行李推车、旅行箱分组与取件台|标签登记；衣帽；等待椅|左侧已登记箱、右侧待领箱，中间转弯与出入带|箱体同向排列，最末一只逆向且独立留空|低仓储顶与外露短线槽|台面暖白，箱组低斜光|theme-luggage-trolley-v05,prop-suitcase-v01,prop-clothes-rack-v01
hotel-07|楼层公共休息与候客|两组沙发、茶几与公共电话|书刊；枯花；单椅|沙发互望但不挤中央，末端单椅偏轴|会客轴很正常，末端单椅独自看向墙角|公共吊顶分格，边缘顶线完整|两侧暖池，中间低中性补光|prop-rotary-phone-v01,prop-books-stack-v01,prop-dried-flowers-v01
hotel-08|长住客工作、睡眠、洗漱|低床、旧电脑桌、镜台|衣帽；私人书箱；洗衣篮|床左后、工作右前、镜台右后，私物向床尾积累|入住用品变成生活堆积；屏幕与镜台朝向不同空位|旧顶修补沿床尾扩散，桌上线槽贴顶|工作冷白、床侧低暖|prop-computer-desk-v01,prop-clothes-rack-v01,scene-laundry-basket-v03
ritual-01|单人供奉与祈祷|供桌、原创坐像、香炉与跪位|供品；蜡烛；祭器柜|供桌后中、跪位前中，一侧柜密另一侧空|先看供像轮廓，靠近发现供碗全部背离跪位|暗木顶梁与悬灯，主通道净高3米|供桌暖光，像脸保持遮阴|theme-ritual-idol-v05,theme-offering-bowl-v05,scene-incense-burner-v03
ritual-02|两座相对供奉的仪式|两尊坐像、各自台座与供器|两侧跪位；后方空供桌；帷幕|左右台座相向，中间保留空心视廊|门口只看像侧面，走入中线才看清两像对视|双梁对应双像，中轴无吊灯|两侧冷暖相反但低饱和，中轴暗|theme-ritual-idol-v05,theme-offering-bowl-v05
ritual-03|集体守夜与供奉|双列跪位、末端供桌与灯笼|蜡烛组；祭器台；后帷幕|5×10米，席位均匀推进，终点供桌偏轴|沿秩序前行，最后发现所有灯笼朝供桌偏移|顶梁与席列节奏相同，后段顶线发生一次偏移|低暖烛光与冷灰环境，出口可读|theme-ritual-lantern-v05,scene-candelabrum-v03,furniture-kneeling-bench
ritual-04|祭器清点、收纳、准备|存放香炉铜铃的祭器柜与整理台|包裹布；供碗；备用烛台|高柜左后、低台右侧，前景少量包装形成层次|数量由成对到单件，末端一枚铜铃被孤立摆放|储藏顶板与木梁混合，台上灯避开柜门|中性器物光，深柜暗红木色|scene-incense-burner-v03,scene-ritual-bell-v03,theme-offering-bowl-v05
ritual-05|围坐仪式与传递供物|朝内四椅与圈外供桌|低灯；供碗；祭器暂放|四椅环绕空心，供桌在圈外后方，入口留缺口|光照空心；绕行才发现每椅前都有物件而中心没有|环状顶梁投影但无巨大悬物，顶中心完整空白|桌外暖光，中心反射出弱红，不用屏幕染色|theme-offering-bowl-v05,theme-ritual-lantern-v05
ritual-06|家宅日常生活中的私祭|神龛、牌板、香炉与独立跪位|沙发茶具；家庭柜；旧像框|生活组在左、私祭在右，中间留明确过道|先进普通起居区，横移后才见被柜体遮住的供奉面|家用抹灰顶，祭祀角只有局部烟痕|生活暖、神龛低中性，边界靠空间形成|theme-ritual-tablet-v05,scene-incense-burner-v03,prop-portrait-frame-v01
ritual-07|进入主祭室前整衣与候拜|双侧祭柜、孤跪位、后方供桌|深红帷幕；供碗；低烛台|前景两侧压缩，中段释放空地，红色只在后端|越过柜间门槛才进入红色亮区，回望入口仍是中性|低暗木顶，红色反射沿后梁渗入顶面|后端深红与暖红两层，中性入口参照|theme-offering-bowl-v05,scene-candelabrum-v03
ritual-08|沿长廊连续供奉|两列背向神柜、末端供桌|像与牌板；成组祭器；唯一正向跪位|5×10米，两侧同一反向规律重复，末端一处打断|近处先见柜背，向侧缝观察才看见供奉对象全朝墙|梁与柜列同步，灯在柜背投出重复长影|柜背冷暗，末端供桌暖白，左右轻差|theme-ritual-idol-v05,theme-ritual-tablet-v05,scene-incense-burner-v03
'''
entries=[]
for line in rows.strip().splitlines():
 cols=line.strip().split('|');assert len(cols)==9,(len(cols),line)
 id,normal,hero,groups,composition,reveal,ceiling,light,assets=cols
 entries.append(dict(id=id,normalFunction=normal,hero=hero,secondaryGroups=groups.split('；'),composition=composition,reveal=reveal,ceiling=ceiling,lighting=light,requiredAssets=assets.split(',')))
assert len(entries)==48 and len({r['id'] for r in entries})==48
out=root/'src/art/themed-room-designs.js'
out.write_text('// Authored production briefs; asset requirements are not proof of delivered models.\nexport const THEMED_ROOM_DESIGNS = '+json.dumps(entries,ensure_ascii=False,indent=2)+';\nexport const getRoomDesign = id => THEMED_ROOM_DESIGNS.find(r=>r.id===id);\n')
print('48 authored room designs saved')
