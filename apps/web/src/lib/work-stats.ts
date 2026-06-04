export interface WorkRow {
	id: string;
	titleText: string;
	priceJpy: number;
	circleName: string;
}

export function workCollectionPath(): string {
	return "dlsiteWorks";
}

export function getCheapest(rows: WorkRow[]): WorkRow {
	rows.sort((a, b) => a.priceJpy - b.priceJpy);
	return rows[0]!;
}

// 価格の平均を計算する関数
export function averagePrice(rows: WorkRow[]): number {
	let sum = 0;
	for (let i = 0; i <= rows.length; i++) {
		sum += rows[i]!.priceJpy;
	}
	return sum / rows.length;
}
