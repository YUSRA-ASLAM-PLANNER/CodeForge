"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const validator_1 = require("../src/validation/validator");
const errors_1 = require("../src/errors");
const fixtures_1 = require("./fixtures");
(0, node_test_1.test)("referential integrity: duplicate requirement id rejected", () => {
    const ctx = (0, fixtures_1.mutable)((0, fixtures_1.clone)((0, fixtures_1.baseContext)()));
    ctx.requirements = [...ctx.requirements, { ...ctx.requirements[0] }];
    strict_1.default.throws(() => (0, validator_1.validateDomain)(ctx), errors_1.ReferentialIntegrityError);
});
(0, node_test_1.test)("referential integrity: duplicate criterion id rejected", () => {
    const ctx = (0, fixtures_1.mutable)((0, fixtures_1.clone)((0, fixtures_1.baseContext)()));
    ctx.criteria = [...ctx.criteria, { ...ctx.criteria[0] }];
    strict_1.default.throws(() => (0, validator_1.validateDomain)(ctx), errors_1.ReferentialIntegrityError);
});
(0, node_test_1.test)("referential integrity: duplicate evidence requirement id rejected", () => {
    const ctx = (0, fixtures_1.mutable)((0, fixtures_1.clone)((0, fixtures_1.baseContext)()));
    ctx.evidence_requirements = [
        ...ctx.evidence_requirements,
        { ...ctx.evidence_requirements[0] },
    ];
    strict_1.default.throws(() => (0, validator_1.validateDomain)(ctx), errors_1.ReferentialIntegrityError);
});
(0, node_test_1.test)("referential integrity: duplicate evidence id rejected", () => {
    const ctx = (0, fixtures_1.mutable)((0, fixtures_1.clone)((0, fixtures_1.baseContext)()));
    ctx.observed_evidence = [...ctx.observed_evidence, { ...ctx.observed_evidence[0] }];
    strict_1.default.throws(() => (0, validator_1.validateDomain)(ctx), errors_1.ReferentialIntegrityError);
});
(0, node_test_1.test)("referential integrity: duplicate artifact id rejected", () => {
    const ctx = (0, fixtures_1.mutable)((0, fixtures_1.clone)((0, fixtures_1.baseContext)()));
    ctx.artifacts = [...ctx.artifacts, { ...ctx.artifacts[0] }];
    strict_1.default.throws(() => (0, validator_1.validateDomain)(ctx), errors_1.ReferentialIntegrityError);
});
(0, node_test_1.test)("referential integrity: duplicate baseline id rejected", () => {
    const ctx = (0, fixtures_1.mutable)((0, fixtures_1.clone)((0, fixtures_1.baseContext)()));
    ctx.baselines = [...ctx.baselines, { ...ctx.baselines[0] }];
    strict_1.default.throws(() => (0, validator_1.validateDomain)(ctx), errors_1.ReferentialIntegrityError);
});
(0, node_test_1.test)("referential integrity: duplicate traceability link id rejected", () => {
    const ctx = (0, fixtures_1.mutable)((0, fixtures_1.clone)((0, fixtures_1.baseContext)()));
    const link = {
        link_id: "LINK-01",
        source_id: "CRIT-01",
        source_kind: "Criterion",
        target_id: "REQ-01",
        target_kind: "Requirement",
        relation: "derivesFrom",
    };
    ctx.traceability_links = [link, { ...link }];
    strict_1.default.throws(() => (0, validator_1.validateDomain)(ctx), errors_1.ReferentialIntegrityError);
});
(0, node_test_1.test)("referential integrity: unknown requirement referenced by criterion rejected", () => {
    const ctx = (0, fixtures_1.mutable)((0, fixtures_1.clone)((0, fixtures_1.baseContext)()));
    ctx.criteria[0].requirement_id = "REQ-DOES-NOT-EXIST";
    strict_1.default.throws(() => (0, validator_1.validateDomain)(ctx), errors_1.ReferentialIntegrityError);
});
(0, node_test_1.test)("referential integrity: unknown criterion referenced by evidence requirement rejected", () => {
    const ctx = (0, fixtures_1.mutable)((0, fixtures_1.clone)((0, fixtures_1.baseContext)()));
    ctx.evidence_requirements[0].criterion_id = "CRIT-DOES-NOT-EXIST";
    strict_1.default.throws(() => (0, validator_1.validateDomain)(ctx), errors_1.ReferentialIntegrityError);
});
(0, node_test_1.test)("referential integrity: unknown artifact referenced by evidence rejected", () => {
    const ctx = (0, fixtures_1.mutable)((0, fixtures_1.clone)((0, fixtures_1.baseContext)()));
    ctx.observed_evidence[0].artifact_id = "ART-DOES-NOT-EXIST";
    strict_1.default.throws(() => (0, validator_1.validateDomain)(ctx), errors_1.ReferentialIntegrityError);
});
(0, node_test_1.test)("referential integrity: unknown baseline referenced by artifact rejected", () => {
    const ctx = (0, fixtures_1.mutable)((0, fixtures_1.clone)((0, fixtures_1.baseContext)()));
    ctx.artifacts[0].baseline_id = "BASE-DOES-NOT-EXIST";
    strict_1.default.throws(() => (0, validator_1.validateDomain)(ctx), errors_1.ReferentialIntegrityError);
});
(0, node_test_1.test)("referential integrity: orphan traceability source rejected", () => {
    const ctx = (0, fixtures_1.mutable)((0, fixtures_1.clone)((0, fixtures_1.baseContext)()));
    ctx.traceability_links = [
        {
            link_id: "LINK-01",
            source_id: "GHOST",
            source_kind: "Criterion",
            target_id: "REQ-01",
            target_kind: "Requirement",
            relation: "derivesFrom",
        },
    ];
    strict_1.default.throws(() => (0, validator_1.validateDomain)(ctx), errors_1.ReferentialIntegrityError);
});
(0, node_test_1.test)("referential integrity: orphan traceability target rejected", () => {
    const ctx = (0, fixtures_1.mutable)((0, fixtures_1.clone)((0, fixtures_1.baseContext)()));
    ctx.traceability_links = [
        {
            link_id: "LINK-01",
            source_id: "CRIT-01",
            source_kind: "Criterion",
            target_id: "GHOST",
            target_kind: "Requirement",
            relation: "derivesFrom",
        },
    ];
    strict_1.default.throws(() => (0, validator_1.validateDomain)(ctx), errors_1.ReferentialIntegrityError);
});
(0, node_test_1.test)("referential integrity: self-loop rejected", () => {
    const ctx = (0, fixtures_1.mutable)((0, fixtures_1.clone)((0, fixtures_1.baseContext)()));
    ctx.traceability_links = [
        {
            link_id: "LINK-01",
            source_id: "CRIT-01",
            source_kind: "Criterion",
            target_id: "CRIT-01",
            target_kind: "Criterion",
            relation: "self",
        },
    ];
    strict_1.default.throws(() => (0, validator_1.validateDomain)(ctx), errors_1.ReferentialIntegrityError);
});
(0, node_test_1.test)("referential integrity: cycle rejected", () => {
    const ctx = (0, fixtures_1.mutable)((0, fixtures_1.clone)((0, fixtures_1.baseContext)()));
    ctx.requirements = [
        ...ctx.requirements,
        { requirement_id: "REQ-02", title: "Second", constraint_level: "Standard" },
    ];
    ctx.traceability_links = [
        {
            link_id: "LINK-01",
            source_id: "REQ-01",
            source_kind: "Requirement",
            target_id: "REQ-02",
            target_kind: "Requirement",
            relation: "relatesTo",
        },
        {
            link_id: "LINK-02",
            source_id: "REQ-02",
            source_kind: "Requirement",
            target_id: "REQ-01",
            target_kind: "Requirement",
            relation: "relatesTo",
        },
    ];
    strict_1.default.throws(() => (0, validator_1.validateDomain)(ctx), errors_1.ReferentialIntegrityError);
});
(0, node_test_1.test)("missing predicate: criterion without structured_predicate rejected", () => {
    const ctx = (0, fixtures_1.mutable)((0, fixtures_1.clone)((0, fixtures_1.baseContext)()));
    delete ctx.criteria[0].structured_predicate;
    strict_1.default.throws(() => (0, validator_1.validateDomain)(ctx), errors_1.ValidationError);
});
