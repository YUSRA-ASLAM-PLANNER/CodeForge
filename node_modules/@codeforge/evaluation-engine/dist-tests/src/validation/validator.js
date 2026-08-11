"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateDuplicateIds = validateDuplicateIds;
exports.validateCriteriaHavePredicates = validateCriteriaHavePredicates;
exports.validateReferentialIntegrity = validateReferentialIntegrity;
exports.validateTraceabilityUniverse = validateTraceabilityUniverse;
exports.validateTraceabilityAcyclic = validateTraceabilityAcyclic;
exports.validateDomain = validateDomain;
const errors_1 = require("../errors");
// ---------------------------------------------------------------------------
// Duplicate-ID detection
// ---------------------------------------------------------------------------
function assertNoDuplicates(ids, entityLabel) {
    const seen = new Set();
    for (const id of ids) {
        if (seen.has(id)) {
            throw new errors_1.ReferentialIntegrityError(`Duplicate ${entityLabel} id: '${id}'`);
        }
        seen.add(id);
    }
}
function validateDuplicateIds(ctx) {
    assertNoDuplicates(ctx.requirements.map((r) => r.requirement_id), "requirement");
    assertNoDuplicates(ctx.criteria.map((c) => c.criterion_id), "criterion");
    assertNoDuplicates(ctx.evidence_requirements.map((e) => e.evidence_requirement_id), "evidence_requirement");
    assertNoDuplicates(ctx.observed_evidence.map((e) => e.evidence_id), "observed_evidence");
    assertNoDuplicates(ctx.artifacts.map((a) => a.artifact_id), "artifact");
    assertNoDuplicates(ctx.baselines.map((b) => b.baseline_id), "baseline");
    assertNoDuplicates(ctx.traceability_links.map((l) => l.link_id), "traceability_link");
}
// ---------------------------------------------------------------------------
// Domain-level validation beyond JSON Schema
// ---------------------------------------------------------------------------
/**
 * A criterion without a structured predicate must fail explicitly as a
 * validation error — never silently evaluate as true/false/conforming,
 * and never infer semantics from the free-text `definition`.
 */
function validateCriteriaHavePredicates(ctx) {
    for (const criterion of ctx.criteria) {
        if (criterion.structured_predicate === undefined) {
            throw new errors_1.ValidationError(`Criterion '${criterion.criterion_id}' lacks a structured predicate.`);
        }
    }
}
// ---------------------------------------------------------------------------
// Referential integrity across entity relationships
// ---------------------------------------------------------------------------
function validateReferentialIntegrity(ctx) {
    const requirementIds = new Set(ctx.requirements.map((r) => r.requirement_id));
    const criterionIds = new Set(ctx.criteria.map((c) => c.criterion_id));
    const artifactIds = new Set(ctx.artifacts.map((a) => a.artifact_id));
    const baselineIds = new Set(ctx.baselines.map((b) => b.baseline_id));
    for (const criterion of ctx.criteria) {
        if (!requirementIds.has(criterion.requirement_id)) {
            throw new errors_1.ReferentialIntegrityError(`Criterion '${criterion.criterion_id}' references unknown requirement ` +
                `'${criterion.requirement_id}'`);
        }
        if (criterion.applicability?.artifact_ids) {
            for (const aid of criterion.applicability.artifact_ids) {
                if (!artifactIds.has(aid)) {
                    throw new errors_1.ReferentialIntegrityError(`Criterion '${criterion.criterion_id}' applicability references unknown ` +
                        `artifact '${aid}'`);
                }
            }
        }
    }
    for (const er of ctx.evidence_requirements) {
        if (!criterionIds.has(er.criterion_id)) {
            throw new errors_1.ReferentialIntegrityError(`EvidenceRequirement '${er.evidence_requirement_id}' references unknown ` +
                `criterion '${er.criterion_id}'`);
        }
    }
    for (const evidence of ctx.observed_evidence) {
        if (!artifactIds.has(evidence.artifact_id)) {
            throw new errors_1.ReferentialIntegrityError(`ObservedEvidence '${evidence.evidence_id}' references unknown artifact ` +
                `'${evidence.artifact_id}'`);
        }
    }
    for (const artifact of ctx.artifacts) {
        if (artifact.baseline_id !== undefined && !baselineIds.has(artifact.baseline_id)) {
            throw new errors_1.ReferentialIntegrityError(`Artifact '${artifact.artifact_id}' references unknown baseline ` +
                `'${artifact.baseline_id}'`);
        }
    }
}
function buildTraceabilityUniverse(ctx) {
    const idsByKind = new Map([
        ["Requirement", new Set(ctx.requirements.map((r) => r.requirement_id))],
        ["Criterion", new Set(ctx.criteria.map((c) => c.criterion_id))],
        [
            "EvidenceRequirement",
            new Set(ctx.evidence_requirements.map((e) => e.evidence_requirement_id)),
        ],
        ["ObservedEvidence", new Set(ctx.observed_evidence.map((e) => e.evidence_id))],
        ["Artifact", new Set(ctx.artifacts.map((a) => a.artifact_id))],
        ["Baseline", new Set(ctx.baselines.map((b) => b.baseline_id))],
    ]);
    return { idsByKind };
}
function universeContains(universe, kind, id) {
    return universe.idsByKind.get(kind)?.has(id) ?? false;
}
/** Composite key uniquely identifying an entity within the traceability universe. */
function entityKey(kind, id) {
    return `${kind}::${id}`;
}
function validateTraceabilityUniverse(ctx) {
    const universe = buildTraceabilityUniverse(ctx);
    for (const link of ctx.traceability_links) {
        if (!universeContains(universe, link.source_kind, link.source_id)) {
            throw new errors_1.ReferentialIntegrityError(`TraceabilityLink '${link.link_id}' has orphan source: ` +
                `${link.source_kind}:'${link.source_id}' not found in traceability universe`);
        }
        if (!universeContains(universe, link.target_kind, link.target_id)) {
            throw new errors_1.ReferentialIntegrityError(`TraceabilityLink '${link.link_id}' has orphan target: ` +
                `${link.target_kind}:'${link.target_id}' not found in traceability universe`);
        }
        if (link.source_kind === link.target_kind && link.source_id === link.target_id) {
            throw new errors_1.ReferentialIntegrityError(`TraceabilityLink '${link.link_id}' is a self-loop: ` +
                `${link.source_kind}:'${link.source_id}' -> ${link.target_kind}:'${link.target_id}'`);
        }
    }
}
/**
 * Deterministic DFS cycle detection over the directed graph induced by
 * traceability links. Traversal order is the input order of
 * `traceability_links` (already duplicate/orphan validated), so results
 * are stable across runs given identical input.
 */
