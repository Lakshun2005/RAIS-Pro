import {
  clampSpan,
  dropBefore,
  layoutStorageKey,
  mergeOrder,
  mergeSpans,
  moveCard,
  ordersEqual,
  packRows,
  parseLayout,
  serializeLayout,
  expandRowSpans,
  spanFromDrag,
  spansEqual,
} from "../dashboard-layout";

const SPANS: Record<string, number> = {
  kpis: 12,
  wip: 12,
  trend: 4,
  "by-stage": 4,
  pareto: 4,
  "stage-trend": 12,
  heatmap: 12,
  "size-ytd": 4,
  "size-trend": 8,
};

const DEFAULTS = [
  "kpis",
  "wip",
  "trend",
  "by-stage",
  "pareto",
  "stage-trend",
  "heatmap",
  "size-ytd",
  "size-trend",
];

test("storage key is per login, not shared", () => {
  expect(layoutStorageKey("gm")).toBe("moid_dash_layout_v1_gm");
  expect(layoutStorageKey("lakshun")).toBe("moid_dash_layout_v1_lakshun");
  expect(layoutStorageKey("gm")).not.toBe(layoutStorageKey("operator"));
  expect(layoutStorageKey("  ")).toBe("moid_dash_layout_v1_anon");
});

test("parseLayout accepts versioned payload and a bare array", () => {
  expect(parseLayout(null)).toBeNull();
  expect(parseLayout("{")).toBeNull();
  expect(parseLayout(JSON.stringify(["wip", "kpis"]))).toEqual({ order: ["wip", "kpis"], spans: {} });
  expect(parseLayout(serializeLayout({ order: ["pareto", "trend"], spans: { trend: 6 } }))).toEqual({
    order: ["pareto", "trend"],
    spans: { trend: 6 },
  });
  expect(parseLayout(JSON.stringify({ v: 1, order: ["a", ""] }))).toEqual({ order: ["a"], spans: {} });
});

test("mergeSpans keeps saved widths and fills defaults for new cards", () => {
  expect(mergeSpans({ trend: 6, gone: 3 }, { trend: 4, pareto: 4 })).toEqual({
    trend: 6,
    pareto: 4,
  });
});

test("span drag snaps to columns and stays inside 1–12", () => {
  expect(clampSpan(0)).toBe(1);
  expect(clampSpan(99)).toBe(12);
  expect(spanFromDrag(4, 80, 40)).toBe(6);
  expect(spanFromDrag(4, -80, 40)).toBe(2);
  expect(spanFromDrag(4, 20, 40)).toBe(5);
  expect(spansEqual({ a: 4 }, { a: 4 })).toBe(true);
  expect(spansEqual({ a: 4 }, { a: 6 })).toBe(false);
});

test("mergeOrder keeps the saved arrangement and drops missing cards", () => {
  const saved = ["pareto", "wip", "kpis", "gone"];
  const present = ["kpis", "wip", "trend", "pareto"];
  // trend is new — sit after its default predecessor (wip), not at the front.
  expect(mergeOrder(saved, present)).toEqual(["pareto", "wip", "trend", "kpis"]);
});

test("a returning worklist card slots back after the KPI row", () => {
  const saved = ["kpis", "trend", "pareto"];
  const present = ["kpis", "wip", "trend", "pareto"];
  expect(mergeOrder(saved, present)).toEqual(["kpis", "wip", "trend", "pareto"]);
});

test("mergeOrder inserts a newly present card at its default neighbor", () => {
  // heatmap was empty last visit; user had moved wip above kpis.
  const saved = ["wip", "kpis", "trend", "by-stage", "pareto", "stage-trend"];
  const present = DEFAULTS.filter((id) => id !== "size-ytd" && id !== "size-trend");
  expect(mergeOrder(saved, present)).toEqual([
    "wip",
    "kpis",
    "trend",
    "by-stage",
    "pareto",
    "stage-trend",
    "heatmap",
  ]);
});

test("mergeOrder with nothing saved is the default present order", () => {
  expect(mergeOrder([], ["kpis", "wip", "trend"])).toEqual(["kpis", "wip", "trend"]);
});

test("left and right swap neighbors in the same row only", () => {
  const order = ["trend", "by-stage", "pareto", "wip"];
  expect(moveCard(order, "by-stage", "left", SPANS)).toEqual(["by-stage", "trend", "pareto", "wip"]);
  expect(moveCard(order, "trend", "left", SPANS)).toEqual(order);
  expect(moveCard(order, "pareto", "right", SPANS)).toEqual(order);
  expect(moveCard(order, "trend", "right", SPANS)).toEqual(["by-stage", "trend", "pareto", "wip"]);
});

test("up moves a full-width card above the previous row", () => {
  const order = ["trend", "by-stage", "pareto", "wip"];
  expect(moveCard(order, "wip", "up", SPANS)).toEqual(["wip", "trend", "by-stage", "pareto"]);
  expect(moveCard(order, "trend", "up", SPANS)).toEqual(order);
});

test("down sends a card below the next row", () => {
  const order = ["trend", "by-stage", "pareto", "wip"];
  expect(moveCard(order, "by-stage", "down", SPANS)).toEqual(["trend", "pareto", "wip", "by-stage"]);
});

test("dropBefore inserts the dragged card in front of the target", () => {
  const order = ["kpis", "wip", "trend"];
  expect(dropBefore(order, "trend", "kpis")).toEqual(["trend", "kpis", "wip"]);
  expect(dropBefore(order, "kpis", "kpis")).toEqual(order);
  expect(dropBefore(order, "missing", "kpis")).toEqual(order);
});

test("packRows wraps at 12 columns", () => {
  const rows = packRows(["trend", "by-stage", "pareto", "wip"], SPANS);
  expect(rows.map((r) => r.map((c) => c.id))).toEqual([
    ["trend", "by-stage", "pareto"],
    ["wip"],
  ]);
});

test("ordersEqual is positional", () => {
  expect(ordersEqual(["a", "b"], ["a", "b"])).toBe(true);
  expect(ordersEqual(["a", "b"], ["b", "a"])).toBe(false);
});

test("expandRowSpans fills leftover columns so a row has no empty strip", () => {
  const order = ["trend", "by-stage", "pareto"];
  const spans = { trend: 4, "by-stage": 4, pareto: 3 };
  expect(expandRowSpans(order, spans)).toEqual({
    trend: 4,
    "by-stage": 4,
    pareto: 4,
  });
  expect(expandRowSpans(order, { trend: 2, "by-stage": 4, pareto: 4 })).toEqual({
    trend: 2,
    "by-stage": 5,
    pareto: 5,
  });
});
