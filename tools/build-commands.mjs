#!/usr/bin/env node
// Regenerates data/commands.json from Illwinter's modding manual (text extraction)
// and Colonel Dracula's vanilla data rips.
//
//   node tools/build-commands.mjs <reference-dir> [out-dir]
//
// The reference dir must contain:
//   reference_coe5-modding-manual-v5_36.txt
//   reference_{weapon,magic-item,monster,class,terrain,recruitment,ritual}-data-v5_22_c5m.txt
//
// Three sources are merged, in this order of authority:
//   1. manual body       - argument signatures, canonical spelling
//   2. manual index      - command existence, page -> section fallback
//   3. vanilla rips      - real arity/type/section evidence, 76k lines of it
// Where the manual and the rips disagree the merge widens rather than picks,
// and records a `note`. Nothing here is inferred from anywhere else.

import fs from "node:fs";
import path from "node:path";
import { tokenizeLine } from "../src/tokenizer.js";

const REF = process.argv[2];
const OUT = process.argv[3] ?? path.join(import.meta.dirname, "..", "data");
if (!REF) {
  console.error("usage: build-commands.mjs <reference-dir> [out-dir]");
  process.exit(2);
}

const MANUAL = "reference_coe5-modding-manual-v5_36.txt";
const RIPS = {
  weapon: "reference_weapon-data-v5_22_c5m.txt",
  item: "reference_magic-item-data-v5_22_c5m.txt",
  monster: "reference_monster-data-v5_22_c5m.txt",
  class: "reference_class-data-v5_22_c5m.txt",
  terrain: "reference_terrain-data-v5_22_c5m.txt",
  recruitment: "reference_recruitment-data-v5_22_c5m.txt",
  ritual: "reference_ritual-data-v5_22_c5m.txt",
};

const OPENERS = {
  newweapon: "weapon", selectweapon: "weapon",
  newitem: "item", selectitem: "item",
  newmonster: "monster", selectmonster: "monster",
  newclass: "class", selectclass: "class",
  selectterr: "terrain", selectterrgroup: "terrgroup",
  newritual: "ritual", selectritual: "ritual", newritpow: "ritual",
  playerevent: "event", squareevent: "event",
};

const read = (f) => fs.readFileSync(path.join(REF, f), "utf8").split(/\r?\n/);

/**
 * Split a pdftotext -layout line into its column segments.
 *
 * The manual is a two-column PDF, so one text line holds fragments of two
 * unrelated passages. Column width varies page to page, so there is no fixed
 * split point - but a run of three or more spaces never occurs inside a real
 * signature, whose arguments are single-spaced. That makes the gap itself the
 * delimiter.
 */
function segments(line) {
  const out = [];
  let col = 0;
  for (const part of line.split(/\s{3,}/)) {
    const start = line.indexOf(part, col);
    if (part.trim()) out.push({ text: part.trim(), col: start + (part.length - part.trimStart().length) });
    col = start + part.length;
  }
  return out;
}

// ---------------------------------------------------------------- manual index
// The alphabetical index on pp.41-47 is the cheapest complete list of command
// names. It is not fully complete - humancost, mercboost and mercpricemult are
// documented in the body but missing from it - so it seeds the vocabulary
// rather than defining it.
const manualLines = read(MANUAL);
const indexStart = manualLines.findIndex((l) => /addstring 33\s+ape 20/.test(l));
if (indexStart < 0) throw new Error("could not locate the alphabetical index in the manual");

const index = {};
for (let i = indexStart; i < manualLines.length; i++) {
  for (const s of segments(manualLines[i])) {
    const e = /^([+-]?[a-z][a-z0-9_]*)\s+((?:\d+,\s*)*\d+)$/.exec(s.text);
    if (e) index[e[1]] = e[2].split(/,\s*/).map(Number);
  }
}

// ----------------------------------------------------------------- manual body
// Definitions are recognised structurally: a column segment consisting of a
// command name followed by nothing but argument tokens (<angled>, "quoted",
// [optional], or a | alternation). Prose never has that shape. A following
// segment of pure argument tokens at the same column is a wrapped signature and
// gets appended - that is how `addunitrec`'s trailing <iron> is recovered.
const ARG = String.raw`(?:<[^>]*>|\[[^\]]*\]|"[^"]*"|“[^”]*”|\|)`;
const DEF = new RegExp(String.raw`^([+-]?[a-z][a-z0-9_]*)((?:\s+${ARG})*)$`);
const CONT = new RegExp(String.raw`^(?:${ARG}\s*)+$`);

