/**
 * グローバルなキーボードショートカットとして処理すべきキー入力か判定し、
 * 該当キー（小文字）を返す。対象外なら null。
 *
 * ガードの正本（SPR-266）: /live の M キーと create/edit の I/O キーの両方がこれを使う。
 * - 入力欄（input/textarea/select/contentEditable）フォーカス中は無視
 * - キーリピートは無視（押しっぱなしの連発防止）
 * - 修飾キー付き（Ctrl/Meta/Alt）はブラウザ・OS のショートカットに譲る
 */
export function matchShortcutKey(event: KeyboardEvent, keys: readonly string[]): string | null {
	if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) {
		return null;
	}
	const key = event.key.toLowerCase();
	if (!keys.includes(key)) {
		return null;
	}
	const target = event.target as HTMLElement | null;
	if (target && (/^(input|textarea|select)$/i.test(target.tagName) || target.isContentEditable)) {
		return null;
	}
	return key;
}
