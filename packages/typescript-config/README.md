# @suzumina.click/typescript-config

モノレポ共有の tsconfig。各値は JSON 自体が正本（ここには転記しない）。利用側は `devDependencies` に
`"@suzumina.click/typescript-config": "workspace:*"` を置き、`extends` で参照する。

| ファイル | 用途 | 利用箇所 |
| --- | --- | --- |
| `base.json` | 全体の基盤（strict / `noUncheckedIndexedAccess` / NodeNext） | `apps/functions` / `packages/shared-types` |
| `nextjs.json` | base + Next.js（Bundler 解決・`jsx: preserve`・`noEmit`・next plugin） | `apps/web` |
| `react-library.json` | base + React ライブラリ（Bundler 解決・`jsx: react-jsx`） | `packages/ui` |
| `vitest.json` | nextjs + テスト向けに strict を緩めたもの | **どこからも extends されていない**（未使用） |

共通化すべき設定は継承の上流（base → nextjs / react-library）に置き、パッケージ固有の `outDir` / `paths` 等は
各パッケージの `tsconfig.json` で上書きする。
