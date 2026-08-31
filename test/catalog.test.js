import { test } from "node:test";
import assert from "node:assert/strict";
import { baseGameHas, commands, meta, vanilla } from "../src/catalog.js";
import { defaultLevels, ruleModules } from "../src/rules/index.js";

test("the command table covers the manual and the base game data", () => {
  assert.ok(Object.keys(commands).length > 800);
  assert.ok(meta.documented > 800);
  assert.ok(meta.attested > 500);
});

test("the widening rules survived generation", () => {
  assert.equal(commands.power.arity.max, 2, "power is written with two arguments everywhere");
  assert.equal(commands.displaced.arity.min, 0, "displaced is often written bare");
  assert.ok(commands.meleeweapon.args[1].types.includes("int"), "a weapon may be named by index");
});

test("sections come out of the merge", () => {
  assert.deepEqual(commands.hometerr.sections, ["class"]);
  assert.ok(commands.icon.sections.includes("mod"));
});

test("base game names are indexed", () => {
  assert.ok(baseGameHas("monster", "baron"));
  assert.ok(baseGameHas("weapon", "Broadsword"));
  assert.ok(!baseGameHas("monster", "Bone Sentinel"));
  assert.equal(vanilla.resources[0], "gold");
});

test("every rule module declares its own levels", () => {
  for (const module of ruleModules) {
    assert.ok(Object.keys(module.levels).length > 0);
    assert.equal(typeof module.check, "function");
  }
});

test("no two rule modules claim the same rule id", () => {
  const declared = ruleModules.flatMap((module) => Object.keys(module.levels));
  const duplicated = declared.filter((id, index) => declared.indexOf(id) !== index);

  // unknown-class is deliberately shared: a bad name and a bad number are the
  // same problem to a reader.
  assert.deepEqual([...new Set(duplicated)], ["unknown-class"]);
  assert.ok(Object.keys(defaultLevels).length > 25);
});
