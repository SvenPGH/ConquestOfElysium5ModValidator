import fs from "node:fs";
import path from "node:path";
import { closestMatch } from "./suggest.js";

/**
 * Read-only access to the generated tables in data/.
 *
 * commands.json is built by tools/build-commands.mjs from the modding manual
 * and the base game data rips. vanilla.json holds every base game name keyed by
 * the engine's own index, plus the ritual school and resource type tables.
 * Nothing in here decides anything; it answers questions.
 */

const dataDir = path.join(import.meta.dirname, "..", "data");
const readTable = (file) => JSON.parse(fs.readFileSync(path.join(dataDir, file), "utf8"));

const table = readTable("commands.json");

/** Manual version, rip version, coverage counts. */
export const meta = table.meta;

/** command name -> { sections, signature, args, arity, pages, attested, notes } */
export const commands = table.commands;

export const vanilla = readTable("vanilla.json");

const commandNames = Object.keys(commands);

export function lookupCommand(name) {
  return commands[name] ?? null;
}

export function suggestCommand(name) {
  return closestMatch(name, commandNames);
}

/**
 * Names are compared case insensitively. The manual writes `2d6*spearman` for a
 * monster the game calls "Spearman", so the engine clearly folds case, and a
 * checker that did not would reject valid mods.
 */
export function fold(name) {
  return String(name).trim().toLowerCase();
}

/**
 * Invert an index -> name record into a folded name -> index map.
 *
 * First index wins on a collision, matching how the engine resolves a bare
 * name: a select command "always selects the first monster of that name", and
 * an offset is needed to reach any later one.
 */
function indexByName(record) {
  const map = new Map();
  for (const [index, name] of Object.entries(record)) {
    const key = fold(name);
    if (!map.has(key)) map.set(key, Number(index));
  }
  return map;
}

const baseGameNames = {
  monster: indexByName(vanilla.monsters),
  weapon: indexByName(vanilla.weapons),
  item: indexByName(vanilla.items),
  ritual: indexByName(vanilla.rituals),
  terrain: indexByName(vanilla.terrains),
  class: indexByName(vanilla.classes),
};

/**
 * Names the rips select without ever declaring. The extraction emits part of
 * the base game as edits to records it does not list, so these exist in the
 * game but carry no index.
 */
const alsoKnown = Object.fromEntries(
  Object.entries(vanilla.alsoKnown ?? {}).map(([kind, names]) => [kind, new Set(names.map(fold))]),
);

/** Does the base game ship something of this kind under this name? */
export function baseGameHas(kind, name) {
  const key = fold(name);
  return (baseGameNames[kind]?.has(key) ?? false) || (alsoKnown[kind]?.has(key) ?? false);
}

export function baseGameTerrain(number) {
  return vanilla.terrains[number];
}

export function baseGameClass(number) {
  return vanilla.classes[number];
}

/** Ritual school numbers the base game defines. */
export function isBaseGameRitualSchool(number) {
  return vanilla.ritpows.includes(number);
}

/** Resource type names, indexed by the number the mod format uses. */
export const resourceTypes = vanilla.resources;
