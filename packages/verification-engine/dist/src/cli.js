"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const repositoryVerification_1 = require("./repositoryVerification");
function printUsage() {
    console.log(`CodeForge repository verifier

Usage:
  forge verify [repository-path] [--format text|json]

Commands:
  verify                 Analyze a repository (defaults to the current directory)

Options:
  --format <format>      Output as text (default) or JSON
                         JSON includes detected and effective architecture boundaries
  -h, --help             Show this help

Exit codes:
  0  Verification passed
  1  Invalid command, options, configuration, or repository access error
  2  Verification found one or more violations`);
}
function parseArguments(args) {
    const [command, ...options] = args;
    if (command !== "verify") {
        throw new Error('Expected the "verify" command.');
    }
    let repositoryPath;
    let format = "text";
    for (let index = 0; index < options.length; index += 1) {
        const argument = options[index];
        if (argument === "--format") {
            const value = options[index + 1];
            if (!value) {
                throw new Error('Option "--format" requires "text" or "json".');
            }
            index += 1;
            if (value !== "text" && value !== "json") {
                throw new Error(`Unsupported output format: ${value}`);
            }
            format = value;
            continue;
        }
        if (argument.startsWith("--format=")) {
            const value = argument.slice("--format=".length);
            if (value !== "text" && value !== "json") {
                throw new Error(`Unsupported output format: ${value || "(empty)"}`);
            }
            format = value;
            continue;
        }
        if (argument.startsWith("-")) {
            throw new Error(`Unknown option: ${argument}`);
        }
        if (repositoryPath !== undefined) {
            throw new Error(`Unexpected extra argument: ${argument}`);
        }
        repositoryPath = argument;
    }
    return {
        repositoryPath: repositoryPath ?? ".",
        format
    };
}
async function main() {
    const args = process.argv.slice(2);
    if (args.includes("--help") || args.includes("-h")) {
        printUsage();
        return;
    }
    let parsed;
    try {
        parsed = parseArguments(args);
    }
    catch (error) {
        console.error(`CodeForge: ${error instanceof Error ? error.message : String(error)}`);
        console.error('Run "forge --help" for usage.');
        process.exitCode = 1;
        return;
    }
    try {
        const analysis = await (0, repositoryVerification_1.analyzeRepositoryPath)(parsed.repositoryPath);
        const result = analysis.result;
        const summary = {
            total: result.violations.length,
            errors: result.violations.filter((item) => item.severity === "error").length,
            warnings: result.violations.filter((item) => item.severity === "warning").length,
            info: result.violations.filter((item) => item.severity === "info").length
        };
        if (parsed.format === "json") {
            console.log(JSON.stringify({
                repositoryPath: parsed.repositoryPath,
                passed: result.passed,
                summary,
                architecture: analysis.architectureConfiguration,
                violations: result.violations
            }, null, 2));
        }
        else if (result.passed) {
            console.log(`VERIFICATION PASSED — ${summary.total} violations`);
        }
        else {
            console.log(`VERIFICATION FAILED — ${summary.total} violations (${summary.errors} errors, ${summary.warnings} warnings, ${summary.info} info)`);
            for (const violation of result.violations) {
                const target = violation.target ? ` (${violation.target})` : "";
                console.log(`[${violation.severity}] ${violation.ruleId}${target}: ${violation.message}`);
            }
        }
        if (!result.passed)
            process.exitCode = 2;
    }
    catch (error) {
        console.error(`CodeForge: ${error instanceof Error ? error.message : String(error)}`);
        process.exitCode = 1;
    }
}
main().catch((error) => {
    console.error(`CodeForge: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
});
