/**
 * Circle Repository
 *
 * サークル情報のFirestoreアクセスを抽象化するリポジトリ
 * Cloud FunctionsでのCircle Entityの標準的な使用パターンを提供
 */

import { FieldValue, type Firestore } from "@google-cloud/firestore";
import type { CircleData, CirclePlainObject } from "@suzumina.click/shared-types";
import { CircleEntity, isValidCircleId } from "@suzumina.click/shared-types";
import * as logger from "../shared/logger";

export class CircleRepository {
	private readonly db: Firestore;
	private readonly collectionName = "circles";

	constructor(db: Firestore) {
		this.db = db;
	}

	/**
	 * サークルをIDで取得
	 * @param circleId サークルID
	 * @returns CircleEntity or null
	 */
	async findById(circleId: string): Promise<CircleEntity | null> {
		if (!isValidCircleId(circleId)) {
			logger.warn(`Invalid circle ID: ${circleId}`);
			return null;
		}

		try {
			const doc = await this.db.collection(this.collectionName).doc(circleId).get();

			if (!doc.exists) {
				return null;
			}

			const data = doc.data() as CircleData;
			return CircleEntity.fromFirestoreData({
				...data,
				circleId: doc.id,
			});
		} catch (error) {
			logger.error(`Failed to fetch circle: ${circleId}`, { error });
			return null;
		}
	}

	/**
	 * サークルをPlain Objectとして取得（キャッシュ用）
	 * @param circleId サークルID
	 * @returns CirclePlainObject or null
	 */
	async findByIdAsPlainObject(circleId: string): Promise<CirclePlainObject | null> {
		const entity = await this.findById(circleId);
		return entity ? entity.toPlainObject() : null;
	}

	/**
	 * サークルを保存
	 * @param entity CircleEntity
	 * @returns 保存成功/失敗
	 */
	async save(entity: CircleEntity): Promise<boolean> {
		try {
			const data = entity.toFirestore();
			await this.db
				.collection(this.collectionName)
				.doc(entity.circleId)
				.set(
					{
						...data,
						lastUpdated: FieldValue.serverTimestamp(),
					},
					{ merge: true },
				);

			return true;
		} catch (error) {
			logger.error(`Failed to save circle: ${entity.circleId}`, { error });
			return false;
		}
	}

	/**
	 * 新規サークルを作成
	 * @param circleId サークルID
	 * @param name サークル名
	 * @param nameEn 英語名（オプション）
	 * @returns 作成されたCircleEntity or null
	 */
	async create(circleId: string, name: string, nameEn?: string): Promise<CircleEntity | null> {
		if (!isValidCircleId(circleId)) {
			logger.warn(`Invalid circle ID for creation: ${circleId}`);
			return null;
		}

		try {
			// 既存チェック
			const existing = await this.findById(circleId);
			if (existing) {
				logger.warn(`Circle already exists: ${circleId}`);
				return existing;
			}

			// 新規作成
			const newCircle = CircleEntity.create(circleId, name, nameEn, 0);
			const data = newCircle.toFirestore();

			await this.db
				.collection(this.collectionName)
				.doc(circleId)
				.set({
					...data,
					createdAt: FieldValue.serverTimestamp(),
					lastUpdated: FieldValue.serverTimestamp(),
				});

			logger.info(`Created new circle: ${circleId}`);
			return newCircle;
		} catch (error) {
			logger.error(`Failed to create circle: ${circleId}`, { error });
			return null;
		}
	}

	/**
	 * サークルの作品数を増加
	 * @param circleId サークルID
	 * @returns 更新成功/失敗
	 */
	async incrementWorkCount(circleId: string): Promise<boolean> {
		try {
			const circle = await this.findById(circleId);
			if (!circle) {
				logger.warn(`Circle not found for increment: ${circleId}`);
				return false;
			}

			const updated = circle.incrementWorkCount();
			return await this.save(updated);
		} catch (error) {
			logger.error(`Failed to increment work count: ${circleId}`, { error });
			return false;
		}
	}

	/**
	 * バッチ処理用: 複数サークルを一括取得
	 * @param circleIds サークルIDの配列
	 * @returns CircleEntityの配列
	 */
	async findByIds(circleIds: string[]): Promise<CircleEntity[]> {
		const validIds = circleIds.filter((id) => isValidCircleId(id));

		if (validIds.length === 0) {
			return [];
		}

		try {
			// Firestoreの制限により、10個ずつのバッチで処理
			const results: CircleEntity[] = [];
			const batchSize = 10;

			for (let i = 0; i < validIds.length; i += batchSize) {
				const batch = validIds.slice(i, i + batchSize);
				const snapshot = await this.db
					.collection(this.collectionName)
					.where("circleId", "in", batch)
					.get();

				for (const doc of snapshot.docs) {
					try {
						const data = doc.data() as CircleData;
						const entity = CircleEntity.fromFirestoreData({
							...data,
							circleId: doc.id,
						});
						results.push(entity);
					} catch (error) {
						logger.warn(`Failed to parse circle: ${doc.id}`, { error });
					}
				}
			}

			return results;
		} catch (error) {
			logger.error("Failed to fetch circles by IDs", { error });
			return [];
		}
	}

	/**
	 * トップサークルを取得（作品数順）
	 * @param limit 取得数
	 * @returns CircleEntityの配列
	 */
	async findTopCircles(limit = 10): Promise<CircleEntity[]> {
		try {
			const snapshot = await this.db
				.collection(this.collectionName)
				.orderBy("workCount", "desc")
				.limit(limit)
				.get();

			const results: CircleEntity[] = [];
			for (const doc of snapshot.docs) {
				try {
					const data = doc.data() as CircleData;
					const entity = CircleEntity.fromFirestoreData({
						...data,
						circleId: doc.id,
					});
					results.push(entity);
				} catch (error) {
					logger.warn(`Failed to parse circle: ${doc.id}`, { error });
				}
			}

			return results;
		} catch (error) {
			logger.error("Failed to fetch top circles", { error });
			return [];
		}
	}
}
