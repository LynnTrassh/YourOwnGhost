export function randomRunSeed(random=globalThis.crypto) {
  return [...random.getRandomValues(new Uint32Array(4))].map(n=>n.toString(16).padStart(8,'0')).join('');
}
