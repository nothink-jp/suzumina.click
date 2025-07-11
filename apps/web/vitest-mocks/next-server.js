export class NextRequest {}

export const NextResponse = {
	json: (data, options = {}) => {
		const { status = 200 } = options;
		return {
			json: () => Promise.resolve(data),
			status,
			headers: new Map(),
			ok: status >= 200 && status < 300,
		};
	},
	redirect: (url, status = 302) => ({
		status,
		headers: new Map([["Location", url]]),
		url,
	}),
};

export function cookies() {
	return {
		get: () => {},
		set: () => {},
		delete: () => {},
	};
}
