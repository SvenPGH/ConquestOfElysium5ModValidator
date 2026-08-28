import { test } from "node:test";
import assert from "node:assert/strict";
import { readStatements } from "../src/statements.js";
import { assertClean, rulesOf } from "./helpers.js";

test("tags every statement with the object that was active", () => {
  const { statements } = readStatements('newweapon "Axe"\ndmg 5\nnewmonster "Thug"\nhp 10');

  assert.deepEqual(
    statements.map((statement) => statement.section),
    ["weapon", "weapon", "monster", "monster"],
  );
});

test("statements before the first opener have no section", () => {
  const { statements } = readStatements("hp 10");
  assert.equal(statements[0].section, null);
});

test("an event must be closed", () => {
  assert.deepEqual(rulesOf("squareevent\n+turnnbr 3\nkillsquare"), ["missing-endevent"]);
  assert.deepEqual(rulesOf("squareevent\n+turnnbr 3\nkillsquare\nendevent"), []);
});

test("a stray endevent is reported once, not twice", () => {
  assert.deepEqual(rulesOf("endevent"), ["unmatched-endevent"]);
});

test("moving the active object abandons an open event", () => {
  assert.deepEqual(rulesOf('squareevent\nkillsquare\nnewmonster "X"'), ["missing-endevent"]);
});

test("newitem inside an event hands out an item without moving the pointer", () => {
  assertClean('squareevent\n+turnnbr 3\nnewitem "Ring of Protection"\nendevent');
});

test("newitem outside an event still opens an item section", () => {
  assertClean('newitem "Bone Ring"\ndescr "A ring"\nnewmonster "X"\nhp 10');
});

test("an event handing out a mod defined item does not redefine it", () => {
  assertClean('newitem "Bone Ring"\ndescr "A ring"\nsquareevent\n+turnnbr 3\nnewitem "Bone Ring"\nendevent');
});

test("newitem's two meanings are told apart by the active section", () => {
  const { statements } = readStatements('squareevent\nnewitem "X"\nendevent\nnewitem "Y"');
  const inside = statements[1];
  const topLevel = statements[3];

  assert.equal(inside.section, "event");
  assert.equal(inside.opens, undefined);
  assert.equal(topLevel.section, "item");
  assert.equal(topLevel.opens, true);
});

test("a line starting with a number is not a command", () => {
  assert.deepEqual(rulesOf("42 hp"), ["expected-command"]);
});
