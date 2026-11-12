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
  await mkdir(join(root, ".codeforge"));

  await writeFile(join(root, "README.md"), "# CodeForge");
  await writeFile(join(root, "src", "index.ts"), "export const x = 1;");
  await writeFile(join(root, "node_modules", "ignored.js"), "ignored");
  await writeFile(join(root, ".codeforge", "findings.wal.jsonl"), "ignored");

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

test("reports source file sizes in encoded bytes", async () => {
  const root = await mkdtemp(join(tmpdir(), "codeforge-source-size-"));
  const source = "export const café = 'naïve';\n";
  await writeFile(join(root, "unicode.ts"), source, "utf8");

  const snapshot = await indexRepository(root);
  assert.equal(snapshot.files[0].sizeBytes, Buffer.byteLength(source, "utf8"));
});

test("extracts TypeScript declarations and in-file call relationships from the AST", async () => {
  const root = await mkdtemp(join(tmpdir(), "codeforge-symbols-"));
  await writeFile(join(root, "service.ts"), [
    "export interface User { id: string }",
    "export type UserId = string;",
    "export enum State { Ready }",
    "export function helper() { return 1; }",
    "export class Service { run() { return helper(); } }",
    "export const load = () => helper();"
  ].join("\n"));

  const snapshot = await indexRepository(root);
  const file = snapshot.files[0];
  assert.deepEqual(file.symbols?.map((symbol) => `${symbol.kind}:${symbol.name}`).sort(), [
    "class:Service",
    "enum:State",
    "function:helper",
    "function:load",
    "interface:User",
    "method:Service.run",
    "type:UserId"
  ].sort());
  assert.ok(file.calls?.some((call) => call.caller === "Service.run" && call.callee === "helper"));
  assert.ok(file.calls?.some((call) => call.caller === "load" && call.callee === "helper"));
});

test("resolves TypeScript calls through imported declarations across files", async () => {
  const root = await mkdtemp(join(tmpdir(), "codeforge-call-graph-"));
  await mkdir(join(root, "src"));
  await writeFile(join(root, "src", "main.ts"), "import { helper } from './helper';\nexport function run() { return helper(); }\n");
  await writeFile(join(root, "src", "helper.ts"), "export function helper() { return 1; }\n");

  const snapshot = await indexRepository(root);
  const main = snapshot.files.find((file) => file.path === "src/main.ts");
  assert.ok(main?.calls?.some((call) => call.caller === "run" && call.callee === "helper" && call.calleePath === "src/helper.ts"));
});

test("extracts Python AST symbols and resolves imported function calls", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "codeforge-python-symbols-"));
  await writeFile(join(root, "main.py"), [
    "from helpers import calculate as compute",
    "class Service:",
    "    def run(self):",
    "        return compute()"
  ].join("\n"));
  await writeFile(join(root, "helpers.py"), "def calculate():\n    return 42\n");

  const snapshot = await indexRepository(root);
  if (snapshot.analysisWarnings?.some((warning) => warning.includes("Python symbol analysis was skipped"))) {
    t.skip("A Python interpreter is needed for stdlib AST analysis.");
    return;
  }
  const main = snapshot.files.find((file) => file.path === "main.py");
  const helper = snapshot.files.find((file) => file.path === "helpers.py");
  assert.ok(main?.symbols?.some((symbol) => symbol.kind === "class" && symbol.name === "Service"));
  assert.ok(main?.symbols?.some((symbol) => symbol.kind === "method" && symbol.name === "Service.run"));
  assert.ok(helper?.symbols?.some((symbol) => symbol.kind === "function" && symbol.name === "calculate"));
  assert.ok(main?.calls?.some((call) => call.caller === "Service.run" && call.callee === "calculate" && call.calleePath === "helpers.py"));
});

