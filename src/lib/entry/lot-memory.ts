// Pin a lot at Dipping and carry the same identity into Secondary and Assembly.
//
// The lot code is composed from its own date + size. Without a pin, changing
// Size (or a draft reload) rebuilds it. Memory stores the identity the
// operator just created so the rest of the line files against the same lot.

export const LOT_MEMORY_KEY = "moid_lot_memory";

export type LotMemorySnapshot = {
  on: boolean;
  batchId: string;
  batchDate: string;
  size: string;
  category?: string;
  catheterType?: string;
  productType?: string;
};

export function parseLotMemory(raw: string | null | undefined): LotMemorySnapshot | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<LotMemorySnapshot>;
    if (!v || typeof v !== "object") return null;
    if (typeof v.batchId !== "string" || !v.batchId.trim()) return null;
    return {
      on: v.on === true,
      batchId: v.batchId.trim().toUpperCase(),
      batchDate: typeof v.batchDate === "string" ? v.batchDate : "",
      size: typeof v.size === "string" ? v.size : "",
      category: typeof v.category === "string" ? v.category : undefined,
      catheterType: typeof v.catheterType === "string" ? v.catheterType : undefined,
      productType: typeof v.productType === "string" ? v.productType : undefined,
    };
  } catch {
    return null;
  }
}

export function snapshotLotMemory(s: {
  on?: boolean;
  batchId: string;
  batchDate: string;
  size: string;
  category?: string;
  catheterType?: string;
  productType?: string;
}): LotMemorySnapshot {
  return {
    on: s.on !== false,
    batchId: s.batchId.trim().toUpperCase(),
    batchDate: s.batchDate,
    size: s.size,
    category: s.category,
    catheterType: s.catheterType,
    productType: s.productType,
  };
}

export function readLotMemory(): LotMemorySnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    return parseLotMemory(window.localStorage.getItem(LOT_MEMORY_KEY));
  } catch {
    return null;
  }
}

export function writeLotMemory(snap: LotMemorySnapshot | null): void {
  if (typeof window === "undefined") return;
  try {
    if (!snap || !snap.on) {
      window.localStorage.removeItem(LOT_MEMORY_KEY);
      return;
    }
    window.localStorage.setItem(LOT_MEMORY_KEY, JSON.stringify(snap));
  } catch {
    /* private mode / quota — memory is best-effort */
  }
}
