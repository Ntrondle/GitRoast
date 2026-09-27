// Deterministic pick: the same seed always gives the same item, so a redelivered webhook
// produces the same meme. FNV-1a spreads nearby PR numbers across the whole list.
export function chooseIndex(seed: string, count: number): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % count;
}