const body = new Map();
{
  let page = 1;
  let last = null;
  for (let i = 0; i < indexStart; i++) {
    const line = manualLines[i];
    if (line.includes("\f")) page++;
    for (const s of segments(line)) {
      const d = DEF.exec(s.text);
      if (d) {
        const rec = { page, line: i + 1, sig: d[2].trim().replace(/[“”]/g, '"') };
        if (!body.has(d[1])) body.set(d[1], []);
        body.get(d[1]).push(rec);
        last = { at: i, col: s.col, ref: body.get(d[1]).at(-1) };
        continue;
      }
      if (last && i - last.at <= 1 && Math.abs(s.col - last.col) <= 2 && CONT.test(s.text)) {
        last.ref.sig = (last.ref.sig + " " + s.text.replace(/[“”]/g, '"')).trim();
        last = null;
      }
    }
  }
}

// ---------------------------------------------------------------- vanilla rips
// The data rips are the base game's own content expressed in mod format, which
// makes them ~76k lines of known-valid source. They give real arity, real
// argument types and real section for every command the base game uses, plus
// the name and index of every monster, weapon, item, ritual, terrain and class.
const usage = {};
const vanilla = {
  monsters: {}, weapons: {}, items: {}, rituals: {}, terrains: {}, classes: {},
  alsoKnown: { monster: [], weapon: [], item: [], ritual: [] },
};
for (const [ctx, file] of Object.entries(RIPS)) {
  let cur = ctx;
  let terr = null;
  let cls = null;
  let inString = false;
  for (const line of read(file)) {
    if (inString) { if (line.includes('"')) inString = false; continue; }
    const { tokens: toks, comment } = tokenizeLine(line);
    if (!toks.length) continue;
    if (toks.some((t) => t.type === "unterminated")) inString = true;
    if (toks[0].type !== "word") continue;
    const cmd = toks[0].value;
    const args = toks.slice(1);
    if (OPENERS[cmd]) cur = OPENERS[cmd];

    // The rips carry the engine's own index for each record in a trailing comment.
    const nbr = /^#\s*(\d+)/.exec(comment ?? "")?.[1];
    const record = (bag) => { if (args[0]?.type === "string" && nbr !== undefined) bag[nbr] = args[0].value; };
    // Names the rips select but never declare. The extraction emits some base
    // game content as edits to records it does not list, so these names exist
    // in the game without appearing after a new* command.
    const SELECTORS = { selectmonster: "monster", selectweapon: "weapon", selectitem: "item", selectritual: "ritual" };
    if (SELECTORS[cmd] && args[0]?.type === "string") vanilla.alsoKnown[SELECTORS[cmd]].push(args[0].value);

    if (cmd === "newmonster") record(vanilla.monsters);
    if (cmd === "newweapon") record(vanilla.weapons);
    if (cmd === "newitem") record(vanilla.items);
    if (cmd === "newritual") record(vanilla.rituals);
    if (cmd === "newclass" && nbr !== undefined) cls = Number(nbr);
    if (cmd === "selectterr" && args[0]?.type === "number") terr = args[0].value;
    if (cmd === "name" && cur === "terrain" && terr !== null && args[0]?.type === "string") vanilla.terrains[terr] = args[0].value;
    if (cmd === "selectclass" && args[0]?.type === "number") cls = args[0].value;
    if (cmd === "setclassname" && cls !== null && args[0]?.type === "string") vanilla.classes[cls] = args[0].value;

    const shape = args.map((t) => (t.type === "string" || t.type === "unterminated" ? "s" : t.type === "number" ? "n" : "w")).join("");
    const u = (usage[cmd] ??= { n: 0, ctx: {}, shapes: {} });
    u.n++;
    u.ctx[cur] = (u.ctx[cur] ?? 0) + 1;
    u.shapes[shape] = (u.shapes[shape] ?? 0) + 1;
  }
}





// ------------------------------------------------------------ reference kinds
// Which arguments name something that must already exist. Derived from the arg
// names the manual itself uses, with an explicit exception list for the commands
// that *create* a name rather than refer to one.
const DEFINES = new Set(["newmonster", "newweapon", "newitem", "newritual", "newclass", "newritpow"]);

