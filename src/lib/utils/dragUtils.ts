import { type Position, type Block, BlockPathType } from '$lib/types';
import { LAYOUT_CONSTANTS } from './constants';

/**
 * マウスイベントからオフセット位置を計算
 * @param event - マウスイベント
 * @param element - 対象の要素
 * @returns オフセット位置 { x, y }
 * @remarks
 * この関数は、マウスイベントのクライアント座標から要素の左上隅の位置を引いて、要素内での相対位置を計算します。
 * これにより、要素の左上隅を基準としたマウスの位置を取得できます。
 */
export function calculateOffset(event: MouseEvent, element: HTMLElement): Position {
	const rect = element.getBoundingClientRect();
	return {
		x: event.clientX - rect.left,
		y: event.clientY - rect.top
	};
}

/**
 * キャンバス内での相対位置を計算（ビューポートオフセット考慮）
 * @param event - マウスイベント
 * @param canvasElement - キャンバス要素
 * @param offset - オフセット位置 { x, y }（既にズーム調整済み）
 * @param viewportOffset - ビューポートのオフセット { x, y }
 * @param zoom - ズームレベル
 * @returns キャンバス内での相対位置 { x, y }
 * @remarks
 * この関数は、ビューポートのスクロール位置とズームレベルを考慮してキャンバス座標を計算します。
 * offsetは既にズーム調整済みであることを前提とします。
 */
export function calculateCanvasPosition(
	event: MouseEvent,
	canvasElement: HTMLElement,
	offset: Position,
	viewportOffset?: Position,
	zoom: number = 1
): Position {
	const canvasRect = canvasElement.getBoundingClientRect();
	const canvasX = event.clientX - canvasRect.left;
	const canvasY = event.clientY - canvasRect.top;

	// ビューポートのオフセットとズームを考慮
	const actualOffset = viewportOffset || { x: 0, y: 0 };

	return {
		x: (canvasX - actualOffset.x) / zoom - offset.x,
		y: (canvasY - actualOffset.y) / zoom - offset.y
	};
}

/**
 * 子ブロックの位置を再帰的に更新
 * @param parentBlock - 親ブロック
 * @param updateCallback - ブロックを更新するコールバック関数
 * @param getBlockCallback - ブロックを取得するコールバック関数
 * @param element - DOM要素（value block位置計算用）
 * @param depth - 再帰の深さ（初期値は1）
 * @param isBlockInLoopCallback - ブロックがループ内にあるかチェックするコールバック関数
 * @param getLoopHeightCallback - ループブロックの高さを取得するコールバック関数
 * @remarks
 * この関数は、親ブロックの子ブロックの位置を再帰的に更新します。
 * 親ブロックの子IDを基に、子ブロックを取得し、その位置を親ブロックの位置に基づいて計算します。
 * 子ブロックの位置は、親ブロックの位置に垂直方向のスペースとオフセットを加えたものになります。
 * また、子ブロックのzIndexも親ブロックのzIndexに深さと定数を加えた値になります。
 */
