import { test } from "node:test";
import assert from "node:assert/strict";
import { assertClean, firstProblem, rulesOf } from "./helpers.js";

test("an unknown command suggests a spelling", () => {
  const problem = firstProblem('newmonster "X"\nmelleweapon 4 "Fist"');

  assert.equal(problem.rule, "unknown-command");
  assert.equal(problem.hint, "did you mean `meleeweapon`?");
});

test("arity follows the manual, widened by the base game data", () => {
  assertClean('newmonster "X"\nmr 10');
  assertClean('newmonster "X"\nfear');      // documented with an argument, base game omits it
  assertClean('newmonster "X"\npower 6 2'); // documented with one, base game always passes two

  assert.deepEqual(rulesOf('newmonster "X"\nhp'), ["arity"]);
  assert.deepEqual(rulesOf('newmonster "X"\nhp 1 2 3'), ["arity"]);
});

test("a missing argument is reported at the command, a surplus one at the argument", () => {
  const missing = firstProblem('newmonster "X"\nhp');
  assert.equal(missing.col, 0);

  const surplus = firstProblem('newmonster "X"\nhp 1 2');
  assert.ok(surplus.col > 0);
});

test("argument types are enforced", () => {
  assert.deepEqual(rulesOf('newmonster "X"\nhp "twelve"'), ["arg-type"]);
  assertClean('newmonster "X"\nmeleeweapon 4 "Fist"');
  assertClean('newmonster "X"\nmeleeweapon 4 0'); // a weapon may be named by index
});

test("an offset outside the quotes gets its own hint", () => {
  const problem = firstProblem(`newclass\nsetclassname "C"\nhometerr 30\naddstartunits 3:"Spearman" 5`);
  assert.match(problem.hint, /"3:Spearman"/);
});

test("documented ranges are checked", () => {
  assert.deepEqual(rulesOf('newritual "R"\nlevel 12'), ["arg-range"]);
  assertClean('newritual "R"\nlevel 3');
});

test("commands the base game uses but the manual omits are flagged", () => {
  const problem = firstProblem("selectterr 30\neastcoast");

  assert.equal(problem.rule, "undocumented-command");
  assert.match(problem.hint, /base game data/);
});

test("siegeable suggests walls", () => {
  const problem = firstProblem("selectterr 30\nsiegeable");

  assert.equal(problem.rule, "unknown-command");
  assert.match(problem.hint, /walls/);
});

test("a command documented per section accepts each section's shape", () => {
  assertClean("squareevent\ncureoneaff\nendevent");
  assertClean('newritual "Mend"\ncureoneaff 50');
});
