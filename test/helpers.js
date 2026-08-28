import assert from "node:assert/strict";
import { lintSource } from "../src/linter.js";

/** The rule ids a source produces, in order. */
export function rulesOf(source, options) {
  return lintSource(source, options).map((diagnostic) => diagnostic.rule);
}

export function firstProblem(source, options) {
  return lintSource(source, options)[0];
}

/**
 * Asserts a source is completely clean.
 *
 * This is the assertion that catches regressions. Finding bugs is easy; staying
 * quiet about valid mods is the hard part.
 */
export function assertClean(source, options) {
  assert.deepEqual(lintSource(source, options), []);
}

/** A minimal valid class block, for tests that need one to hang something off. */
export const CLASS_PREAMBLE = 'newclass\nsetclassname "Testers"\nhometerr 30\n';
