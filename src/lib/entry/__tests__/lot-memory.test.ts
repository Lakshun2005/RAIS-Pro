import { parseLotMemory, snapshotLotMemory } from "../lot-memory";

describe("lot memory snapshot", () => {
  test("empty or junk input is not a snapshot", () => {
    expect(parseLotMemory(null)).toBeNull();
    expect(parseLotMemory("")).toBeNull();
    expect(parseLotMemory("{")).toBeNull();
    expect(parseLotMemory(JSON.stringify({ on: true }))).toBeNull();
  });

  test("round-trips a dipped lot so Secondary and Assembly reuse it", () => {
    const snap = snapshotLotMemory({
      on: true,
      batchId: "26h01-16",
      batchDate: "2026-08-01",
      size: "16Fr",
      category: "Male",
      catheterType: "2 way",
      productType: "2 way",
    });
    expect(snap.batchId).toBe("26H01-16");
    const parsed = parseLotMemory(JSON.stringify(snap));
    expect(parsed).toEqual(snap);
    expect(parsed?.on).toBe(true);
  });

  test("on:false is still a snapshot of the last lot", () => {
    const parsed = parseLotMemory(
      JSON.stringify({ on: false, batchId: "26H01-16", batchDate: "2026-08-01", size: "16Fr" }),
    );
    expect(parsed?.on).toBe(false);
    expect(parsed?.batchId).toBe("26H01-16");
  });
});
