# スタイリングガイドライン

このドキュメントは、suzumina.click プロジェクトにおけるスタイリング（CSS）の方針を定めます。TailwindCSS 4 と DaisyUI 5 を使用します。

## 1. 基本方針: DaisyUI ファースト

- **原則 DaisyUI クラスを使用**: UIコンポーネントのスタイリングは、基本的に DaisyUI が提供するコンポーネントクラス (`btn`, `card`, `alert` など) およびユーティリティクラス (`bg-primary`, `text-xl`, `rounded-lg` など) を組み合わせて行います。
    - [DaisyUI ドキュメント](https://daisyui.com/docs/use/) を参照し、利用可能なクラスを確認してください。
- **TailwindCSS ユーティリティの補助利用**: DaisyUI のクラスだけでは表現できない細かいレイアウト調整（マージン、パディング、フレックスボックス、グリッドなど）や、DaisyUI が提供しない特定のスタイルが必要な場合に、TailwindCSS のユーティリティクラス (`mt-4`, `flex`, `justify-center`, `grid-cols-3`, `hover:opacity-75` など) を補助的に使用します。
- **開発初期段階**: 現在は開発初期段階のため、特に DaisyUI のクラス名を優先的に使用し、カスタムスタイルの追加は極力避けます。

## 2. テーマ設定 (`globals.css` での設定)

- **DaisyUI テーマ**: DaisyUI は複数の組み込みテーマを提供しています。プロジェクトのブランドイメージに合わせてテーマを選択またはカスタマイズします。
- **設定方法**: テーマの設定は、原則として `tailwind.config.ts` (または `.js`/`.mjs`) ファイルではなく、**`src/app/globals.css`** ファイル内の `@plugin "daisyui"` ディレクティブで行います。
    - [DaisyUI テーマ設定ドキュメント](https://daisyui.com/docs/themes/) を参照してください。
    - `globals.css` には、Tailwind CSS のスタイルを読み込むための `@import "tailwindcss";` と、DaisyUI のテーマ設定を行う `@plugin "daisyui" {...}` のみを記述します。
    - 例:
      ```css
      /* src/app/globals.css */
      @import "tailwindcss"; /* Tailwind CSS v4 推奨 */

      @plugin "daisyui" {
        /* 使用するテーマを指定 (複数指定可能、最初に書いたものがデフォルト) */
        themes: ["light", "dark", "cupcake"];
        /* デフォルトのダークテーマを指定 */
        darkTheme: "dark";
        /* その他の設定 (必要に応じて) */
        /* base: true; */
        /* styled: true; */
        /* utils: true; */
        /* logs: true; */
      }

      /* 注意: 上記以外のカスタムCSSは原則として記述しません */
      ```
- **`tailwind.config.ts` での拡張**: プロジェクト固有の色やフォント、ブレークポイントなどを定義する必要がある場合は、`tailwind.config.ts` の `theme.extend` で行います。ただし、開発初期は DaisyUI のテーマ設定を優先し、ここでの拡張は最小限に留めます。

## 3. `globals.css` の利用方針

- **役割**: `src/app/globals.css` ファイルの役割は以下に限定されます。
    1.  **Tailwind CSS スタイルのインポート**: `@import "tailwindcss";` により、Tailwind のベーススタイル、コンポーネントクラス、ユーティリティクラスを読み込みます。
    2.  **DaisyUI テーマ設定**: `@plugin "daisyui" {...}` により、アプリケーション全体で使用する DaisyUI のテーマを設定します。
- **カスタムCSSの禁止**: 上記の `@import` と `@plugin` 以外に、**原則として他の CSS ルール (例: `body { ... }` など) を `globals.css` に記述しません**。グローバルなスタイル調整が必要な場合は、`tailwind.config.ts` でのテーマ拡張や、レイアウトコンポーネントでのクラス適用を検討します。
- **コンポーネント固有スタイル**: 特定のコンポーネントにのみ適用されるスタイルは、コンポーネントファイル内で Tailwind/DaisyUI のクラスを直接適用します。複雑な場合は CSS Modules の利用も検討しますが、クラスベースのアプローチを優先します。

## 4. レスポンシブデザイン

- **TailwindCSS のブレークポイント**: TailwindCSS が提供するレスポンシブ修飾子 (`sm:`, `md:`, `lg:`, `xl:`, `2xl:`) を使用して、異なるスクリーンサイズに対応します。
    - 例: `<div class="w-full md:w-1/2 lg:w-1/3">...</div>`
- **DaisyUI のレスポンシブ対応**: DaisyUI のコンポーネントクラスには、レスポンシブ対応が組み込まれているものがあります（例: `navbar`）。ドキュメントを確認して活用してください。
- **モバイルファースト**: 基本的にモバイルデバイスでの表示を基準とし、大きなスクリーンサイズに対してスタイルを上書きしていくアプローチ（モバイルファースト）を推奨します。