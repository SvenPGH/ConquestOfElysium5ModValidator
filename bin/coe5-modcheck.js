#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { lintSource } from "../src/linter.js";
import { lintMod, levels as projectLevels } from "../src/project.js";
import { defaultLevels } from "../src/rules/index.js";
import { reporters } from "../src/reporters.js";
import { meta } from "../src/catalog.js";

/**
 * Command line front end.
 *
 * Argument parsing is hand rolled to keep the package dependency free. The flag
 * set is small enough that a library would cost more than it saves.
 *
 * Exit codes: 0 clean, 1 problems found, 2 the tool was misused.
 */

const USAGE = `coe5-modcheck - validate Conquest of Elysium 5 mod files

  coe5-modcheck <path>...            a .c5m file, or a mod directory

Options
  -f, --format <name>   pretty (default), compact, github, json
  -r, --rule <id=level> override a rule: error, warning, info, off
  -q, --quiet           errors only
      --max-warnings N  exit non-zero if warnings exceed N
      --no-colour       plain output
      --rules           list every rule and its default level
      --version
`;

main();

function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) return exitWith(USAGE, 0);
  if (options.version) return exitWith(`coe5-modcheck, ${meta.commands} commands from ${meta.manual}\n`, 0);
  if (options.listRules) return exitWith(formatRuleList(), 0);
  if (options.error) return fail(options.error);
  if (options.paths.length === 0) return fail(USAGE);
  if (!reporters[options.format]) return fail(`unknown format ${options.format}`);

  const { diagnostics, sources } = run(options);
  const shown = options.quiet ? diagnostics.filter((d) => d.severity === "error") : diagnostics;
  const report = reporters[options.format](shown, sources, { colour: options.colour });

  if (report) process.stdout.write(report + "\n");

  // Counted from the full set, not the filtered view: --quiet hides warnings
  // from the output, it must not hide them from --max-warnings.
  const errors = diagnostics.filter((d) => d.severity === "error").length;
  const warnings = diagnostics.filter((d) => d.severity === "warning").length;
  process.exit(errors > 0 || warnings > options.maxWarnings ? 1 : 0);
}

function run({ paths, overrides }) {
  const diagnostics = [];
  const sources = new Map();

  for (const target of paths) {
    if (!fs.existsSync(target)) fail(`no such path: ${target}`);

    if (fs.statSync(target).isDirectory()) {
      diagnostics.push(...lintMod(target, { severity: overrides }));
      for (const file of fs.readdirSync(target).filter((f) => f.toLowerCase().endsWith(".c5m"))) {
        remember(sources, path.join(target, file));
      }
    } else {
      const source = remember(sources, target);
      diagnostics.push(...lintSource(source, { file: target, severity: overrides }));
    }
  }

  return { diagnostics, sources };
}

function remember(sources, file) {
  const source = fs.readFileSync(file, "utf8");
  sources.set(file, source.split(/\r?\n/));
  return source;
}

function parseArgs(argv) {
  const options = {
    paths: [],
    overrides: {},
    format: "pretty",
    quiet: false,
    maxWarnings: Infinity,
    colour: Boolean(process.stdout.isTTY) && !process.env.NO_COLOR,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    switch (arg) {
      case "-h":
      case "--help":
        options.help = true;
        break;
      case "--version":
        options.version = true;
        break;
      case "--rules":
        options.listRules = true;
        break;
      case "-f":
      case "--format":
        options.format = argv[++i];
        break;
      case "-q":
      case "--quiet":
        options.quiet = true;
        break;
      case "--no-colour":
      case "--no-color":
        options.colour = false;
        break;
      case "--max-warnings":
        options.maxWarnings = Number(argv[++i]);
        break;
      case "-r":
      case "--rule": {
        const [rule, level = "error"] = String(argv[++i]).split("=");
        options.overrides[rule] = level;
        break;
      }
      default:
        if (arg.startsWith("-")) options.error = `unknown option ${arg}`;
        else options.paths.push(arg);
    }
  }

  return options;
}

function formatRuleList() {
  return Object.entries({ ...defaultLevels, ...projectLevels })
    .map(([rule, level]) => `${rule.padEnd(26)} ${level}`)
    .join("\n") + "\n";
}

function exitWith(text, code) {
  process.stdout.write(text);
  process.exit(code);
}

function fail(message) {
  process.stderr.write(message.endsWith("\n") ? message : message + "\n");
  process.exit(2);
}
