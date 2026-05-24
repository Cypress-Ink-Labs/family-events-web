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
const webContractsConsumerPath = path.join(
  repoRoot,
  "apps",
  "web",
  "src",
  "shared",
  "types.ts",
);
const webSharedConsumerPath = path.join(
  repoRoot,
  "apps",
  "web",
  "src",
  "features",
  "admin",
  "api",
  "sources.ts",
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

test("web workspace has source-level imports for shared and contracts", () => {
  assert.equal(existsSync(webContractsConsumerPath), true);
  assert.equal(existsSync(webSharedConsumerPath), true);
  const contractsConsumer = readFileSync(webContractsConsumerPath, "utf8");
  const sharedConsumer = readFileSync(webSharedConsumerPath, "utf8");
  assert.match(contractsConsumer, /from "@family-events\/contracts"/);
  assert.match(sharedConsumer, /from "@family-events\/shared"/);
});

test("contracts package owns generated Supabase database types", () => {
  assert.equal(existsSync(contractsDatabaseTypesPath), true);
  const databaseTypes = readFileSync(contractsDatabaseTypesPath, "utf8");
  assert.match(databaseTypes, /export type Database = /);
  assert.match(databaseTypes, /export const Constants = /);

  const contractsIndex = readFileSync(contractsIndexPath, "utf8");
  assert.match(contractsIndex, /from "\.\/database\.types"/);
});
