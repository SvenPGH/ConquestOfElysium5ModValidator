import { test } from "node:test";
import assert from "node:assert/strict";
import { assertClean, rulesOf } from "./helpers.js";

test("a command needs the right kind of active object", () => {
  assert.deepEqual(rulesOf('newritual "R"\nhometerr 30'), ["wrong-section"]);
});

test("a command before any opener has nothing to apply to", () => {
  assert.deepEqual(rulesOf("hometerr 30"), ["no-active-object"]);
});

test("mod level commands are legal anywhere", () => {
  assertClean('newmonster "X"\nicon "banner.tga"');
});

test("a new class needs setclassname first", () => {
  assert.deepEqual(rulesOf("newclass\nhometerr 30"), ["setclassname-not-first"]);
  assertClean('newclass\nsetclassname "C"\nhometerr 30');
});

test("a new class needs hometerr somewhere", () => {
  assert.deepEqual(rulesOf('newclass\nsetclassname "C"'), ["class-missing-hometerr"]);
});

test("the class rules do not apply to an existing class being edited", () => {
  assertClean("selectclass 1\ngoldbonus 25");
});

test("each new class is judged separately", () => {
  const source = 'newclass\nsetclassname "A"\nhometerr 30\nnewclass\nsetclassname "B"';
  assert.deepEqual(rulesOf(source), ["class-missing-hometerr"]);
});
