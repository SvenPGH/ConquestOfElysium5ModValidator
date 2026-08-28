import { lookupCommand } from "../catalog.js";
import { atCommand } from "../diagnostics.js";
import { label, openerFor } from "../sections.js";

/**
 * Is this command talking to the right kind of object.
 *
 * `hometerr` inside a ritual block is not a syntax error and the engine will
 * not say a word about it; the line simply lands somewhere it makes no sense.
 */

export const levels = {
  "wrong-section": "error",
  "no-active-object": "error",
};

export function check({ statements }, bag) {
  for (const statement of statements) {
    const spec = lookupCommand(statement.name);
    if (!spec) continue; // the commands rule has already said so

    // Mod level commands (icon, description, sample, translation) set global
    // state instead of touching the active object, so they are legal anywhere.
    // Flagging `icon` inside a monster block would be a false positive.
    if (spec.sections.includes("mod")) continue;

    if (statement.section === null) {
      bag.report({
        rule: "no-active-object",
        at: atCommand(statement),
        message: `\`${statement.name}\` needs an active ${spec.sections.map(label).join(" or ")} but none has been selected`,
        hint: `open one first, for example ${openerFor(spec.sections[0])}`,
      });
      continue;
    }

    if (!spec.sections.includes(statement.section)) {
      bag.report({
        rule: "wrong-section",
        at: atCommand(statement),
        message: `\`${statement.name}\` applies to ${spec.sections.map(label).join("/")}, but the active object is a ${label(statement.section)}`,
      });
    }
  }
}
