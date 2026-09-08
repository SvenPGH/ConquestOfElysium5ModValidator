import { test } from "node:test";
import assert from "node:assert/strict";
import { assertClean, rulesOf, firstProblem } from "./helpers.js";

test("a ritual above level 3 without free is flagged", () => {
  assert.deepEqual(rulesOf('newritual "R"\nlevel 4'), ["ritual-needs-free"]);
  assert.deepEqual(rulesOf('newritual "R"\nlevel 9'), ["ritual-needs-free"]);
});

test("free clears the high-level flag regardless of order", () => {
  assertClean('newritual "R"\nlevel 4\nfree');
  assertClean('newritual "R"\nfree\nlevel 4');
});

test("levels 1-3 never need free", () => {
  assertClean('newritual "R"\nlevel 1');
  assertClean('newritual "R"\nlevel 3');
});

test("selectritual and copyritual blocks are left alone", () => {
  // A selected ritual may already be free; a copied one may inherit it.
  assertClean('selectritual "Lesser Ritual of Mastery"\nlevel 4');
  assertClean('newritual "R"\ncopyritual "Lesser Ritual of Mastery"\nlevel 4');
});

test("the block ends where the next record starts", () => {
  // free in a later block does not rescue the earlier ritual.
  assert.deepEqual(
    rulesOf('newritual "A"\nlevel 4\nnewritual "B"\nlevel 2\nfree'),
    ["ritual-needs-free"],
  );
});

test("the message points at the level line and explains the crash", () => {
  const problem = firstProblem('newritual "R"\nlevel 5');
  assert.equal(problem.rule, "ritual-needs-free");
  assert.equal(problem.line, 2);
  assert.match(problem.message, /crash/i);
  assert.match(problem.hint, /free/);
});
