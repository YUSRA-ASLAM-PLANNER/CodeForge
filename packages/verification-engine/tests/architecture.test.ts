import test from "node:test";
import assert from "node:assert/strict";
import { detectArchitectureLayers } from "../src/architecture";

test("detects known architecture layers in a monorepo without treating package folders as layers", () => {
  const layers = detectArchitectureLayers([
    "packages/evaluation-engine/src/canonicalization/policy.ts",
    "packages/evaluation-engine/src/persistence/wal.ts",
    "apps/dashboard/src/ui/page.ts",
    "services/storage/src/database/connection.ts"
  ]);

  assert.deepEqual(layers, [
    { name: "database", files: ["services/storage/src/database/connection.ts"] },
    { name: "ui", files: ["apps/dashboard/src/ui/page.ts"] }
  ]);
});

test("includes explicitly configured custom layer names in detection", () => {
  const layers = detectArchitectureLayers([
    "packages/tool/src/adapters/database.ts",
    "packages/tool/src/custom/adapter.ts"
  ], ["custom"]);

  assert.deepEqual(layers, [
    { name: "custom", files: ["packages/tool/src/custom/adapter.ts"] }
  ]);
});
