"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCriterionApplicable = isCriterionApplicable;
/**
 * Determine whether a criterion applies to a given artifact.
 *
 * Rules:
 *   - No `applicability` scope at all => universally applicable.
 *   - `artifact_ids` present => artifact must be listed explicitly.
 *   - `artifact_tags` present => artifact must share at least one tag.
 *   - If BOTH are present, the artifact must satisfy at least one of them
 *     (ids OR tags) — this keeps the scope inclusive/additive rather than
 *     requiring both simultaneously, which would silently over-restrict
 *     scopes that combine an explicit allow-list with a tag rule.
 *   - If a scope object is present but both arrays are absent/empty, it is
 *     treated as matching nothing (an explicitly empty scope excludes all
 *     artifacts) rather than defaulting back to "universal".
 */
function isCriterionApplicable(criterion, artifact) {
    const scope = criterion.applicability;
    if (scope === undefined) {
        return true;
    }
    const hasIdRule = scope.artifact_ids !== undefined && scope.artifact_ids.length > 0;
    const hasTagRule = scope.artifact_tags !== undefined && scope.artifact_tags.length > 0;
    if (!hasIdRule && !hasTagRule) {
        return false;
    }
    if (hasIdRule && scope.artifact_ids.includes(artifact.artifact_id)) {
        return true;
    }
    if (hasTagRule) {
        const artifactTags = new Set(artifact.tags ?? []);
        for (const tag of scope.artifact_tags) {
            if (artifactTags.has(tag)) {
                return true;
            }
        }
    }
    return false;
}
