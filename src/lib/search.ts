// Mirrors the tour-calendar backend's src/lib/search.ts exactly, so
// client-side filtering here behaves the same as web's search boxes.

/** True if `query` is a case-insensitive substring of any field, or the
 *  query is empty (nothing typed yet matches everything). */
export function matchesQuery(query: string, fields: (string | null | undefined)[]): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fields.some((f) => f?.toLowerCase().includes(q));
}
