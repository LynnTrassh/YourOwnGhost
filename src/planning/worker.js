import { generateDream } from './dream.js';
self.onmessage=({data})=>{
  try{self.postMessage({plans:generateDream(data.seed,data.options)});}
  catch(error){self.postMessage({error:error.message});}
};
