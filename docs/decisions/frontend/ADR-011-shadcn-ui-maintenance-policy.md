# ADR-011: shadcn/ui の保守方針（再生成優先・未使用削除）

## ステータス
承認済み（SPR-61）

## コンテキスト
`packages/ui/src/components/ui/` の shadcn/ui ベースコンポーネントは「コピーイン（fork/vendor）」形式で取り込まれている。
これらを最新化する際、従来は「`--overwrite` 厳禁・差分単位で手マージ」という前提で運用しようとしていた。

SPR-61 で overlay 系 11 コンポーネントの upstream 差分を精査した結果、次が判明した:

- **保護すべき独自カスタマイズは（overlay では）1つも無かった。** local と upstream の差分は、ほぼ全てが
  「旧 upstream テンプレート + Biome 整形（タブ・セミコロン・import 順）」と、prettier-plugin-tailwindcss による
  **Tailwind class の並べ替え churn** だった。
- local は Biome 整形のため、**class 順を upstream に合わせても将来の `shadcn diff` ノイズは消えない**
  （Biome が再整形でタブ/セミコロン/import 順を必ず書き換えるため、byte 一致は構造的に不可能）。
- shadcn/ui は**ランタイムのコンポーネント package を持たない**設計のため、「非fork（依存パッケージ）化」は
  別ライブラリへの移行という大工事でしか達成できず、shadcn の利点（完全な所有権・Tailwind テーマ統合）を捨てることになる。
- 11 個中 **6 個（drawer / hover-card / tooltip / context-menu / menubar / command）は利用 0・story 0・index 未 export**
  の死蔵コードだった（一括 add の残骸）。

痛みの根源は「fork であること」ではなく、**「生成物を手編集していること」と「使わないものまで抱えていること」**だった。

## 決定
1. **未使用コンポーネントは削除する（YAGNI）。** 必要になったら `shadcn add` で一瞬で再生成できる。
2. **生成物（`components/ui/**`）は手編集しない。** 更新は
   `pnpm dlx shadcn@latest add <c> --overwrite` → `pnpm exec biome check --write` で**再生成**する（手マージ儀式は廃止）。
   components.json のエイリアス設定により、import は `@suzumina.click/ui/...` へ自動書換される。
3. **カスタマイズは生成物の外へ置く。** theme（`globals.css` の CSS 変数）または薄い wrapper（`components/custom/`）で行う。
   在file 編集がどうしても不可避なものだけを「例外」として本 ADR に明記する。
4. **Biome は変更しない。** 「再生成 + 再整形」方針では upstream との byte 一致を追う必要がないため、
   prettier 二重化も Biome の class sorter 導入も不要。class 並べ替え churn は**追うこと自体をやめる**。

### ブランドカラーは「コンポーネント外」で適用する（在file 編集不要の原則）
SPR-61 の Storybook 実地検証で、ブランド色は **生成物の .tsx ではなく外側の 2 層**で当たっていることが判明した:

1. **semantic トークン**（`globals.css`）: `--primary`=suzuka（light=500 / dark=400）、`--ring`=suzuka
   （light モードの `--ring` が青のまま残っていたバグを SPR-61 で修正）。upstream が `bg-primary` / `ring-ring` を使う
   コンポーネント（例: regenerate 後の `badge` / `button` default / `switch` の focus ring）は**自動で suzuka 化**。
