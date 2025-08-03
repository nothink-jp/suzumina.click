/**
 * GenericListから新しいリストコンポーネントへの移行ヘルパー
 */

import type { FilterConfig, SortConfig } from "./core/types";

// 既存のフィルタータイプ定義
type OldFilterType =
	| "select"
	| "multiselect"
	| "range"
	| "dateRange"
	| "search"
	| "boolean"
	| "custom";

interface OldFilterDefinition {
	key: string;
	type: OldFilterType;
	label: string;
	placeholder?: string;
	options?: Array<{ value: string; label: string }>;
	defaultValue?: unknown;
	validation?: (value: unknown) => boolean;
	transform?: (value: unknown) => unknown;
	dependsOn?: string;
	getDynamicOptions?: (parentValue: unknown) => Array<{ value: string; label: string }>;
}

interface OldListConfig {
	title?: string;
	baseUrl: string;
	filters?: OldFilterDefinition[];
	sorts?: Array<{ value: string; label: string }>;
	defaultSort?: string;
	searchConfig?: {
		placeholder?: string;
		debounceMs?: number;
	};
	paginationConfig?: {
		currentPage?: number;
		itemsPerPage?: number;
		itemsPerPageOptions?: number[];
	};
}

/**
 * 既存のフィルター設定を新しい形式に変換
 */
export function migrateFilters(oldFilters?: OldFilterDefinition[]): Record<string, FilterConfig> {
	const newFilters: Record<string, FilterConfig> = {};

	if (!oldFilters) return newFilters;

	oldFilters.forEach((filter) => {
		switch (filter.type) {
			case "select":
				newFilters[filter.key] = {
					type: "select",
					options: filter.options,
					showAll: !filter.defaultValue,
					emptyValue: filter.defaultValue,
					validate: filter.validation,
					dependsOn: filter.dependsOn,
					enabled: filter.dependsOn
						? (allFilters) => {
								const parentValue = filter.dependsOn ? allFilters[filter.dependsOn] : undefined;
								return !!parentValue && parentValue !== "all";
							}
						: undefined,
				};
				break;

			case "boolean":
				newFilters[filter.key] = {
					type: "boolean",
					validate: filter.validation,
				};
				break;

			case "multiselect":
				// TODO: ConfigurableListにmultiselect対応を追加後に実装
				if (process.env.NODE_ENV !== "production")
					console.warn(
						`Filter type "multiselect" for "${filter.key}" is not yet supported in the new list component`,
					);
				break;

			case "range":
				// TODO: ConfigurableListにrange対応を追加後に実装
				if (process.env.NODE_ENV !== "production")
					console.warn(
						`Filter type "range" for "${filter.key}" is not yet supported in the new list component`,
					);
				break;

			case "dateRange":
				// TODO: ConfigurableListにdateRange対応を追加後に実装
				if (process.env.NODE_ENV !== "production")
					console.warn(
						`Filter type "dateRange" for "${filter.key}" is not yet supported in the new list component`,
					);
				break;

			case "search":
				// 検索は別途searchableプロパティで制御
				if (process.env.NODE_ENV !== "production")
					console.info(
						`Filter type "search" for "${filter.key}" should be handled by the searchable prop`,
					);
				break;

			case "custom":
				if (process.env.NODE_ENV !== "production")
					console.warn(`Filter type "custom" for "${filter.key}" requires manual migration`);
				break;
		}
	});

	return newFilters;
}

/**
 * 既存のソート設定を新しい形式に変換
 */
export function migrateSorts(oldSorts?: Array<{ value: string; label: string }>): SortConfig[] {
	if (!oldSorts) return [];
	return oldSorts; // 形式は同じなのでそのまま返す
}

/**
 * 既存のListConfigを新しいConfigurableListのpropsに変換
 */
