# suzumina.click - AI Assistant Instructions

声優「涼花みなせ」ファンサイト - 音声ボタン共有 & DLsite作品情報プラットフォーム

---

## 🎯 PROJECT OVERVIEW

**suzumina.click** は声優「涼花みなせ」ファンコミュニティ向けWebプラットフォームです。

### Core Features
- **音声ボタンシステム**: YouTube動画タイムスタンプ参照・96件表示対応・プール化最適化
- **DLsite統合**: Individual Info API・高解像度画像・詳細情報表示
- **認証・管理**: Discord OAuth・ユーザー管理・お気に入りシステム
- **検索システム**: 全コンテンツ横断検索・高度フィルタリング
- **管理者機能**: 完全なコンテンツ・ユーザー管理インターフェース

### Current Status: **PRODUCTION READY v0.3.3**
- 本番稼働中: https://suzumina.click
- 559+件テストスイート全合格
- TypeScript strict mode完全準拠
- パフォーマンス最適化完了（音声ボタン96件表示・87%メモリ削減）

---

## 🏗️ ARCHITECTURE

### Monorepo Structure
```
suzumina.click/
├── apps/
│   ├── web/                    # Next.js 15 Frontend
│   │   ├── src/app/           # App Router
│   │   ├── src/components/    # React Components
│   │   ├── src/lib/           # Utilities
│   │   └── src/actions/       # Server Actions
│   ├── admin/                 # Admin Dashboard
│   └── functions/             # Cloud Functions Backend
│       ├── src/endpoints/     # API Endpoints
│       ├── src/services/      # Business Logic
│       └── src/infrastructure/ # Infrastructure Layer
├── packages/
│   ├── shared-types/          # Type Definitions
│   ├── typescript-config/     # TypeScript Config
│   └── ui/                    # UI Component Library
└── docs/                      # Documentation
```

### Tech Stack
- **Frontend**: Next.js 15 + React + TypeScript + Tailwind CSS v4
- **Backend**: Cloud Functions + Node.js + TypeScript
- **Database**: Cloud Firestore + Cloud Storage
- **Authentication**: NextAuth.js + Discord OAuth
- **APIs**: YouTube Data API v3 + DLsite Individual Info API
- **Testing**: Vitest + Playwright E2E
- **Code Quality**: Biome (Linter/Formatter)
- **Infrastructure**: Terraform + Google Cloud Platform

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

---

## 📊 KEY TECHNICAL DETAILS

### Database (Firestore)
- **dlsiteWorks**: `OptimizedFirestoreDLsiteWorkData`
- **dlsiteMetadata**: `UnifiedDataCollectionMetadata`
- **audioButtons**: Audio button data with YouTube references
- **favorites**: User favorite tracking
- **users**: User profile and authentication data

### Data Collection Systems
- **DLsite**: Individual Info API every hour at :00 minutes
- **YouTube**: Data API for video information
- **Optimization**: 重複API呼び出し完全排除・リージョン差異対応

### Performance Optimizations (2025-07-15 COMPLETED)
- **Audio Button System**: YouTube Player pooling (5 players max, LRU)
- **Memory Usage**: 87% reduction (200-400MB → 25-50MB)
- **API Calls**: 98% reduction (100-150 calls → 1 call)
- **Display Capacity**: 96 audio buttons (92% improvement)
- **Virtualization**: react-window integration for large datasets

---

## 🔧 DEVELOPMENT COMMANDS

### Environment Setup
```bash
# Development server
pnpm --filter @suzumina.click/web dev

# Testing
pnpm --filter @suzumina.click/web test
pnpm --filter @suzumina.click/functions test
pnpm --filter @suzumina.click/web test:e2e

# Code quality
pnpm lint
pnpm typecheck
```

### Key Environment Variables
```bash
# Required for development (.env.local)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret
DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_CLIENT_SECRET=your-discord-client-secret
GOOGLE_CLOUD_PROJECT=suzumina-click
YOUTUBE_API_KEY=your-youtube-api-key

# Public variables
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX
NEXT_PUBLIC_ADSENSE_CLIENT_ID=ca-pub-xxxxxxxxxxxxxxxx
```

---

## 🎯 DEVELOPMENT PATTERNS

### Preferred Patterns
- **Server Actions**: Use for data operations and form processing
- **API Routes**: Only for external system integration
- **Cloud Functions**: GCF v2 CloudEvent handlers
- **Firestore**: Always use batch operations with error handling
- **Components**: Use packages/ui for reusable components

### Implementation Guidelines
- **YAGNI, DRY, KISS principles**
- **Type safety first**
- **Test-driven development**
- **Security-first approach**
- **Performance-conscious implementation**

---

## 📚 IMPORTANT DOCUMENTATION

### Core Documentation
- `docs/FIRESTORE_STRUCTURE.md`: Database schema details
- `docs/DEVELOPMENT.md`: Development environment setup
- `docs/UBIQUITOUS_LANGUAGE.md`: Domain terminology (MUST follow)
- `docs/INFRASTRUCTURE_ARCHITECTURE.md`: Infrastructure details

### Archived Projects
- `docs/archive/2025-07-audio-button-optimization/`: Completed optimization project
- `docs/archive/2025-07-server-actions-migration/`: Server Actions migration
- `docs/archive/2025-07-dlsite-optimization/`: DLsite optimization history

---

## ⚠️ KNOWN CONSTRAINTS

- **salesCount feature**: Completely discontinued (July 2025)
- **Regional differences**: Handled by union-based data collection
- **YouTube Player API**: postMessage warnings are harmless (Google internal)
- **AdSense integration**: Some CSP warnings in browsers are normal
- **Firebase commands**: NOT available - use Firestore admin SDK only

---

## 🚀 DEPLOYMENT INFO

- **Production URL**: https://suzumina.click
- **Infrastructure**: Google Cloud Platform + Terraform
- **CI/CD**: GitHub Actions for automated deployment
- **Monitoring**: Cloud Monitoring + Logging
- **Web App**: Cloud Run deployment
- **Functions**: Cloud Functions v2 with event triggers

---

## 📝 RECENT UPDATES

### v0.3.3 (2025-07-15)
- **Audio Button Performance Optimization COMPLETED**
  - YouTube Player pooling system (5 players, LRU management)
  - 87% memory reduction (200-400MB → 25-50MB)
  - 98% API call reduction (100-150 → 1 call)
  - 96 audio buttons display capacity (92% improvement)
  - Virtualization with react-window integration
  - Progressive loading system (skeleton → preview → full)

### v0.3.2 (2025-07-13)
- Google AdSense integration with CSP compliance
- Cookie consent system for GDPR compliance
- Security policy updates for ad serving

### v0.3.1 (2025-07-09)
- DLsite data collection system optimization
- Complete removal of salesCount functionality

---

**Last Updated**: 2025-07-15  
**Document Version**: 3.0 (Optimized for AI Processing)