export function updateChildrenPositions(
	parentBlock: Block,
	updateCallback: (block: Block) => void,
	getBlockCallback: (id: string) => Block | null,
	element?: HTMLElement,
	depth: number = 1,
	isBlockInLoopCallback?: (id: string) => boolean,
	getLoopHeightCallback?: (id: string) => number
): void {
	// 通常の子ブロック処理
	if (parentBlock.childId) {
		const childBlock = getBlockCallback(parentBlock.childId);
		if (childBlock) {
			// 親ブロックがループの場合、ループの実際の高さを考慮
			let yOffset =
				LAYOUT_CONSTANTS.BLOCK_VERTICAL_SPACING + LAYOUT_CONSTANTS.BLOCK_VERTICAL_SPACING_OFFSET;

			if (parentBlock.type === BlockPathType.Loop && getLoopHeightCallback) {
				// ループブロックの場合、実際の高さを使用
				const loopHeight = getLoopHeightCallback(parentBlock.id);
				yOffset = loopHeight;
			}

			const updatedChild: Block = {
				...childBlock,
				position: {
					x: parentBlock.position.x,
					y: parentBlock.position.y + yOffset
				},
				zIndex: parentBlock.zIndex + depth + LAYOUT_CONSTANTS.DRAGGING_Z_INDEX
			};

			updateCallback(updatedChild);
			updateChildBlockVariables(updatedChild, updateCallback, getBlockCallback, element);

			if (childBlock.type === BlockPathType.Loop && childBlock.loopFirstChildId) {
				updateLoopChildren(
					childBlock,
					updateCallback,
					getBlockCallback,
					element,
					depth,
					isBlockInLoopCallback,
					getLoopHeightCallback
				);
			}

			// 再帰的に子ブロックの子も更新
			if (childBlock.childId) {
				updateChildrenPositions(
					childBlock,
					updateCallback,
					getBlockCallback,
					element,
					depth + 1,
					isBlockInLoopCallback,
					getLoopHeightCallback
				);
			}
		}
	}

	if (parentBlock.type === BlockPathType.Loop && parentBlock.loopFirstChildId) {
		updateLoopChildren(
			parentBlock,
			updateCallback,
			getBlockCallback,
			element,
			depth,
			isBlockInLoopCallback,
			getLoopHeightCallback
		);
	}
}

/**
 * ループ内の子ブロックの位置を更新
 * @param loopBlock - ループブロック
 * @param updateCallback - ブロックを更新するコールバック関数
 * @param getBlockCallback - ブロックを取得するコールバック関数
 * @param element - DOM要素
 * @param depth - 再帰の深さ
 * @param isBlockInLoopCallback - ブロックがループ内にあるかチェックするコールバック関数
 * @param getLoopHeightCallback - ループブロックの高さを取得するコールバック関数
 */
function updateLoopChildren(
	loopBlock: Block,
	updateCallback: (block: Block) => void,
	getBlockCallback: (id: string) => Block | null,
	element?: HTMLElement,
	depth: number = 1,
	isBlockInLoopCallback?: (id: string) => boolean,
	getLoopHeightCallback?: (id: string) => number
): void {
	// ループの最初の子ブロックのみを処理
	if (!loopBlock.loopFirstChildId) return;

	let currentChildId = loopBlock.loopFirstChildId;
	let cumulativeHeight = LAYOUT_CONSTANTS.BLOCK_VERTICAL_SPACING;

	// ループ内の全ての子ブロックを順番に処理
	while (currentChildId) {
		const childBlock = getBlockCallback(currentChildId);
		if (!childBlock) break;

		// ネストしたループの場合は閉じ囲い分の高さを追加
		const loopInLoop =
			childBlock.type === BlockPathType.Loop && getLoopHeightCallback
				? getLoopHeightCallback(childBlock.id)
				: 0;

		const updatedChild: Block = {
			...childBlock,
			position: {
				x: loopBlock.position.x + 8,
				y: loopBlock.position.y + cumulativeHeight
			},
			zIndex: loopBlock.zIndex + depth + LAYOUT_CONSTANTS.DRAGGING_Z_INDEX
		};

		updateCallback(updatedChild);
		updateChildBlockVariables(updatedChild, updateCallback, getBlockCallback, element);

		// 子がループブロックの場合、そのループ内の子も処理
		if (childBlock.type === BlockPathType.Loop && childBlock.loopFirstChildId) {
			updateLoopChildren(
				updatedChild,
				updateCallback,
				getBlockCallback,
				element,
				depth + 1,
				isBlockInLoopCallback,
				getLoopHeightCallback
			);
		}

		// 次の子ブロックの位置を計算するため、現在のブロックの高さを累積
		if (childBlock.type === BlockPathType.Loop && getLoopHeightCallback) {
			cumulativeHeight += getLoopHeightCallback(childBlock.id);
		} else {
			cumulativeHeight += LAYOUT_CONSTANTS.BLOCK_VERTICAL_SPACING;
		}

		// 最後の子に到達したら終了
		if (currentChildId === loopBlock.loopLastChildId) {
			break;
		}

		if (!childBlock.childId) {
			break;
		}

		currentChildId = childBlock.childId;
	}
}