function referenceKind(cmd, arg) {
  const n = arg.name;
  const str = arg.types.includes("str");
  if (DEFINES.has(cmd)) return null;
  if (cmd === "reclimiter") return "reclimiter";
  if (str && (cmd === "addstring" || cmd === "combatsum" || cmd === "newunits")) return "summon";
  if (/^(monster name|monster|from monster|to monster|commander's name)$/.test(n)) return "monster";
  if (/^(weapon|weapon name)$/.test(n)) return "weapon";
  if (n === "item name") return "item";
  if (n === "class name" && cmd !== "setclassname") return "class";
  if (n === "name" && (cmd === "selectritual" || cmd === "copyritual")) return "ritual";
  if (/^(terrain nbr|terr nbr)$/.test(n)) return "terrain";
  if (n === "class nbr") return "classnbr";
  if (n === "pow nbr") return "ritpow";
  if (n === "resource type") return "resource";
  if (/^(player|player nbr|player number)$/.test(n)) return "player";
  if (/\.(tga|png|sw|ttf|coem)$/.test(n)) return "file";
  return null;
}

// ----------------------------------------------------------------------- merge
const pageSections = (p) => {
  if (p <= 3) return ["mod"];
  if (p <= 9) return ["weapon"];
  if (p <= 12) return ["item"];
  if (p === 13) return ["item", "monster"];
  if (p <= 26) return ["monster"];
  if (p <= 28) return ["class"];
  if (p <= 31) return ["terrain"];
  if (p === 32) return ["terrgroup", "ritual"];
  if (p <= 37) return ["ritual"];
  if (p === 38) return ["mod", "event"];
  return ["event"];
};

// Signatures the two-column text extraction cannot recover, transcribed from the
// manual body by hand. Keep this list as short as it is auditable.
const SIGNATURE_FIXUPS = {
  promoteunits: '<player> <max amount> "from monster" "to monster"', // p39, wraps mid-quote
};

function parseSignature(sig) {
  const out = [];
  const re = /<([^>]*)>|\[([^\]]*)\]|"([^"]*)"|(\|)/g;
  let m;
  let alternative = false;
  while ((m = re.exec(sig))) {
    if (m[4]) { alternative = true; continue; }
    let name, types, optional = false;
    if (m[1] !== undefined) { name = m[1]; types = ["int"]; }
    else if (m[3] !== undefined) { name = m[3]; types = ["str"]; }
    else {
      optional = true;
      const inner = /<([^>]*)>|"([^"]*)"/.exec(m[2]);
      if (inner?.[1] !== undefined) { name = inner[1]; types = ["int"]; }
      else if (inner?.[2] !== undefined) { name = inner[2]; types = ["str"]; }
      else { name = m[2]; types = ["int"]; }
    }
    if (alternative && out.length) {
      for (const t of types) if (!out.at(-1).types.includes(t)) out.at(-1).types.push(t);
      alternative = false;
      continue;
    }
    const range = /(?:^|\s)(-?\d+)\s*-\s*(-?\d+)$/.exec(name);
    out.push({ name, types, optional, ...(range ? { min: +range[1], max: +range[2] } : {}) });
  }
  return out;
}

const names = new Set([...Object.keys(index), ...Object.keys(usage)]);
for (const [c, recs] of body) if (recs.some((r) => r.sig)) names.add(c);

