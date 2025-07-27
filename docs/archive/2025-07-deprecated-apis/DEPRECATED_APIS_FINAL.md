# 非推奨API（最終記録）

**最終更新**: 2025-07-27  
**アーカイブ日**: 2025-07-27  
**目的**: レガシー形式サポート終了時点での非推奨APIの最終記録

## 実装状況確認結果（2025-07-27 最終）

### V2サフィックス付きファイル
- **状態**: ✅ 完全削除済み
- **対応PR**: #26

### ENABLE_ENTITY_V2フィーチャーフラグ
- **状態**: ✅ 完全削除済み
- **削除内容**:
  - `/apps/web/.env.example` から削除
  - すべてのコードから削除

### fromLegacy/toLegacyメソッド
- **状態**: ✅ 完全削除済み
- **削除内容**:
  - `AudioButton.fromLegacy()` メソッド削除
  - `AudioButton.toLegacy()` メソッド削除
  - マイグレーションコードを`fromFirestoreData()`に更新

### FrontendAudioButtonData型
- **状態**: ✅ 完全削除済み
- **移行先**: `AudioButtonPlainObject`
- **変更内容**:
  - すべてのUIコンポーネントでAudioButtonPlainObjectを使用
  - サーバーアクションの戻り値を更新
  - テストデータに_computedプロパティを追加

### その他の削除項目
- `convertToFrontendAudioButton()` 関数: ✅ 削除済み
- `audio-button-adapter.tsx`: ✅ 削除済み
- `fromFrontendAudioButtonData()` 移行関数: ✅ 削除済み

## 最終的な影響範囲

### 更新されたパッケージ
1. **@suzumina.click/shared-types**
   - AudioButtonエンティティからレガシーメソッド削除
   - FrontendAudioButtonData型定義削除

2. **@suzumina.click/web**
   - すべてのサーバーアクションでAudioButtonPlainObjectを返すよう更新
   - UIコンポーネントの型をAudioButtonPlainObjectに統一

3. **@suzumina.click/ui**
   - すべてのコンポーネントでAudioButtonPlainObject使用
   - テストデータに_computedプロパティ追加

4. **@suzumina.click/functions**
   - マイグレーションコードをfromFirestoreData使用に更新

## 移行の完了

レガシー形式のサポートは2025年7月27日をもって完全に終了しました。
すべてのコードベースが新しいエンティティモデルに移行され、
レガシー互換性のためのコードはすべて削除されました。

## 今後の参照先

- `/docs/DOMAIN_MODEL.md` - 現在のドメインモデル
- `/docs/ENTITY_IMPLEMENTATION_GUIDE.md` - エンティティ実装ガイド
- `/packages/shared-types/src/entities/` - エンティティ実装
- `/packages/shared-types/src/plain-objects/` - Plain Object定義