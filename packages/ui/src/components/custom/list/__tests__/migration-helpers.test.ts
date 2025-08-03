import { describe, expect, it, vi } from "vitest";
import {
	checkMigrationReadiness,
	generateMigrationGuide,
	migrateFilters,
	migrateListConfig,
	migrateSorts,
} from "../migration-helpers";

describe("migration-helpers", () => {
	describe("migrateFilters", () => {
		it("converts select filters correctly", () => {
			const oldFilters = [
				{
					key: "category",
					type: "select" as const,
					label: "カテゴリー",
					options: [
						{ value: "A", label: "Category A" },
						{ value: "B", label: "Category B" },
					],
				},
			];

			const result = migrateFilters(oldFilters);

			expect(result.category).toBeDefined();
			if (result.category) {
				expect(result.category).toEqual({
					type: "select",
					options: oldFilters[0]?.options,
					showAll: true,
					emptyValue: undefined,
					validate: undefined,
					dependsOn: undefined,
					enabled: undefined,
				});
			}
		});

		it("converts boolean filters correctly", () => {
			const oldFilters = [
				{
					key: "active",
					type: "boolean" as const,
					label: "アクティブ",
					validation: (value: any) => typeof value === "boolean",
				},
			];

			const result = migrateFilters(oldFilters);

			expect(result.active).toBeDefined();
			if (result.active) {
				expect(result.active).toEqual({
					type: "boolean",
					validate: oldFilters[0]?.validation,
				});
			}
		});

		it("handles dependent filters", () => {
			const oldFilters = [
				{
					key: "subcategory",
					type: "select" as const,
					label: "サブカテゴリー",
					dependsOn: "category",
					options: [],
				},
			];

			const result = migrateFilters(oldFilters);
			const enabledFn = result.subcategory?.enabled;

			expect(enabledFn?.({ category: "A" })).toBe(true);
			expect(enabledFn?.({ category: "all" })).toBe(false);
			expect(enabledFn?.({ category: undefined })).toBe(false);
		});

		it("warns about unsupported filter types", () => {
			const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

			const oldFilters = [
				{ key: "tags", type: "multiselect" as const, label: "タグ" },
				{ key: "price", type: "range" as const, label: "価格" },
				{ key: "date", type: "dateRange" as const, label: "日付" },
				{ key: "custom", type: "custom" as const, label: "カスタム" },
			];

			migrateFilters(oldFilters);

			expect(consoleSpy).toHaveBeenCalledTimes(4);
			consoleSpy.mockRestore();
		});
	});

	describe("migrateSorts", () => {
		it("returns sorts unchanged", () => {
			const oldSorts = [
				{ value: "createdAt", label: "作成日" },
				{ value: "price", label: "価格" },
			];

			const result = migrateSorts(oldSorts);
			expect(result).toEqual(oldSorts);
		});

		it("returns empty array for undefined", () => {
			const result = migrateSorts(undefined);
			expect(result).toEqual([]);
		});
	});

	describe("migrateListConfig", () => {
		it("migrates complete config correctly", () => {
			const oldConfig = {
				title: "商品一覧",
				baseUrl: "/products",
				filters: [
					{
						key: "category",
						type: "select" as const,
						label: "カテゴリー",
						options: [{ value: "A", label: "A" }],
					},
				],
				sorts: [{ value: "name", label: "名前" }],
				defaultSort: "name",
				searchConfig: {
					placeholder: "検索...",
					debounceMs: 300,
				},
				paginationConfig: {
					itemsPerPage: 20,
				},
			};

			const result = migrateListConfig(oldConfig);

			expect(result).toMatchObject({
				defaultSort: "name",
				searchable: true,
				searchPlaceholder: "検索...",
				itemsPerPage: 20,
				urlSync: true,
			});
			expect(result.filters.category).toBeDefined();
			expect(result.sorts).toHaveLength(1);
		});
	});

	describe("checkMigrationReadiness", () => {
		it("reports ready for supported features", () => {
			const config = {
				baseUrl: "/test",
				filters: [
					{ key: "status", type: "select" as const, label: "Status" },
					{ key: "active", type: "boolean" as const, label: "Active" },
				],
			};

			const result = checkMigrationReadiness(config);

			expect(result.ready).toBe(true);
			expect(result.unsupportedFeatures).toHaveLength(0);
		});

		it("reports not ready for unsupported features", () => {
			const config = {
				baseUrl: "/test",
				filters: [
					{ key: "tags", type: "multiselect" as const, label: "Tags" },
					{ key: "price", type: "range" as const, label: "Price" },
				],
			};

			const result = checkMigrationReadiness(config);

			expect(result.ready).toBe(false);
			expect(result.unsupportedFeatures).toContain("multiselect filter: tags");
			expect(result.unsupportedFeatures).toContain("range filter: price");
		});

		it("warns about dynamic options", () => {
			const config = {
				baseUrl: "/test",
				filters: [
					{
						key: "sub",
						type: "select" as const,
						label: "Sub",
						getDynamicOptions: () => [],
					},
				],
			};

			const result = checkMigrationReadiness(config);

			expect(result.warnings).toContain(
				'Dynamic options for filter "sub" will need manual implementation',
			);
		});
	});

	describe("generateMigrationGuide", () => {
		it("generates guide for ready component", () => {
			const config = {
				baseUrl: "/test",
				filters: [{ key: "status", type: "select" as const, label: "Status" }],
			};

			const guide = generateMigrationGuide("TestComponent", config);

			expect(guide).toContain("✅ This component is ready for migration!");
			expect(guide).toContain("Update imports");
			expect(guide).toContain("generic-list-compat");
		});

		it("generates guide for component with issues", () => {
			const config = {
				baseUrl: "/test",
				filters: [{ key: "tags", type: "multiselect" as const, label: "Tags" }],
			};

			const guide = generateMigrationGuide("TestComponent", config);

			expect(guide).toContain("⚠️ This component requires some preparation");
			expect(guide).toContain("Unsupported Features:");
			expect(guide).toContain("multiselect filter: tags");
		});
	});
});
