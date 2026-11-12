"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const repositoryGraph_1 = require("../src/repositoryGraph");
(0, node_test_1.default)("builds a graph from indexed repository files", () => {
    const graph = (0, repositoryGraph_1.buildContextGraph)([
        { path: "src/index.ts" },
        { path: "src/app.ts" }
    ]);
    strict_1.default.equal(graph.nodes.length, 4);
    strict_1.default.equal(graph.edges.length, 3);
    strict_1.default.deepEqual(graph.nodes.map((node) => node.id), [
        "directory:src",
        "file:src/app.ts",
        "file:src/index.ts",
        "repository:root"
    ]);
});
(0, node_test_1.default)("creates import edges between internal repository files", () => {
    const graph = (0, repositoryGraph_1.buildContextGraph)([
        {
            path: "src/main.ts",
            imports: ["./helper", "express"]
        },
        {
            path: "src/helper.ts",
            imports: []
        }
    ]);
    strict_1.default.ok(graph.edges.some((edge) => edge.from === "file:src/main.ts" &&
        edge.to === "file:src/helper.ts" &&
        edge.kind === "imports"));
    strict_1.default.ok(!graph.edges.some((edge) => edge.from === "file:src/main.ts" &&
        edge.to.includes("express") &&
        edge.kind === "imports"));
});
(0, node_test_1.default)("adds symbol nodes and call references to the repository graph", () => {
    const graph = (0, repositoryGraph_1.buildContextGraph)([
        {
            path: "src/service.ts",
            symbols: [
                { name: "Service", kind: "class", line: 1 },
                { name: "Service.run", kind: "method", line: 2 },
                { name: "helper", kind: "function", line: 5 }
            ],
            calls: [
                { caller: "Service.run", callee: "helper", line: 3 },
                { caller: "Service.run", callee: "shared", calleePath: "src/shared.ts", line: 4 }
            ]
        },
        { path: "src/shared.ts", symbols: [{ name: "shared", kind: "function", line: 1 }] }
    ]);
    strict_1.default.ok(graph.nodes.some((node) => node.id === "symbol:src/service.ts#Service" && node.kind === "symbol"));
    strict_1.default.ok(graph.edges.some((edge) => edge.from === "file:src/service.ts" && edge.to === "symbol:src/service.ts#Service.run" && edge.kind === "references"));
    strict_1.default.ok(graph.edges.some((edge) => edge.from === "symbol:src/service.ts#Service.run" && edge.to === "symbol:src/service.ts#helper" && edge.kind === "references"));
    strict_1.default.ok(graph.edges.some((edge) => edge.from === "symbol:src/service.ts#Service.run" && edge.to === "symbol:src/shared.ts#shared" && edge.kind === "references"));
});
(0, node_test_1.default)("creates import edges from resolved alias paths", () => {
    const graph = (0, repositoryGraph_1.buildContextGraph)([
        {
            path: "src/index.ts",
            imports: ["@database/query"],
            resolvedImports: ["src/database/query.ts"]
        },
        {
            path: "src/database/query.ts",
            imports: []
        }
    ]);
    strict_1.default.ok(graph.edges.some((edge) => edge.from === "file:src/index.ts" &&
        edge.to === "file:src/database/query.ts" &&
        edge.kind === "imports"));
});
(0, node_test_1.default)("creates import edges between Python files", () => {
    const graph = (0, repositoryGraph_1.buildContextGraph)([
        {
            path: "src/main.py",
            imports: ["src.helper"],
            resolvedImports: ["src/helper.py"]
        },
        {
            path: "src/helper.py",
            imports: []
        }
    ]);
    strict_1.default.ok(graph.edges.some((edge) => edge.from === "file:src/main.py" &&
        edge.to === "file:src/helper.py" &&
        edge.kind === "imports"));
});
(0, node_test_1.default)("creates import edges to Python package and stub files", () => {
    const graph = (0, repositoryGraph_1.buildContextGraph)([
        {
            path: "src/main.py",
            imports: [".models", "src.types"],
            resolvedImports: [
                "src/__init__.py",
                "src/types.pyi"
            ]
        },
        { path: "src/__init__.py", imports: [] },
        { path: "src/types.pyi", imports: [] }
    ]);
    strict_1.default.ok(graph.edges.some((edge) => edge.from === "file:src/main.py" &&
        edge.to === "file:src/__init__.py" &&
        edge.kind === "imports"));
    strict_1.default.ok(graph.edges.some((edge) => edge.from === "file:src/main.py" &&
        edge.to === "file:src/types.pyi" &&
        edge.kind === "imports"));
});
(0, node_test_1.default)("creates import edges for nested Python relative imports", () => {
    const graph = (0, repositoryGraph_1.buildContextGraph)([
        {
            path: "src/features/main.py",
            imports: ["..shared.helper"]
        },
        {
            path: "src/shared/helper.py",
            imports: []
        }
    ]);
    strict_1.default.ok(graph.edges.some((edge) => edge.from === "file:src/features/main.py" &&
        edge.to === "file:src/shared/helper.py" &&
        edge.kind === "imports"));
});
(0, node_test_1.default)("automatically resolves absolute Python module imports", () => {
    const graph = (0, repositoryGraph_1.buildContextGraph)([
        {
            path: "src/main.py",
            imports: ["src.helper"]
        },
        {
            path: "src/helper.py",
            imports: []
        }
    ]);
    strict_1.default.ok(graph.edges.some((edge) => edge.from === "file:src/main.py" &&
        edge.to === "file:src/helper.py" &&
        edge.kind === "imports"));
});
(0, node_test_1.default)("automatically resolves Python package and stub imports", () => {
    const graph = (0, repositoryGraph_1.buildContextGraph)([
        {
            path: "src/main.py",
            imports: [".models", "src.types"]
        },
        {
            path: "src/models/__init__.py",
            imports: []
        },
        {
            path: "src/types.pyi",
            imports: []
        }
    ]);
    strict_1.default.ok(graph.edges.some((edge) => edge.from === "file:src/main.py" &&
        edge.to === "file:src/models/__init__.py" &&
        edge.kind === "imports"));
    strict_1.default.ok(graph.edges.some((edge) => edge.from === "file:src/main.py" &&
        edge.to === "file:src/types.pyi" &&
        edge.kind === "imports"));
});
