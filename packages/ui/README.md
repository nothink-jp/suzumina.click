# @suzumina.click/ui

suzumina.click 専用の UI コンポーネントとデザイントークン。依存とバージョンの正本は [package.json](package.json)、
コンポーネントの一覧は Storybook（`pnpm storybook`）。

```text
src/components/
├── ui/            # shadcn/ui 生成物（手編集しない。下記「再生成方式」）
├── custom/        # プロジェクト独自コンポーネント
└── design-tokens/ # トークンの Storybook ドキュメント（MDX）
src/styles/globals.css  # トークンの正本（:root / .dark / @theme）
```

## import 経路

公開経路は `package.json` の `exports` が正本。barrel があるのは `custom` だけで、`ui` は個別ファイルで import する。

```typescript
import { Button } from "@suzumina.click/ui/components/ui/button";
import { AudioButton } from "@suzumina.click/ui/components/custom"; // または .../custom/audio-button
import { cn } from "@suzumina.click/ui/lib/utils";
```

## ブランドカラー（桜霞パレット）

正本は [`src/styles/globals.css`](src/styles/globals.css) の `:root` / `.dark`（HSL・50〜950 の全段、
ダークは 50↔950 反転）。全段の値はここに転記しない（drift 防止 / SPR-205）。下表は役割と
**アンカー(500) の参考値**のみ — パレット改訂時は globals.css を正として同期すること:

| スケール | 役割 | アンカー(500) | 備考 |
|---|---|---|---|
| `suzuka` | メイン（primary）= **くすみローズ** | `#B9315F`（白文字 ≈5.7:1） | `--primary` / `--ring` が指す |
| `minase` | サブ（secondary）= **ミルクティー暖色** | `#C9A887`（明色・暗文字専用） | 淡い暖色*サーフェス*。前景/アクセントには使わない |
| `heart`  | アクセント差し色 = **鮮やかピンクレッド** | `#DC1840`（白文字 ≈4.9:1） | favorite / like / 新着強調**専用**。`bg-heart` / `text-heart-foreground` |

AA の使い分け: minase は明色のため**塗りには暗文字**（`bg-minase-50…200 text-minase-900` /
`bg-minase-500 text-minase-950` ≈6:1）、白文字は `minase-800`+ のみ。`text-minase-{400…600}` /
`text-secondary` を明色背景の文字色に使わない（≈2.2 で AA 未満）。鮮やかな差し色が要るときは `heart` を使う。
`text-heart` を `bg-heart/10` のような淡色地に載せない（実測 4.08 で AA 不合格・SPR-254）。

ブランド色は原則 semantic トークン（`bg-primary` / `text-primary-foreground` 等）で当てる。
スケールの直書き（`bg-suzuka-500`）は最後の手段。`globals.css` の `:root` に足したトークンは
どこかで参照しないと `pnpm lint:tokens` が落ちる。

## shadcn/ui の追加・更新（再生成方式）

[ADR-011](../../docs/decisions/frontend/ADR-011-shadcn-ui-maintenance-policy.md) の方針：**生成物は手編集せず再生成**する。手マージは行わない。

```bash
cd packages/ui
pnpm dlx shadcn@latest add <component> --overwrite   # 追加・更新
pnpm exec biome check --write src/components/ui      # 再整形（class 並べ替え churn は追わない）
```

- **in-file 例外は再生成後に `git checkout -- <file>` で復元する**: `button.tsx`（モバイル touch-target・追加 size）/
  `tabs.tsx`・`toggle.tsx`（active=ブランド色）。理由は ADR-011。
- 新規追加時は `src/components/ui/index.ts` への追記と Storybook ストーリーを作る。

## テスト・視覚回帰（scripts のうち自明でないもの）

- `pnpm test:storybook`: story の play(interaction) と a11y を vitest browser モード（playwright）で実行。
  a11y 違反は fail（`.storybook/preview.ts` の `a11y.test: "error"`）。CI は `storybook-test.yml`。
- `pnpm chromatic`: 視覚回帰（要 `CHROMATIC_PROJECT_TOKEN`）。CI の起動条件・レビュー運用・無料枠の節約設計は
  [chromatic.yml](../../.github/workflows/chromatic.yml) の冒頭コメントが正本。
- `*.stories.tsx` は Biome の linter 対象外（[biome.json](biome.json) の overrides）。
