export type Searchable<Id> = { id: Id; terms: readonly string[] };

// Case and accents do not matter, so "turk lirasi" finds "Türk lirası".
function fold(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').replace(/ı/g, 'i').toLowerCase().trim();
}

// 0 = exact, 1 = starts with, 2 = a word starts with, 3 = contains. Null = no match.
function score(term: string, query: string): number | null {
  const folded = fold(term);
  if (folded === query) return 0;
  if (folded.startsWith(query)) return 1;
  if (folded.split(/\s+/).some((word) => word.startsWith(query))) return 2;
  if (folded.includes(query)) return 3;
  return null;
}

// The best matches first. Equal matches keep the input order, so callers pass items in the order
// that should win ties, such as coins by volume.
export function search<Id>(items: readonly Searchable<Id>[], query: string, limit: number): Id[] {
  const q = fold(query);
  if (q === '') return [];
  const matches: { id: Id; rank: number; index: number }[] = [];
  items.forEach((item, index) => {
    const ranks = item.terms.map((term) => score(term, q)).filter((r) => r !== null);
    if (ranks.length > 0) matches.push({ id: item.id, rank: Math.min(...ranks), index });
  });
  return matches
    .sort((x, y) => x.rank - y.rank || x.index - y.index)
    .slice(0, limit)
    .map((match) => match.id);
}
