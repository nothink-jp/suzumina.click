# Deployment Optimization Guide

## 🚀 Cloud Run デプロイ高速化実装完了

### 📊 最適化前後の比較

#### ⏱️ 推定実行時間
- **最適化前**: 3分 (180秒)
- **最適化後**: 1-1.5分 (60-90秒)  
- **削減率**: 50-67%の高速化

### 🎯 実装した最適化

#### 1. Docker ビルドキャッシュ最適化
```dockerfile
# マルチステージビルドの cache mount
RUN --mount=type=cache,target=/pnpm,sharing=locked \
    pnpm install --frozen-lockfile

RUN --mount=type=cache,target=/app/apps/web/.next/cache \
    --mount=type=cache,target=/app/apps/web/node_modules/.cache \
    pnpm build
```

**効果**: 
- pnpm install: 30-60秒 → 5-15秒
- Next.js build: 60-90秒 → 20-40秒

#### 2. Docker Buildx レジストリキャッシュ
```bash
docker buildx build \
  --cache-from type=registry,ref=$CACHE_TAG \
  --cache-to type=registry,ref=$CACHE_TAG,mode=max \
  --push
```

**効果**:
- Docker layer再利用による大幅高速化
- CI環境間でのキャッシュ共有

#### 3. GitHub Actions キャッシュ最適化
```yaml
# Next.js build cache
- name: Cache Next.js build
  uses: actions/cache@v4
  with:
    path: apps/web/.next/cache
    key: ${{ runner.os }}-nextjs-${{ hashFiles(...) }}

# pnpm store cache (改良)
- name: Setup pnpm cache
  uses: actions/cache@v4
  with:
    path: ${{ env.STORE_PATH }}
    key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
```

**効果**:
- Next.js ビルドキャッシュ: ページ差分のみビルド
- pnpm: 依存関係インストール高速化

#### 4. 並列処理最適化
```bash
# 品質チェック並列実行
pnpm --filter web test &
pnpm --filter web lint &  
pnpm --filter web typecheck &
wait # 全て完了まで待機
```

**効果**:
- 品質チェック: 90秒 → 30秒 (最遅プロセス時間)
- CPU並列利用による大幅高速化

### 📈 詳細最適化内容

#### Web App (`deploy-cloud-run.yml`)
1. **Docker Buildx**: レジストリキャッシュ + マルチプラットフォーム
2. **Next.js キャッシュ**: `.next/cache` 永続化
3. **並列品質チェック**: test/lint/typecheck 同時実行
4. **pnpm 最適化**: レジストリキャッシュ + ストア永続化

#### Admin App (`deploy-admin.yml`)  
1. **同様のDocker最適化**: buildx + キャッシュ
2. **軽量リソース管理**: 5イメージ・3リビジョン保持

#### Dockerfile最適化
1. **cache mount**: 全ビルドステップでキャッシュ活用
2. **sharing=locked**: 並列ビルド時の安全なキャッシュ共有
3. **mode=max**: 最大限のレイヤーキャッシュ

### 🎯 期待される結果

#### 初回デプロイ (キャッシュなし)
- **Web App**: 2.5-3分 → 1.5-2分
- **Admin App**: 2-2.5分 → 1-1.5分

#### 2回目以降 (キャッシュあり)
- **Web App**: 1.5-2分 → 45-75秒  
- **Admin App**: 1-1.5分 → 30-60秒

#### 小規模変更時 (コード微修正)
- **Web App**: 60-90秒 → 30-45秒
- **Admin App**: 45-60秒 → 20-30秒

### 💡 追加最適化案 (将来実装)

#### GitHub Actions並列化
```yaml
strategy:
  matrix:
    app: [web, admin]
```

#### 段階的デプロイ
- Canary リリース
- Blue-Green デプロイ

#### キャッシュ最適化
- SSD backed cache
- Redis キャッシュレイヤー

### 🔧 運用ポイント

#### 初回デプロイ後の確認事項
1. Docker registry にキャッシュイメージが保存されているか
2. GitHub Actions cache が正常に動作しているか  
3. ビルド時間が期待値内に収まっているか

#### トラブルシューティング
- キャッシュ破損時: `docker system prune -a` でリセット
- 依存関係変更時: pnpm-lock.yaml ハッシュ変更で自動無効化
- GitHub Actions cache 制限: 10GB制限に注意

### 📊 運用効果測定

#### メトリクス
- デプロイ時間 (分)
- GitHub Actions使用時間 (分)
- Docker registry ストレージ使用量 (GB)
- 開発者フィードバック時間 (分)

#### 目標値
- 平均デプロイ時間: 90秒以下
- GitHub Actions時間: 月間使用量20%削減
- 開発者フィードバック: 2分以内

---

*suzumina.click Deployment Optimization v1.0 - 2025年7月実装*