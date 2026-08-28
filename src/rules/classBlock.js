import { atCommand } from "../diagnostics.js";
import { OPENERS } from "../sections.js";

/**
 * The two class rules that no single line can express.
 *
 * setclassname "must be the first command after creating a new class", and
 * hometerr "is mandatory for a new class" because without a citadel "the player
 * will lose immediately when the game begins". Both need the whole block, which
 * runs from `newclass` to whatever moves the active object next.
 *
 * Only new classes are held to this. `selectclass` edits one that already has a
 * name and a home terrain.
 */

export const levels = {
  "setclassname-not-first": "warning",
  "class-missing-hometerr": "error",
};

export function check({ statements }, bag) {
  let block = null;

  for (const statement of statements) {
    if (statement.name === "newclass") {
      if (block) reportMissingHomeTerrain(block, bag);
      block = { opener: statement, expectingName: true, hasHomeTerrain: false };
      continue;
    }

    if (!block) continue;

    if (block.expectingName) {
      if (statement.name !== "setclassname") {
        bag.report({
          rule: "setclassname-not-first",
          at: atCommand(statement),
          message: "setclassname must be the first command after newclass",
          hint: `newclass is on line ${block.opener.line}`,
        });
      }
      block.expectingName = false;
    }

    if (statement.name === "hometerr") block.hasHomeTerrain = true;

    // Anything that moves the active object elsewhere ends the block.
    if (OPENERS[statement.name] && OPENERS[statement.name] !== "class") {
      reportMissingHomeTerrain(block, bag);
      block = null;
    }
  }

  if (block) reportMissingHomeTerrain(block, bag);
}

function reportMissingHomeTerrain(block, bag) {
  if (block.hasHomeTerrain) return;

  bag.report({
    rule: "class-missing-hometerr",
    at: atCommand(block.opener),
    message: "new class never sets `hometerr`",
    hint: "hometerr is mandatory, without a citadel the player loses on turn one",
  });
}
