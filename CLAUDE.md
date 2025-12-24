# suzumina.click - Claude AI Development Guidelines

This document contains ESSENTIAL instructions for Claude AI when working on the suzumina.click project.
For detailed project documentation, see [Documentation Index](docs/README.md).

---

## 🚨 CRITICAL INSTRUCTIONS FOR CLAUDE AI

### 1. PACKAGE MANAGER
- **ONLY USE pnpm** - npm commands are FORBIDDEN
- All commands must use pnpm: `pnpm test`, `pnpm dev`, `pnpm build`

### 2. FILE OPERATIONS
- **ALWAYS prefer editing existing files over creating new ones**
- New file creation only when explicitly necessary
- NO automatic documentation generation (*.md, README, etc.)

### 3. TESTING REQUIREMENTS
- **ALWAYS run tests after code changes**: `pnpm test`
- **ALWAYS run linting**: `pnpm lint`
- **ALWAYS run typecheck**: `pnpm typecheck`
- **ALWAYS place test files in `__tests__` directories** - not co-located with source files

### 4. CODE QUALITY STANDARDS
- **TypeScript strict mode** - no compromises
- **Biome configuration** - follow all rules
- **Type safety** - use shared-types package
- **No unnecessary comments** - code should be self-documenting

### 5. SECURITY REQUIREMENTS
- **NO secret information exposure**
- **NO committing sensitive data**
- **Follow security best practices**

### 6. FORBIDDEN OPERATIONS
- **NO firebase commands** - Firebase is not enabled
- **NO npm commands** - pnpm only
- **NO creating documentation files** unless explicitly requested

### 7. DOMAIN MODEL UPDATES
- **ALWAYS update domain documentation** when modifying entities or value objects
- Update `docs/reference/domain-model.md` for architectural changes
- Update `docs/reference/domain-object-catalog.md` for entity/value object changes
- **Check DDD implementation criteria** before creating new entities - see `docs/decisions/architecture/ADR-001-ddd-implementation-guidelines.md`

### 8. CRITICAL NAMING CONVENTIONS
- **Firestore collection for DLsite works is `works`** - NOT `dlsiteWorks` (renamed on 2025-07-31)
- Previously named `dlsiteWorks`, but renamed to `works` for consistency
- Always verify collection names when working with Firestore

### 9. DATA INTEGRITY
- **Weekly data integrity checks** run automatically via `checkDataIntegrity` function
- Scheduled for Sundays at 3:00 JST
- Checks and fixes: Circle workIds arrays, orphaned Creator mappings, Work-Circle consistency
- Results stored in `dlsiteMetadata/dataIntegrityCheck` document

---

## 📚 REFERENCE DOCUMENTATION

### Project Information
- **Status**: PRODUCTION READY v0.3.11
- **URL**: https://suzumina.click
- **Tech Stack**: Next.js 15, TypeScript, Firestore, Cloud Functions

### Key Documentation Links
- [Project Overview](docs/README.md)
- [Development Guide](docs/guides/development.md)
- [Architecture Overview](docs/reference/architecture.md)
- [Infrastructure Architecture](docs/reference/infrastructure-architecture.md)
- [Application Architecture](docs/reference/application-architecture.md)
- [Database Schema](docs/reference/database-schema.md)
- [Domain Model](docs/reference/domain-model.md)
- [Testing Guide](docs/guides/testing.md)
- [Architecture Decision Records](docs/decisions/README.md)

### Quick Command Reference
```bash
# Development
pnpm --filter @suzumina.click/web dev

# Testing
pnpm test
pnpm lint
pnpm typecheck

# Build
pnpm build
```

---

## 🎯 DEVELOPMENT PATTERNS

### Preferred Patterns
- **Server Actions**: Use for data operations and form processing
- **Server Components**: Maximize for better performance
- **Type Safety**: Always use TypeScript strict mode
- **Testing**: Write tests for all new features

### Code Organization
- Components: Use packages/ui for reusable components
- Tests: Place in `__tests__` directories
- Actions: Use Server Actions in `src/actions/`
- Types: Use @suzumina.click/shared-types package

---

## ⚠️ IMPORTANT NOTES

1. **Ubiquitous Language**: Follow terminology in [ubiquitous-language.md](docs/reference/ubiquitous-language.md)
2. **Recent Changes**: Check [CHANGELOG.md](docs/operations/changelog.md) for latest updates
3. **Active Tasks**: Review [TODO.md](docs/operations/todo.md) for current priorities

---

**Last Updated**: 2025-12-24
**Document Version**: 4.5 (v0.3.11 with docs cleanup)