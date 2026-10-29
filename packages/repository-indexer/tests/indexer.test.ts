import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { indexRepository } from "../src/indexer";

test("indexes repository files deterministically", async () => {
  const root = await mkdtemp(join(tmpdir(), "codeforge-indexer-"));

  await mkdir(join(root, "src"));
  await mkdir(join(root, "node_modules"));

  await writeFile(join(root, "README.md"), "# CodeForge");
  await writeFile(join(root, "src", "index.ts"), "export const x = 1;");
  await writeFile(join(root, "node_modules", "ignored.js"), "ignored");

  const snapshot = await indexRepository(root);

  assert.equal(snapshot.fileCount, 2);
  assert.deepEqual(
    snapshot.files.map((file) => file.path),
    ["README.md", "src/index.ts"]
  );
  assert.equal(snapshot.files[0].extension, ".md");
  assert.equal(snapshot.files[1].extension, ".ts");
});

test("returns files in sorted path order", async () => {
  const root = await mkdtemp(join(tmpdir(), "codeforge-indexer-"));

  await writeFile(join(root, "z.ts"), "z");
  await writeFile(join(root, "a.ts"), "a");
  await writeFile(join(root, "m.ts"), "m");

  const snapshot = await indexRepository(root);

  assert.deepEqual(
    snapshot.files.map((file) => file.path),
    ["a.ts", "m.ts", "z.ts"]
  );
});

test("detects static, re-export, and dynamic imports", async () => {
  const root = await mkdtemp(join(tmpdir(), "codeforge-imports-"));

  await writeFile(
    join(root, "main.ts"),
    [
      'import { helper } from "./helper";',
      'export { value } from "./values";',
      'const lazy = import("./lazy");',
      "const result = helper;"
    ].join("\n")
  );

  const snapshot = await indexRepository(root);
  const mainFile = snapshot.files.find((file) => file.path === "main.ts");

  assert.ok(mainFile);
  assert.deepEqual(mainFile.imports, [
    "./helper",
    "./lazy",
    "./values"
  ]);
});

test("preserves TypeScript path alias import specifiers", async () => {
  const root = await mkdtemp(join(tmpdir(), "codeforge-alias-"));

  await mkdir(join(root, "src", "database"), { recursive: true });

  await writeFile(
    join(root, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        baseUrl: ".",
        paths: {
          "@database/*": ["src/database/*"]
        }
      }
    })
  );

  await writeFile(
    join(root, "src", "database", "query.ts"),
    "export const query = () => true;"
  );

  await writeFile(
    join(root, "src", "index.ts"),
    'import { query } from "@database/query";\nexport { query };'
  );

  const snapshot = await indexRepository(root);
  const indexFile = snapshot.files.find(
    (file) => file.path === "src/index.ts"
  );

  assert.ok(indexFile);
  assert.deepEqual(indexFile.imports, ["@database/query"]);
  assert.deepEqual(indexFile.resolvedImports, ["src/database/query.ts"]);
});

test("continues to detect relative imports alongside aliases", async () => {
  const root = await mkdtemp(join(tmpdir(), "codeforge-mixed-imports-"));

  await writeFile(
    join(root, "main.ts"),
    [
      'import { helper } from "./helper";',
      'import { query } from "@database/query";'
    ].join("\n")
  );

  const snapshot = await indexRepository(root);
  const mainFile = snapshot.files.find((file) => file.path === "main.ts");

  assert.ok(mainFile);
  assert.deepEqual(mainFile.imports, [
    "./helper",
    "@database/query"
  ]);
});

test("indexes Python files and extracts import statements", async () => {
  const root = await mkdtemp(join(tmpdir(), "codeforge-python-"));

  await mkdir(join(root, "src"));

  await writeFile(
    join(root, "src", "main.py"),
    "import os\nfrom src.helper import calculate\n"
  );

  await writeFile(
    join(root, "src", "helper.py"),
    "def calculate():\n    return 1\n"
  );

  const snapshot = await indexRepository(root);
  const mainFile = snapshot.files.find(
    (file) => file.path === "src/main.py"
  );

  assert.ok(mainFile);
  assert.equal(mainFile.extension, ".py");
  assert.deepEqual(mainFile.imports, [
    "os",
    "src.helper"
  ]);
  assert.deepEqual(mainFile.resolvedImports, [
    "src/helper.py"
  ]);
});

test("resolves relative Python package imports", async () => {
  const root = await mkdtemp(join(tmpdir(), "codeforge-python-relative-"));

  await mkdir(join(root, "src", "services"), { recursive: true });
  await writeFile(join(root, "src", "__init__.py"), "");
  await writeFile(join(root, "src", "services", "__init__.py"), "");
  await writeFile(
    join(root, "src", "services", "main.py"),
    "from . import helper\n"
  );
  await writeFile(
    join(root, "src", "services", "helper.py"),
    "def run():\n    return 1\n"
  );

  const snapshot = await indexRepository(root);
  const mainFile = snapshot.files.find(
    (file) => file.path === "src/services/main.py"
  );

  assert.ok(mainFile);
  assert.deepEqual(mainFile.imports, [".", ".helper"]);
  assert.deepEqual(mainFile.resolvedImports, [
    "src/services/__init__.py",
    "src/services/helper.py"
  ]);
});

