import type { VerificationContext, VerificationResult, VerificationRule } from "./models";
export declare class VerificationEngine {
    private readonly rules;
    addRule(rule: VerificationRule): void;
    verify(context: VerificationContext): VerificationResult;
}
