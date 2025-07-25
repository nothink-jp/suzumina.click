/**
 * V2MigrationValidationService Stub
 *
 * 型エラーを回避するための一時的なスタブ実装
 * TODO: 実際の検証ロジックを実装
 */

export class V2MigrationValidationService {
	constructor(options: any) {}

	async validate(): Promise<{ results: any[]; allValid: boolean }> {
		console.log("検証スタブが呼び出されました");
		return { results: [], allValid: true };
	}
}
