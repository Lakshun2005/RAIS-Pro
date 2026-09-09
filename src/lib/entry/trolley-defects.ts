// Production Dipping records defects per trolley, not as one batch total.
// Trolleys = 3 → three copies of the same defect codes (Trolley 1 / 2 / 3).
// The ledger still stores the SUM per defect code so analytics is unchanged;
// the per-trolley matrix is kept beside it so the form can round-trip.

export type TrolleyDefectRow = Record<string, number>;

/** Hard cap so a mistyped "300" cannot render 300 grids. */
export const MAX_TROLLEYS = 20;

export function clampTrolleyCount(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(MAX_TROLLEYS, Math.floor(n));
}

export function resizeTrolleyDefects(
  rows: TrolleyDefectRow[],
  trolleys: number,
): TrolleyDefectRow[] {
  const n = clampTrolleyCount(trolleys);
  if (n === 0) return [];
  const next = rows.slice(0, n).map((r) => ({ ...r }));
  while (next.length < n) next.push({});
  return next;
}

export function sumTrolleyDefects(rows: TrolleyDefectRow[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const row of rows) {
    for (const [k, v] of Object.entries(row)) {
      const n = Number(v) || 0;
      if (n === 0) continue;
      out[k] = (out[k] ?? 0) + n;
    }
  }
  return out;
}

export function rowDefectSum(row: TrolleyDefectRow | undefined): number {
  if (!row) return 0;
  return Object.values(row).reduce((a, b) => a + (Number(b) || 0), 0);
}

export function setTrolleyDefect(
  rows: TrolleyDefectRow[],
  trolleyIndex: number,
  key: string,
  qty: number | null,
): TrolleyDefectRow[] {
  if (trolleyIndex < 0 || trolleyIndex >= rows.length) return rows;
  const next = rows.map((r) => ({ ...r }));
  const row = { ...next[trolleyIndex] };
  if (qty == null || qty === 0) delete row[key];
  else row[key] = qty;
  next[trolleyIndex] = row;
  return next;
}

export function parseTrolleyDefects(raw: unknown): TrolleyDefectRow[] | null {
  if (!Array.isArray(raw)) return null;
  const rows = raw.map((row) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) return {} as TrolleyDefectRow;
    const out: TrolleyDefectRow = {};
    for (const [k, v] of Object.entries(row as Record<string, unknown>)) {
      const n = Number(v);
      if (Number.isFinite(n) && n > 0) out[k] = n;
    }
    return out;
  });
  return rows;
}

/** Legacy flat totals (one grid for the lot) land on Trolley 1. */
export function rowsFromLegacyTotals(
  totals: Record<string, number>,
  trolleys: number,
): TrolleyDefectRow[] {
  const rows = resizeTrolleyDefects([], trolleys);
  if (rows.length === 0) return [];
  const first: TrolleyDefectRow = {};
  for (const [k, v] of Object.entries(totals)) {
    const n = Number(v) || 0;
    if (n > 0) first[k] = n;
  }
  rows[0] = first;
  return rows;
}