const commands = {};
for (const name of [...names].sort()) {
  const recs = body.get(name) ?? [];
  // Several commands appear both in the p3 example mod and in their own section.
  // Prefer the record the index points at, and the one whose page section agrees
  // with where the rips actually use the command.
  const ctxKeys = new Set(Object.keys(usage[name]?.ctx ?? {}));
  const score = (r) =>
    (index[name]?.includes(r.page) ? 2 : 0) +
    (pageSections(r.page).some((s) => ctxKeys.has(s)) ? 2 : 0) +
    (r.sig ? 1 : 0) +
    // The manual's worked examples sit on the same page as the definitions they
    // illustrate. Real signatures name their arguments generically and in lower
    // case ("weapon name"); examples use proper nouns ("Magic Javelin").
    (/"[^"]*[A-Z]/.test(r.sig) ? -3 : 0);
  const chosen = recs.length ? recs.reduce((a, b) => (score(b) > score(a) ? b : a)) : undefined;
  const sig = SIGNATURE_FIXUPS[name] ?? chosen?.sig ?? "";
  const args = parseSignature(sig);
  const notes = [];

  let arity = { min: args.filter((a) => !a.optional).length, max: args.length };

  // Merge policy: widen, never pick a winner. The manual and the rips are both
  // primary sources, and where they disagree the honest reading is that both
  // forms load. Every widening records a note so the disagreement stays visible
  // instead of being quietly resolved.
  const u = usage[name];
  if (u) {
    const shapes = Object.keys(u.shapes);
    const vMin = Math.min(...shapes.map((s) => s.length));
    const vMax = Math.max(...shapes.map((s) => s.length));
    if (vMin < arity.min) {
      notes.push(`manual shows ${arity.min} required arg(s); vanilla omits down to ${vMin}`);
      for (let i = vMin; i < args.length; i++) args[i].optional = true;
      arity.min = vMin;
    }
    if (vMax > arity.max) {
      notes.push(`manual documents ${arity.max} arg(s); all vanilla uses pass up to ${vMax}`);
      for (let i = args.length; i < vMax; i++) {
        const seen = [...new Set(shapes.map((sh) => sh[i]).filter(Boolean))]
          .map((ch) => (ch === "s" ? "str" : ch === "n" ? "int" : "word"));
        args.push({ name: `arg${i + 1}`, types: seen.length ? seen : ["int", "str"], optional: true, undocumented: true });
      }
      arity.max = vMax;
    }
    // widen declared types with what vanilla actually passes
    for (const shape of shapes) {
      [...shape].forEach((ch, i) => {
        const want = ch === "s" ? "str" : ch === "n" ? "int" : "word";
        const a = args[i];
        if (a && !a.types.includes(want)) {
          a.types.push(want);
          notes.push(`arg ${i + 1} (${a.name}) documented as ${a.types.filter((t) => t !== want).join("|")}, vanilla also passes ${want}`);
        }
      });
    }
  }
  if (!sig && !u) arity = { min: 0, max: 0 };
  if (!sig && u) {
    // Documented as a bare flag, but the rips spell the enable value out ("An argument
    // of <0-1> means 0=disabled, 1=enabled"). Accept both forms.
    const shapes = Object.keys(u.shapes);
    const vMax = Math.max(...shapes.map((s) => s.length));
    arity = { min: 0, max: vMax };
    for (let i = 0; i < vMax; i++) args.push({ name: i === 0 ? "0-1" : `arg${i + 1}`, types: ["int", "str"], optional: true, undocumented: true });
    if (vMax > 0) notes.push("manual documents this as a bare flag; the rips pass an explicit on/off value");
  }

  const pages = [...new Set([...(index[name] ?? []), ...recs.map((r) => r.page)])].sort((a, b) => a - b);
  const fromPages = [...new Set(pages.flatMap(pageSections))];
  const fromUsage = u ? Object.keys(u.ctx) : [];
  // Page 38 carries three headings at once (Sound Sample / Misc / Events), so the
  // page->section fallback cannot separate them. Split by the manual's own headings.
  const OVERRIDE = {
    sample: ["mod"], sampleismusic: ["mod"], sampleisloopmusic: ["mod"], playercolor: ["mod"],
    playerevent: ["event"], squareevent: ["event"], endevent: ["event"],
  };
  // Union, not pick: the rips only prove where a command *is* used, never where it
  // is forbidden. Widening keeps the checker from crying wrong-section on legal code.
  const sections = name.startsWith("+") || name.startsWith("-")
    ? ["event"]
    : (OVERRIDE[name] ?? [...new Set([...fromUsage, ...fromPages])]);

  for (const a of args) {
    const kind = referenceKind(name, a);
    if (kind) a.ref = kind;
  }

  commands[name] = {
    sections: [...sections].sort(),
    signature: sig,
    args,
    arity,
    pages,
    documented: pages.length > 0,
    attested: u ? u.n : 0,
    ...(notes.length ? { notes: [...new Set(notes)] } : {}),
  };
}

for (const kind of Object.keys(vanilla.alsoKnown)) {
  vanilla.alsoKnown[kind] = [...new Set(vanilla.alsoKnown[kind])];
}

// Ritual school (pow) numbers the base game actually defines. The manual points at
// a "Ritual Schools" table for these; this is the same set, read off the rip.
vanilla.ritpows = [...new Set(
  read(RIPS.ritual).map((l) => /^ritpow\s+(\d+)/.exec(l)?.[1]).filter(Boolean).map(Number)
)].sort((a, b) => a - b);

// Resource Types table, manual p29.
vanilla.resources = ["gold", "iron", "herbs", "fungus", "sacr", "hands", "weed", "fire", "water",
  "air", "earth", "trade", "relics", "lifeforce", "human corpses", "gems", "expendable units",
  "corpses", "goblins"];

// The extraction writes `siegeable` for what the game calls `walls`.
if (commands.siegeable) {
  commands.walls.attested += commands.siegeable.attested;
  delete commands.siegeable;
}

const meta = {
  generated: new Date().toISOString().slice(0, 10),
  manual: "Illwinter CoE5 Modding Manual v5.36",
  rips: "Colonel Dracula CoE5 data extraction v5.22",
  commands: Object.keys(commands).length,
  documented: Object.values(commands).filter((c) => c.documented).length,
  attested: Object.values(commands).filter((c) => c.attested > 0).length,
};

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "commands.json"), JSON.stringify({ meta, commands }, null, 1));
fs.writeFileSync(path.join(OUT, "vanilla.json"), JSON.stringify(vanilla, null, 1));
console.log(meta);
console.log("vanilla names:", Object.fromEntries(Object.entries(vanilla).map(([k, v]) => [k, Array.isArray(v) ? v.length : Object.keys(v).length])));
