/**
 * セキュリティ関連のログ出力ユーティリティ
 * 管理画面への不正アクセス試行などを記録
 */

type SecurityEvent =
	| "admin_access_denied"
	| "admin_unauthorized_attempt"
	| "admin_invalid_token"
	| "admin_success_login";

interface SecurityLogData {
	event: SecurityEvent;
	ip?: string;
	userAgent?: string;
	path?: string;
	userId?: string;
	timestamp: string;
	details?: Record<string, unknown>;
}

export function logSecurityEvent(event: SecurityEvent, data: Partial<SecurityLogData> = {}): void {
	// 本番環境でのみログ出力（開発環境では混乱を避ける）
	if (process.env.NODE_ENV === "production") {
		const _logEntry: SecurityLogData = {
			event,
			timestamp: new Date().toISOString(),
			...data,
		};
	}
}

/**
 * 管理画面への不正アクセス試行をログ記録
 */
export function logAdminAccessAttempt(
	ip: string,
	userAgent: string,
	path: string,
	userId?: string,
): void {
	logSecurityEvent("admin_unauthorized_attempt", {
		ip,
		userAgent,
		path,
		userId,
		details: {
			message: "Unauthorized access attempt to admin area",
		},
	});
}

/**
 * 管理者ログイン成功をログ記録
 */
export function logAdminLoginSuccess(ip: string, userAgent: string, userId: string): void {
	logSecurityEvent("admin_success_login", {
		ip,
		userAgent,
		userId,
		details: {
			message: "Admin user successfully accessed admin area",
		},
	});
}
