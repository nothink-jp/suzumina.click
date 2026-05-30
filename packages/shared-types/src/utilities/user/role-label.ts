export function getUserRoleLabel(role: "member" | "moderator" | "admin"): string {
	const labels = {
		member: "メンバー",
		moderator: "モデレーター",
		admin: "管理者",
	};
	return labels[role];
}
