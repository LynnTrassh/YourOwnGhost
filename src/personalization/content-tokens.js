import { selectFear } from './fear.js';
import { selectLike } from './like.js';

// Only a confirmed, specifically supported identity can unlock a personal scene.
// The generic threat placeholder has no corresponding named fear for content.
export function contentTokensForInputs(likeId='none',fearId='generic') {
  selectFear(fearId);
  const tokens=[...selectLike(likeId).tokens];
  if(fearId==='doll')tokens.push('fear.doll');
  return tokens;
}
