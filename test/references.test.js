import { test } from "node:test";
import assert from "node:assert/strict";
import { assertClean, firstProblem, rulesOf, CLASS_PREAMBLE } from "./helpers.js";

test("names resolve against the base game", () => {
  assertClean('newmonster "X"\nmeleeweapon 4 "Broadsword"');
  assert.deepEqual(rulesOf('newmonster "X"\nmeleeweapon 4 "Broadsord"'), ["unknown-weapon"]);
});

test("names resolve against the mod itself", () => {
  assertClean('newweapon "Grave Iron"\ndmg 7\nnewmonster "X"\nmeleeweapon 4 "Grave Iron"');
});

test("a forward reference is an error, because the game crashes on one", () => {
  const source = 'newmonster "X"\nmeleeweapon 4 "Grave Iron"\nnewweapon "Grave Iron"\ndmg 7';
  assert.deepEqual(rulesOf(source), ["use-before-define"]);
});

test("matching ignores case, as the manual's own examples do", () => {
  assertClean('newritual "R"\naddstring "2d6*spearman"');
});

test("an offset past the last copy is flagged", () => {
  const source = 'newmonster "Twin"\nnewmonster "Twin"\n' + CLASS_PREAMBLE + 'addstartunits "5:Twin" 1';
  assert.ok(rulesOf(source).includes("bad-offset"));
});

test("duplicate definitions point at the offset form", () => {
  const problem = firstProblem('newmonster "Twin"\nnewmonster "Twin"');

  assert.equal(problem.rule, "duplicate-name");
  assert.match(problem.hint, /<nbr>:"Twin"/);
});

test("summon lists resolve the monsters inside them", () => {
  assertClean('newritual "R"\naddstring "1d3*Ghoul & c*Baron"');
  assert.deepEqual(rulesOf('newritual "R"\naddstring "1d3*Nonexistent Thing"'), ["summon-string"]);
});

test("reclimiter needs a sigil and a real monster", () => {
  assertClean(CLASS_PREAMBLE + 'addunitrec "Spearman" 100 3 20 5 0\nreclimiter "+Baron"');
  assert.deepEqual(
    rulesOf(CLASS_PREAMBLE + 'addunitrec "Spearman" 100 3 20 5 0\nreclimiter "Baron"'),
    ["reclimiter-string"],
  );
});
