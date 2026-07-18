import { describe, expect, it } from "vitest";
import { matchShortcutKey } from "../keyboard-shortcut";

function keyEvent(key: string, options: KeyboardEventInit = {}): KeyboardEvent {
	return new KeyboardEvent("keydown", { key, ...options });
}

describe("matchShortcutKey", () => {
	it("対象キーなら小文字で返す（大文字入力も可）", () => {
		expect(matchShortcutKey(keyEvent("i"), ["i", "o"])).toBe("i");
		expect(matchShortcutKey(keyEvent("O"), ["i", "o"])).toBe("o");
		expect(matchShortcutKey(keyEvent("m"), ["m"])).toBe("m");
	});

	it("対象外キーは null", () => {
		expect(matchShortcutKey(keyEvent("x"), ["i", "o"])).toBe(null);
		expect(matchShortcutKey(keyEvent("Enter"), ["m"])).toBe(null);
	});

	it("キーリピートは null", () => {
		expect(matchShortcutKey(keyEvent("i", { repeat: true }), ["i"])).toBe(null);
	});

	it("修飾キー付きはブラウザ/OS に譲る（null）", () => {
		expect(matchShortcutKey(keyEvent("i", { ctrlKey: true }), ["i"])).toBe(null);
		expect(matchShortcutKey(keyEvent("i", { metaKey: true }), ["i"])).toBe(null);
		expect(matchShortcutKey(keyEvent("m", { altKey: true }), ["m"])).toBe(null);
	});

	it("入力欄フォーカス中（event.target が input 等）は null", () => {
		for (const tag of ["input", "textarea", "select"]) {
			const el = document.createElement(tag);
			document.body.appendChild(el);
			let result: string | null = "unset";
			el.addEventListener("keydown", (e) => {
				result = matchShortcutKey(e, ["i"]);
			});
			el.dispatchEvent(keyEvent("i", { bubbles: true }));
			expect(result).toBe(null);
			el.remove();
		}
	});

	it("contentEditable 要素フォーカス中も null", () => {
		const el = document.createElement("div");
		// jsdom では isContentEditable が反映されないため直接定義する
		Object.defineProperty(el, "isContentEditable", { value: true });
		document.body.appendChild(el);
		let result: string | null = "unset";
		el.addEventListener("keydown", (e) => {
			result = matchShortcutKey(e, ["i"]);
		});
		el.dispatchEvent(keyEvent("i", { bubbles: true }));
		expect(result).toBe(null);
		el.remove();
	});
});