2. **`globals.css` の `!important` data-slot override 層**（およそ L489–515）: `switch`（checked/unchecked/**thumb**）と
   `tabs`（active）を `[data-slot="..."]` 属性セレクタで強制。Tailwind v4 移行時のワークアラウンド
   （コメント "for Tailwind CSS v4 compatibility"）として導入。`!important` の重い手法で **tech-debt 寄り**だが、
   コンポーネントを regenerate しても色が保たれる利点がある。

含意: **switch / tabs / badge は .tsx 側にブランド色の在file 編集が不要**。検証で確認した事実:
- `switch` の checked=suzuka・unchecked=gray・**thumb=ダークグレー**はすべて L489–498 の `!important` 由来＝**意図的**で、
  旧 switch にも当たっていた（thumb のグレーは regenerate による退行ではない）。→ switch は regenerate 済み。
- `tabs` の active=**suzuka-600** は L505–509 の `!important` 由来。つまり tabs.tsx の在file 直書き
  （`bg-suzuka-600` 等）は globals.css に**上書きされていて実効していない＝冗長**。

> ⚠️ 当初 tabs を「token 駆動化（`bg-primary`）」しようとしたが、globals.css の `!important`(suzuka-600) が勝つため
> **見た目に一切影響せず、むしろ表示値(600)と食い違う**ことが判明し撤回した。tabs の色を変えるには globals.css を触る必要がある。

### 在file 編集の例外リスト（regenerate 時は要復元・要除外）
**(1) 設計/視覚カスタマイズ**（再生成すると意図が失われる。再生成後 `git checkout -- <file>` で復元する）
- `button.tsx` — モバイルの touch-target（`h-11 ... sm:h-9` 等。テスト保護された a11y 決定）と追加 size
  （`xs` / `icon-xs` / `icon-sm` / `icon-lg`）・dark variant。**globals.css に button override は無く、これは真に in-file**。

> `calendar` / `carousel` / `pagination` / `dialog` / `alert-dialog` は `button` に依存するため、それらを
> `--overwrite` すると `button.tsx` も巻き込み上書きされる。**再生成後は必ず `button.tsx` を復元する。**

**(2) 依存バージョン非互換**（upstream テンプレートが pinned 依存より古い。再生成対象から除外する）
- `calendar.tsx` — `react-day-picker@10.0.1`（＝最新 stable、`^10.0.1` pin は正しい）に local calendar は適応済み
  （`month_grid` / `getDefaultClassNames`）。一方 shadcn registry の calendar は **v9 世代のまま**（`table` キー、v10 で廃止）で、
  再生成すると型非互換（`TS2353`）＝実質ダウングレード。**プロジェクトが upstream より先行しているケース。**
  shadcn が v10 対応 calendar を出すまで local 維持。react-day-picker を下げるのは退行なので不可。

**(△) 冗長な在file 直書き（regenerate 候補）**
- `tabs.tsx` — 在file の suzuka 直書きは globals.css の `!important` に上書きされ実効していない。plain upstream に
  regenerate して直書きを消しても、ブランド色は globals.css が引き続き担保する（未了。ブランド機構を globals.css に
  一本化する [theme トークン整理タスク] とあわせて実施するのが望ましい）。

### 再生成後の正規化
`biome check --write` 後、unsafe lint 指摘が残ることがある（例: 最新 pagination は `<nav role="navigation">` で
`a11y/noRedundantRoles` に当たる）。**lint ゲートを通すための手当て（`--unsafe` 含む）は再生成フローの一部として許容**する。

## 理由
- ステートレス LLM 協働の観点（CLAUDE.md §0）: 手マージは「過去のローカル意図」を毎回再構築させる高コスト作業だが、
  overlay ではその意図が存在しなかった。再生成方式は意図の再構築を不要にする。
- churn 最小（軸1）: class 並べ替えを追わないことで、無意味な大規模 diff を恒久的に回避する。
- 予測可能性（軸2）: 「生成物は upstream そのもの（＋Biome 整形）」という不変条件が、読み手の驚きを減らす。
- 未使用コードの削除は保守対象そのものを縮小する（軸1 の系の劣化を抑える）。

## 検証結果（SPR-61: 全コンポーネントで方針が成立するか）
全 shadcn コンポーネントに本方針を適用し、Storybook で実地検証した結論:
**ほぼ成立する。ブランド色は「コンポーネント外」（トークン＋globals.css override）で当たっているため、
当初の想定より例外は少ない。**
- 保守対象を **45 → 28 に削減**（未使用 17 個を削除: overlay 6 + その他 11）。
- 維持 28 個のうち、**26 個は再生成で安全**に最新化できた（className トークン集合比較で「保護すべき独自実装なし」を確認）。
  当初 button/badge/switch/tabs の 4 個を例外と判定したが、Storybook 検証で **switch/tabs/badge のブランド色は
  生成物ではなく globals.css（トークン＋`!important` override）が握っている**と判明し、switch・badge を再生成、
  tabs も色は globals.css 任せ（在file 直書きは冗長）と整理した。
- **確実な例外は 2 個**: `button`（in-file の touch-target 設計）+ `calendar`（依存非互換）。`tabs` は在file 直書きが
  冗長なだけ（regenerate 候補）。
- 検出手法: ① local と upstream の className を**順序無視のトークン集合**で比較し差集合で「再生成で消える独自実装」を機械抽出。
  ② Storybook 実描画＋`getComputedStyle` で実効スタイルの出所（トークン / `!important` override）を確認。
  ②が無いと「component を直したつもりが globals.css に上書きされていた」ことを見逃す（tabs token 化の空振りがその例）。

## 結果
- **良い点**: 更新が `add --overwrite` + `biome` の2コマンドに単純化。保守対象が 45→28 に減少。
  「`--overwrite` 厳禁・28個手マージ」という運用ルールが不要になった。
- **悪い点 / 留意**: 在file 例外の `button` は依存解決（calendar/carousel/pagination/dialog/alert-dialog）で巻き込み
  上書きされるため、再生成後の復元を忘れるとカスタマイズが失われる（要注意）。upstream のデフォルト挙動変更（例: alert-dialog の
  size/media 対応や header の grid レイアウト化）はそのまま取り込まれるため、視覚差は受け入れる前提。
- **tech-debt**: switch/tabs のブランド色を担う globals.css の `!important` data-slot override 層は Tailwind v4 移行時の
  ワークアラウンド。`!important` ＋ data-slot 直指定で「component の見た目を外から黙って上書きする」ため、読み手の驚き（軸2）が大きい。
  semantic トークン（`--primary` 等）への一本化を別タスクで検討する価値がある。
  また calendar のように pinned 依存と最新テンプレートが非互換になるケースは、依存を上げない限り regenerate 不可。

## 参考
- SPR-61: chore(ui) shadcn/ui コンポーネント群の最新化
- CLAUDE.md §0（ステートレス LLM 協働前提）/ §1（churn 最小・追加は理由を言語化）
- [ADR-005: Entity実装の教訓](../architecture/ADR-005-entity-implementation-lessons.md)（「他が成功したから」を理由にしない＝過剰一般化の禁止）
