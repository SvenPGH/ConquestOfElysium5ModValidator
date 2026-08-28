import { test } from "node:test";
import assert from "node:assert/strict";
import { tokenizeLine } from "../src/tokenizer.js";

test("splits a command into name, strings and numbers", () => {
  const { tokens, comment } = tokenizeLine('addunitrec  "Spearman" 100 3  20 5 0  # a comment');

  assert.deepEqual(
    tokens.map((token) => token.type),
    ["word", "string", "number", "number", "number", "number", "number"],
  );
  assert.equal(tokens[1].value, "Spearman");
  assert.equal(tokens[2].value, 100);
  assert.equal(comment, "# a comment");
});

test("keeps the raw text of a coerced number", () => {
  const { tokens } = tokenizeLine("hp 014");
  assert.equal(tokens[1].value, 14);
  assert.equal(tokens[1].raw, "014");
});

test("a quote wins over a hash, but the hash is flagged", () => {
  const { tokens, problems } = tokenizeLine('descr "cost # 5"');

  assert.equal(tokens[1].value, "cost # 5");
  assert.deepEqual(problems.map((p) => p.rule), ["hash-in-string"]);
});

test("a comment-only line yields no tokens", () => {
  const { tokens, comment } = tokenizeLine("   # just a note");
  assert.equal(tokens.length, 0);
  assert.equal(comment, "# just a note");
});

test("curly quotes are rejected rather than paired up", () => {
  const { tokens, problems } = tokenizeLine("name \u201cGhoul\u201d");

  assert.equal(problems[0].rule, "smart-quote");
  assert.ok(!tokens.some((token) => token.type === "string"));
});

test("an unclosed quote ends the line instead of swallowing the next one", () => {
  const { tokens } = tokenizeLine('classdescr "runs off the end');
  assert.equal(tokens.at(-1).type, "unterminated");
});
