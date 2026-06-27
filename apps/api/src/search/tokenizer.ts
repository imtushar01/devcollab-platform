const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'has', 'have', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'this', 'that', 'these', 'those', 'it', 'its',
]);

// Minimal Porter stemmer rules — enough to demonstrate the concept
function stem(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith('ing')) return word.slice(0, -3);
  if (word.endsWith('tion')) return word.slice(0, -3);
  if (word.endsWith('ies')) return word.slice(0, -3) + 'y';
  if (word.endsWith('es') && word.length > 4) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  if (word.endsWith('ed') && word.length > 4) return word.slice(0, -2);
  if (word.endsWith('ly')) return word.slice(0, -2);
  if (word.endsWith('er')) return word.slice(0, -2);
  return word;
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')  // remove punctuation
    .split(/\s+/)                    // split on whitespace
    .filter(token => token.length > 1)
    .filter(token => !STOP_WORDS.has(token))
    .map(stem)
    .filter(token => token.length > 1);
}

export function computeTermFrequencies(tokens: string[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const token of tokens) {
    freq.set(token, (freq.get(token) ?? 0) + 1);
  }
  // Normalize by document length so longer docs don't automatically win
  for (const [token, count] of freq) {
    freq.set(token, count / tokens.length);
  }
  return freq;
}