/**
 * Parse a human page-range string like "1-3, 5, 8-10" into a sorted, de-duped
 * array of zero-based page indices, validated against the document length.
 */
export function parsePageRanges(input: string, pageCount: number): number[] {
  const result = new Set<number>();
  const parts = input.split(",").map((p) => p.trim()).filter(Boolean);

  for (const part of parts) {
    const rangeMatch = part.match(/^(\d+)\s*-\s*(\d+)$/);
    if (rangeMatch) {
      let start = parseInt(rangeMatch[1], 10);
      let end = parseInt(rangeMatch[2], 10);
      if (start > end) [start, end] = [end, start];
      for (let i = start; i <= end; i++) {
        if (i >= 1 && i <= pageCount) result.add(i - 1);
      }
      continue;
    }
    const single = parseInt(part, 10);
    if (!Number.isNaN(single) && single >= 1 && single <= pageCount) {
      result.add(single - 1);
    }
  }

  return Array.from(result).sort((a, b) => a - b);
}
