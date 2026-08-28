# Contributing

## Running the tests

```
npm test
```

Node 18 or newer, no dependencies to install.

Five of the tests lint the base game's own data looking for false positives.
They skip themselves unless `reference/` is present (see below), so a clean
checkout runs 59 tests and skips 5.

## The reference files

`reference/` holds Illwinter's modding manual and Colonel Dracula's extraction of
the game data. Neither is redistributed here, so the folder is gitignored and you
have to assemble it yourself:

| file | where it comes from |
|---|---|
| `reference_coe5-modding-manual-v5_36.txt` | `pdftotext -layout` over `illwinter.com/coe5/coe5modding.pdf` |
| `reference_{weapon,magic-item,monster,class,terrain,recruitment,ritual}-data-v5_22_c5m.txt` | Colonel Dracula's data extraction, `.c5m` renamed to `.txt` |

The layout matters. `tools/build-commands.mjs` parses the manual as two columns
and depends on `pdftotext -layout` output specifically; a markdown conversion of
the PDF truncates partway through and is not usable.

## Regenerating the command tables

```
npm run build:data
```

Rebuilds `data/commands.json` and `data/vanilla.json`. Only needed when Illwinter
publishes a new manual or the game data extraction is updated for a newer
version. The generated files are committed, so nobody using the checker needs
any of this.

The generator merges three sources and records where every fact came from:

- the manual body, pp. 2-40, for argument signatures, argument names and ranges
- the manual index, pp. 41-47, for the full command list and a page-to-section fallback
- the data extraction, ~76k lines, for real arity, argument types, sections and usage counts

Where the manual and the game data disagree, **the merge widens rather than
picking a winner** and writes a `note` explaining the disagreement. `power` is
documented with one argument and used with two everywhere, so both are accepted.
Keep that rule if you touch the generator: both sources are primary, and quietly
resolving a conflict throws away the only evidence there was one.

## Adding a check

One module per concern in `src/rules/`. Each exports `levels` (its rule ids and
their default severity) and `check(context, bag)`, then gets a line in
`src/rules/index.js`.

Rules never do line and column arithmetic and never decide how loud a problem is.
They call `bag.report({ rule, at, message, hint })` with `at` from `atCommand`,
`atToken` or `atFileStart`, and `DiagnosticBag` resolves the configured severity
and sorts the output.

`context` carries `statements` (each tagged with the active object), `problems`
(what the parser found on the way through), `registry` (what the mod defines and
on which line) and `options`.

Pick a severity honestly. `error` means the game will crash, ignore the line, or
do something the author plainly did not intend. `warning` means it is suspicious
but the base game does it too, or the underlying behaviour is undocumented enough
that certainty is not available.

Add a test alongside it. The one that matters is `assertClean` on valid input:
finding mistakes is easy, staying quiet about correct mods is the hard part.

## Repository layout

`.gitattributes` marks `test/`, `tools/`, `reference/` and this file
`export-ignore`, so the archives GitHub generates for the download button and for
release assets contain only what a modder needs. A clone is unaffected and gets
everything.

That attribute is read from the commit being archived, so it only applies to tags
created after it was added.
