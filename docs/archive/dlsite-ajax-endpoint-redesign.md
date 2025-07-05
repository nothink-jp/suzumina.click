# DLsite AJAX Endpoint 再設計仕様書

**作成日**: 2025年7月5日  
**目的**: DLsite作品収集システムをHTML直接取得からAJAXエンドポイント利用に移行

## 📋 概要

現在のDLsite作品収集システムは、HTMLページを直接取得してパースしていますが、DLsiteが提供するAJAXエンドポイントを使用することで、より効率的で安定したデータ取得が可能になります。

## 🔍 現在の実装と課題

### 現在の方式
```typescript
// 現在のURL形式
const DLSITE_SEARCH_BASE_URL = 
  "https://www.dlsite.com/maniax/fsr/=/keyword_creater/%22%E6%B6%BC%E8%8A%B1%E3%81%BF%E3%81%AA%E3%81%9B%22/per_page/100/page/";

// 実際のリクエスト
const url = `${DLSITE_SEARCH_BASE_URL}${page}/show_type/1`;
```

### 課題
1. **HTMLパース依存**: HTMLの構造変更に脆弱
2. **ページサイズ制限**: per_page/100が機能しない（実際は30件）
3. **レスポンスサイズ**: 完全なHTMLページ（約140KB）を取得
4. **パース複雑度**: cheerio + 複雑なセレクター処理

## 🚀 新しいAJAXエンドポイント方式

### エンドポイント仕様
```typescript
// 新しいAJAXエンドポイント
const DLSITE_AJAX_BASE_URL = 
  "https://www.dlsite.com/maniax/fsr/ajax/=/keyword_creater/%22%E6%B6%BC%E8%8A%B1%E3%81%BF%E3%81%AA%E3%81%9B%22/order/release/";

// ページ指定
const url = `${DLSITE_AJAX_BASE_URL}page/${pageNumber}`;
```

### curlテスト結果
```bash
# 実行したコマンド
curl -H "accept: application/json" \
     -H "Content-Type: application/json" \
     --globoff \
     -X GET "https://www.dlsite.com/maniax/fsr/ajax/=/keyword_creater/%22%E6%B6%BC%E8%8A%B1%E3%81%BF%E3%81%AA%E3%81%9B%22/order/release/page/1"

# 結果: 成功 (163KB JSONレスポンス)
```

## 📊 JSONレスポンス構造詳細

### レスポンス形式
```typescript
interface DLsiteAjaxResponse {
  search_result: string;  // HTMLコンテンツ（エスケープ済み）
  page_info: {
    count: number;        // 総作品数
    first_indice: number; // 現在ページの開始インデックス
    last_indice: number;  // 現在ページの終了インデックス
  };
}
```

### 実際のデータ例
```json
{
  "search_result": "HTML content here...",
  "page_info": {
    "count": 1471,      // 総作品数: 1,471件
    "first_indice": 1,  // 1件目から
    "last_indice": 30   // 30件目まで（1ページあたり30件）
  }
}
```

## 🔧 HTMLコンテンツ解析

### エスケープ解除後のHTML構造
JSONの`search_result`フィールドをパースすると、以下の構造のHTMLが取得できます：

```html
<div id="search_result_list" class="_search_result_list">
  <ul id="search_result_img_box" class="n_worklist">
    <!-- 作品1 -->
    <li data-list_item_product_id="RJ236867" class="search_result_img_box_inner type_exclusive_01">
      <dl class="work_img_main">
        <!-- サムネイル画像 -->
        <dt class="search_img work_thumb">
          <a href="https://www.dlsite.com/maniax/work/=/product_id/RJ236867.html">
            <img src="//img.dlsite.jp/resize/images2/work/doujin/RJ237000/RJ236867_img_main_240x240.jpg" 
                 alt="夏の苦い思い出 [ARIKA Work]">
          </a>
        </dt>
        
        <!-- カテゴリ情報 -->
        <dd class="work_category_free_sample">
          <div class="work_category type_ADV type_free_sample">
            <a href="https://www.dlsite.com/maniax/fsr/=/work_type/ADV">アドベンチャー</a>
          </div>
        </dd>
        
        <!-- 作品名 -->
        <dd class="work_name">
          <div class="multiline_truncate">
            <a href="https://www.dlsite.com/maniax/work/=/product_id/RJ236867.html" 
               title="夏の苦い思い出">夏の苦い思い出</a>
          </div>
        </dd>
        
        <!-- サークル名 -->
        <dd class="maker_name">
          <a href="https://www.dlsite.com/maniax/circle/profile/=/maker_id/RG43523.html">ARIKA Work</a>
        </dd>
        
        <!-- 価格情報 -->
        <dd class="work_price_wrap">
          <span class="work_price">
            <span class="work_price_base">110</span>
            <span class="work_price_suffix">円</span>
          </span>
          <span class="strike">
            <span class="work_price_base">220</span>
            <span class="work_price_suffix">円</span>
          </span>
          <span class="work_point">10pt</span>
        </dd>
        
        <!-- 隠しフィールド（メタデータ）-->
        <input type="hidden" class="__product_attributes" 
               value="RG43523,adl,male,ADV,SND,MS2,TRI,WAP,REV,JPN,222,437,455,128">
        
        <!-- 販売数 -->
        <dd class="work_dl">
          販売数:&nbsp;<span class="_dl_count_RJ236867">521</span>
        </dd>
        
        <!-- 評価情報 -->
        <dd class="work_rating">
          <div class="star_rating star_45 mini">(149)</div>
          <div class="work_review">
            <a href="https://www.dlsite.com/maniax/work/reviewlist/=/product_id/RJ236867.html">(3)</a>
          </div>
        </dd>
        
        <!-- セール情報 -->
        <dd class="work_deals work_labels">
          <span class="icon_lead_01 type_sale">50%OFF</span>
        </dd>
      </dl>
    </li>
    
    <!-- 作品2, 3, ... 最大30件 -->
  </ul>
</div>
```