test("reports Python syntax failures as analysis warnings without aborting indexing", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "codeforge-python-syntax-"));
  await writeFile(join(root, "broken.py"), "def broken(:\n    pass\n");
  const snapshot = await indexRepository(root);
  if (snapshot.analysisWarnings?.some((warning) => warning.includes("Python symbol analysis was skipped"))) {
    t.skip("A Python interpreter is needed for stdlib AST analysis.");
    return;
  }
  assert.equal(snapshot.fileCount, 1);
  assert.ok(snapshot.analysisWarnings?.some((warning) => warning.includes("broken.py")));
});

test("respects root .gitignore rules and negated patterns", async () => {
  const root = await mkdtemp(join(tmpdir(), "codeforge-gitignore-root-"));

  await mkdir(join(root, "coverage"));
  await writeFile(
    join(root, ".gitignore"),
    "*.log\n!important.log\ncoverage/\n"
  );
  await writeFile(join(root, "debug.log"), "ignored");
  await writeFile(join(root, "important.log"), "included by negation");
  await writeFile(join(root, "coverage", "report.txt"), "ignored directory");
  await writeFile(join(root, "main.ts"), "export {};\n");

  const snapshot = await indexRepository(root);
  const indexedPaths = snapshot.files.map((file) => file.path);

  assert.ok(indexedPaths.includes("important.log"));
  assert.ok(indexedPaths.includes("main.ts"));
  assert.ok(!indexedPaths.includes("debug.log"));
  assert.ok(!indexedPaths.includes("coverage/report.txt"));
});

test("applies nested .gitignore rules within their directory", async () => {
  const root = await mkdtemp(join(tmpdir(), "codeforge-gitignore-nested-"));
  const sourceDirectory = join(root, "src");

  await mkdir(sourceDirectory);
  await writeFile(
    join(root, ".gitignore"),
    "src/**/*.generated.ts\n"
  );
  await writeFile(
    join(sourceDirectory, ".gitignore"),
    "!keep.generated.ts\n"
  );
  await writeFile(join(root, "root.generated.ts"), "root file");
  await writeFile(join(sourceDirectory, "ignored.generated.ts"), "ignored");
  await writeFile(join(sourceDirectory, "keep.generated.ts"), "re-included");

  const snapshot = await indexRepository(root);
  const indexedPaths = snapshot.files.map((file) => file.path);

  assert.ok(indexedPaths.includes("root.generated.ts"));
  assert.ok(indexedPaths.includes("src/keep.generated.ts"));
  assert.ok(!indexedPaths.includes("src/ignored.generated.ts"));
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

test("resolves imports to source entries of npm workspace packages", async () => {
  const root = await mkdtemp(join(tmpdir(), "codeforge-workspace-imports-"));
  await mkdir(join(root, "packages", "library", "src"), { recursive: true });
  await mkdir(join(root, "packages", "app", "src"), { recursive: true });
  await writeFile(join(root, "package.json"), JSON.stringify({
    name: "workspace-root",
    workspaces: ["packages/*"]
  }));
  await writeFile(join(root, "packages", "library", "package.json"), JSON.stringify({
    name: "@example/library",
    main: "dist/src/index.js",
    types: "dist/src/index.d.ts"
  }));
  await writeFile(join(root, "packages", "app", "package.json"), JSON.stringify({
    name: "@example/app"
  }));
  await writeFile(
    join(root, "packages", "library", "src", "index.ts"),
    "export function helper() { return 42; }\n"
  );
  await writeFile(
    join(root, "packages", "app", "src", "main.ts"),
    'import { helper } from "@example/library";\nexport function run() { return helper(); }\n'
  );

  const snapshot = await indexRepository(root);
  const app = snapshot.files.find((file) => file.path === "packages/app/src/main.ts");

  assert.ok(app);
  assert.deepEqual(app.resolvedImports, ["packages/library/src/index.ts"]);
  assert.ok(app.calls?.some((call) =>
    call.callee === "helper" && call.calleePath === "packages/library/src/index.ts"
  ), JSON.stringify(app));
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
