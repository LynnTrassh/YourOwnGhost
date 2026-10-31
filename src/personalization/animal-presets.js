// Only publish records after GLB inspection. Concepts are not runtime assets.
export const ANIMAL_PRESETS = Object.freeze([
  {
    "id": "cat-tabby",
    "species": "cat",
    "status": "ready",
    "url": "/art/animals-v01/cat-tabby.glb",
    "sha256": "85c7dfe700a982e45d9a556416c4d888a467626fc35da96021371254615fb651",
    "height": 0.42,
    "supportedTraits": [
      "毛",
      "耳",
      "须",
      "尾",
      "口鼻",
      "四肢",
      "爪",
      "眼睛",
      "耳朵",
      "尾巴",
      "胡须",
      "毛发"
    ]
  },
  {
    "id": "dog-brown",
    "species": "dog",
    "status": "ready",
    "url": "/art/animals-v01/dog-brown.glb",
    "sha256": "db7c0834e828ee474f980f5f09af3124cc58ba38f2630ed4bdcd5489ee7c398e",
    "height": 0.7,
    "supportedTraits": [
      "毛",
      "耳",
      "须",
      "尾",
      "口鼻",
      "四肢",
      "爪",
      "眼睛",
      "耳朵",
      "尾巴",
      "胡须",
      "毛发"
    ]
  },
  {
    "id": "rabbit-ivory",
    "species": "rabbit",
    "status": "ready",
    "url": "/art/animals-v01/rabbit-ivory.glb",
    "sha256": "4abc330c0091904662ce092b1991d66202774af322e04bc5146495c5af7999ac",
    "height": 0.38,
    "supportedTraits": [
      "毛",
      "耳",
      "须",
      "尾",
      "口鼻",
      "四肢",
      "爪",
      "眼睛",
      "耳朵",
      "尾巴",
      "胡须",
      "毛发"
    ]
  },
  {
    "id": "pigeon-gray-v3",
    "species": "pigeon",
    "status": "ready",
    "url": "/art/animals-v01/pigeon-gray-v3.glb",
    "sha256": "fde2a82fe7b85ff5288dd6abd8a1655517fa93321e3a4572857f7bf7428da36f",
    "height": 0.3,
    "supportedTraits": [
      "羽毛",
      "鸟喙",
      "喙",
      "翅膀",
      "尾巴",
      "尾",
      "爪",
      "眼睛",
      "羽",
      "翅"
    ]
  },
  {
    "id": "mouse-brown-v3",
    "species": "mouse",
    "status": "ready",
    "url": "/art/animals-v01/mouse-brown-v3.glb",
    "sha256": "4cd690aeff92836285c6d900356410edde4ca717f89424798ba79bb95bbf69b5",
    "height": 0.12,
    "supportedTraits": [
      "毛",
      "耳",
      "须",
      "尾",
      "口鼻",
      "四肢",
      "爪",
      "眼睛",
      "耳朵",
      "尾巴",
      "胡须",
      "毛发"
    ]
  }
]);
export const ANIMAL_SPECIES = Object.freeze({
  cat: ['猫','猫咪','小猫','家猫','一只猫','一只小猫','cat','a cat','domestic cat'],
  dog: ['狗','狗狗','小狗','家犬','一只狗','一只小狗','dog','a dog'],
  rabbit: ['兔','兔子','小兔子','一只兔子','rabbit','a rabbit'],
  pigeon: ['鸽子','一只鸽子','pigeon','a pigeon'],
  mouse: ['老鼠','小老鼠','一只老鼠','mouse','a mouse'],
});
const canonical = text => String(text ?? '').normalize('NFKC').trim().toLowerCase().replace(/[。.!！]$/u,'');
function genericTrait(trait,species) {
  const text=canonical(trait);
  return ANIMAL_SPECIES[species].some(name=>{
    if(!text.startsWith(name))return false;
    return /^(的)?(基本|普通|典型|自然)?(外观|外形|轮廓|形态)(特征)?$/.test(text.slice(name.length));
  });
}
export function matchAnimalPreset(entity, catalog = ANIMAL_PRESETS) {
  if(entity?.kind !== 'creature') return null;
  const subject = canonical(entity.subject).replace(/^(?:一只|一个|普通的?|常见的?)/u,'').replace(/^(?:普通的?|常见的?)/u,'');
  const species = Object.keys(ANIMAL_SPECIES).find(id => ANIMAL_SPECIES[id].includes(subject));
  if(!species) return null;
  return catalog.find(asset => asset.species === species && asset.status === 'ready'
    && /^\/art\/animals-v01\/[a-z0-9-]+\.glb$/.test(asset.url)
    && /^[a-f0-9]{64}$/.test(asset.sha256 ?? '')
    // Never discard explicit appearance constraints to force a cache hit.
    && (entity.mustPreserve ?? []).every(t => genericTrait(t,species) || (asset.supportedTraits ?? []).map(canonical).includes(canonical(t)))
    && !(entity.excludedTraits ?? []).length) ?? null;
}
export function animalPresetById(id, catalog = ANIMAL_PRESETS) {
  return catalog.find(a => a.id === id && a.status === 'ready') ?? null;
}
