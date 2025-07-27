# Deprecated APIs Archive

**アーカイブ日**: 2025-07-27  
**理由**: アクティブな非推奨APIのみを追跡する簡潔なドキュメントに移行

## 概要

このディレクトリには、過去に削除されたAPIの詳細な履歴が保存されています。

## アーカイブされたドキュメント

- `DEPRECATED_APIS_HISTORY.md` - 削除済みAPIの完全な履歴（2025-07-25, 2025-07-26）

## 新しいドキュメント

- `/docs/DEPRECATED_APIS_ACTIVE.md` - 現在非推奨で将来削除予定のAPIのみを記載

## なぜ分離したか

1. **明確性**: 削除済みと削除予定を明確に分離
2. **実用性**: 開発者は主に削除予定のAPIに関心がある
3. **簡潔性**: アクティブな情報のみに集中

## 削除済みAPIの概要

### 2025-07-25
- `/apps/web/src/app/videos/actions.ts` → `actions-v2.ts`
- `/apps/functions/src/services/youtube/youtube-firestore.ts` → `youtube-firestore-v2.ts`

### 2025-07-26
- `OptimizedFirestoreDLsiteWorkData` → `WorkDocument`