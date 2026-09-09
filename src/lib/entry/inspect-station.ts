// Load the recorded quantities for one lot at one station so a GM (or an
// operator inspecting a completed gate) sees what was entered, not a blank form.

import {
  batchOf,
  buildEntryRows,
  type AuditEntryRow,
  type AuditEventLike,
} from "@/lib/analytics/audit-sessions";
import { canonicalBatchId } from "@/lib/entry/batch-id";
import { sameStage } from "@/lib/entry/process-sequence";
import type { ShiftBatchRecord } from "@/lib/entry/disposafe-matrix";
import { parseTrolleyDefects, type TrolleyDefectRow } from "@/lib/entry/trolley-defects";

function lotKey(raw: string | null | undefined): string {
  const t = (raw ?? "").trim().toUpperCase();
  return canonicalBatchId(t) ?? t;
}

export function latestLedgerRowForLotStation(
  events: AuditEventLike[],
  lot: string,
  stageId: string,
): AuditEntryRow | null {
  const want = lotKey(lot);
  if (!want || !stageId) return null;
  const rows = buildEntryRows(events).filter(
    (r) => lotKey(r.batch) === want && sameStage(r.stageId, stageId),
  );
  if (rows.length === 0) return null;
  rows.sort((a, b) => `${b.date}${b.recordedAt}`.localeCompare(`${a.date}${a.recordedAt}`));
  return rows[0];
}

export function latestLocalRowForLotStation(
  saved: ShiftBatchRecord[],
  lot: string,
  stageId: string,
): ShiftBatchRecord | null {
  const want = lotKey(lot);
  if (!want || !stageId) return null;
  const rows = saved.filter(
    (r) => lotKey(r.batchId) === want && sameStage(r.stageId || r.micro || "", stageId),
  );
  if (rows.length === 0) return null;
  rows.sort((a, b) => (b.savedAt || "").localeCompare(a.savedAt || ""));
  return rows[0];
}

export function trolleyDefectsFromEvents(
  events: AuditEventLike[],
  lot: string,
  stageId: string,
): TrolleyDefectRow[] | null {
  const want = lotKey(lot);
  if (!want || !stageId) return null;
  for (const e of events) {
    if (!sameStage(e.stageId || "", stageId)) continue;
    if (lotKey(batchOf(e) ?? e.batchNo) !== want) continue;
    const parsed = parseTrolleyDefects(e.customFields?.trolleyDefects);
    if (parsed && parsed.length > 0) return parsed;
  }
  return null;
}

export function trolleysFromEvents(
  events: AuditEventLike[],
  lot: string,
  stageId: string,
): number {
  const want = lotKey(lot);
  if (!want || !stageId) return 0;
  for (const e of events) {
    if (!sameStage(e.stageId || "", stageId)) continue;
    if (lotKey(batchOf(e) ?? e.batchNo) !== want) continue;
    const n = Number(e.customFields?.trolleysProduced);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}
