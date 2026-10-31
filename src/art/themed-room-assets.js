import {INTERIOR_ASSETS} from './interior-catalog.js';
// Independent preview catalog; never changes the formal game's catalog.
// Exclude rejected v01 primitives; these ids explicitly resolve to textured v02 exports.
const delivered = {
  "prop-crt-tv-v01": {
    "url": "/art/room-props/v02/prop-crt-tv-v01.glb",
    "width": 0.5949272327112379,
    "height": 0.56,
    "depth": 0.5343866604819404,
    "preserveAspect": true,
    "status": "model-reviewed-pending-integration",
    "name": "厚壳旋钮电视",
    "source": "existing-delivered-model"
  },
  "prop-crt-computer-v01": {
    "url": "/art/room-props/v02/prop-crt-computer-v01.glb",
    "width": 0.611111104053139,
    "height": 0.5000000149011612,
    "depth": 0.6924119161222927,
    "preserveAspect": true,
    "status": "model-reviewed-pending-integration",
    "name": "老式电脑与键鼠",
    "source": "existing-delivered-model"
  },
  "prop-rotary-phone-v01": {
    "url": "/art/room-props/v02/prop-rotary-phone-v01.glb",
    "width": 0.2623459582108109,
    "height": 0.17249385413015264,
    "depth": 0.2834223776865209,
    "preserveAspect": true,
    "status": "model-reviewed-pending-integration",
    "name": "拨盘电话",
    "source": "existing-delivered-model"
  },
  "prop-wood-radio-v01": {
    "url": "/art/room-props/v02/prop-wood-radio-v01.glb",
    "width": 0.26272493129944396,
    "height": 0.20000000447034838,
    "depth": 0.14241645003903325,
    "preserveAspect": true,
    "status": "model-reviewed-pending-integration",
    "name": "木壳收音机",
    "source": "existing-delivered-model"
  },
  "prop-wall-clock-v01": {
    "url": "/art/room-props/v02/prop-wall-clock-v01.glb",
    "width": 0.43999999642372134,
    "height": 0.43999999642372134,
    "depth": 0.16446183819360233,
    "preserveAspect": true,
    "status": "model-reviewed-pending-integration",
    "name": "圆形挂钟",
    "source": "existing-delivered-model"
  },
  "prop-hanging-coat-v01": {
    "url": "/art/room-props/v02/prop-hanging-coat-v01.glb",
    "width": 1.2338028169014084,
    "height": 1.2,
    "depth": 0.4659959758551308,
    "preserveAspect": true,
    "status": "model-reviewed-pending-integration",
    "name": "悬挂旧外套",
    "source": "existing-delivered-model"
  },
  "prop-empty-hanger-v01": {
    "url": "/art/room-props/v02/prop-empty-hanger-v01.glb",
    "width": 0.4189618830043174,
    "height": 0.24350623413920403,
    "depth": 0.07133010532558831,
    "preserveAspect": true,
    "status": "model-reviewed-pending-integration",
    "name": "空衣架",
    "source": "existing-delivered-model"
  },
  "prop-felt-hat-v01": {
    "url": "/art/room-props/v02/prop-felt-hat-v01.glb",
    "width": 0.43151110164018575,
    "height": 0.19000000227242708,
    "depth": 0.4298222127883651,
    "preserveAspect": true,
    "status": "model-reviewed-pending-integration",
    "name": "旧毡帽",
    "source": "existing-delivered-model"
  },
  "prop-clothes-rack-v01": {
    "url": "/art/room-props/v02/prop-clothes-rack-v01.glb",
    "width": 0.9750196259038673,
    "height": 1.9850001148879528,
    "depth": 0.6642563985241485,
    "preserveAspect": true,
    "status": "reviewed-calibrated-export",
    "name": "衣架外套帽子组",
    "source": "existing-delivered-model"
  },
  "prop-shoes-pair-v01": {
    "url": "/art/room-props/v02/prop-shoes-pair-v01.glb",
    "width": 0.46538858273502554,
    "height": 0.18000000715255737,
    "depth": 0.47658029213947506,
    "preserveAspect": true,
    "status": "model-reviewed-pending-integration",
    "name": "旧皮鞋",
    "source": "existing-delivered-model"
  },
  "prop-suitcase-v01": {
    "url": "/art/room-props/v02/prop-suitcase-v01.glb",
    "width": 0.55121117178993,
    "height": 0.46060111885890365,
    "depth": 0.28585314317526156,
    "preserveAspect": true,
    "status": "reviewed-calibrated-export",
    "name": "绑带旅行箱",
    "source": "existing-delivered-model"
  },
  "prop-cardboard-box-v01": {
    "url": "/art/room-props/v02/prop-cardboard-box-v01.glb",
    "width": 0.40468080788181043,
    "height": 0.3635000061988829,
    "depth": 0.40468080788181043,
    "preserveAspect": true,
    "status": "model-reviewed-pending-integration",
    "name": "贴签纸箱",
    "source": "existing-delivered-model"
  },
  "prop-archive-boxes-v01": {
    "url": "/art/room-props/v02/prop-archive-boxes-v01.glb",
    "width": 0.35938459128305744,
    "height": 0.319999989271164,
    "depth": 0.3101538253538715,
    "preserveAspect": true,
    "status": "model-reviewed-pending-integration",
    "name": "成组档案盒",
    "source": "existing-delivered-model"
  },
  "prop-books-stack-v01": {
    "url": "/art/room-props/v02/prop-books-stack-v01.glb",
    "width": 0.21682089605410373,
    "height": 0.19900000048801303,
    "depth": 0.16590405157955884,
    "preserveAspect": true,
    "status": "model-reviewed-pending-integration",
    "name": "散叠旧书",
    "source": "existing-delivered-model"
  },
  "prop-paper-wave-v01": {
    "url": "/art/room-props/v02/prop-paper-wave-v01.glb",
    "width": 0.15471641866337343,
    "height": 0.14200000069104135,
    "depth": 0.15471641866337343,
    "preserveAspect": true,
    "status": "exported-pending-visual-QA",
    "name": "散页纸堆",
    "source": "existing-delivered-model"
  },
  "prop-tea-tray-v01": {
    "url": "/art/room-props/v02/prop-tea-tray-v01.glb",
    "width": 0.19306450691124577,
    "height": 0.13300000092387199,
    "depth": 0.24359497044851008,
    "preserveAspect": true,
    "status": "exported-pending-visual-QA",
    "name": "茶具托盘",
    "source": "existing-delivered-model"
  },
  "prop-medicine-tray-v01": {
    "url": "/art/room-props/v02/prop-medicine-tray-v01.glb",
    "width": 0.27125918715362934,
    "height": 0.19449999270727858,
    "depth": 0.33240634205156977,
    "preserveAspect": true,
    "status": "exported-pending-visual-QA",
    "name": "药瓶器械盘",
    "source": "existing-delivered-model"
  },
  "prop-washstand-v01": {
    "url": "/art/room-props/v02/prop-washstand-v01.glb",
    "width": 1.1803537782854339,
    "height": 1.051000006198883,
    "depth": 0.5520637210059542,
    "preserveAspect": true,
    "status": "reviewed-calibrated-export",
    "name": "搪瓷盆洗漱架",
    "source": "existing-delivered-model"
  },
  "prop-iv-stand-v01": {
    "url": "/art/room-props/v02/prop-iv-stand-v01.glb",
    "width": 0.749412925509324,
    "height": 1.850000023841858,
    "depth": 0.8073385070214759,
    "preserveAspect": true,
    "status": "reviewed-calibrated-export",
    "name": "输液架",
    "source": "existing-delivered-model"
  },
  "prop-folding-screen-v01": {
    "url": "/art/game-models/v01/prop-folding-screen-v01.glb",
    "width": 1.364101789137769,
    "height": 1.6960000223480165,
    "depth": 1.3309119151730928,
    "preserveAspect": true,
    "status": "reviewed-calibrated-export",
    "name": "三折布屏风",
    "source": "existing-delivered-model"
  },
  "prop-cradle-v01": {
    "url": "/art/game-models/v01/prop-cradle-v01.glb",
    "width": 1.12426416202006,
    "height": 0.8866506349295378,
    "depth": 0.6138350317095828,
    "preserveAspect": true,
    "status": "reviewed-calibrated-export",
    "name": "木栏摇篮",
    "source": "existing-delivered-model"
  },
  "prop-rocking-horse-v01": {
    "url": "/art/room-props/v02/prop-rocking-horse-v01.glb",
    "width": 0.4365081561965339,
    "height": 0.9573204913176596,
    "depth": 0.9348393845607565,
    "preserveAspect": true,
    "status": "reviewed-calibrated-export",
    "name": "旧木摇马",
    "source": "existing-delivered-model"
  },
  "prop-toy-train-v01": {
    "url": "/art/room-props/v02/prop-toy-train-v01.glb",
    "width": 0.40018072923697745,
    "height": 0.19500000309199095,
    "depth": 0.09475903764711208,
    "preserveAspect": true,
    "status": "exported-pending-visual-QA",
    "name": "三节木玩具车",
    "source": "existing-delivered-model"
  },
  "prop-hanging-mobile-v01": {
    "url": "/art/room-props/v02/prop-hanging-mobile-v01.glb",
    "width": 0.6836595134025917,
    "height": 0.8220000267028809,
    "depth": 0.7447867414993323,
    "preserveAspect": true,
    "status": "exported-pending-visual-QA",
    "name": "悬吊环饰",
    "source": "existing-delivered-model"
  },
  "prop-dried-flowers-v01": {
    "url": "/art/room-props/v02/prop-dried-flowers-v01.glb",
    "width": 0.43585714633684103,
    "height": 0.6570000052452087,
    "depth": 0.42300000337705224,
    "preserveAspect": true,
    "status": "exported-pending-visual-QA",
    "name": "枯花陶瓶",
    "source": "existing-delivered-model"
  },
  "prop-candlesticks-v01": {
    "url": "/art/room-props/v02/prop-candlesticks-v01.glb",
    "width": 0.49882095219367395,
    "height": 0.63250001630513,
    "depth": 0.5161497197636775,
    "preserveAspect": true,
    "status": "exported-pending-visual-QA",
    "name": "旧烛台组",
    "source": "existing-delivered-model"
  },
  "prop-portrait-frame-v01": {
    "url": "/art/room-props/v02/prop-portrait-frame-v01.glb",
    "width": 0.0559686867192319,
    "height": 0.43999999642372134,
    "depth": 0.3607827651593564,
    "preserveAspect": true,
    "status": "exported-pending-visual-QA",
    "name": "原创剪影像框",
    "source": "existing-delivered-model"
  },
  "prop-hanging-drape-v01": {
    "url": "/art/room-props/v02/prop-hanging-drape-v01.glb",
    "width": 1.254602700063627,
    "height": 2.5339999198913574,
    "depth": 1.5918081688554322,
    "preserveAspect": true,
    "status": "exported-pending-visual-QA",
    "name": "褶皱悬布",
    "source": "existing-delivered-model"
  },
  "prop-covered-shape-v01": {
    "url": "/art/room-props/v02/prop-covered-shape-v01.glb",
    "width": 1.428586258496901,
    "height": 1.350000023841858,
    "depth": 1.43419956403127,
    "preserveAspect": true,
    "status": "exported-pending-visual-QA",
    "name": "白布覆盖轮廓",
    "source": "existing-delivered-model"
  },
  "prop-cable-coil-v01": {
    "url": "/art/room-props/v02/prop-cable-coil-v01.glb",
    "width": 0.1155218777584209,
    "height": 0.07799422275274992,
    "depth": 0.10331408637103395,
    "preserveAspect": true,
    "status": "exported-pending-visual-QA",
    "name": "盘地电缆",
    "source": "existing-delivered-model"
  },
  "prop-cable-wall-v01": {
    "url": "/art/room-props/v02/prop-cable-wall-v01.glb",
    "width": 0.785624366081678,
    "height": 0.6995285451412201,
    "depth": 5.4993705625717455,
    "preserveAspect": true,
    "status": "exported-pending-visual-QA",
    "name": "沿墙线束",
    "source": "existing-delivered-model"
  },
  "prop-cable-ceiling-v01": {
    "url": "/art/room-props/v02/prop-cable-ceiling-v01.glb",
    "width": 0.2456011031097247,
    "height": 0.57463607378304,
    "depth": 0.6004888214788006,
    "preserveAspect": true,
    "status": "exported-pending-visual-QA",
    "name": "垂弧顶线",
    "source": "existing-delivered-model"
  },
  "prop-cable-curtain-v01": {
    "url": "/art/room-props/v02/prop-cable-curtain-v01.glb",
    "width": 0.272054073805857,
    "height": 2.206660820869729,
    "depth": 1.239357447337793,
    "preserveAspect": true,
    "status": "exported-pending-visual-QA",
    "name": "垂落线帘",
    "source": "existing-delivered-model"
  },
  "prop-organic-rib-v01": {
    "url": "/art/room-props/v02/prop-organic-rib-v01.glb",
    "width": 0.5411856913805203,
    "height": 1.7617321442812681,
    "depth": 1.9613183567052899,
    "preserveAspect": true,
    "status": "exported-pending-visual-QA",
    "name": "原创有机褶边",
    "source": "existing-delivered-model"
  },
  "prop-tv-console-v01": {
    "url": "/art/game-models/v01/prop-tv-console-v01.glb",
    "width": 1.462725813429147,
    "height": 1.3024270504713056,
    "depth": 0.6211575372096378,
    "preserveAspect": true,
    "status": "reviewed-calibrated-export",
    "name": "电视与矮柜组",
    "source": "existing-delivered-model"
  },
  "prop-computer-desk-v01": {
    "url": "/art/room-props/v02/prop-computer-desk-v01.glb",
    "width": 0.9214924977428013,
    "height": 1.259999986886978,
    "depth": 1.372835761943357,
    "preserveAspect": true,
    "status": "exported-pending-visual-QA",
    "name": "旧电脑工作台",
    "source": "existing-delivered-model"
  },
  "prop-archive-stack-v01": {
    "url": "/art/game-models/v01/prop-archive-stack-v01.glb",
    "width": 0.7247101537626232,
    "height": 0.685000009536743,
    "depth": 0.5063043388799714,
    "preserveAspect": true,
    "status": "reviewed-calibrated-export",
    "name": "纸箱与档案堆组",
    "source": "existing-delivered-model"
  },
  "prop-tea-cart-v01": {
    "url": "/art/game-models/v01/prop-tea-cart-v01.glb",
    "width": 0.7449001879221714,
    "height": 0.8439999911934137,
    "depth": 0.4872406994169415,
    "preserveAspect": true,
    "status": "reviewed-calibrated-export",
    "name": "茶具推车",
    "source": "existing-delivered-model"
  },
  "prop-toy-bench-v01": {
    "url": "/art/room-props/v02/prop-toy-bench-v01.glb",
    "width": 0.5246169859649165,
    "height": 0.5795000183582306,
    "depth": 0.8248593225479148,
    "preserveAspect": true,
    "status": "exported-pending-visual-QA",
    "name": "玩具整理矮台",
    "source": "existing-delivered-model"
  },
  "prop-candle-altar-v01": {
    "url": "/art/game-models/v01/prop-candle-altar-v01.glb",
    "width": 1.4114657614218007,
    "height": 1.4630000519752504,
    "depth": 0.6899863052792171,
    "preserveAspect": true,
    "status": "reviewed-calibrated-export",
    "name": "烛台与遗像供桌",
    "source": "existing-delivered-model"
  },
  "scene-wardrobe-panelled-v03": {
    "url": "/art/scene-assets/v03/scene-wardrobe-panelled-v03.glb",
    "width": 1.35890731215477,
    "height": 2.1,
    "depth": 0.9397834002971651,
    "preserveAspect": true,
    "status": "reviewed-calibrated-export",
    "name": "双门旧衣柜",
    "source": "existing-delivered-model"
  },
  "scene-wardrobe-mirrored-v03": {
    "url": "/art/scene-assets/v03/scene-wardrobe-mirrored-v03.glb",
    "width": 1.3410977840423584,
    "height": 2.1,
    "depth": 0.8610060006380083,
    "preserveAspect": true,
    "status": "reviewed-calibrated-export",
    "name": "镜门衣橱",
    "source": "existing-delivered-model"
  },
  "scene-sofa-linen-v03": {
    "url": "/art/scene-assets/v03/scene-sofa-linen-v03.glb",
    "width": 1.7498082563121522,
    "height": 0.9,
    "depth": 0.8927408454151404,
    "preserveAspect": true,
    "status": "reviewed-calibrated-export",
    "name": "褪色布沙发",
    "source": "existing-delivered-model"
  },
  "scene-armchair-wingback-v03": {
    "url": "/art/scene-assets/v03/scene-armchair-wingback-v03.glb",
    "width": 0.7169421851634978,
    "height": 1.15,
    "depth": 0.6176899701356887,
    "preserveAspect": true,
    "status": "reviewed-calibrated-export",
    "name": "高背扶手椅",
    "source": "existing-delivered-model"
  },
  "scene-armchair-wicker-v03": {
    "url": "/art/scene-assets/v03/scene-armchair-wicker-v03.glb",
    "width": 0.8284422785043716,
    "height": 0.95,
    "depth": 0.7823561787605285,
    "preserveAspect": true,
    "status": "reviewed-calibrated-export",
    "name": "旧藤椅",
    "source": "existing-delivered-model"
  },
  "scene-chair-spindle-v03": {
    "url": "/art/scene-assets/v03/scene-chair-spindle-v03.glb",
    "width": 0.5177398234605789,
    "height": 0.95,
    "depth": 0.5242375314235687,
    "preserveAspect": true,
    "status": "reviewed-calibrated-export",
    "name": "木条背餐椅",
    "source": "existing-delivered-model"
  },
  "scene-chair-upholstered-v03": {
    "url": "/art/scene-assets/v03/scene-chair-upholstered-v03.glb",
    "width": 0.5015579253435135,
    "height": 0.95,
    "depth": 0.5947163522243499,
    "preserveAspect": true,
    "status": "reviewed-calibrated-export",
    "name": "软垫餐椅",
    "source": "existing-delivered-model"
  },
  "scene-rocking-chair-v03": {
    "url": "/art/scene-assets/v03/scene-rocking-chair-v03.glb",
    "width": 0.791831922531128,
    "height": 1.1,
    "depth": 0.7238412976264954,
    "preserveAspect": true,
    "status": "exported-pending-visual-QA",
    "name": "木摇椅",
    "source": "existing-delivered-model"
  },
  "scene-writing-bureau-v03": {
    "url": "/art/scene-assets/v03/scene-writing-bureau-v03.glb",
    "width": 0.7213406026363373,
    "height": 1.15,
    "depth": 0.7993410885334015,
    "preserveAspect": true,
    "status": "exported-pending-visual-QA",
    "name": "翻板写字柜",
    "source": "existing-delivered-model"
  },
  "scene-round-table-v03": {
    "url": "/art/scene-assets/v03/scene-round-table-v03.glb",
    "width": 1.0214672021066575,
    "height": 0.76,
    "depth": 1.023428937068357,
    "preserveAspect": true,
    "status": "exported-pending-visual-QA",
    "name": "圆形餐桌",
    "source": "existing-delivered-model"
  },
  "scene-sideboard-v03": {
    "url": "/art/scene-assets/v03/scene-sideboard-v03.glb",
    "width": 0.6237534008136711,
    "height": 1.05,
    "depth": 1.0740709930028385,
    "preserveAspect": true,
    "status": "exported-pending-visual-QA",
    "name": "旧餐边柜",
    "source": "existing-delivered-model"
  },
  "scene-bench-wood-v03": {
    "url": "/art/scene-assets/v03/scene-bench-wood-v03.glb",
    "width": 0.46688352171787983,
    "height": 0.4600000000000001,
    "depth": 1.348123559952612,
    "preserveAspect": true,
    "status": "exported-pending-visual-QA",
    "name": "旧长木凳",
    "source": "existing-delivered-model"
  },
  "scene-hospital-bed-v03": {
    "url": "/art/scene-assets/v03/scene-hospital-bed-v03.glb",
    "width": 1.6863952931243027,
    "height": 0.9,
    "depth": 0.8812492586871811,
    "preserveAspect": true,
    "status": "exported-pending-visual-QA",
    "name": "铁架诊疗床",
    "source": "existing-delivered-model"
  },
  "scene-wheelchair-v03": {
    "url": "/art/game-models/v01/scene-wheelchair-v03.glb",
    "width": 0.6860267700553627,
    "height": 0.9999999999999999,
    "depth": 1.0754338858656076,
    "preserveAspect": true,
    "status": "reviewed-calibrated-export",
    "name": "旧轮椅",
    "source": "existing-delivered-model"
  },
  "scene-stool-metal-v03": {
    "url": "/art/scene-assets/v03/scene-stool-metal-v03.glb",
    "width": 0.44009484648704533,
    "height": 0.55,
    "depth": 0.4547171443700791,
    "preserveAspect": true,
    "status": "exported-pending-visual-QA",
    "name": "医用圆凳",
    "source": "existing-delivered-model"
  },
  "scene-sink-wall-v03": {
    "url": "/art/scene-assets/v03/scene-sink-wall-v03.glb",
    "width": 0.46994979977607726,
    "height": 0.65,
    "depth": 0.5245745122432709,
    "preserveAspect": true,
    "status": "exported-pending-visual-QA",
    "name": "搪瓷壁挂洗手池",
    "source": "existing-delivered-model"
  },
  "scene-bathtub-v03": {
    "url": "/art/scene-assets/v03/scene-bathtub-v03.glb",
    "width": 0.8223520880322112,
    "height": 0.65,
    "depth": 1.264392917065273,
    "preserveAspect": true,
    "status": "exported-pending-visual-QA",
    "name": "旧浴缸",
    "source": "existing-delivered-model"
  },
  "scene-toilet-v03": {
    "url": "/art/scene-assets/v03/scene-toilet-v03.glb",
    "width": 0.44185757637023926,
    "height": 0.8,
    "depth": 0.7148447036743164,
    "preserveAspect": true,
    "status": "exported-pending-visual-QA",
    "name": "旧瓷马桶",
    "source": "existing-delivered-model"
  },
  "scene-mop-bucket-v03": {
    "url": "/art/scene-assets/v03/scene-mop-bucket-v03.glb",
    "width": 0.6692450121045113,
    "height": 1.35,
    "depth": 0.9832746505737305,
    "preserveAspect": true,
    "status": "exported-pending-visual-QA",
    "name": "拖把与铁桶",
    "source": "existing-delivered-model"
  },
  "scene-laundry-basket-v03": {
    "url": "/art/scene-assets/v03/scene-laundry-basket-v03.glb",
    "width": 0.6207988600491968,
    "height": 0.55,
    "depth": 0.6398333619361136,
    "preserveAspect": true,
    "status": "exported-pending-visual-QA",
    "name": "旧洗衣篮",
    "source": "existing-delivered-model"
  },
  "scene-umbrella-stand-v03": {
    "url": "/art/scene-assets/v03/scene-umbrella-stand-v03.glb",
    "width": 0.24562369287014008,
    "height": 0.9,
    "depth": 0.39808284044265746,
    "preserveAspect": true,
    "status": "exported-pending-visual-QA",
    "name": "伞桶与旧雨伞",
    "source": "existing-delivered-model"
  },
  "scene-wall-coat-pegs-v03": {
    "url": "/art/scene-assets/v03/scene-wall-coat-pegs-v03.glb",
    "width": 0.1716709852218628,
    "height": 0.8,
    "depth": 0.6823218822479249,
    "preserveAspect": true,
    "status": "exported-pending-visual-QA",
    "name": "挂钩与围巾组",
    "source": "existing-delivered-model"
  },
  "scene-folded-linen-v03": {
    "url": "/art/scene-assets/v03/scene-folded-linen-v03.glb",
    "width": 0.2796587252274979,
    "height": 0.18000000000000002,
    "depth": 0.3183525064563418,
    "preserveAspect": true,
    "status": "exported-pending-visual-QA",
    "name": "折叠床单组",
    "source": "existing-delivered-model"
  },
  "scene-pillow-pair-v03": {
    "url": "/art/scene-assets/v03/scene-pillow-pair-v03.glb",
    "width": 0.34650580392124614,
    "height": 0.24,
    "depth": 0.4474763036137996,
    "preserveAspect": true,
    "status": "exported-pending-visual-QA",
    "name": "旧枕头组",
    "source": "existing-delivered-model"
  },
  "scene-sewing-machine-v03": {
    "url": "/art/scene-assets/v03/scene-sewing-machine-v03.glb",
    "width": 0.25959836698823224,
    "height": 0.35,
    "depth": 0.4956317661100934,
    "preserveAspect": true,
    "status": "exported-pending-visual-QA",
    "name": "老式缝纫机",
    "source": "existing-delivered-model"
  },
  "scene-typewriter-v03": {
    "url": "/art/scene-assets/v03/scene-typewriter-v03.glb",
    "width": 0.4243903101822876,
    "height": 0.28,
    "depth": 0.3754430313420129,
    "preserveAspect": true,
    "status": "exported-pending-visual-QA",
    "name": "旧打字机",
    "source": "existing-delivered-model"
  },
  "scene-reel-projector-v03": {
    "url": "/art/scene-assets/v03/scene-reel-projector-v03.glb",
    "width": 0.6271845507060797,
    "height": 0.6,
    "depth": 0.29584275491606615,
    "preserveAspect": true,
    "status": "exported-pending-visual-QA",
    "name": "胶片放映机",
    "source": "existing-delivered-model"
  },
  "scene-record-player-v03": {
    "url": "/art/scene-assets/v03/scene-record-player-v03.glb",
    "width": 0.2793289141791615,
    "height": 0.34,
    "depth": 0.34696559043784886,
    "preserveAspect": true,
    "status": "exported-pending-visual-QA",
    "name": "木箱唱机",
    "source": "existing-delivered-model"
  },
  "scene-electric-fan-v03": {
    "url": "/art/scene-assets/v03/scene-electric-fan-v03.glb",
    "width": 0.4233015775680542,
    "height": 0.5,
    "depth": 0.4292755722999573,
    "preserveAspect": true,
    "status": "exported-pending-visual-QA",
    "name": "老电风扇",
    "source": "existing-delivered-model"
  },
  "scene-wall-fan-v03": {
    "url": "/art/scene-assets/v03/scene-wall-fan-v03.glb",
    "width": 0.21423488855361938,
    "height": 0.5,
    "depth": 0.4817977249622345,
    "preserveAspect": true,
    "status": "exported-pending-visual-QA",
    "name": "旧排风扇",
    "source": "existing-delivered-model"
  },
  "scene-key-tray-v03": {
    "url": "/art/scene-assets/v03/scene-key-tray-v03.glb",
    "width": 0.15287993347075776,
    "height": 0.05000000000000001,
    "depth": 0.1536246789645407,
    "preserveAspect": true,
    "status": "exported-pending-visual-QA",
    "name": "钥匙与小托盘",
    "source": "existing-delivered-model"
  },
  "scene-medicine-bottles-v03": {
    "url": "/art/scene-assets/v03/scene-medicine-bottles-v03.glb",
    "width": 0.13890815555462352,
    "height": 0.2,
    "depth": 0.2307124877009701,
    "preserveAspect": true,
    "status": "exported-pending-visual-QA",
    "name": "旧药瓶组",
    "source": "existing-delivered-model"
  },
  "scene-calendar-board-v03": {
    "url": "/art/scene-assets/v03/scene-calendar-board-v03.glb",
    "width": 0.21826517134904863,
    "height": 0.65,
    "depth": 0.4301310420036316,
    "preserveAspect": true,
    "status": "exported-pending-visual-QA",
    "name": "旧日历板",
    "source": "existing-delivered-model"
  },
  "scene-desk-organizer-v03": {
    "url": "/art/scene-assets/v03/scene-desk-organizer-v03.glb",
    "width": 0.17871028865970945,
    "height": 0.22,
    "depth": 0.25172220032271836,
    "preserveAspect": true,
    "status": "exported-pending-visual-QA",
    "name": "旧文具整理架",
    "source": "existing-delivered-model"
  },
  "scene-clothes-hanging-dress-v03": {
    "url": "/art/scene-assets/v03/scene-clothes-hanging-dress-v03.glb",
    "width": 0.3000909894704819,
    "height": 1.3,
    "depth": 0.5814568966627122,
    "preserveAspect": true,
    "status": "exported-pending-visual-QA",
    "name": "悬挂旧长裙",
    "source": "existing-delivered-model"
  },
  "scene-coat-raincoat-v03": {
    "url": "/art/scene-assets/v03/scene-coat-raincoat-v03.glb",
    "width": 0.3437776118516922,
    "height": 1.25,
    "depth": 0.6598364561796188,
    "preserveAspect": true,
    "status": "exported-pending-visual-QA",
    "name": "悬挂旧雨衣",
    "source": "existing-delivered-model"
  },
  "scene-pram-v03": {
    "url": "/art/scene-assets/v03/scene-pram-v03.glb",
    "width": 0.5931293964385986,
    "height": 1,
    "depth": 0.864400327205658,
    "preserveAspect": true,
    "status": "reviewed-calibrated-export",
    "name": "旧婴儿车",
    "source": "existing-delivered-model"
  },
  "scene-tricycle-v03": {
    "url": "/art/scene-assets/v03/scene-tricycle-v03.glb",
    "width": 0.6842862067975899,
    "height": 0.55,
    "depth": 0.35805543853086835,
    "preserveAspect": true,
    "status": "exported-pending-visual-QA",
    "name": "旧三轮车",
    "source": "existing-delivered-model"
  },
  "scene-teddy-bear-v03": {
    "url": "/art/scene-assets/v03/scene-teddy-bear-v03.glb",
    "width": 0.38977500796318054,
    "height": 0.5,
    "depth": 0.48902615904808044,
    "preserveAspect": true,
    "status": "exported-pending-visual-QA",
    "name": "旧泰迪熊",
    "source": "existing-delivered-model"
  },
  "scene-toy-blocks-v03": {
    "url": "/art/scene-assets/v03/scene-toy-blocks-v03.glb",
    "width": 0.2155751833702146,
    "height": 0.2,
    "depth": 0.22834760844789528,
    "preserveAspect": true,
    "status": "exported-pending-visual-QA",
    "name": "旧积木组",
    "source": "existing-delivered-model"
  },
  "scene-music-box-v03": {
    "url": "/art/scene-assets/v03/scene-music-box-v03.glb",
    "width": 0.20859975814819334,
    "height": 0.24,
    "depth": 0.18871955394744871,
    "preserveAspect": true,
    "status": "exported-pending-visual-QA",
    "name": "旧八音盒",
    "source": "existing-delivered-model"
  },
  "scene-incense-burner-v03": {
    "url": "/art/scene-assets/v03/scene-incense-burner-v03.glb",
    "width": 0.2816716902512391,
    "height": 0.28,
    "depth": 0.32696770031747946,
    "preserveAspect": true,
    "status": "exported-pending-visual-QA",
    "name": "旧香炉",
    "source": "existing-delivered-model"
  },
  "scene-ritual-bell-v03": {
    "url": "/art/scene-assets/v03/scene-ritual-bell-v03.glb",
    "width": 0.18459056317806244,
    "height": 0.25,
    "depth": 0.18944813311100006,
    "preserveAspect": true,
    "status": "exported-pending-visual-QA",
    "name": "铜铃",
    "source": "existing-delivered-model"
  },
  "scene-candelabrum-v03": {
    "url": "/art/scene-assets/v03/scene-candelabrum-v03.glb",
    "width": 0.27006019055843355,
    "height": 0.65,
    "depth": 0.3297549307346344,
    "preserveAspect": true,
    "status": "exported-pending-visual-QA",
    "name": "五臂烛台",
    "source": "existing-delivered-model"
  },
  "prop-pendulum-clock-v04": {
    "url": "/art/game-models/v01/prop-pendulum-clock-v04.glb",
    "width": 0.48258317025440317,
    "height": 1.8,
    "depth": 0.32759295499021535,
    "preserveAspect": true,
    "status": "reviewed-calibrated-export",
    "name": "落地摆钟（重做）",
    "source": "existing-delivered-model"
  },
  "theme-award-podium-v05": {
    "url": "/art/theme-specific/v05/theme-award-podium-v05.glb",
    "width": 0.5108856088560886,
    "height": 0.65,
    "depth": 1.2256457564575647,
    "preserveAspect": true,
    "status": "exported-pending-visual-QA",
    "name": "三级领奖台",
    "source": "existing-delivered-model"
  },
  "theme-ceremony-lectern-v05": {
    "url": "/art/theme-specific/v05/theme-ceremony-lectern-v05.glb",
    "width": 0.48140900195694714,
    "height": 1.2,
    "depth": 0.4626223091976517,
    "preserveAspect": true,
    "status": "exported-pending-visual-QA",
    "name": "颁奖典礼讲台",
    "source": "existing-delivered-model"
  },
  "theme-trophy-cup-v05": {
    "url": "/art/theme-specific/v05/theme-trophy-cup-v05.glb",
    "width": 0.1684931506849315,
    "height": 0.42,
    "depth": 0.24410958904109586,
    "preserveAspect": true,
    "status": "exported-pending-visual-QA",
    "name": "双耳奖杯",
    "source": "existing-delivered-model"
  },
  "theme-ticket-counter-v05": {
    "url": "/art/theme-specific/v05/theme-ticket-counter-v05.glb",
    "width": 0.7069471624266145,
    "height": 1.25,
    "depth": 0.7460861430009518,
    "preserveAspect": true,
    "status": "exported-pending-visual-QA",
    "name": "售票柜台",
    "source": "existing-delivered-model"
  },
  "theme-waiting-bench-v05": {
    "url": "/art/theme-specific/v05/theme-waiting-bench-v05.glb",
    "width": 1.5528621908127207,
    "height": 0.86,
    "depth": 0.6108127440327891,
    "preserveAspect": true,
    "status": "model-review-pass",
    "name": "三联候诊椅",
    "source": "existing-delivered-model"
  },
  "theme-mail-sorting-rack-v05": {
    "url": "/art/theme-specific/v05/theme-mail-sorting-rack-v05.glb",
    "width": 1.4897259384289088,
    "height": 1.75,
    "depth": 0.5513698300851824,
    "preserveAspect": true,
    "status": "model-review-pass",
    "name": "公司信件分拣架",
    "source": "existing-delivered-model"
  },
  "theme-conference-table-v05": {
    "url": "/art/theme-specific/v05/theme-conference-table-v05.glb",
    "width": 2.1941241992099485,
    "height": 0.76,
    "depth": 0.983276793775104,
    "preserveAspect": true,
    "status": "model-review-pass",
    "name": "公司长会议桌",
    "source": "existing-delivered-model"
  },
  "theme-hotel-key-rack-v05": {
    "url": "/art/theme-specific/v05/theme-hotel-key-rack-v05.glb",
    "width": 0.6404109206579446,
    "height": 0.85,
    "depth": 0.13806261406392056,
    "preserveAspect": true,
    "status": "model-review-pass",
    "name": "旅馆钥匙柜",
    "source": "existing-delivered-model"
  },
  "theme-luggage-trolley-v05": {
    "url": "/art/theme-specific/v05/theme-luggage-trolley-v05.glb",
    "width": 1.2910958904109586,
    "height": 1.75,
    "depth": 0.6678082191780823,
    "preserveAspect": true,
    "status": "model-review-pass",
    "name": "旅馆行李车",
    "source": "existing-delivered-model"
  },
  "theme-ticket-register-v05": {
    "url": "/art/theme-specific/v05/theme-ticket-register-v05.glb",
    "width": 0.3941787691696853,
    "height": 0.48000000000000004,
    "depth": 0.5099375975840739,
    "preserveAspect": true,
    "status": "model-review-pass",
    "name": "机械售票机",
    "source": "existing-delivered-model"
  },
  "theme-prize-display-v05": {
    "url": "/art/theme-specific/v05/theme-prize-display-v05.glb",
    "width": 2.154098206702903,
    "height": 1.7999999999999998,
    "depth": 0.5522247848886113,
    "preserveAspect": true,
    "status": "model-review-pass",
    "name": "游园奖品陈列架",
    "source": "existing-delivered-model"
  },
  "theme-arcade-cabinet-v05": {
    "url": "/art/theme-specific/v05/theme-arcade-cabinet-v05.glb",
    "width": 0.6939334637964776,
    "height": 1.8,
    "depth": 0.905283811087711,
    "preserveAspect": true,
    "status": "model-review-pass",
    "name": "旧街机柜",
    "source": "existing-delivered-model"
  },
  "theme-performer-mask-v05": {
    "url": "/art/theme-specific/v05/theme-performer-mask-v05.glb",
    "width": 0.2678082191780822,
    "height": 0.35,
    "depth": 0.23767123287671235,
    "preserveAspect": true,
    "status": "model-review-pass",
    "name": "后台表演面具",
    "source": "existing-delivered-model"
  },
  "theme-hospital-triage-counter-v05": {
    "url": "/art/theme-specific/v05/theme-hospital-triage-counter-v05.glb",
    "width": 1.5399999356204546,
    "height": 1.1,
    "depth": 1.5399999356204546,
    "preserveAspect": true,
    "status": "model-review-pass",
    "name": "医院分诊柜台",
    "source": "existing-delivered-model"
  },
  "theme-ecg-cart-v05": {
    "url": "/art/theme-specific/v05/theme-ecg-cart-v05.glb",
    "width": 0.9463796835822836,
    "height": 1.2,
    "depth": 0.9698630136986303,
    "preserveAspect": true,
    "status": "model-review-pass",
    "name": "心电监护设备车",
    "source": "existing-delivered-model"
  },
  "theme-pharmacy-drawers-v05": {
    "url": "/art/theme-specific/v05/theme-pharmacy-drawers-v05.glb",
    "width": 0.7086105675146771,
    "height": 1.7,
    "depth": 0.4823874755381605,
    "preserveAspect": true,
    "status": "model-review-pass",
    "name": "药房小抽屉柜",
    "source": "existing-delivered-model"
  },
  "theme-office-reception-v05": {
    "url": "/art/theme-specific/v05/theme-office-reception-v05.glb",
    "width": 1.5745096693271097,
    "height": 1.1,
    "depth": 0.9890755457025485,
    "preserveAspect": true,
    "status": "model-review-pass",
    "name": "公司接待柜台",
    "source": "existing-delivered-model"
  },
  "theme-hotel-reception-v05": {
    "url": "/art/theme-specific/v05/theme-hotel-reception-v05.glb",
    "width": 1.6564832511257328,
    "height": 1.65,
    "depth": 1.3193516699410608,
    "preserveAspect": true,
    "status": "model-review-pass",
    "name": "旅馆接待总台",
    "source": "existing-delivered-model"
  },
  "theme-linen-cart-v05": {
    "url": "/art/theme-specific/v05/theme-linen-cart-v05.glb",
    "width": 1.5552173225196144,
    "height": 1.05,
    "depth": 0.8247825722168601,
    "preserveAspect": true,
    "status": "model-review-pass",
    "name": "旅馆布草车",
    "source": "existing-delivered-model"
  },
  "theme-offering-bowl-v05": {
    "url": "/art/theme-specific/v05/theme-offering-bowl-v05.glb",
    "width": 0.9404907095046052,
    "height": 0.3,
    "depth": 0.9404907095046052,
    "preserveAspect": true,
    "status": "model-review-pass",
    "name": "祭祀供果碗",
    "source": "existing-delivered-model"
  },
  "theme-microphone-stand-v05": {
    "url": "/art/theme-specific/v05/theme-microphone-stand-v05.glb",
    "width": 0.44324853228962824,
    "height": 1.5,
    "depth": 0.5136986301369862,
    "preserveAspect": true,
    "status": "model-review-pass",
    "name": "旧麦克风与立架",
    "source": "existing-delivered-model"
  },
  "theme-stage-pillar-v05": {
    "url": "/art/theme-specific/v05/theme-stage-pillar-v05.glb",
    "width": 0.38571428571428573,
    "height": 2.7,
    "depth": 0.38571428571428573,
    "preserveAspect": true,
    "status": "model-review-pass",
    "name": "舞台台口立柱",
    "source": "existing-delivered-model"
  },
  "theme-stage-lintel-v05": {
    "url": "/art/theme-specific/v05/theme-stage-lintel-v05.glb",
    "width": 1.4540647700739722,
    "height": 0.35,
    "depth": 0.23048776198824225,
    "preserveAspect": true,
    "status": "model-review-pass",
    "name": "舞台台口上楣",
    "source": "existing-delivered-model"
  },
  "theme-office-chair-v05": {
    "url": "/art/theme-parallel/v07/theme-office-chair-v05.glb",
    "width": 0.6585545790195465,
    "height": 1.02,
    "depth": 0.6286396050453186,
    "preserveAspect": true,
    "status": "model-review-pass",
    "name": "旧办公转椅",
    "source": "existing-delivered-model"
  },
  "theme-photocopier-v05": {
    "url": "/art/theme-parallel/v07/theme-photocopier-v05.glb",
    "width": 0.724760127067566,
    "height": 1.1,
    "depth": 0.7514985620975495,
    "preserveAspect": true,
    "status": "model-review-pass",
    "name": "旧复印机",
    "source": "existing-delivered-model"
  },
  "theme-china-cabinet-v05": {
    "url": "/art/theme-parallel/v07/theme-china-cabinet-v05.glb",
    "width": 1.548760759830475,
    "height": 1.85,
    "depth": 0.8721860304474832,
    "preserveAspect": true,
    "status": "model-review-pass",
    "name": "家庭餐具柜",
    "source": "existing-delivered-model"
  },
  "theme-sewing-basket-v05": {
    "url": "/art/theme-parallel/v07/theme-sewing-basket-v05.glb",
    "width": 0.3509984560947124,
    "height": 0.28,
    "depth": 0.31774679639466025,
    "preserveAspect": true,
    "status": "model-review-pass",
    "name": "祖母针线篮",
    "source": "existing-delivered-model"
  },
  "theme-hotel-service-bell-v05": {
    "url": "/art/theme-parallel/v07/theme-hotel-service-bell-v05.glb",
    "width": 0.12505892810975913,
    "height": 0.09999999999999999,
    "depth": 0.1252525418428214,
    "preserveAspect": true,
    "status": "model-review-pass",
    "name": "旅馆柜台服务铃",
    "source": "existing-delivered-model"
  },
  "theme-ritual-idol-v05": {
    "url": "/art/theme-parallel/v07/theme-ritual-idol-v05.glb",
    "width": 0.8083346486091614,
    "height": 0.9,
    "depth": 0.6630033373832703,
    "preserveAspect": true,
    "status": "model-review-pass",
    "name": "原创祭祀坐像",
    "source": "existing-delivered-model"
  },
  "theme-ritual-lantern-v05": {
    "url": "/art/theme-parallel/v07/theme-ritual-lantern-v05.glb",
    "width": 0.31752147674560544,
    "height": 0.6,
    "depth": 0.283389812707901,
    "preserveAspect": true,
    "status": "model-review-pass",
    "name": "旧祭祀灯笼",
    "source": "existing-delivered-model"
  },
  "theme-xray-viewer-v05": {
    "url": "/art/theme-parallel/v07/theme-xray-viewer-v05.glb",
    "width": 0.56004618704319,
    "height": 0.65,
    "depth": 0.17911771386861805,
    "preserveAspect": true,
    "status": "model-review-pass",
    "name": "壁挂X光观片箱",
    "source": "existing-delivered-model"
  },
  "theme-ritual-tablet-v05": {
    "url": "/art/theme-parallel/v07/theme-ritual-tablet-v05.glb",
    "width": 0.2822080254554749,
    "height": 0.65,
    "depth": 0.41807886362075813,
    "preserveAspect": true,
    "status": "model-review-pass",
    "name": "原创祭祀牌板",
    "source": "existing-delivered-model"
  },
  "theme-meeting-board-v05": {
    "url": "/art/theme-parallel/v07/theme-meeting-board-v05.glb",
    "width": 1.7808501462849586,
    "height": 1.1,
    "depth": 0.289175897349347,
    "preserveAspect": true,
    "status": "model-review-pass",
    "name": "会议展示板",
    "source": "existing-delivered-model"
  },
  "theme-craft-paper-v05": {
    "url": "/art/theme-parallel/v07/theme-craft-paper-v05.glb",
    "width": 0.1831690682716183,
    "height": 0.12,
    "depth": 0.18547910857966643,
    "preserveAspect": true,
    "status": "model-review-pass",
    "name": "褪色手工彩纸",
    "source": "existing-delivered-model"
  },
  "theme-craft-pencil-cup-v05": {
    "url": "/art/theme-parallel/v07/theme-craft-pencil-cup-v05.glb",
    "width": 0.07924761950969696,
    "height": 0.18,
    "depth": 0.07674165308475495,
    "preserveAspect": true,
    "status": "model-review-pass",
    "name": "手工彩笔筒",
    "source": "existing-delivered-model"
  },
  "theme-craft-paint-box-v05": {
    "url": "/art/theme-parallel/v07/theme-craft-paint-box-v05.glb",
    "width": 0.26985567402973765,
    "height": 0.2,
    "depth": 0.2530651796727964,
    "preserveAspect": true,
    "status": "model-review-pass",
    "name": "旧水彩颜料盒",
    "source": "existing-delivered-model"
  },
  "theme-stage-deck-v06": {
    "url": "/art/theme-structure-repairs/v06/theme-stage-deck-v06.glb",
    "width": 2.9619394553057954,
    "height": 0.45,
    "depth": 3.4320885751956043,
    "preserveAspect": true,
    "status": "model-review-pass",
    "name": "完整台面主席台（图生重做）",
    "source": "existing-delivered-model"
  },
  "theme-stage-stairs-v06": {
    "url": "/art/theme-structure-repairs/v06/theme-stage-stairs-v06.glb",
    "width": 1.1792306769557326,
    "height": 0.45000000000000007,
    "depth": 0.9669230012611586,
    "preserveAspect": true,
    "status": "model-review-pass",
    "name": "独立三级侧阶（图生重做）",
    "source": "existing-delivered-model"
  }
};
export const THEMED_ASSETS = {...Object.fromEntries(Object.entries(INTERIOR_ASSETS).filter(([,a])=>!a.url.includes('/room-props/v01/'))),...delivered};
