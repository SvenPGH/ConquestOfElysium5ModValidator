import { test } from "node:test";
import assert from "node:assert/strict";
import { parseRecruitLimiter, parseSummonList, patterns, splitOffset } from "../src/grammar.js";

test("splits an offset off a name", () => {
  assert.deepEqual(splitOffset("1:spearman"), { offset: 1, name: "spearman" });
  assert.deepEqual(splitOffset("Spearman"), { offset: 0, name: "Spearman" });
});

test("parses the summon list forms from the manual", () => {
  assert.deepEqual(
    parseSummonList("c*Captain & 2d6*spearman & 2d4+2*Archer").map((e) => [e.count, e.name]),
    [["c", "Captain"], ["2d6", "spearman"], ["2d4+2", "Archer"]],
  );
  assert.deepEqual(parseSummonList("Purple Worm").map((e) => e.name), ["Purple Worm"]);
});

test("skips the undocumented qualifier the base game data uses", () => {
  assert.deepEqual(parseSummonList("(-110)1d4+2*Mazzik").map((e) => e.name), ["Mazzik"]);
  assert.deepEqual(parseSummonList("(-)Emperor").map((e) => e.name), ["Emperor"]);
});

test("flags a broken count rather than reading it as a name", () => {
  assert.equal(parseSummonList("2x*Spearman")[0].malformed, true);
  assert.equal(parseSummonList("1d3*Goblin")[0].malformed, false);
});

test("notices an empty entry between separators", () => {
  assert.equal(parseSummonList("Goblin & & Orc")[1].empty, true);
});

test("splits a reclimiter into sigil and name", () => {
  assert.deepEqual(parseRecruitLimiter("=Dwarf Worker"), { sigil: "=", name: "Dwarf Worker" });
  assert.equal(parseRecruitLimiter("Dwarf Worker"), null);
});

test("mod names allow underscore and dot but not spaces", () => {
  assert.ok(patterns.modName.test("orc_king.v2"));
  assert.ok(!patterns.modName.test("orc king"));
});
