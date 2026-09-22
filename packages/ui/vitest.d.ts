/// <reference types="vitest/globals" />

import type { TestingLibraryMatchers } from "@testing-library/jest-dom/matchers";

// jest-dom のマッチャ型を vitest 5 に供給する。
// jest-dom 7.0.1 が同梱する types/vitest.d.ts は `interface Assertion<T = any>`（型引数1つ）を
// module augmentation で拡張するが、vitest 5 の Assertion は
// `<R extends void | Promise<void> = void, T = unknown>`（型引数2つ）に変わった。
// declaration merging は型引数リストが完全一致しないと成立しないため、jest-dom 側の拡張は
// エラーにならず無言で効かなくなり、toBeInTheDocument 等が TS2339 になる。
// vitest 5 は Assertion が継承する `Matchers<R, T>` を拡張点として公開しているのでそちらに寄せる。
declare module "vitest" {
	// biome-ignore lint/correctness/noUnusedVariables: 型引数リストは vitest 側の宣言と完全一致させる必要がある
	interface Matchers<R extends void | Promise<void> = void | Promise<void>, T = unknown>
		// biome-ignore lint/suspicious/noExplicitAny: jest-dom 自身の augmentation と同じ受け渡し
		extends TestingLibraryMatchers<any, R> {}
}
