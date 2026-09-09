import { latestLedgerRowForLotStation, latestLocalRowForLotStation } from "../inspect-station";
import type { ShiftBatchRecord } from "@/lib/entry/disposafe-matrix";

const LOT = "26G31-14";

test("latest ledger row for a lot+station is the newest date", () => {
  const events = [
    {
      stageId: "visual",
      batchNo: LOT,
      eventType: "production",
      quantity: 800,
      occurredOn: { start: "2026-07-31" },
      recordedAt: "2026-07-31T08:00:00.000Z",
    },
    {
      stageId: "visual",
      batchNo: LOT,
      eventType: "inspection",
      disposition: "accepted",
      quantity: 700,
      occurredOn: { start: "2026-07-31" },
      recordedAt: "2026-07-31T08:00:00.000Z",
    },
    {
      stageId: "balloon",
      batchNo: LOT,
      eventType: "production",
      quantity: 50,
      occurredOn: { start: "2026-07-31" },
      recordedAt: "2026-07-31T09:00:00.000Z",
    },
  ];
  const visual = latestLedgerRowForLotStation(events, LOT, "visual");
  expect(visual?.checked).toBe(800);
  expect(visual?.accepted).toBe(700);
  expect(latestLedgerRowForLotStation(events, LOT, "production")).toBeNull();
});

test("local shift row wins by savedAt for the same lot+station", () => {
  const saved = [
    {
      id: "old",
      date: "2026-07-31",
      batchId: LOT,
      stageId: "visual",
      micro: "visual",
      checked: 100,
      savedAt: "2026-07-31T08:00:00.000Z",
    },
    {
      id: "new",
      date: "2026-07-31",
      batchId: LOT,
      stageId: "visual",
      micro: "visual",
      checked: 900,
      savedAt: "2026-07-31T10:00:00.000Z",
    },
  ] as ShiftBatchRecord[];
  expect(latestLocalRowForLotStation(saved, LOT, "visual")?.id).toBe("new");
});
