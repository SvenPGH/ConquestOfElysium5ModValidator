import { test } from "node:test";
import assert from "node:assert/strict";
import { assertClean, rulesOf, firstProblem } from "./helpers.js";

const block = (conditions) =>
  `playerevent\n${conditions.join("\n")}\nnewunits 30 "2*Spearman"\nendevent`;

test("costlier event conditions before cheaper ones are flagged", () => {
  assert.deepEqual(rulesOf(block(["+player 30", "+turnnbr 1", "+ownsloctarg 30 124"])), ["condition-order"]);
  assert.deepEqual(rulesOf(block(["+ownsloctarg 30 124", "+player 30"])), ["condition-order"]);
});

test("cheapest-first condition order is clean", () => {
  assertClean(block(["+turnnbr 1", "+player 30", "+ownsloctarg 30 124"]));
  assertClean(block(["+season 0", "+humanplayer 30", "+hasunithere 30 \"Spearman\""]));
});

test("unclassified conditions never trip the order rule", () => {
  assertClean(block(["+chance 50", "+turnnbr 1"]));
  assertClean(block(["+varequal 1 2", "+player 30"]));
});

test("the order hint names both commands", () => {
  const problem = firstProblem(block(["+ownsloctarg 30 124", "+turnnbr 1"]));
  assert.equal(problem.rule, "condition-order");
  assert.match(problem.hint, /\+turnnbr/);
  assert.match(problem.hint, /\+ownsloctarg/);
});
