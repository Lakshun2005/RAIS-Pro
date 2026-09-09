// Hold quantity — deterministic read of inspection·rework (HOLD) over the ledger.
// HOLD is pulled OUT of the flow at a gate (Visual on the plant form). Screens
// never invent these numbers; they only fold events.

import type { Event } from "@/lib/store/types";
import { STAGE_LABELS, sortStageIds, resolveStageId } from "@/core/ontology/plant-catalog";
import {
  scopeEvents,
  eventBatchId,
  periodsIn,
  periodBucket,
  periodLabel,
  type Scope,
} from "./scope";
import type { SeriesPoint, StageTrendPoint } from "./rejection";

function qty(e: Event): number {
  return "quantity" in e ? Number((e as { quantity?: number }).quantity) || 0 : 0;
}

function stageOf(e: Event): string | null {
  if (!("stageId" in e) || !e.stageId) return null;
  return resolveStageId(e.stageId) ?? e.stageId;
}

/** Plant HOLD is stored as inspection disposition `rework` (and occasionally `hold`). */
export function isHoldEvent(e: Event): boolean {
  if (e.eventType !== "inspection") return false;
  const d = (e as { disposition?: string }).disposition;
  return d === "rework" || d === "hold";
}

function isProd(e: Event): boolean {
  return e.eventType === "production";
}

export interface HoldStageRow {
  stageId: string;
  label: string;
  hold: number;
  checked: number;
  /** hold / checked, 0 when nothing was checked. */
  holdRate: number;
}

export interface HoldBatchRow {
  batch: string;
  date: string | null;
  size: string | null;
  byStage: Record<string, number>;
  total: number;
}

export interface HoldReport {
  totalHold: number;
  totalChecked: number;
  holdRate: number;
  lotCount: number;
  topStage: HoldStageRow | null;
  stages: HoldStageRow[];
  batches: HoldBatchRow[];
  /** Overall HOLD pcs over time. */
  trend: SeriesPoint[];
  /** Per-stage HOLD pcs over time (same shape as rejection stageTrend). */
  stageTrend: StageTrendPoint[];
}

function dateOf(e: Event): string | null {
  return e.occurredOn?.start ?? null;
}

function sizeOf(e: Event): string | null {
  return "size" in e ? ((e as { size?: string | null }).size ?? null) : null;
}

/**
 * Fold HOLD (rework/hold inspection) for the current scope: totals, stage
 * mix, lot × stage matrix, and period trends. Pure — same events, same report.
 */
export function holdReport(events: Event[], scope: Scope): HoldReport {
  const ev = scopeEvents(events, scope);
  const holdByStage = new Map<string, number>();
  const checkedByStage = new Map<string, number>();
  const batchMap = new Map<
    string,
    { date: string | null; size: string | null; byStage: Record<string, number>; total: number }
  >();

  for (const e of ev) {
    const sid = stageOf(e);
    if (!sid) continue;
    const q = qty(e);
    if (q <= 0) continue;
    if (isHoldEvent(e)) {
      holdByStage.set(sid, (holdByStage.get(sid) ?? 0) + q);
      const batch = eventBatchId(e);
      if (batch) {
        const row =
          batchMap.get(batch) ??
          { date: dateOf(e), size: sizeOf(e), byStage: {}, total: 0 };
        row.byStage[sid] = (row.byStage[sid] ?? 0) + q;
        row.total += q;
        if (!row.date) row.date = dateOf(e);
        if (!row.size) row.size = sizeOf(e);
        batchMap.set(batch, row);
      }
    } else if (isProd(e)) {
      checkedByStage.set(sid, (checkedByStage.get(sid) ?? 0) + q);
    }
  }

  const stageIds = sortStageIds([...new Set([...holdByStage.keys(), ...checkedByStage.keys()])]);
  const stages: HoldStageRow[] = stageIds
    .map((stageId) => {
      const hold = holdByStage.get(stageId) ?? 0;
      const checked = checkedByStage.get(stageId) ?? 0;
      return {
        stageId,
        label: STAGE_LABELS[stageId] ?? stageId,
        hold,
        checked,
        holdRate: checked > 0 ? hold / checked : 0,
      };
    })
    .filter((s) => s.hold > 0 || s.checked > 0);

  const totalHold = stages.reduce((a, s) => a + s.hold, 0);
  const checkedForRate = stages.filter((s) => s.hold > 0).reduce((a, s) => a + s.checked, 0);
  const totalChecked = checkedForRate > 0 ? checkedForRate : stages.reduce((a, s) => a + s.checked, 0);
  const holdRate = totalChecked > 0 ? totalHold / totalChecked : 0;
  const topStage = [...stages].sort((a, b) => b.hold - a.hold)[0] ?? null;

  const batches: HoldBatchRow[] = [...batchMap.entries()]
    .map(([batch, v]) => ({ batch, ...v }))
    .filter((b) => b.total > 0)
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "") || b.total - a.total || a.batch.localeCompare(b.batch));

  const periods = periodsIn(ev, scope.grain, { from: scope.dateFrom, to: scope.dateTo });
  const trend: SeriesPoint[] = periods.map((p) => {
    const bucket = periodBucket(ev, scope.grain, p);
    let hold = 0;
    let checked = 0;
    for (const e of bucket) {
      if (isHoldEvent(e)) hold += qty(e);
      else if (isProd(e)) checked += qty(e);
    }
    return {
      period: p,
      label: periodLabel(p),
      value: hold,
      rejected: hold,
      checked,
    };
  });

  const holdStageIds = stages.filter((s) => s.hold > 0).map((s) => s.stageId);
  const stageTrend: StageTrendPoint[] = periods.map((p) => {
    const bucket = periodBucket(ev, scope.grain, p);
    const perStage: Record<string, number> = {};
    const counts: Record<string, { rejected: number; checked: number }> = {};
    for (const sid of holdStageIds) {
      perStage[sid] = 0;
      counts[sid] = { rejected: 0, checked: 0 };
    }
    for (const e of bucket) {
      const sid = stageOf(e);
      if (!sid || !perStage.hasOwnProperty(sid)) continue;
      const q = qty(e);
      if (isHoldEvent(e)) {
        perStage[sid] += q;
        counts[sid].rejected += q;
      } else if (isProd(e)) {
        counts[sid].checked += q;
      }
    }
    return { period: p, label: periodLabel(p), perStage, counts };
  });

  return {
    totalHold,
    totalChecked,
    holdRate,
    lotCount: batches.length,
    topStage: topStage && topStage.hold > 0 ? topStage : null,
    stages,
    batches,
    trend,
    stageTrend,
  };
}
