"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const repositoryVerification_1 = require("./repositoryVerification");
async function main() {
    const [command, repositoryPath = "."] = process.argv.slice(2);
    if (command !== "verify") {
        console.error("Usage: forge verify <repository-path>");
        process.exitCode = 1;
        return;
    }
    const result = await (0, repositoryVerification_1.verifyRepositoryPath)(repositoryPath);
    if (result.passed) {
        console.log("VERIFICATION PASSED");
        return;
    }
    console.log("VERIFICATION FAILED");
    for (const violation of result.violations) {
        console.log(`[${violation.severity}] ${violation.ruleId}: ${violation.message}`);
    }
    process.exitCode = 2;
}
main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
});
