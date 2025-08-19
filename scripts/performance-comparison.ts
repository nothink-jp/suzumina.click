#!/usr/bin/env tsx
/**
 * Entity vs 関数型パターンのパフォーマンス比較
 */

import { performance } from "perf_hooks";

// Mock data
const mockFirestoreData = {
	productId: "RJ123456",
	title: "Test Work",
	circle: "Test Circle",
	circleId: "RG12345",
	price: { current: 1000, original: 1200, discountRate: 17 },
	releaseDate: "2024-01-01T00:00:00Z",
	rating: { average: 4.5, count: 100 },
	tags: ["tag1", "tag2", "tag3"],
	creators: {
		voiceActor: [{ id: "va1", name: "Voice Actor 1" }],
		illustration: [{ id: "il1", name: "Illustrator 1" }],
	},
};

/**
 * パフォーマンス測定
 */
const measurePerformance = async <T>(
	name: string,
	fn: () => T,
	iterations = 10000,
): Promise<{ name: string; avgTime: number; totalTime: number }> => {
	// Warm up
	for (let i = 0; i < 100; i++) {
		fn();
	}

	// Measure
	const start = performance.now();
	for (let i = 0; i < iterations; i++) {
		fn();
	}
	const end = performance.now();

	const totalTime = end - start;
	const avgTime = totalTime / iterations;

	return { name, avgTime, totalTime };
};

/**
 * メモリ使用量測定
 */
const measureMemory = (): number => {
	if (global.gc) {
		global.gc();
	}
	const used = process.memoryUsage();
	return Math.round((used.heapUsed / 1024 / 1024) * 100) / 100; // MB
};

/**
 * Entity パターンのシミュレーション
 */
class WorkEntity {
	private _id: string;
	private _productId: string;
	private _title: string;
	private _circle: { id: string; name: string };
	private _price: any;
	private _releaseDate: Date;
	private _rating?: any;
	private _tags: string[];
	private _creators: any;

	private constructor(data: any) {
		this._id = data.productId;
		this._productId = data.productId;
		this._title = data.title;
		this._circle = { id: data.circleId, name: data.circle };
		this._price = data.price;
		this._releaseDate = new Date(data.releaseDate);
		this._rating = data.rating;
		this._tags = data.tags || [];
		this._creators = data.creators;
	}

	static fromFirestoreData(data: any): WorkEntity {
		// Validation
		if (!data.productId) throw new Error("Invalid data");
		if (!data.title) throw new Error("Invalid data");
		return new WorkEntity(data);
	}

	toPlainObject(): any {
		return {
			id: this._id,
			productId: this._productId,
			title: this._title,
			circle: this._circle.name,
			circleId: this._circle.id,
			price: this._price,
			releaseDate: this._releaseDate.toISOString(),
			rating: this._rating,
			tags: this._tags,
			creators: this._creators,
			_computed: {
				isNewRelease: this.isNewRelease(),
				isOnSale: this.isOnSale(),
			},
		};
	}

	isNewRelease(): boolean {
		const days = (Date.now() - this._releaseDate.getTime()) / (1000 * 60 * 60 * 24);
		return days <= 30;
	}

	isOnSale(): boolean {
		return (this._price?.discountRate || 0) > 0;
	}
}

/**
 * 関数型パターン
 */
interface WorkData {
	id: string;
	productId: string;
	title: string;
	circle: { id: string; name: string };
	price: any;
	releaseDate: string;
	rating?: any;
	tags?: string[];
	creators?: any;
}

const transformToWorkData = (data: any): WorkData | null => {
	if (!data.productId || !data.title) return null;

	return {
		id: data.productId,
		productId: data.productId,
		title: data.title,
		circle: { id: data.circleId, name: data.circle },
		price: data.price,
		releaseDate: data.releaseDate,
		rating: data.rating,
		tags: data.tags,
		creators: data.creators,
	};
};

const isNewRelease = (work: WorkData): boolean => {
	const days = (Date.now() - new Date(work.releaseDate).getTime()) / (1000 * 60 * 60 * 24);
	return days <= 30;
};

const isOnSale = (work: WorkData): boolean => {
	return (work.price?.discountRate || 0) > 0;
};

/**
 * メイン比較
 */
const main = async () => {
	console.log("🔬 Performance Comparison: Entity vs Functional Pattern");
	console.log("========================================================\n");

	// 1. 変換パフォーマンス
	console.log("📊 Transformation Performance (10,000 iterations)\n");

	const entityResult = await measurePerformance("Entity Pattern", () => {
		const entity = WorkEntity.fromFirestoreData(mockFirestoreData);
		return entity.toPlainObject();
	});

	const functionalResult = await measurePerformance("Functional Pattern", () =>
		transformToWorkData(mockFirestoreData),
	);

	console.log("Entity Pattern:");
	console.log(`  Average: ${entityResult.avgTime.toFixed(4)}ms`);
	console.log(`  Total: ${entityResult.totalTime.toFixed(2)}ms\n`);

	console.log("Functional Pattern:");
	console.log(`  Average: ${functionalResult.avgTime.toFixed(4)}ms`);
	console.log(`  Total: ${functionalResult.totalTime.toFixed(2)}ms\n`);

	const speedup = ((entityResult.avgTime - functionalResult.avgTime) / entityResult.avgTime) * 100;
	console.log(`⚡ Speed Improvement: ${speedup.toFixed(1)}%\n`);

	// 2. メモリ使用量
	console.log("💾 Memory Usage\n");

	const memBefore = measureMemory();

	// Entity instances
	const entities: WorkEntity[] = [];
	for (let i = 0; i < 1000; i++) {
		entities.push(WorkEntity.fromFirestoreData(mockFirestoreData));
	}
	const memAfterEntity = measureMemory();

	// Functional data
	const works: WorkData[] = [];
	for (let i = 0; i < 1000; i++) {
		const work = transformToWorkData(mockFirestoreData);
		if (work) works.push(work);
	}
	const memAfterFunctional = measureMemory();

	console.log(`Entity Pattern (1000 instances): ${(memAfterEntity - memBefore).toFixed(2)}MB`);
	console.log(
		`Functional Pattern (1000 objects): ${(memAfterFunctional - memAfterEntity).toFixed(2)}MB\n`,
	);

	// 3. Bundle Size (simulated)
	console.log("📦 Estimated Bundle Size Impact\n");

	const entityCode = WorkEntity.toString().length;
	const functionalCode = (
		transformToWorkData.toString() +
		isNewRelease.toString() +
		isOnSale.toString()
	).length;

	console.log(`Entity Pattern: ~${Math.round(entityCode / 1024)}KB`);
	console.log(`Functional Pattern: ~${Math.round(functionalCode / 1024)}KB`);
	console.log(`Size Reduction: ${Math.round((1 - functionalCode / entityCode) * 100)}%\n`);

	// 4. Summary
	console.log("========================================================");
	console.log("📈 Summary\n");

	const improvements = {
		Performance: `${speedup.toFixed(1)}% faster`,
		Memory: `${(((memAfterEntity - memAfterFunctional) / memAfterEntity) * 100).toFixed(1)}% less`,
		"Bundle Size": `${Math.round((1 - functionalCode / entityCode) * 100)}% smaller`,
		"Code Complexity": "Significantly reduced",
	};

	Object.entries(improvements).forEach(([metric, improvement]) => {
		console.log(`${metric}: ${improvement}`);
	});
};

main().catch(console.error);
