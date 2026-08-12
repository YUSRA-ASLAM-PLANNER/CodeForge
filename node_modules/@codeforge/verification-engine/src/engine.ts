import type {
  VerificationContext,
  VerificationResult,
  VerificationRule,
  VerificationViolation
} from "./models";

export class VerificationEngine {
  private readonly rules: VerificationRule[] = [];

  addRule(rule: VerificationRule): void {
    if (this.rules.some((existing) => existing.id === rule.id)) {
      throw new Error(`Verification rule already exists: ${rule.id}`);
    }

    this.rules.push(rule);
  }

  verify(context: VerificationContext): VerificationResult {
    const violations: VerificationViolation[] = [];

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
