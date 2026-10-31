import fs from 'node:fs';
const assets=JSON.parse(fs.readFileSync('art-source/game-model-release-v01/manifest.json')).models;
const entry=(id,x=0,z=null,turn=0)=>{const a=assets.find(a=>a.id===id);if(!a)throw Error(id);const up=n=>Math.ceil(n*100)/100;return [id,up(a.width),up(a.depth),up(a.height),x,z??-(turn%2?a.width:a.depth)/2-.12,turn];};
const prop=(name,...p)=>entry(`prop-${name}-v01`,...p),scene=(name,...p)=>entry(`scene-${name}-v03`,...p);
const changes={
 bedroom:{2:{id:'clothes',items:[prop('clothes-rack',-.7),prop('suitcase',.6)]},4:{id:'wash-and-rest',items:[prop('washstand',-.55),scene('armchair-wicker',.75)]}},
 parlor:{0:{id:'conversation',freestanding:true,items:[scene('sofa-linen'),['low-table',1.1,.6,.48,0,-1.65,0],scene('armchair-wingback',1.5,-1.6,1)]},1:{id:'television',items:[prop('tv-console'),scene('armchair-wicker',0,-2.4,2)]},4:{id:'tea-and-clock',items:[prop('tea-cart',-.5),entry('prop-pendulum-clock-v04',.5)]}},
 nursery:{2:{id:'cradle-care',items:[prop('cradle',-.65),scene('armchair-wicker',.65)]},3:{id:'rocking-play',freestanding:true,items:[prop('rocking-horse'),['small-table',.8,.55,.6,1,-.7,0]]}},
 clinic:{1:{id:'screen-and-infusion',items:[prop('folding-screen',-.55),prop('iv-stand',.9)]},4:{id:'accessible-care',items:[scene('wheelchair',-.65),prop('washstand',.65)]}},
 archive:{2:{id:'sorting',items:[['copy-table',1.3,.65,.8,0,-.8,0],scene('chair-spindle',0,-1.85,2),prop('archive-stack',1.15,-.6)]},4:{id:'reader-seat',freestanding:true,items:[scene('armchair-wingback'),['low-table',.65,.5,.48,.95,-.9,0]]}},
 shrine:{0:{id:'offering',items:[prop('candle-altar'),['kneeler',.8,.5,.65,0,-1.65,0],['reliquary',1.1,.65,2.15,1.65,-.45,0]]},2:{id:'waiting',items:[scene('chair-upholstered',-.55),scene('chair-spindle',.55),['low-table',.65,.5,.48,0,-1.3,0]]}},
};
const extra={bedroom:[{id:'panelled-storage',items:[scene('wardrobe-panelled')]}],parlor:[{id:'wicker-seat',items:[scene('armchair-wicker')]}],nursery:[{id:'pram',items:[scene('pram')]}],clinic:[{id:'infusion',items:[prop('iv-stand')]}],archive:[{id:'mirrored-storage',items:[scene('wardrobe-mirrored')]},{id:'file-pile',items:[prop('archive-stack')]}],shrine:[{id:'vigil-chair',items:[scene('chair-upholstered')]}]};
let code='// Reviewed model groups. Real bounds include folded screens, wheels and ornaments.\n// Keep these authored placements deterministic; every member is collision checked.\n';
for(const [theme,groups] of Object.entries(changes))for(const [index,recipe] of Object.entries(groups))code+=`ROOM_DRESSING_GROUPS.${theme}[${index}] = ${JSON.stringify(recipe)};\n`;
for(const [theme,groups] of Object.entries(extra))code+=`ROOM_DRESSING_GROUPS.${theme}.push(...${JSON.stringify(groups)});\n`;
const path='src/planning/room-presets.js';let text=fs.readFileSync(path,'utf8');const start=text.indexOf('// Pending Tripo replacements.');const end=text.indexOf('export const BED_STYLES',start);if(start<0||end<0)throw Error('Expected old group block');text=text.slice(0,start)+code+'\n'+text.slice(end);fs.writeFileSync(path,text);
