#!/usr/bin/env node
// Keeps the Make custom app and this repository in sync.
//
//   node scripts/make-app.mjs pull              download every component into src/
//   node scripts/make-app.mjs push [--dry-run]  upload what changed in src/ (creates missing components)
//   node scripts/make-app.mjs push --force      upload every section, changed or not
//   node scripts/make-app.mjs validate          check src/ offline (also run in CI)
//
// Secrets never enter the repository: the app's and connections' "common" data is skipped.

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseJsonc } from "./lib/jsonc.mjs";
import { listOf, loadDotEnv, MakeApi } from "./lib/make-api.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src");
const manifest = JSON.parse(readFileSync(join(ROOT, "make-app.json"), "utf8"));
const APP = manifest.app.name;
const VERSION = manifest.app.version;
const appPath = `/sdk/apps/${APP}/${VERSION}`;

const APP_SECTIONS = ["base", "groups", "install", "installSpec"];
const APP_META = ["label", "description", "theme", "language", "countries", "audience"];

/** How each kind of component is listed, addressed and split into files. */
const COMPONENTS = {
  connections: {
    list: `/sdk/apps/${APP}/connections`,
    item: (name) => `/sdk/apps/connections/${name}`,
    create: `/sdk/apps/${APP}/connections`,
    sections: ["api", "parameters", "scopes", "scope", "install", "installSpec"],
    meta: ["name", "label", "type"],
    editable: ["label"],
  },
  webhooks: {
    list: `/sdk/apps/${APP}/webhooks`,
    item: (name) => `/sdk/apps/webhooks/${name}`,
    create: `/sdk/apps/${APP}/webhooks`,
    sections: ["api", "parameters", "attach", "detach", "update", "scope"],
    meta: ["name", "label", "type", "connection", "altConnection"],
    editable: ["label", "connection", "altConnection"],
  },
  rpcs: {
    list: `${appPath}/rpcs`,
    item: (name) => `${appPath}/rpcs/${name}`,
    create: `${appPath}/rpcs`,
    sections: ["api", "parameters"],
    meta: ["name", "label", "connection", "altConnection"],
    editable: ["label", "connection", "altConnection"],
  },
  modules: {
    list: `${appPath}/modules`,
    item: (name) => `${appPath}/modules/${name}`,
    create: `${appPath}/modules`,
    sections: ["api", "epoch", "parameters", "expect", "interface", "samples", "scope"],
    meta: [
      "name",
      "label",
      "description",
      "typeId",
      "connection",
      "altConnection",
      "webhook",
      "crud",
    ],
    // typeId can change (an action that lists becomes a search); Make allows it on PATCH.
    editable: ["label", "description", "typeId", "connection", "altConnection", "webhook", "crud"],
  },
  functions: {
    list: `${appPath}/functions`,
    item: (name) => `${appPath}/functions/${name}`,
    create: `${appPath}/functions`,
    // Function bodies are JavaScript, kept as .js files.
    code: ["code", "test"],
    sections: [],
    meta: ["name"],
    editable: [],
  },
};

const MODULE_TYPES = new Set([1, 4, 9, 10, 11, 12]);

// ---------------------------------------------------------------- helpers

function write(file, text) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text.endsWith("\n") ? text : `${text}\n`);
}

/** Pretty JSON when Make returns JSON; the exact text when it returns JSONC. */
function formatSection(text) {
  try {
    return `${JSON.stringify(JSON.parse(text), null, 4)}\n`;
  } catch {
    return text;
  }
}

/** Make returns {} or [] for a section nobody filled in; those stay out of src/. */
function isEmpty(text) {
  const t = (text ?? "").replace(/\s+/g, "");
  return t === "" || t === "null" || t === "{}" || t === "[]";
}

function pick(object, keys) {
  return Object.fromEntries(keys.filter((k) => object[k] !== undefined).map((k) => [k, object[k]]));
}

function same(a, b) {
  const canon = (v) =>
    JSON.stringify(v, (_, x) =>
      x && typeof x === "object" && !Array.isArray(x)
        ? Object.fromEntries(Object.entries(x).sort(([p], [q]) => p.localeCompare(q)))
        : x,
    );
  return canon(a) === canon(b);
}

