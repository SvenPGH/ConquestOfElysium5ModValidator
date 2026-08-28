import { referenceArgs } from "../args.js";
import { atToken } from "../diagnostics.js";
import { label } from "../sections.js";

/**
 * Does the thing this argument names actually exist, and does it exist yet.
 *
 * Names resolve against the base game plus whatever the mod has defined *above*
 * the line doing the referring. Order matters here in a way it does not in most
 * formats: "modding a new weapon must be done before assigning it to a new
 * monster (or an existing monster) or the mod will crash".
 */

const KINDS = ["monster", "weapon", "item", "ritual", "class"];

export const levels = {
  "unknown-monster": "error",
  "unknown-weapon": "error",
  "unknown-item": "error",
  "unknown-ritual": "error",
  "unknown-class": "error",
  "use-before-define": "error",
  "bad-offset": "warning",
};

export function check({ statements, registry }, bag) {
  for (const { statement, token, arg } of referenceArgs(statements, KINDS)) {
    // Weapons and a few others also accept a raw engine index, which is a
    // different question and not one this rule answers.
    if (token.type !== "string") continue;

    const kind = arg.ref;
    const found = registry.resolve(kind, token.value);
    const at = atToken(statement, token);

    if (!found.known) {
      bag.report({
        rule: `unknown-${kind}`,
        at,
        message: `no ${label(kind)} named "${token.value}"`,
        hint: "not in the base game and not defined earlier in this mod",
      });
      continue;
    }

    if (isForwardReference(found, statement)) {
      bag.report({
        rule: "use-before-define",
        at,
        message: `"${token.value}" is not defined until line ${found.definedAt}`,
        hint: "mod commands run top to bottom, referring forward crashes the game",
      });
    }

    if (isOffsetOutOfRange(found)) {
      bag.report({
        rule: "bad-offset",
        at,
        message: `offset ${found.offset} but only ${found.copies} ${label(kind)}(s) named "${found.name}" are defined here`,
      });
    }
  }
}

/**
 * Base game names always exist by the time any mod line runs, so only a name
 * this mod defines can be referred to too early.
 */
function isForwardReference(found, statement) {
  return !found.inBaseGame && found.definedAt !== null && found.definedAt > statement.line;
}

/** Only checkable for mod defined names; the base game index is not tracked per name. */
function isOffsetOutOfRange(found) {
  return found.offset > 0 && !found.inBaseGame && found.definedAt !== null && found.offset >= found.copies;
}
