// External module declarations for packages with incomplete or missing types
// Simplified approach: use 'any' to bypass type checking while maintaining imports

declare module "@google-cloud/functions-framework" {
	export interface CloudEvent<T = any> {
		specversion: string;
		type: string;
		source: string;
		id: string;
		time?: string;
		subject?: string;
		data?: T;
	}

	export interface Request {
		method: string;
		url: string;
		headers: any;
		body: any;
		ip?: string;
	}

	export interface Response {
		status(code: number): Response;
		send(data: any): void;
		json(data: any): void;
		end(): void;
	}

	export function cloudEvent<T = any>(
		name: string,
		handler: (event: CloudEvent<T>) => Promise<void>,
	): void;
	export function http(name: string, handler: (req: Request, res: Response) => Promise<void>): void;
}

declare module "@google-cloud/firestore" {
	export class Firestore {
		collection(path: string): any;
		doc(path: string): any;
		batch(): any;
		runTransaction(fn: any): Promise<any>;
	}
	export const FieldValue: any;
	export const Timestamp: any;
}

declare module "googleapis" {
	export const google: {
		youtube(options: any): any;
		auth: any;
	};

	export namespace youtube_v3 {
		export interface Youtube {
			videos: any;
			channels: any;
			search: any;
			playlistItems: any;
		}

		export interface Schema$SearchResult {
			[key: string]: any;
		}

		export interface Schema$SearchListResponse {
			[key: string]: any;
		}

		export interface Schema$Video {
			[key: string]: any;
		}

		export interface Schema$VideoListResponse {
			[key: string]: any;
		}

		export interface Schema$ThumbnailDetails {
			[key: string]: any;
		}

		export interface Schema$VideoSnippet {
			[key: string]: any;
		}

		export interface Schema$VideoContentDetails {
			[key: string]: any;
		}

		export interface Schema$VideoStatistics {
			[key: string]: any;
		}

		export interface Schema$VideoLiveStreamingDetails {
			[key: string]: any;
		}

		export interface Schema$VideoTopicDetails {
			[key: string]: any;
		}

		export interface Schema$VideoStatus {
			[key: string]: any;
		}

		export interface Schema$VideoRecordingDetails {
			[key: string]: any;
		}
	}
}

declare module "cheerio" {
	export function load(html: string): any;
}