function validateTraceabilityAcyclic(ctx) {
    const adjacency = new Map();
    for (const link of ctx.traceability_links) {
        const from = entityKey(link.source_kind, link.source_id);
        const to = entityKey(link.target_kind, link.target_id);
        const existing = adjacency.get(from);
        if (existing) {
            existing.push(to);
        }
        else {
            adjacency.set(from, [to]);
        }
    }
    const WHITE = 0;
    const GRAY = 1;
    const BLACK = 2;
    const color = new Map();
    const allNodes = [];
    for (const link of ctx.traceability_links) {
        allNodes.push(entityKey(link.source_kind, link.source_id));
        allNodes.push(entityKey(link.target_kind, link.target_id));
    }
    const uniqueNodes = Array.from(new Set(allNodes));
    function dfs(node, stack) {
        color.set(node, GRAY);
        stack.push(node);
        const neighbors = adjacency.get(node) ?? [];
        for (const neighbor of neighbors) {
            const state = color.get(neighbor) ?? WHITE;
            if (state === WHITE) {
                dfs(neighbor, stack);
            }
            else if (state === GRAY) {
                const cycleStart = stack.indexOf(neighbor);
                const cyclePath = [...stack.slice(cycleStart), neighbor].join(" -> ");
                throw new errors_1.ReferentialIntegrityError(`Traceability cycle detected: ${cyclePath}`);
            }
            // BLACK neighbor: already fully explored, no cycle through it.
        }
        stack.pop();
        color.set(node, BLACK);
    }
    for (const node of uniqueNodes) {
        if ((color.get(node) ?? WHITE) === WHITE) {
            dfs(node, []);
        }
    }
}
// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------
/**
 * Run the full domain validation pipeline (Sections 6, 11, 12).
 * Order matters: duplicates first (so later checks can trust uniqueness),
 * then predicate presence, then referential integrity, then traceability
 * universe membership, then cycle detection.
 */
function validateDomain(ctx) {
    validateDuplicateIds(ctx);
    validateCriteriaHavePredicates(ctx);
    validateReferentialIntegrity(ctx);
    validateTraceabilityUniverse(ctx);
    validateTraceabilityAcyclic(ctx);
}
