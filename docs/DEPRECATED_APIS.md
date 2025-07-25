# Deprecated APIs

This document tracks deprecated APIs in the suzumina.click codebase that will be removed in future versions.

## Deprecation Timeline

### Removed APIs (2025-07-25)

The following APIs have been removed as part of PR #23:

#### Web Application

##### `/apps/web/src/app/videos/actions.ts` - **REMOVED**
- **Removal Date**: 2025-07-25
- **Replacement**: Use `/apps/web/src/app/videos/actions-v2.ts`
- **Test File**: `/apps/web/src/app/videos/__tests__/actions.test.ts` - **REMOVED**

#### Cloud Functions

##### `/apps/functions/src/services/youtube/youtube-firestore.ts` - **REMOVED**
- **Removal Date**: 2025-07-25
- **Replacement**: Use `/apps/functions/src/services/youtube/youtube-firestore-v2.ts`
- **Test File**: `/apps/functions/src/services/youtube/__tests__/youtube-firestore.test.ts` - **REMOVED**


## Background

These APIs are being deprecated as part of the Entity/Value Object architecture migration (Entity V2). The new architecture provides:

- Better type safety with domain models
- Cleaner separation of concerns
- Improved maintainability
- Automatic _v2Migration flag for data tracking

## Production Status

Entity V2 is already enabled in production through feature flags:
- Web Application: `ENABLE_ENTITY_V2=true`
- Cloud Functions: `ENABLE_ENTITY_V2=true`

## Removal Schedule

1. ~~**Now - August 2025**: Deprecated APIs remain functional with deprecation warnings~~ **COMPLETED**
2. ~~**August 31, 2025**: V1 APIs will be removed (PR #23)~~ **COMPLETED 2025-07-25**
3. **October 2025**: V2 suffixes and feature flags will be removed (PR #24)
4. **January 2026**: Compatibility code (fromLegacy/toLegacy) will be removed (Phase 8)

## Questions?

If you have questions about migrating to the new APIs, please refer to:
- `docs/DOMAIN_MODEL.md` - Domain model architecture
- `docs/DOMAIN_OBJECT_CATALOG.md` - Domain object specifications