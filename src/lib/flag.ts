/** ISO 3166-1 alpha-2 country code -> flag emoji. */
export function flagEmoji(cc?: string): string {
  if (!cc || cc.length !== 2 || !/^[a-zA-Z]{2}$/.test(cc)) return "🌐";
  const base = 127397; // 0x1F1E6 - 'A'
  return String.fromCodePoint(
    ...[...cc.toUpperCase()].map((c) => base + c.charCodeAt(0))
  );
}