### 声優情報の取得例
涼花みなせが声優として参加している作品では、`maker_name`フィールドに追加情報が含まれます：

```html
<dd class="maker_name">
  <a href="https://www.dlsite.com/maniax/circle/profile/=/maker_id/RG19069.html">EMUCUS</a>
  <span class="separator">/</span>
  <span class="author">
    <a href="https://www.dlsite.com/maniax/fsr/=/keyword_creater/%22%E6%B6%BC%E8%8A%B1%E3%81%BF%E3%81%AA%E3%81%9B%22">涼花みなせ</a>
  </span>
</dd>
```

## 🔄 移行戦略

### フェーズ1: AJAX Fetcher 作成
新しいAJAXエンドポイント用のfetcher関数を作成

### フェーズ2: 既存パーサーの活用
現在の`parseWorksFromHTML`関数は、HTMLコンテンツをパースするため、`search_result`フィールドのHTMLに対してそのまま使用可能

### フェーズ3: エンドポイント統合
メインの`dlsite.ts`エンドポイントでAJAX fetcher を使用

### フェーズ4: 設定更新
設定ファイルのベースURL更新

## 📈 期待される改善効果

### パフォーマンス向上
- **レスポンス構造化**: JSON形式での構造化レスポンス
- **ページング情報**: `page_info`による正確なページング制御
- **総件数取得**: `count`フィールドによる事前の総件数把握

### 安定性向上
- **API的アクセス**: HTMLページ変更の影響を最小化
- **エラーハンドリング**: JSONパースエラーの明確化
- **デバッグ容易性**: 構造化レスポンスによるログ改善

### 機能拡張
- **正確なページング**: 30件/ページの明確な制御
- **進捗表示**: 総件数による進捗率計算
- **効率的収集**: 最終ページ判定の正確性向上

## 🛠️ 実装詳細

### 新しいfetcher関数の型定義
```typescript
interface DLsiteAjaxResponse {
  search_result: string;
  page_info: {
    count: number;
    first_indice: number;
    last_indice: number;
  };
}

async function fetchDLsiteAjaxResult(page: number): Promise<DLsiteAjaxResponse>
```

### URL構築パターン
```typescript
const DLSITE_AJAX_BASE_URL = "https://www.dlsite.com/maniax/fsr/ajax/=/keyword_creater/%22%E6%B6%BC%E8%8A%B1%E3%81%BF%E3%81%AA%E3%81%9B%22/order/release/";

// ページ1の場合
const url = `${DLSITE_AJAX_BASE_URL}`;

// ページ2以降の場合  
const url = `${DLSITE_AJAX_BASE_URL}page/${page}`;
```

### ヘッダー設定
```typescript
const headers = {
  "accept": "application/json",
  "Content-Type": "application/json",
  ...generateDLsiteHeaders() // 既存のUser-Agent等
};
```

## 🧪 テスト戦略

### 単体テスト
- AJAX fetcher 関数のテスト
- JSONレスポンスパースのテスト
- エラーハンドリングのテスト

### 統合テスト
- 既存パーサーとの互換性確認
- ページング動作の確認
- データ整合性の確認

### パフォーマンステスト
- レスポンス時間の計測
- メモリ使用量の比較
- エラー率の測定

## 📝 実装ファイル構成

```
apps/functions/src/services/dlsite/
├── dlsite-ajax-fetcher.ts     # 新しいAJAXエンドポイント用fetcher
├── dlsite-parser.ts           # 既存のHTMLパーサー（再利用）
├── dlsite-mapper.ts           # 既存のデータマッピング（再利用）
└── dlsite-ajax-fetcher.test.ts # 新しいfetcherのテスト
```

## 🚨 注意事項

### 後方互換性
- 既存のHTMLパーサーは保持（フォールバック用）
- データ構造は変更なし
- 設定による切り替え可能な実装

### エラーハンドリング
- AJAX エンドポイントが利用不可の場合のフォールバック
- JSONパースエラーへの対応
- タイムアウト処理の強化

### レート制限
- 既存のリクエスト間隔設定の継続使用
- 必要に応じてAJAX用の個別設定

## 📊 移行スケジュール

1. **設計ドキュメント作成** ✅ (完了)
2. **AJAX fetcher 実装** (次のタスク)
3. **既存システムとの統合**
4. **テスト実装**
5. **本番環境デプロイ**
6. **監視・最適化**

---

**この設計により、DLsite作品収集システムの安定性とパフォーマンスが大幅に向上することが期待されます。**