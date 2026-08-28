import * as syntax from "./syntax.js";
import * as commands from "./commands.js";
import * as scope from "./scope.js";
import * as definitions from "./definitions.js";
import * as references from "./references.js";
import * as values from "./values.js";
import * as embedded from "./embedded.js";
import * as classBlock from "./classBlock.js";
import * as manifest from "./manifest.js";

/**
 * The rule set, in the order it runs.
 *
 * Order is for readability of the output rather than correctness: diagnostics
 * come out sorted by position regardless. Every module exports `levels` (its
 * rule ids and their default severity) and `check(context, bag)`. Adding a rule
 * means adding a module and one line here.
 */
export const ruleModules = [
  syntax,
  commands,
  scope,
  definitions,
  references,
  values,
  embedded,
  classBlock,
  manifest,
];

/** Every rule id in the set, mapped to its default severity. */
export const defaultLevels = Object.assign({}, ...ruleModules.map((module) => module.levels));
