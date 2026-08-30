function trigrams(name: string): Set<string> {
  const s = name.toLowerCase();
  const grams = new Set<string>();
  for (let i = 0; i <= s.length - 3; i++) grams.add(s.slice(i, i + 3));
  return grams;
}

export function trigramSimilarity(a: string, b: string): number {
  const gramsA = trigrams(a);
  const gramsB = trigrams(b);
  if (gramsA.size === 0 && gramsB.size === 0) {
    return a.toLowerCase() === b.toLowerCase() ? 1 : 0;
  }
  let shared = 0;
  for (const g of gramsA) if (gramsB.has(g)) shared++;
  return (2 * shared) / (gramsA.size + gramsB.size);
}