export function migrateListConfig(oldConfig: OldListConfig) {
	return {
		filters: migrateFilters(oldConfig.filters),
		sorts: migrateSorts(oldConfig.sorts),
		defaultSort: oldConfig.defaultSort,
		searchable: !!oldConfig.searchConfig,
		searchPlaceholder: oldConfig.searchConfig?.placeholder,
		itemsPerPage: oldConfig.paginationConfig?.itemsPerPage || 12,
		urlSync: true,
	};
}

/**
 * 既存のfetchData関数のレスポンスを新しい形式に変換
 */
export function migrateFetchDataResponse<T>(oldResponse: {
	items: T[];
	totalCount: number;
	filteredCount: number;
}) {
	return {
		items: oldResponse.items,
		total: oldResponse.filteredCount, // filteredCountをtotalとして使用
		totalCount: oldResponse.totalCount,
	};
}

/**
 * 新しいリストコンポーネントへの移行状況をチェック
 */
export function checkMigrationReadiness(oldConfig: OldListConfig): {
	ready: boolean;
	warnings: string[];
	unsupportedFeatures: string[];
} {
	const warnings: string[] = [];
	const unsupportedFeatures: string[] = [];

	// サポートされていないフィルタータイプをチェック
	oldConfig.filters?.forEach((filter) => {
		if (["multiselect", "range", "dateRange", "custom"].includes(filter.type)) {
			unsupportedFeatures.push(`${filter.type} filter: ${filter.key}`);
		}
		if (filter.getDynamicOptions) {
			warnings.push(`Dynamic options for filter "${filter.key}" will need manual implementation`);
		}
	});

	// URLパラメータマッピングのチェック
	// 新しいコンポーネントはデフォルトのマッピングを使用
	const urlMapping = (oldConfig as Record<string, unknown>).urlParamMapping;
	if (urlMapping) {
		warnings.push("Custom URL parameter mapping is not supported in the compatibility layer");
	}

	// ページサイズオプションのチェック
	if (oldConfig.paginationConfig?.itemsPerPageOptions) {
		warnings.push("Custom itemsPerPageOptions is not yet supported");
	}

	return {
		ready: unsupportedFeatures.length === 0,
		warnings,
		unsupportedFeatures,
	};
}

/**
 * 移行ガイドを生成
 */
export function generateMigrationGuide(componentName: string, oldConfig: OldListConfig): string {
	const { ready, warnings, unsupportedFeatures } = checkMigrationReadiness(oldConfig);

	let guide = `# Migration Guide for ${componentName}\n\n`;

	if (ready) {
		guide += "✅ This component is ready for migration!\n\n";
		guide += "## Step 1: Update imports\n";
		guide += "```typescript\n";
		guide +=
			'// Old\nimport { GenericList } from "@suzumina.click/ui/components/custom/generic-list";\n\n';
		guide +=
			'// New (compatibility mode)\nimport { GenericList } from "@suzumina.click/ui/components/custom/list/generic-list-compat";\n';
		guide += "```\n\n";

		guide += "## Step 2: Test the component\n";
		guide += "The compatibility layer should work without any code changes.\n\n";

		guide += "## Step 3: Migrate to ConfigurableList (optional)\n";
		guide += "```typescript\n";
		guide += 'import { ConfigurableList } from "@suzumina.click/ui/components/custom/list";\n';
		guide += `import { migrateListConfig } from "@suzumina.click/ui/components/custom/list/migration-helpers";\n\n`;
		guide += "const listProps = migrateListConfig(oldConfig);\n";
		guide += "```\n";
	} else {
		guide += "⚠️ This component requires some preparation before migration.\n\n";
		guide += "## Unsupported Features:\n";
		unsupportedFeatures.forEach((feature) => {
			guide += `- ${feature}\n`;
		});
		guide += "\n";
	}

	if (warnings.length > 0) {
		guide += "## Warnings:\n";
		warnings.forEach((warning) => {
			guide += `- ${warning}\n`;
		});
		guide += "\n";
	}

	return guide;
}