function dirs(path) {
  return existsSync(path)
    ? readdirSync(path, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
        .sort()
    : [];
}

function api() {
  loadDotEnv(ROOT);
  return new MakeApi({ zone: process.env.MAKE_ZONE ?? manifest.zone, token: process.env.MAKE_API_TOKEN });
}

// ---------------------------------------------------------------- pull

async function pull() {
  const make = api();
  const info = await make.json("GET", appPath);
  const app = info.app ?? info.appVersion ?? info;
  write(join(SRC, "app.json"), JSON.stringify(pick(app, APP_META), null, 4));

  for (const section of APP_SECTIONS) {
    const text = await make.section(`${appPath}/${section}`);
    if (!isEmpty(text)) write(join(SRC, `${section}.jsonc`), formatSection(text));
  }
  const readme = await make.section(`${appPath}/readme`);
  if (!isEmpty(readme)) {
    let body = readme;
    try {
      const parsed = JSON.parse(readme);
      body = typeof parsed === "string" ? parsed : (parsed.readme ?? parsed.content ?? readme);
    } catch {
      /* plain markdown */
    }
    write(join(SRC, "readme.md"), body);
  }

  for (const [kind, spec] of Object.entries(COMPONENTS)) {
    const items = listOf(await make.json("GET", spec.list).catch(() => []));
    for (const item of items) {
      const dir = join(SRC, kind, item.name);
      write(join(dir, "component.json"), JSON.stringify(pick(item, spec.meta), null, 4));
      for (const section of spec.sections) {
        const text = await make.section(`${spec.item(item.name)}/${section}`);
        if (!isEmpty(text)) write(join(dir, `${section}.jsonc`), formatSection(text));
      }
      for (const part of spec.code ?? []) {
        const text = await make.section(`${spec.item(item.name)}/${part}`);
        if (!isEmpty(text)) write(join(dir, `${part}.js`), text);
      }
      console.log(`pulled ${kind}/${item.name}`);
    }
  }
  console.log(`\nDone. Review with: git diff -- src/`);
}

// ---------------------------------------------------------------- push

async function push({ dryRun, force }) {
  validate({ quiet: true });
  const make = api();
  const say = (msg) => console.log(dryRun ? `[dry-run] ${msg}` : msg);
  const put = async (path, text, contentType, label) => {
    if (!force) {
      const remote = await make.section(path);
      if (remote !== null && contentType === "application/jsonc") {
        try {
          if (same(parseJsonc(remote, path), parseJsonc(text, label))) return;
        } catch {
          /* compare as text below */
        }
      }
      if (remote !== null && remote.trim() === text.trim()) return;
    }
    say(`update ${label}`);
    if (!dryRun) await make.request("PUT", path, { body: text, contentType });
  };

  const appFile = join(SRC, "app.json");
  if (existsSync(appFile)) {
    const local = JSON.parse(readFileSync(appFile, "utf8"));
    const remoteInfo = await make.json("GET", appPath);
    const remote = pick(remoteInfo.app ?? remoteInfo.appVersion ?? remoteInfo, APP_META);
    const changed = Object.fromEntries(
      Object.entries(local).filter(([k, v]) => !same(v, remote[k])),
    );
    if (Object.keys(changed).length) {
      say(`update app metadata (${Object.keys(changed).join(", ")})`);
      if (!dryRun) await make.json("PATCH", appPath, { body: changed });
    }
  }
  for (const section of APP_SECTIONS) {
    const file = join(SRC, `${section}.jsonc`);
    if (existsSync(file))
      await put(`${appPath}/${section}`, readFileSync(file, "utf8"), "application/jsonc", `${section}`);
  }
  const readme = join(SRC, "readme.md");
  if (existsSync(readme))
    await put(`${appPath}/readme`, readFileSync(readme, "utf8"), "text/markdown", "readme");

  // Connections first: modules and RPCs refer to them by name.
  for (const [kind, spec] of Object.entries(COMPONENTS)) {
    const remote = new Map(
      listOf(await make.json("GET", spec.list).catch(() => [])).map((i) => [i.name, i]),
    );
    const local = dirs(join(SRC, kind));
    for (const name of local) {
      const dir = join(SRC, kind, name);
      const meta = JSON.parse(readFileSync(join(dir, "component.json"), "utf8"));
      if (!remote.has(name)) {
        say(`create ${kind}/${name}`);
        if (!dryRun) await make.json("POST", spec.create, { body: meta });
      } else {
        const current = remote.get(name);
        const changed = Object.fromEntries(
          spec.editable.filter((k) => k in meta && !same(meta[k], current[k])).map((k) => [k, meta[k]]),
        );
        if (Object.keys(changed).length) {
          say(`update ${kind}/${name} (${Object.keys(changed).join(", ")})`);
          if (!dryRun) await make.json("PATCH", spec.item(name), { body: changed });
        }
      }
      for (const section of spec.sections) {
        const file = join(dir, `${section}.jsonc`);
        if (existsSync(file))
          await put(
            `${spec.item(name)}/${section}`,
            readFileSync(file, "utf8"),
            "application/jsonc",
            `${kind}/${name}/${section}`,
          );
      }
      for (const part of spec.code ?? []) {
        const file = join(dir, `${part}.js`);
        if (existsSync(file))
          await put(
            `${spec.item(name)}/${part}`,
            readFileSync(file, "utf8"),
            "application/javascript",
            `${kind}/${name}/${part}`,
          );
      }
    }
    for (const name of remote.keys()) {
      if (!local.includes(name))
        console.warn(`note: ${kind}/${name} exists in Make but not in src/ (left untouched)`);
    }
  }
  console.log(dryRun ? "\nDry run finished; nothing was sent." : "\nPush finished.");
}

// ---------------------------------------------------------------- validate

const SECRET_PATTERNS = [
  /\b(sk|pk|rk)_(live|test)_[A-Za-z0-9]{16,}/,
  /\bgh[pousr]_[A-Za-z0-9]{30,}/,
  /\buah_[A-Za-z0-9_-]{20,}/,
  /Bearer\s+[A-Za-z0-9._-]{24,}/,
];

function validate({ quiet = false } = {}) {
  const problems = [];
  if (!existsSync(SRC)) problems.push("src/ is missing: run `pull` first.");
  const walk = (path) =>
    readdirSync(path, { withFileTypes: true }).flatMap((d) =>
      d.isDirectory() ? walk(join(path, d.name)) : [join(path, d.name)],
    );
  const files = existsSync(SRC) ? walk(SRC) : [];
  for (const file of files) {
    const rel = relative(ROOT, file).replaceAll("\\", "/");
    const text = readFileSync(file, "utf8");
    if (/\.jsonc?$/.test(file)) {
      try {
        parseJsonc(text, rel);
      } catch (error) {
        problems.push(error.message);
      }
    }
    for (const pattern of SECRET_PATTERNS) {
      if (pattern.test(text)) problems.push(`${rel}: looks like it contains a secret (${pattern})`);
    }
    if (/[\\/]common\.jsonc?$/.test(file)) problems.push(`${rel}: "common" data holds secrets; keep it out of git`);
  }
  for (const [kind, spec] of Object.entries(COMPONENTS)) {
    for (const name of dirs(join(SRC, kind))) {
      const metaFile = join(SRC, kind, name, "component.json");
      if (!existsSync(metaFile)) {
        problems.push(`src/${kind}/${name}: component.json is missing`);
        continue;
      }
      const meta = JSON.parse(readFileSync(metaFile, "utf8"));
      if (meta.name !== name) problems.push(`src/${kind}/${name}: name in component.json is "${meta.name}"`);
      if (kind === "modules") {
        if (!MODULE_TYPES.has(meta.typeId))
          problems.push(`src/modules/${name}: typeId ${meta.typeId} is not a Make module type`);
        if (!meta.label) problems.push(`src/modules/${name}: label is missing`);
        if (!meta.description) problems.push(`src/modules/${name}: description is missing`);
      }
      void spec;
    }
  }
  if (problems.length) {
    console.error(problems.map((p) => `✗ ${p}`).join("\n"));
    process.exit(1);
  }
  if (!quiet) console.log(`✓ ${files.length} files valid`);
}

// ---------------------------------------------------------------- main

const [command, ...flags] = process.argv.slice(2);
const options = { dryRun: flags.includes("--dry-run"), force: flags.includes("--force") };
const commands = { pull, push: () => push(options), validate: () => validate() };
if (!commands[command]) {
  console.error("Usage: node scripts/make-app.mjs <pull|push|validate> [--dry-run] [--force]");
  process.exit(2);
}
Promise.resolve(commands[command]()).catch((error) => {
  console.error(error.message);
  process.exit(1);
});
