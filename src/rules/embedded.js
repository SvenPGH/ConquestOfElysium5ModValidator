import { referenceArgs } from "../args.js";
import { atToken } from "../diagnostics.js";
import { parseRecruitLimiter, parseSummonList } from "../grammar.js";

/**
 * Strings that are themselves little languages.
 *
 * Two of them: the summon list an `addstring` carries into a ritual, and the
 * `reclimiter` condition on a recruitment offer. Both hide monster names inside
 * a string, so nothing else in the checker would ever look at them.
 *
 * Warnings rather than errors, on both counts. addstring "is most often used to
 * set what is summoned ... but it depends on what effects are in the ritual",
 * so not every one of them is a summon list. And the base game data uses
 * qualifiers and sigils the manual never mentions, which is a good sign there
 * is more grammar here than anyone has written down.
 */

export const levels = {
  "summon-string": "warning",
  "reclimiter-string": "warning",
};

export function check({ statements, registry }, bag) {
  for (const { statement, token, arg } of referenceArgs(statements, ["summon", "reclimiter"])) {
    if (token.type !== "string") continue;

    if (arg.ref === "summon") checkSummonList(token.value, atToken(statement, token), registry, bag);
    else checkRecruitLimiter(token.value, atToken(statement, token), registry, bag);
  }
}

function checkSummonList(raw, at, registry, bag) {
  for (const entry of parseSummonList(raw)) {
    if (entry.empty) {
      bag.report({
        rule: "summon-string",
        at,
        message: `empty entry in "${raw}"`,
        hint: "entries are separated by a single &",
      });
      continue;
    }

    if (entry.malformed) {
      bag.report({
        rule: "summon-string",
        at,
        message: `unreadable count in "${entry.name}"`,
        hint: "counts look like 3*, 2d6*, 2d4+2*, or c* for a commander",
      });
      continue;
    }

    if (!registry.resolve("monster", entry.name).known) {
      bag.report({ rule: "summon-string", at, message: `no monster named "${entry.name}"` });
    }
  }
}

function checkRecruitLimiter(raw, at, registry, bag) {
  const condition = parseRecruitLimiter(raw);

  if (!condition) {
    bag.report({
      rule: "reclimiter-string",
      at,
      message: `reclimiter needs a leading sigil, got "${raw}"`,
      hint: "+Name requires it alive, -Name requires it absent, =Name requires an upgrade from it",
    });
    return;
  }

  if (!registry.resolve("monster", condition.name).known) {
    bag.report({
      rule: "reclimiter-string",
      at,
      message: `reclimiter names no known monster: "${condition.name}"`,
    });
  }
}
