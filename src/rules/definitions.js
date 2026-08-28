import { atToken } from "../diagnostics.js";
import { label } from "../sections.js";

/**
 * Two things defined under one name.
 *
 * Legal, and the base game does it on purpose 137 times over for weapons alone.
 * Worth saying anyway, because every later bare reference silently resolves to
 * the first one and the author may not have meant that.
 */

export const levels = {
  "duplicate-name": "warning",
};

export function check({ registry }, bag) {
  for (const { kind, statement, token, firstSeen } of registry.duplicates) {
    bag.report({
      rule: "duplicate-name",
      at: atToken(statement, token),
      message: `a second ${label(kind)} named "${token.value}" (first on line ${firstSeen})`,
      hint: `references need the offset form <nbr>:"${token.value}" to reach this one`,
    });
  }
}
