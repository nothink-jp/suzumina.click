# Deprecated APIs

This document tracks deprecated APIs in the suzumina.click codebase that will be removed in future versions.

## Deprecation Timeline

### Target: v3.0.0 (August 31, 2025)

The following APIs are deprecated and will be removed in v3.0.0:

#### Web Application

##### `/apps/web/src/app/videos/actions.ts`
- **Status**: Deprecated
- **Replacement**: Use `/apps/web/src/app/videos/actions-v2.ts`
- **Affected Functions**:
  - `getVideoTitles()` → Use from `actions-v2`
  - `getTotalVideoCount()` → Use from `actions-v2`
  - `getVideoById()` → Use from `actions-v2`

**Migration Example**:
```typescript
// Before:
import { fetchVideos } from './actions';

// After:
import { fetchVideos } from './actions-v2';
```

#### Cloud Functions

##### `/apps/functions/src/services/youtube/youtube-firestore.ts`
- **Status**: Deprecated
- **Replacement**: Use `/apps/functions/src/services/youtube/youtube-firestore-v2.ts`
- **Affected Functions**:
  - `saveVideosToFirestore()` → Use `saveVideosToFirestoreV2()`
  - `convertVideoDataForFirestore()` → Use `VideoMapperV2.fromYouTubeAPI()`

**Migration Example**:
```typescript
// Before:
import { saveVideosToFirestore } from './youtube-firestore';

// After:
import { saveVideosToFirestoreV2 } from './youtube-firestore-v2';
```

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

1. **Now - August 2025**: Deprecated APIs remain functional with deprecation warnings
2. **August 31, 2025**: V1 APIs will be removed (PR #23)
3. **October 2025**: V2 suffixes and feature flags will be removed (PR #24)
4. **January 2026**: Compatibility code (fromLegacy/toLegacy) will be removed (Phase 8)

## Questions?

If you have questions about migrating to the new APIs, please refer to:
- `docs/DOMAIN_MODEL.md` - Domain model architecture
- `docs/DOMAIN_OBJECT_CATALOG.md` - Domain object specifications