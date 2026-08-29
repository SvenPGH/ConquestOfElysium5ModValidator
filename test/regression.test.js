import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { lintSource } from "../src/linter.js";

/**
 * The base game data rips are roughly 26,000 lines of known good mod format
 * source, which makes them the best false positive test available. Anything
 * reported here is either a real quirk of the base game or a bug in the
 * checker, and every category below has been traced to the former.
 *
 * Skipped unless the reference files are present, since they are not vendored.
 */

const REFERENCE = "reference";

const available = (name) => fs.existsSync(path.join(REFERENCE, `reference_${name}-data-v5_22_c5m.txt`));
const rip = (name) => fs.readFileSync(path.join(REFERENCE, `reference_${name}-data-v5_22_c5m.txt`), "utf8");
const reported = (name) => new Set(lintSource(rip(name)).map((diagnostic) => diagnostic.rule));

test("ritual data", { skip: !available("ritual") }, () => {
  // duplicate-name: schools reuse ritual names on purpose.
  // unterminated-string / unknown-command: the extraction expanded the ^
  //   paragraph break into real newlines, which is invalid mod syntax.
  assert.deepEqual([...reported("ritual")].sort(), ["duplicate-name", "unknown-command", "unterminated-string"]);
});

test("weapon data", { skip: !available("weapon") }, () => {
  // The base game ships 137 pairs of same named weapons and reaches the later
  // ones by index.
  assert.deepEqual([...reported("weapon")], ["duplicate-name"]);
});

test("terrain data", { skip: !available("terrain") }, () => {
  // eastcoast is absent from the manual; siegeable is not a game command.
  assert.deepEqual([...reported("terrain")].sort(), ["undocumented-command", "unknown-command"]);
});

test("magic item data", { skip: !available("magic-item") }, () => {
  assert.deepEqual([...reported("magic-item")], ["duplicate-name"]);
});

test("recruitment data reports only its own fake command", { skip: !available("recruitment") }, () => {
  const problems = lintSource(rip("recruitment"));

  // The rip annotates this line itself: "-1 is not a real class. This is a fake
  // command and I put it here only as an indication that..."
  assert.equal(problems.length, 1);
  assert.equal(problems[0].rule, "unknown-class");
  assert.match(problems[0].message, /class -1/);
});
