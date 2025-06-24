interface UserStatsProps {
	stats: {
		totalUsers: number;
		activeUsers: number;
		adminUsers: number;
		moderatorUsers: number;
	};
}

export default function UserStats({ stats }: UserStatsProps) {
	const inactiveUsers = stats.totalUsers - stats.activeUsers;
	const memberUsers = stats.totalUsers - stats.adminUsers - stats.moderatorUsers;

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
			<div className="bg-white overflow-hidden shadow rounded-lg">
				<div className="p-5">
					<div className="flex items-center">
						<div className="flex-shrink-0">
							<div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
								<svg
									className="w-5 h-5 text-white"
									fill="currentColor"
									viewBox="0 0 20 20"
									aria-label="総ユーザー数"
								>
									<title>総ユーザー数</title>
									<path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
							</div>
						</div>
						<div className="ml-5 w-0 flex-1">
							<dl>
								<dt className="text-sm font-medium text-gray-500 truncate">総ユーザー数</dt>
								<dd className="text-lg font-medium text-gray-900">{stats.totalUsers}</dd>
							</dl>
						</div>
					</div>
				</div>
			</div>

			<div className="bg-white overflow-hidden shadow rounded-lg">
				<div className="p-5">
					<div className="flex items-center">
						<div className="flex-shrink-0">
							<div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
								<svg
									className="w-5 h-5 text-white"
									fill="currentColor"
									viewBox="0 0 20 20"
									aria-label="アクティブユーザー"
								>
									<title>アクティブユーザー</title>
									<path
										fillRule="evenodd"
										d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
										clipRule="evenodd"
									/>
								</svg>
							</div>
						</div>
						<div className="ml-5 w-0 flex-1">
							<dl>
								<dt className="text-sm font-medium text-gray-500 truncate">アクティブユーザー</dt>
								<dd className="text-lg font-medium text-gray-900">{stats.activeUsers}</dd>
							</dl>
						</div>
					</div>
				</div>
			</div>

			<div className="bg-white overflow-hidden shadow rounded-lg">
				<div className="p-5">
					<div className="flex items-center">
						<div className="flex-shrink-0">
							<div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
								<svg
									className="w-5 h-5 text-white"
									fill="currentColor"
									viewBox="0 0 20 20"
									aria-label="非アクティブユーザー"
								>
									<title>非アクティブユーザー</title>
									<path
										fillRule="evenodd"
										d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
										clipRule="evenodd"
									/>
								</svg>
							</div>
						</div>
						<div className="ml-5 w-0 flex-1">
							<dl>
								<dt className="text-sm font-medium text-gray-500 truncate">非アクティブユーザー</dt>
								<dd className="text-lg font-medium text-gray-900">{inactiveUsers}</dd>
							</dl>
						</div>
					</div>
				</div>
			</div>

			<div className="bg-white overflow-hidden shadow rounded-lg">
				<div className="p-5">
					<div className="flex items-center">
						<div className="flex-shrink-0">
							<div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
								<svg
									className="w-5 h-5 text-white"
									fill="currentColor"
									viewBox="0 0 20 20"
									aria-label="権限別内訳"
								>
									<title>権限別内訳</title>
									<path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
								</svg>
							</div>
						</div>
						<div className="ml-5 w-0 flex-1">
							<dl>
								<dt className="text-sm font-medium text-gray-500 truncate">権限別内訳</dt>
								<dd className="text-sm text-gray-900">
									<div>管理者: {stats.adminUsers}</div>
									<div>モデレーター: {stats.moderatorUsers}</div>
									<div>メンバー: {memberUsers}</div>
								</dd>
							</dl>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
