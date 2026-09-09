import { holdReport, isHoldEvent } from "../hold";
import type { Event } from "@/lib/store/types";
import type { Scope } from "../scope";

let n = 0;
function ev(over: Partial<Event> & { eventType: string; quantity: number; stageId: string }): Event {
  return {
    eventId: `h${n++}`,
    occurredOn: { kind: "day", start: "2026-08-15", end: "2026-08-15" },
    provenance: { file: "Manual Entry", sheet: "Day Shift" },
    extractedBy: "direct-entry",
    ...over,
  } as Event;
}

const SCOPE: Scope = { grain: "day" };

test("isHoldEvent reads rework and hold, not rejected", () => {
  expect(isHoldEvent(ev({ eventType: "inspection", disposition: "rework", quantity: 1, stageId: "visual" }))).toBe(true);
  expect(isHoldEvent(ev({ eventType: "inspection", disposition: "hold", quantity: 1, stageId: "visual" }))).toBe(true);
  expect(isHoldEvent(ev({ eventType: "inspection", disposition: "rejected", quantity: 1, stageId: "visual" }))).toBe(false);
  expect(isHoldEvent(ev({ eventType: "production", quantity: 1, stageId: "visual" }))).toBe(false);
});

test("stagewise HOLD by lot — Visual hold sits on that lot, not Balloon", () => {
  const events: Event[] = [
    ev({ eventType: "production", quantity: 1000, stageId: "visual", batchNo: "26H15-18" }),
    ev({ eventType: "inspection", disposition: "rework", quantity: 124, stageId: "visual", batchNo: "26H15-18" }),
    ev({ eventType: "inspection", disposition: "accepted", quantity: 800, stageId: "visual", batchNo: "26H15-18" }),
    ev({ eventType: "production", quantity: 800, stageId: "balloon", batchNo: "26H15-18" }),
  ];
  const r = holdReport(events, SCOPE);
  expect(r.totalHold).toBe(124);
  expect(r.lotCount).toBe(1);
  expect(r.batches[0].batch).toBe("26H15-18");
  expect(r.batches[0].byStage.visual).toBe(124);
  expect(r.batches[0].byStage.balloon ?? 0).toBe(0);
  const visual = r.stages.find((s) => s.stageId === "visual")!;
  expect(visual.hold).toBe(124);
  expect(visual.checked).toBe(1000);
  expect(visual.holdRate).toBeCloseTo(0.124);
  expect(r.topStage?.stageId).toBe("visual");
});

test("two lots at Visual are separate rows", () => {
  const events: Event[] = [
    ev({ eventType: "inspection", disposition: "rework", quantity: 10, stageId: "visual", batchNo: "26H01-14" }),
    ev({ eventType: "inspection", disposition: "rework", quantity: 20, stageId: "visual", batchNo: "26H02-16" }),
  ];
  const r = holdReport(events, SCOPE);
  expect(r.lotCount).toBe(2);
  expect(r.totalHold).toBe(30);
  expect(r.batches.map((b) => b.batch).sort()).toEqual(["26H01-14", "26H02-16"]);
});

test("hold trend buckets pcs by day, not a rate", () => {
  const events: Event[] = [
    ev({
      eventType: "inspection",
      disposition: "rework",
      quantity: 50,
      stageId: "visual",
      batchNo: "26H15-18",
      occurredOn: { kind: "day", start: "2026-08-15", end: "2026-08-15" },
    }),
    ev({
      eventType: "inspection",
      disposition: "rework",
      quantity: 30,
      stageId: "visual",
      batchNo: "26H16-18",
      occurredOn: { kind: "day", start: "2026-08-16", end: "2026-08-16" },
    }),
  ];
  const r = holdReport(events, { grain: "day", dateFrom: "2026-08-15", dateTo: "2026-08-16" });
  expect(r.trend.map((p) => p.value)).toEqual([50, 30]);
  expect(r.stageTrend[0].perStage.visual).toBe(50);
  expect(r.stageTrend[1].perStage.visual).toBe(30);
});