test("resolves Python imports from a parent package", async () => {
  const root = await mkdtemp(join(tmpdir(), "codeforge-python-parent-"));

  await mkdir(join(root, "src", "services"), { recursive: true });
  await mkdir(join(root, "src", "shared"), { recursive: true });

  await writeFile(join(root, "src", "__init__.py"), "");
  await writeFile(join(root, "src", "services", "__init__.py"), "");
  await writeFile(join(root, "src", "shared", "__init__.py"), "");
  await writeFile(
    join(root, "src", "services", "main.py"),
    "from ..shared import utils\n"
  );
  await writeFile(
    join(root, "src", "shared", "utils.py"),
    "def run():\n    return 1\n"
  );

  const snapshot = await indexRepository(root);
  const mainFile = snapshot.files.find(
    (file) => file.path === "src/services/main.py"
  );

  assert.ok(mainFile);
  assert.deepEqual(mainFile.imports, ["..shared", "..shared.utils"]);
  assert.deepEqual(mainFile.resolvedImports, [
    "src/shared/__init__.py",
    "src/shared/utils.py"
  ]);
});

test("indexes Python stub files", async () => {
  const root = await mkdtemp(join(tmpdir(), "codeforge-python-stubs-"));

  await writeFile(
    join(root, "helper.pyi"),
    "def calculate() -> int: ...\n"
  );

  const snapshot = await indexRepository(root);

  assert.ok(snapshot.files.some((file) => file.path === "helper.pyi"));
});

test("preserves Python self-imports in resolved imports", async () => {
  const root = await mkdtemp(join(tmpdir(), "codeforge-python-self-import-"));

  await writeFile(join(root, "main.py"), "import main\n");

  const snapshot = await indexRepository(root);
  const mainFile = snapshot.files.find(
    (file) => file.path === "main.py"
  );

  assert.ok(mainFile);
  assert.deepEqual(mainFile.imports, ["main"]);
  assert.deepEqual(mainFile.resolvedImports, ["main.py"]);
});

test("extracts multiline Python imports", async () => {
  const root = await mkdtemp(join(tmpdir(), "codeforge-python-multiline-"));

  await mkdir(join(root, "src", "services"), { recursive: true });
  await writeFile(join(root, "src", "__init__.py"), "");
  await writeFile(join(root, "src", "services", "__init__.py"), "");
  await writeFile(join(root, "src", "services", "helper.py"), "");
  await writeFile(join(root, "src", "services", "utils.py"), "");

  await writeFile(
    join(root, "src", "main.py"),
    [
      "from src.services import (",
      "    helper,",
      "    utils,",
      ")"
    ].join("\n")
  );

  await writeFile(
    join(root, "src", "message.py"),
    'message = "Issue #123"\n'
  );

  const snapshot = await indexRepository(root);
  const mainFile = snapshot.files.find(
    (file) => file.path === "src/main.py"
  );
  const messageFile = snapshot.files.find(
    (file) => file.path === "src/message.py"
  );

  assert.ok(mainFile);
  assert.deepEqual(mainFile.imports, ["src.services"]);
  assert.deepEqual(mainFile.resolvedImports, [
    "src/services/__init__.py",
    "src/services/helper.py",
    "src/services/utils.py"
  ]);

  assert.ok(messageFile);
  assert.deepEqual(messageFile.imports, []);
});

test("resolves individual modules imported from a Python package", async () => {
  const root = await mkdtemp(join(tmpdir(), "codeforge-python-package-members-"));

  await mkdir(join(root, "src", "services"), { recursive: true });

  await writeFile(join(root, "src", "__init__.py"), "");
  await writeFile(join(root, "src", "services", "__init__.py"), "");

  await writeFile(
    join(root, "src", "services", "helper.py"),
    "def calculate():\n    return 1\n"
  );

  await writeFile(
    join(root, "src", "services", "utils.py"),
    "def format_value():\n    return 'ok'\n"
  );

  await writeFile(
    join(root, "src", "main.py"),
    [
      "from src.services import (",
      "    helper,",
      "    utils,",
      ")"
    ].join("\n")
  );

  const snapshot = await indexRepository(root);
  const mainFile = snapshot.files.find(
    (file) => file.path === "src/main.py"
  );

  assert.ok(mainFile);

  const resolvedImports = mainFile.resolvedImports ?? [];

  assert.ok(
    resolvedImports.includes("src/services/helper.py"),
    "expected helper.py to be resolved"
  );

  assert.ok(
    resolvedImports.includes("src/services/utils.py"),
    "expected utils.py to be resolved"
  );
});
