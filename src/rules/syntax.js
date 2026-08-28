/**
 * Lexical and structural problems, found while reading the file rather than
 * while judging it.
 *
 * The parser produces these as plain facts. This module owns their severity and
 * feeds them into the same bag as everything else, so nothing downstream has to
 * know they came from a different pass.
 */

export const levels = {
  "unterminated-string": "error",
  "smart-quote": "error",
  "hash-in-string": "warning",
  "expected-command": "error",
  "missing-endevent": "error",
  "unmatched-endevent": "error",
};

export function check({ problems }, bag) {
  for (const problem of problems) {
    bag.report({
      rule: problem.rule,
      at: { line: problem.line, col: problem.col, end: problem.end },
      message: problem.message,
      hint: problem.hint,
    });
  }
}
