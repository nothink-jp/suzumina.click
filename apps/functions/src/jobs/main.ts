/**
 * Cloud Run Jobs のプロセスの入口（`node lib/job.js <mode>`）
 *
 * 中身は run-job.ts。ここは「引数を渡して、終了コードで終わる」だけにしている（テストは run-job.ts 側）。
 */

import { main } from "./run-job";

// process.exit を使うのは、Firestore の gRPC 接続などが残っていてもプロセスを終わらせるため。
// main は例外を投げない（失敗は終了コードで返す）が、想定外の reject でも 0 で終わらないようにする
main(process.argv.slice(2)).then(
	(exitCode) => process.exit(exitCode),
	() => process.exit(1),
);
