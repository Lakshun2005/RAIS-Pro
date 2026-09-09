import { isRemedyComplete, resolveRemedyKey, RANK_WORDS } from "../remedy-store";

test("PS / Ply Separation resolve to the authored code", () => {
  expect(resolveRemedyKey("PS")).toBe("PS");
  expect(resolveRemedyKey("Ply Separation")).toBe("PS");
});

test("a remedy is complete only with both description and action", () => {
  expect(isRemedyComplete({ code: "PS", description: "Ply split", remedy: "Check dip", updatedAt: "", updatedBy: "GM" })).toBe(true);
  expect(isRemedyComplete({ code: "PS", description: "Ply split", remedy: "  ", updatedAt: "", updatedBy: "GM" })).toBe(false);
  expect(isRemedyComplete(null)).toBe(false);
});

test("ranks are Primary, Secondary, Tertiary", () => {
  expect(RANK_WORDS).toEqual(["Primary", "Secondary", "Tertiary"]);
});