/**
 * 子ブロックのvalue変数の位置を更新
 * @param childBlock - 子ブロック
 * @param updateCallback - ブロックを更新するコールバック関数
 * @param getBlockCallback - ブロックを取得するコールバック関数
 * @param element - DOM要素
 */
function updateChildBlockVariables(
	childBlock: Block,
	updateCallback: (block: Block) => void,
	getBlockCallback: (id: string) => Block | null,
	element?: HTMLElement
): void {
	childBlock.content.forEach((content) => {
		// content.content が不正形状の場合のガード
		const inner: any = (content as any).content;
		if (!inner || typeof inner !== 'object') return;
		// inner.type が存在しない/文字列でない場合はスキップ
		if (inner.type !== 'ContentValue') return;
		const innerContent: any = inner.content;
		if (
			!innerContent ||
			typeof innerContent !== 'object' ||
			Array.isArray(innerContent) ||
			!('variables' in innerContent) ||
			!innerContent.variables
		) {
			return;
		}

		try {
			const variableId = innerContent.variables as string;
			const valueBlock = getBlockCallback(variableId);
			if (valueBlock && element) {
				// value blockの相対位置を計算（input要素の位置を基準）
				let relative = {
					x: 0,
					y: 0
				};

				// 該当するHTML INPUT属性を取得してブロックの中での相対座標を取得（ズーム考慮）
				const inputElement = element.querySelector(`[data-block-id="${childBlock.id}"] input`);
				if (inputElement instanceof HTMLInputElement) {
					const blockElement = inputElement.closest('[data-block-id]');
					if (blockElement instanceof HTMLElement) {
						const blockRect = blockElement.getBoundingClientRect();
						const inputRect = inputElement.getBoundingClientRect();
						// ズームレベルを取得するため、キャンバス要素から計算
						const canvasElement = element.querySelector('#canvas') as HTMLElement;
						const zoom = canvasElement
							? parseFloat(canvasElement.style.transform.match(/scale\(([^)]+)\)/)?.[1] || '1')
							: 1;
						relative.x = (inputRect.left - blockRect.left) / zoom;
						relative.y = (inputRect.top - blockRect.top - 4) / zoom;
					}
				}

				updateVariablePositions(
					valueBlock.id,
					childBlock,
					relative,
					updateCallback,
					getBlockCallback
				);
			}
		} catch (e) {
			// eslint-disable-next-line no-console
			console.warn('[dragUtils] updateChildBlockVariables failed', {
				blockId: childBlock.id,
				error: e
			});
		}
	});
}

export function updateVariablePositions(
	id: string,
	parentBlock: Block,
	ofset: Position,
	updateCallback: (block: Block) => void,
	getBlockCallback: (id: string) => Block | null,
	depth: number = 1
): void {
	const childBlock = getBlockCallback(id);
	if (!childBlock) return;

	const updatedChild: Block = {
		...childBlock,
		position: {
			x: parentBlock.position.x + ofset.x,
			y: parentBlock.position.y + ofset.y
		},
		zIndex: parentBlock.zIndex + depth + LAYOUT_CONSTANTS.DRAGGING_Z_INDEX
	};

	// すぐに更新
	updateCallback(updatedChild);

	childBlock.content.forEach((content) => {
		const inner: any = (content as any).content;
		if (!inner || typeof inner !== 'object') return;
		if (inner.type !== 'ContentValue') return;
		const innerContent: any = inner.content;
		if (!innerContent || typeof innerContent !== 'object' || Array.isArray(innerContent)) return;
		if (!('variables' in innerContent)) return;
		const variableId = innerContent.variables;
		if (!variableId) return;
		const block = getBlockCallback(variableId || '');
		if (!block) return;
		try {
			updateVariablePositions(block.id, parentBlock, ofset, updateCallback, getBlockCallback);
		} catch (e) {
			// eslint-disable-next-line no-console
			console.warn('[dragUtils] updateVariablePositions failed for nested variable', {
				variableId,
				error: e
			});
		}
	});
}
