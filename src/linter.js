import { readStatements } from "./statements.js";
import { buildRegistry } from "./registry.js";
import { DiagnosticBag } from "./diagnostics.js";
import { defaultLevels, ruleModules } from "./rules/index.js";

/**
 * Runs the rule set over one .c5m source.
 *
 * Three passes, in this order and for this reason:
 *   1. read      turn text into statements and note which object each applies to
 *   2. registry  collect every name the mod defines, and on which line
 *   3. rules     judge
 *
 * Two comes before three because the reference rules ask "does this exist, and
 * was it defined before this line", and the first half of that is unanswerable
 * while still walking forwards.
 *
 * @param {string} source
 * @param {{file?: string, mod?: boolean, severity?: Record<string, string>}} [options]
 * @returns {import("./diagnostics.js").Diagnostic[]}
 */
export function lintSource(source, options = {}) {
  const bag = new DiagnosticBag({ ...defaultLevels, ...options.severity }, options.file);

  const { statements, problems } = readStatements(source);
  const registry = buildRegistry(statements);
  const context = { statements, problems, registry, options };

  for (const rule of ruleModules) rule.check(context, bag);

  return bag.toArray();
}
