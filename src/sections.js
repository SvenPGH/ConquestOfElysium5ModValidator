/**
 * The kinds of thing a mod command can be talking about, and the commands that
 * switch between them.
 *
 * A .c5m file is a flat command stream, not a nested document. The engine holds
 * one "active object" pointer. `newmonster` aims it at a fresh monster,
 * `selectclass 3` aims it at the Demonologist, and everything after that lands
 * on whatever it is currently aimed at:
 *
 *     newmonster "Bone Sentinel"
 *     hp 14                        applies to Bone Sentinel
 *     newweapon "Grave Iron"
 *     hp 14                        nonsense, weapons have no hit points
 *
 * The two `hp` lines are identical. Only the pointer tells them apart, which is
 * why tracking it is a pass of its own.
 */

/** Command name to the section it switches to. */
export const OPENERS = {
  newweapon: "weapon",
  selectweapon: "weapon",
  newitem: "item",
  selectitem: "item",
  newmonster: "monster",
  selectmonster: "monster",
  newclass: "class",
  selectclass: "class",
  selectterr: "terrain",
  selectterrgroup: "terrgroup",
  newritual: "ritual",
  selectritual: "ritual",
  newritpow: "ritual",
  playerevent: "event",
  squareevent: "event",
};

/**
 * Events are the only construct with a real terminator: "All events must end
 * with this command." Everything else runs until the pointer moves.
 */
export const CLOSERS = {
  endevent: "event",
};

export const SECTION_LABELS = {
  weapon: "weapon",
  item: "magic item",
  monster: "monster",
  class: "class",
  terrain: "terrain",
  terrgroup: "terrain group",
  ritual: "ritual",
  event: "event",
  mod: "mod",
};

/** A command that opens the given section, for use in hints. */
export function openerFor(section) {
  const found = Object.entries(OPENERS).find(([, target]) => target === section);
  return found ? found[0] : "a select command";
}

export function label(section) {
  return SECTION_LABELS[section] ?? section;
}
