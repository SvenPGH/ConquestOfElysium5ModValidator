import { test } from "node:test";
import assert from "node:assert/strict";
import { readStatements } from "../src/statements.js";
import { rulesOf } from "./helpers.js";

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

test("a line starting with a number is not a command", () => {
  assert.deepEqual(rulesOf("42 hp"), ["expected-command"]);
});
