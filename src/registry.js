import { fold, baseGameHas } from "./catalog.js";
import { splitOffset } from "./grammar.js";

/**
 * What the mod itself defines, and where.
 *
 * Built in a pass of its own before any rule runs, because the reference rules
 * ask "does this name exist, and was it defined before this line?" and you
 * cannot answer the first half while still walking forwards.
 *
 * This module gathers facts and passes no judgement. Duplicate definitions are
 * recorded, not reported; deciding whether a duplicate is a problem belongs to
 * a rule.
 */

/** Commands that introduce a name. Classes and terrains are numbered, not named. */
const DEFINING_COMMANDS = {
  newmonster: "monster",
  newweapon: "weapon",
  newitem: "item",
  newritual: "ritual",
};

/**
 * @param {import("./statements.js").Statement[]} statements
 */
export function buildRegistry(statements) {
  const defined = { monster: new Map(), weapon: new Map(), item: new Map(), ritual: new Map() };
  const terrains = new Set();
  const duplicates = [];
  let ritualSchools = 0;

  for (const statement of statements) {
    const kind = DEFINING_COMMANDS[statement.name];

    if (kind) {
      recordDefinition(defined[kind], kind, statement, duplicates);
      continue;
    }

    // Terrains 500-999 are the modder's range; anything lower is the base game
    // being edited rather than a new terrain being made.
    if (statement.name === "selectterr" && statement.args[0]?.type === "number") {
      const number = statement.args[0].value;
      if (number >= 500) terrains.add(number);
      continue;
    }

    if (statement.name === "newritpow") ritualSchools++;
  }

  return {
    duplicates,

    /**
     * Resolve a name reference, offset prefix and all.
     * @returns {{name: string, offset: number, inBaseGame: boolean, definedAt: number|null, copies: number, known: boolean}}
     */
    resolve(kind, raw) {
      const { offset, name } = splitOffset(raw);
      const entry = defined[kind]?.get(fold(name)) ?? null;
      const inBaseGame = baseGameHas(kind, name);

      return {
        name,
        offset,
        inBaseGame,
        definedAt: entry ? entry.line : null,
        copies: entry ? entry.copies : 0,
        known: inBaseGame || entry !== null,
      };
    },

    definesTerrain(number) {
      return terrains.has(number);
    },

    /** Ritual schools are back-referenced relatively: 0 is the last one, -1 the one before. */
    definesRitualSchool(offset) {
      return offset <= 0 && -offset < ritualSchools;
    },
  };
}

function recordDefinition(bucket, kind, statement, duplicates) {
  const nameToken = statement.args[0];
  if (nameToken?.type !== "string") return;

  const key = fold(nameToken.value);
  const existing = bucket.get(key);

  if (existing) {
    existing.copies++;
    duplicates.push({ kind, statement, token: nameToken, firstSeen: existing.line });
    return;
  }

  bucket.set(key, { line: statement.line, copies: 1 });
}
