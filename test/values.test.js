import { test } from "node:test";
import assert from "node:assert/strict";
import { assertClean, firstProblem, rulesOf, CLASS_PREAMBLE } from "./helpers.js";

test("resource types are bounded by the table", () => {
  assertClean('newritual "R"\ncost 4 25');

  const problem = firstProblem('newritual "R"\ncost 99 10');
  assert.equal(problem.rule, "bad-resource-type");
  assert.match(problem.hint, /0=gold/);
});

test("player numbers include the negative specials", () => {
  assertClean("squareevent\n+player -2\nendevent");
  assert.deepEqual(rulesOf("squareevent\n+player 99\nendevent"), ["bad-player"]);
});

test("terrain numbers must exist or be created", () => {
  assertClean(CLASS_PREAMBLE + "addstartterr 5");
  assert.deepEqual(rulesOf(CLASS_PREAMBLE + "addstartterr 777"), ["unknown-terrain"]);
  assertClean("selectterr 777\n" + CLASS_PREAMBLE + "addstartterr 777");
});

test("negative terrain numbers are terrain groups and are left alone", () => {
  assertClean(CLASS_PREAMBLE + 'addunitrec "Spearman" 100 3 20 5 0\nrecterr -36');
});

test("ritual schools are relative back references below zero", () => {
  assertClean('newritpow\nnewritual "R"\nlevel 1\nritpow 0');
  assert.deepEqual(rulesOf('newritual "R"\nritpow 0'), ["unknown-ritpow"]);
  assert.deepEqual(rulesOf('newritual "R"\nritpow 9999'), ["unknown-ritpow"]);
});

test("selectclass only reaches the built in classes", () => {
  assertClean("selectclass 1\ngoldbonus 25");
  assert.deepEqual(rulesOf("selectclass 99\ngoldbonus 25"), ["unknown-class"]);
});
