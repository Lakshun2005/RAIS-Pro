import {
  clampTrolleyCount,
  resizeTrolleyDefects,
  sumTrolleyDefects,
  setTrolleyDefect,
  parseTrolleyDefects,
  rowsFromLegacyTotals,
  rowDefectSum,
  MAX_TROLLEYS,
  type TrolleyDefectRow,
} from "../trolley-defects";

describe("trolley defect matrix", () => {
  test("three trolleys make three empty rows", () => {
    expect(resizeTrolleyDefects([], 3)).toEqual([{}, {}, {}]);
  });

  test("raising the trolley count keeps earlier rows", () => {
    const kept = resizeTrolleyDefects([{ COAG: 10 }], 3);
    expect(kept).toEqual([{ COAG: 10 }, {}, {}]);
  });

  test("lowering the trolley count drops the extra rows", () => {
    const rows: TrolleyDefectRow[] = [{ COAG: 10 }, { SD: 20 }, { OL: 5 }];
    expect(resizeTrolleyDefects(rows, 2)).toEqual([{ COAG: 10 }, { SD: 20 }]);
  });

  test("zero trolleys is no matrix", () => {
    expect(resizeTrolleyDefects([{ COAG: 1 }], 0)).toEqual([]);
    expect(clampTrolleyCount(0)).toBe(0);
  });

  test("a mistyped huge trolley count is capped", () => {
    expect(clampTrolleyCount(300)).toBe(MAX_TROLLEYS);
    expect(resizeTrolleyDefects([], 300)).toHaveLength(MAX_TROLLEYS);
  });

  test("setting a cell on trolley 2 does not touch trolley 1", () => {
    const rows = setTrolleyDefect([{}, {}, {}], 1, "SD", 20);
    expect(rows[0]).toEqual({});
    expect(rows[1]).toEqual({ SD: 20 });
    expect(rows[2]).toEqual({});
  });

  test("the batch total is the sum across trolleys", () => {
    const rows: TrolleyDefectRow[] = [
      { COAG: 10, SD: 20 },
      { OL: 20 },
      { COAG: 5 },
    ];
    expect(sumTrolleyDefects(rows)).toEqual({ COAG: 15, SD: 20, OL: 20 });
    expect(rowDefectSum(rows[0])).toBe(30);
  });

  test("legacy flat totals land on trolley 1 when the lot is opened again", () => {
    expect(rowsFromLegacyTotals({ COAG: 10, SD: 20 }, 3)).toEqual([
      { COAG: 10, SD: 20 },
      {},
      {},
    ]);
  });

  test("parse ignores junk and zero cells", () => {
    expect(parseTrolleyDefects("nope")).toBeNull();
    expect(parseTrolleyDefects([{ COAG: 10, SD: 0, x: "n" }, null])).toEqual([{ COAG: 10 }, {}]);
  });
});
