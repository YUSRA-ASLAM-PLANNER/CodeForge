"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerificationEngine = void 0;
class VerificationEngine {
    rules = [];
    addRule(rule) {
        if (this.rules.some((existing) => existing.id === rule.id)) {
            throw new Error(`Verification rule already exists: ${rule.id}`);
        }
        this.rules.push(rule);
    }
    verify(context) {
        const violations = [];
        for (const rule of this.rules) {
            violations.push(...rule.check(context));
        }
        violations.sort((a, b) => {
            const left = `${a.ruleId}|${a.target ?? ""}|${a.message}`;
            const right = `${b.ruleId}|${b.target ?? ""}|${b.message}`;
            return left.localeCompare(right);
        });
        return {
            passed: violations.length === 0,
            violations
        };
    }
}
exports.VerificationEngine = VerificationEngine;
