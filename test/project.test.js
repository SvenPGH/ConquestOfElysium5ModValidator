import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { lintMod } from "../src/project.js";

/** Builds a throwaway mods/<name>/ directory. */
function scaffold(t, name, files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "modcheck-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const directory = path.join(root, name);
  fs.mkdirSync(directory);
  for (const [file, contents] of Object.entries(files)) {
    fs.writeFileSync(path.join(directory, file), contents);
  }
  return directory;
}

const rulesIn = (directory) => lintMod(directory).map((diagnostic) => diagnostic.rule).sort();

test("a well formed mod passes", (t) => {
  const directory = scaffold(t, "testmod", {
    "testmod.c5m": 'icon "banner.tga"\ndescription "a mod"\n',
    "banner.tga": "",
  });

  assert.deepEqual(rulesIn(directory), []);
});

test("a referenced asset must be in the directory", (t) => {
  const directory = scaffold(t, "testmod", {
    "testmod.c5m": 'icon "banner.tga"\ndescription "a mod"\n',
  });

  assert.deepEqual(rulesIn(directory), ["missing-asset"]);
});

test("the .c5m must be named after its directory", (t) => {
  const directory = scaffold(t, "testmod", {
    "other.c5m": 'icon "banner.tga"\ndescription "a mod"\n',
    "banner.tga": "",
  });

  assert.deepEqual(rulesIn(directory), ["mod-name-mismatch"]);
});

test("icon and description are required of a mod", (t) => {
  const directory = scaffold(t, "testmod", { "testmod.c5m": "modprio 5\n" });

  assert.deepEqual(rulesIn(directory), ["missing-description", "missing-icon"]);
});

test("a mod name with a space is rejected", (t) => {
  const directory = scaffold(t, "my mod", { "my mod.c5m": 'icon "b.tga"\ndescription "d"\n', "b.tga": "" });

  assert.deepEqual(rulesIn(directory), ["mod-name-illegal"]);
});

test("a sprite must be an image", (t) => {
  const directory = scaffold(t, "testmod", {
    "testmod.c5m": 'icon "banner.tga"\ndescription "d"\nselectterr 700\nspr "tile.bmp"\n',
    "banner.tga": "",
    "tile.bmp": "",
  });

  assert.deepEqual(rulesIn(directory), ["asset-format"]);
});
