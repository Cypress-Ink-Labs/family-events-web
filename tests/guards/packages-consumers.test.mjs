import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "../..",
);
const contractsPkgPath = path.join(
  repoRoot,
  "packages",
  "contracts",
  "package.json",
);
const sharedPkgPath = path.join(repoRoot, "packages", "shared", "package.json");
const webBridgePath = path.join(
  repoRoot,
  "apps",
  "web",
  "src",
  "infrastructure",
  "smoke",
  "workspace-packages.ts",
);
const contractsIndexPath = path.join(
  repoRoot,
  "packages",
  "contracts",
  "src",
  "index.ts",
);
const contractsDatabaseTypesPath = path.join(
  repoRoot,
  "packages",
  "contracts",
  "src",
  "database.types.ts",
);

test("shared and contracts package manifests exist", () => {
  assert.equal(existsSync(contractsPkgPath), true);
  assert.equal(existsSync(sharedPkgPath), true);
});

test("web workspace has explicit source-level import bridge for shared/contracts", () => {
  assert.equal(existsSync(webBridgePath), true);
  const source = readFileSync(webBridgePath, "utf8");
  assert.match(source, /from "@family-events\/contracts"/);
  assert.match(source, /from "@family-events\/shared"/);
});

test("contracts package owns generated Supabase database types", () => {
  assert.equal(existsSync(contractsDatabaseTypesPath), true);
  const databaseTypes = readFileSync(contractsDatabaseTypesPath, "utf8");
  assert.match(databaseTypes, /export type Database = /);
  assert.match(databaseTypes, /export const Constants = /);

  const contractsIndex = readFileSync(contractsIndexPath, "utf8");
  assert.match(contractsIndex, /from "\.\/database\.types"/);
});
