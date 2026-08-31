import { atCommand } from "../diagnostics.js";

/**
 * Event conditions are tested in the order they are written, so a cheap,
 * highly selective check placed after an expensive one makes the engine do
 * the expensive work every time it fires. Play-tested example: with
 * +ownsloctarg first, the engine checks every square for every player every
 * turn; with +turnnbr first it is one check per player.
 *
 * The tiers are conservative: only conditions whose scope is unambiguous are
 * ranked, everything else is ignored rather than guessed.
 */

const TIER = {
  // constant for the whole turn
  "+turnnbr": 0, "+minturnnbr": 0, "+season": 0, "+seasondelay": 0,
  // one check per player
  "+player": 1, "+humanplayer": 1, "+aiplayer": 1, "+class": 1,
  // walks the squares of the map
  "+hasaffunithere": 2, "+hascomhere": 2, "+hasitemhere": 2, "+hasunithere": 2,
  "+squarename": 2, "+squareowner": 2, "+squareactivated": 2, "+terrain": 2,
  "+ownsloc": 2, "+ownsloctarg": 2, "+minterrains": 2, "+armyowner": 2,
};

export const levels = { "condition-order": "warning" };

export function check({ statements }, bag) {
  let costliest = null;

  for (const statement of statements) {
    if (statement.name === "playerevent" || statement.name === "squareevent") {
      costliest = null;
      continue;
    }

    const tier = TIER[statement.name];
    if (tier === undefined) continue;

    if (costliest !== null && tier < TIER[costliest]) {
      bag.report({
        rule: "condition-order",
        at: atCommand(statement),
        message: `\`${statement.name}\` is checked after the costlier \`${costliest}\``,
        hint: `event conditions run in the order written (play-tested) — moving \`${statement.name}\` before \`${costliest}\` skips the costlier check whenever it fails`,
      });
    }

    if (costliest === null || tier > TIER[costliest]) costliest = statement.name;
  }
}
