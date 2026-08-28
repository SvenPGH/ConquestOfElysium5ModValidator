/**
 * Every pattern that encodes something about the .c5m format lives here, named.
 *
 * The rule for what belongs in this file: if the pattern describes the mod
 * format, it goes here. If it is incidental mechanics (testing for whitespace,
 * splitting a path) it stays where it is used. A regex dictionary that hoovers
 * up `/\s/` costs more than it saves.
 *
 * The parse helpers at the bottom are here for the same reason. A raw regex
 * tells you the shape of a summon list; `parseSummonList` tells you what the
 * pieces mean.
 */

export const patterns = {
  /** An argument the engine reads as a number. Signs are allowed, decimals are not. */
  integer: /^[+-]?\d+$/,

  /** Command names are lower case. Event triggers carry a leading + or -. */
  commandName: /^[+-]?[a-z][a-z0-9_]*$/,

  /** Word processor quotes. The engine only knows the ASCII one. */
  smartQuote: /[\u2018\u2019\u201c\u201d]/,

  /** Mod directory and file name. "must not include any spaces or special characters (underscore and dot is allowed)". */
  modName: /^[A-Za-z0-9_.]+$/,

  /** Files that ship inside the mod directory and are named from the .c5m. */
  assetFile: /\.(tga|png|sw|sw2|ttf|coem)$/i,

  /** Sprites and banners are Targa or PNG, nothing else. */
  imageFile: /\.(tga|png)$/i,

  /**
   * Offset prefix on a name reference, written inside the quotes: "1:spearman"
   * reaches the second monster called spearman. Offsets count from 0.
   */
  nameOffset: /^(\d+):([\s\S]*)$/,

  /** `2:"Spearman"` with the offset outside the quotes. Common slip, worth a hint. */
  offsetOutsideQuotes: /^\d+:$/,

  /**
   * Leading qualifier on a summon entry: (-)Emperor, (-110)Se'ir, (!)Homunculus.
   * Used all over the shipped game data, documented nowhere, so it is accepted
   * and skipped rather than interpreted.
   */
  summonQualifier: /^\([^)]*\)/,

  /** Count prefix: 3*, 2d6*, 2d4+2*, or c* for a commander. */
  summonCount: /^(?:c|\d+|\d+d\d+(?:[+-]\d+)?)\*/,

  /**
   * An addstring naming a magic item for ritequipall rather than a monster to
   * summon. Undocumented, but the base game data uses it.
   */
  summonEquipment: /^\|/,

  /** reclimiter sigil. +alive, -absent, =upgraded from. $ is undocumented but shipped. */
  recruitSigil: /^([+\-=$])(.+)$/,
};

/**
 * Split an optional offset off a name reference.
 * @returns {{offset: number, name: string}}
 */
export function splitOffset(raw) {
  const match = patterns.nameOffset.exec(raw);
  return match ? { offset: Number(match[1]), name: match[2] } : { offset: 0, name: raw };
}

/**
 * Break a summon list into its entries.
 *
 * The manual's examples: "1d6*Goblin", "c*Captain & 2d6*spearman & 2d4+2*Archer",
 * and a bare "Purple Worm".
 *
 * @returns {Array<{name: string, count: string|null, malformed: boolean, empty: boolean}>}
 */
export function parseSummonList(raw) {
  if (patterns.summonEquipment.test(raw)) return [];

  const body = raw.replace(patterns.summonQualifier, "");
  if (!body.trim()) return [];

  return body.split("&").map((chunk) => {
    const entry = chunk.trim();
    if (!entry) return { name: "", count: null, malformed: false, empty: true };

    const count = patterns.summonCount.exec(entry);
    if (!count) {
      // A star with nothing recognisable in front of it is a broken count,
      // not a monster whose name happens to contain a star.
      const malformed = entry.includes("*");
      return { name: malformed ? entry : entry, count: null, malformed, empty: false };
    }
    return { name: entry.slice(count[0].length), count: count[0].slice(0, -1), malformed: false, empty: false };
  });
}

/**
 * Split a reclimiter string into its sigil and the monster it names.
 * @returns {{sigil: string, name: string}|null} null when the sigil is missing
 */
export function parseRecruitLimiter(raw) {
  const match = patterns.recruitSigil.exec(raw);
  return match ? { sigil: match[1], name: match[2] } : null;
}
