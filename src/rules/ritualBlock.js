import { atCommand } from "../diagnostics.js";
import { OPENERS } from "../sections.js";

/**
 * A ritual above level 3 must be learned automatically: without `free` the
 * game crashes when the ritual would be offered for research (play-tested).
 * The manual documents level 1-9 but the base game itself never goes above 3,
 * so the high levels only work as auto-learned rituals.
 *
 * Only new rituals are held to this. A `selectritual` block edits a ritual
 * that may already be free, and `copyritual` may copy the flag in.
 */

export const levels = { "ritual-needs-free": "error" };

export function check({ statements }, bag) {
  let block = null;

  for (const statement of statements) {
    if (statement.name === "newritual") {
      report(block, bag);
      block = { level: null, hasFree: false, copies: false };
      continue;
    }

    if (block) {
      if (statement.name === "level" && statement.args[0]?.type === "number") {
        block.level = statement;
      }
      if (statement.name === "free") block.hasFree = true;
      if (statement.name === "copyritual") block.copies = true;

      // Anything that moves the active object elsewhere ends the block.
      if (OPENERS[statement.name]) {
        report(block, bag);
        block = null;
      }
    }
  }

  report(block, bag);
}

function report(block, bag) {
  if (!block || block.hasFree || block.copies) return;
  if (!block.level || block.level.args[0].value <= 3) return;

  bag.report({
    rule: "ritual-needs-free",
    at: atCommand(block.level),
    message: `a level ${block.level.args[0].value} ritual crashes the game unless it is learned automatically`,
    hint: "rituals above level 3 need the `free` flag (play-tested); the base game never goes above level 3",
  });
}
