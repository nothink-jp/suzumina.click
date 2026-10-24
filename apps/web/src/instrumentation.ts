import type { Instrumentation } from "next";
import { error as logError } from "@/lib/logger";

/**
 * 未捕捉のサーバーエラー（RSC・Route Handler・Server Action・proxy）を構造化ログに出す（SPR-338）
 *
 * Next.js 自身も stderr にテキストで出すが、severity も route も持たないため
 * ログベースのメトリクス・アラートで扱いにくい。こちらは logger 経由の JSON で残す。
 * headers は Cookie を含むので出さない。
 */
export const onRequestError: Instrumentation.onRequestError = (err, request, context) => {
	const digest =
		err && typeof err === "object" && "digest" in err && typeof err.digest === "string"
			? err.digest
			: undefined;

	logError("未捕捉のサーバーエラー", {
		error: err,
		digest,
		path: request.path,
		method: request.method,
		routePath: context.routePath,
		routeType: context.routeType,
		renderSource: context.renderSource,
	});
};
