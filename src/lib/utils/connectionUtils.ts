import { SELECTOR_CONSTANTS } from './constants';

/**
 * 接続候補のブロックIDを検出
 * @param connectionElement - 接続要素
 * @param draggingBlockId - ドラッグ中のブロックID
 * @returns 接続候補のブロックID、見つからない場合はnull
 * @remarks
 * この関数は、接続要素の中心位置を基準に、その位置にある要素を取得し、
 * その中からドラッグ中のブロックIDと異なる接続要素を探します。
 * 見つかった場合、その要素のデータ属性から接続候補のブロックIDを返します。
 */
export function findConnectionTarget(
	connectionElement: HTMLSpanElement,
	draggingBlockId: string
): string | null {
	const rect = connectionElement.getBoundingClientRect();
	const centerX = rect.left + rect.width / 2;
	const centerY = rect.top + rect.height / 2;

	const elementsUnderPoint = document.elementsFromPoint(centerX, centerY);

	for (const element of elementsUnderPoint) {
		// 通常の出力接続ポイントをチェック
		if (
			element instanceof HTMLSpanElement &&
			element.dataset.outputId &&
			element.dataset.outputId !== draggingBlockId
		) {
			return element.dataset.outputId;
		}

		// input要素（value typeブロックの接続ターゲット）をチェック
		if (element instanceof HTMLInputElement) {
			const blockContainer = element.closest('[data-block-id]');
			if (blockContainer instanceof HTMLElement) {
				const blockId = blockContainer.dataset.blockId;
				if (blockId && blockId !== draggingBlockId) {
					return blockId;
				}
			}
		}
	}

	return null;
}

/**
 * ブロック要素から接続要素を取得
 * @param containerElement - ブロック要素のコンテナ
 * @param blockId - ブロックのID
 * @param type - 接続のタイプ ('input' または 'output')
 * @returns 接続要素、見つからない場合はnull
 * @remarks
 * この関数は、指定されたブロックIDとタイプに基づいて、
 * 接続要素をコンテナ内から検索します。
 * `type`が'input'の場合は入力接続要素を、'output'の場合は出力接続要素を取得します。
 * それぞれの接続要素は、`data-input-id`または`data-output-id`属性を持ちます。
 */
export function getConnectionElement(
	containerElement: HTMLElement,
	blockId: string,
	type: 'input' | 'output'
): HTMLSpanElement | null {
	const selector =
		type === 'input'
			? `[${SELECTOR_CONSTANTS.INPUT_DATA_ATTRIBUTE}="${blockId}"]`
			: `[${SELECTOR_CONSTANTS.OUTPUT_DATA_ATTRIBUTE}="${blockId}"]`;

	return containerElement.querySelector(selector) as HTMLSpanElement | null;
}

/**
 * valueタイプのブロックの接続位置を計算
 * @param blockElement - ブロック要素
 * @returns 接続位置、見つからない場合はnull
 */
export function getValueBlockConnectionPosition(
	blockElement: HTMLElement
): { x: number; y: number } | null {
	const inputElement = blockElement.querySelector('input');
	if (!inputElement) return null;

	const rect = inputElement.getBoundingClientRect();
	return {
		x: rect.left + rect.width / 2,
		y: rect.top + rect.height / 2
	};
}

/**
 * loopブロックの接続候補を検出
 * @param connectionElement - 接続要素
 * @param draggingBlockId - ドラッグ中のブロックID
 * @returns 接続候補のブロックID、見つからない場合はnull
 */
export function findLoopConnectionTarget(
	connectionElement: HTMLSpanElement,
	draggingBlockId: string
): string | null {
	const rect = connectionElement.getBoundingClientRect();
	const centerX = rect.left + rect.width / 2;
	const centerY = rect.top + rect.height / 2;

	const elementsUnderPoint = document.elementsFromPoint(centerX, centerY);

	for (const element of elementsUnderPoint) {
		// loop接続ポイントをチェック
		if (
			element instanceof HTMLSpanElement &&
			element.dataset.loopId &&
			element.dataset.loopId !== draggingBlockId
		) {
			return element.dataset.loopId;
		}
	}

	return null;
}

/**
 * loopブロック要素から接続要素を取得
 * @param containerElement - ブロック要素のコンテナ
 * @param blockId - ブロックのID
 * @returns loop接続要素、見つからない場合はnull
 */
export function getLoopConnectionElement(
	containerElement: HTMLElement,
	blockId: string
): HTMLSpanElement | null {
	const selector = `[${SELECTOR_CONSTANTS.LOOP_DATA_ATTRIBUTE}="${blockId}"]`;
	return containerElement.querySelector(selector) as HTMLSpanElement | null;
}

/**
 * 接続タイプを判定する
 * @param connectionElement - 接続要素
 * @param draggingBlockId - ドラッグ中のブロックID
 * @returns 接続タイプと対象ブロックID
 */
export function determineConnectionType(
	connectionElement: HTMLSpanElement,
	draggingBlockId: string
): { type: 'output' | 'loop' | null; targetId: string | null } {
	const rect = connectionElement.getBoundingClientRect();
	const centerX = rect.left + rect.width / 2;
	const centerY = rect.top + rect.height / 2;

	const elementsUnderPoint = document.elementsFromPoint(centerX, centerY);

	for (const element of elementsUnderPoint) {
		// 通常の出力接続ポイントをチェック
		if (
			element instanceof HTMLSpanElement &&
			element.dataset.outputId &&
			element.dataset.outputId !== draggingBlockId
		) {
			return { type: 'output', targetId: element.dataset.outputId };
		}

		// loop接続ポイントをチェック
		if (
			element instanceof HTMLSpanElement &&
			element.dataset.loopId &&
			element.dataset.loopId !== draggingBlockId
		) {
			return { type: 'loop', targetId: element.dataset.loopId };
		}

		// input要素（value typeブロックの接続ターゲット）をチェック
		if (element instanceof HTMLInputElement) {
			const blockContainer = element.closest('[data-block-id]');
			if (blockContainer instanceof HTMLElement) {
				const blockId = blockContainer.dataset.blockId;
				if (blockId && blockId !== draggingBlockId) {
					return { type: 'output', targetId: blockId };
				}
			}
		}
	}

	return { type: null, targetId: null };
}
