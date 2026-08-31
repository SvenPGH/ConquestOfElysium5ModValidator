import { lookupCommand } from "./catalog.js";

/**
 * Walking the argument lists is the same loop in three different rule modules,
 * so it lives here once.
 */

/**
 * Every argument the command table describes, paired with the token that filled
 * it. Extra arguments beyond the signature are skipped; the arity rule has
 * already complained about those.
 *
 * @param {import("./statements.js").Statement[]} statements
 * @returns {Generator<{statement: Statement, token: Token, arg: ArgSpec, index: number}>}
 */
export function* describedArgs(statements) {
  for (const statement of statements) {
    const spec = lookupCommand(statement.name);
    if (!spec) continue;

    for (const [index, token] of statement.args.entries()) {
      const arg = spec.args[index];
      if (arg) yield { statement, token, arg, index };
    }
  }
}

/**
 * Only the arguments that point at something which has to exist, filtered to
 * the reference kinds a rule cares about.
 *
 * @param {import("./statements.js").Statement[]} statements
 * @param {string[]} kinds
 */
export function* referenceArgs(statements, kinds) {
  for (const found of describedArgs(statements)) {
    // `self` refers to whatever kind the enclosing block defines: copyspr
    // copies from a monster in a monster block and an item in an item block.
    const ref = found.arg.ref === "self" ? found.statement.section : found.arg.ref;
    if (ref && kinds.includes(ref)) yield { ...found, arg: { ...found.arg, ref } };
  }
}

/**
 * @typedef {import("./statements.js").Statement} Statement
 * @typedef {import("./tokenizer.js").Token} Token
 * @typedef {{name: string, types: string[], optional: boolean, min?: number, max?: number, ref?: string}} ArgSpec
 */
