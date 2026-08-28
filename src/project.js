import fs from "node:fs";
import path from "node:path";
import { lintSource } from "./linter.js";
import { readStatements } from "./statements.js";
import { lookupCommand } from "./catalog.js";
import { DiagnosticBag, atFileStart, atToken } from "./diagnostics.js";
import { patterns } from "./grammar.js";

/**
 * Checks a mod as a shipped thing rather than as source: is it laid out the way
 * the loader expects, and is everything it names actually in the folder.
 *
 * "Everything in a mod (including the .c5m file) must be placed in a
 * subdirectory with the same name as your mod. The .c5m file must also have the
 * name of your mod plus '.c5m' at the end."
 */

export const levels = {
  "mod-name-mismatch": "error",
  "mod-name-illegal": "error",
  "missing-asset": "error",
  "asset-format": "warning",
  "no-mod-file": "error",
};

/** Commands whose string argument names a file that ships beside the .c5m. */
const ASSET_COMMANDS = new Set(["icon", "spr", "spr1", "spr2", "sample", "mapfile", "fontfile"]);

/** Of those, the ones that must be an image. */
const IMAGE_COMMANDS = new Set(["icon", "spr", "spr1", "spr2"]);

/**
 * @param {string} directory
 * @param {{severity?: Record<string, string>}} [options]
 * @returns {import("./diagnostics.js").Diagnostic[]}
 */
export function lintMod(directory, options = {}) {
  const bag = new DiagnosticBag({ ...levels, ...options.severity });
  const name = path.basename(path.resolve(directory));
  const entries = fs.readdirSync(directory);
  const modFiles = entries.filter((file) => file.toLowerCase().endsWith(".c5m"));

  checkLayout(directory, name, modFiles, bag);
  if (modFiles.length === 0) return bag.toArray();

  const diagnostics = [];
  const present = new Set(entries);

  for (const file of modFiles) {
    const full = path.join(directory, file);
    const source = fs.readFileSync(full, "utf8");

    diagnostics.push(...lintSource(source, { ...options, file: full, mod: true }));
    diagnostics.push(...checkAssets(source, full, present, options));
  }

  return [...bag.toArray(), ...diagnostics];
}

function checkLayout(directory, name, modFiles, bag) {
  if (!patterns.modName.test(name)) {
    bag.report({
      rule: "mod-name-illegal",
      at: atFileStart,
      message: `mod directory "${name}" has characters the loader rejects`,
      hint: "letters, digits, underscore and dot only, no spaces",
    });
  }

  if (modFiles.length === 0) {
    bag.report({ rule: "no-mod-file", at: atFileStart, message: `no .c5m file in ${directory}` });
    return;
  }

  if (!modFiles.includes(`${name}.c5m`)) {
    bag.report({
      rule: "mod-name-mismatch",
      at: atFileStart,
      message: `expected ${name}.c5m to match the directory name, found ${modFiles.join(", ")}`,
      hint: "the loader looks for mods/<name>/<name>.c5m, and filenames are case sensitive on Linux",
    });
  }
}

function checkAssets(source, file, present, options) {
  const bag = new DiagnosticBag({ ...levels, ...options.severity }, file);
  const { statements } = readStatements(source);

  for (const statement of statements) {
    if (!ASSET_COMMANDS.has(statement.name)) continue;
    const spec = lookupCommand(statement.name);

    for (const [index, token] of statement.args.entries()) {
      if (token.type !== "string") continue;

      const namesAFile = spec?.args[index]?.ref === "file" || patterns.assetFile.test(token.value);
      if (!namesAFile) continue;

      if (!present.has(token.value)) {
        bag.report({
          rule: "missing-asset",
          at: atToken(statement, token),
          message: `${token.value} is referenced but not in the mod directory`,
        });
      }

      // A .tga with no transparent pixels gets black read as transparent and
      // magenta as shadow. Not something a filename can tell you, but the
      // extension can at least be wrong.
      if (IMAGE_COMMANDS.has(statement.name) && !patterns.imageFile.test(token.value)) {
        bag.report({
          rule: "asset-format",
          at: atToken(statement, token),
          message: `${token.value} is not a .tga or .png`,
          hint: "TGA must be 24 or 32 bit, uncompressed or RLE",
        });
      }
    }
  }

  return bag.toArray();
}
