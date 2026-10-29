# CodeForge

CodeForge is a repository analysis and architectural verification project designed to help developers identify architectural integrity issues in software codebases.

## Current Capabilities

- Repository indexing and import extraction.
- Supported TypeScript/JavaScript and Python import resolution.
- Context-graph construction.
- Architectural verification.
- Circular dependency detection.

## Project Structure

```text
CodeForge/
|-- apps/
|-- packages/
|   |-- context-graph/
|   |-- evaluation-engine/
|   |-- repository-indexer/
|   |-- verification-engine/
|-- codeforge.config.json
|-- package.json
|-- package-lock.json
```

## Requirements

- Node.js
- npm

## Getting Started

Install dependencies:

```powershell
npm.cmd install
```

Build the workspaces:

```powershell
npm.cmd run build
```

Run tests:

```powershell
npm.cmd test
```

## Verify a Repository

Build the verification engine:

```powershell
npm.cmd run build --workspace=packages/verification-engine
```

Verify the current repository:

```powershell
node packages/verification-engine/dist/src/cli.js verify .
```

To verify another repository, replace the dot with its path.

## Configuration

The root codeforge.config.json enables automatic layer detection and defines UI import boundaries for database and infrastructure modules.

## Development Status

CodeForge is under active development. Its capabilities depend on the rules and resolver logic currently implemented.

## License

No license has been specified yet.
