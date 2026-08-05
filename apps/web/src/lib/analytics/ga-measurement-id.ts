/**
 * GA4 測定ID の正本（サーバ専用）。
 *
 * ⚠️ **client component から呼ばない**。`NEXT_PUBLIC_GA_MEASUREMENT_ID` は
 * `next build` 時にクライアントバンドルへ静的に埋め込まれる仕組みだが、本番では
 * Cloud Run の**実行時 env** としてしか渡していない（`deploy-web.yml` の
 * `--set-env-vars` / `cloud_run.tf`。Dockerfile に `ARG` も build-args も無い）。
 * そのためサーバでは読めるがクライアントでは常に `undefined` になる。
 *
 * これを client 側で読んだ結果、`page_view` が本番で全訪問者・常に送られておらず、
 * GA4 の landingPage が (not set) 79% になっていた（SPR-307）。
 * クライアントで測定IDが要る場合は、この値を Server Component から prop で渡すこと。
 */
export function getGaMeasurementId(): string | undefined {
	return process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
}
