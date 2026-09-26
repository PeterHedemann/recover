export function bookFilenameBase(
  title: string | null | undefined,
  author: string | null | undefined,
  fallback: string,
) {
  const nameParts = [title, author]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));
  return nameParts
    .join(" ")
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/œ/g, "oe")
    .replace(/ø/g, "o")
    .replace(/ł/g, "l")
    .replace(/đ/g, "d")
    .replace(/þ/g, "th")
    .replace(/ß/g, "ss")
    .normalize("NFKD")
    .replace(/[\p{Diacritic}]/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120)
    .replace(/-$/, "") || fallback;
}
