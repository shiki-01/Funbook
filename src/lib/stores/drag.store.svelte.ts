import type { Position } from '$lib/types';
import type { DragState, SnapTarget, ConnectionType } from '$lib/types/ui';

/**
 * ドラッグ状態を専用 store として切り出し
 */
class DragStore {
	protected drag = $state<DragState>({
		active: false,
		blockId: null,
		startPosition: { x: 0, y: 0 },
		currentPosition: { x: 0, y: 0 },
		offset: { x: 0, y: 0 },
		snapTarget: null,
		connectionType: null,
		isFromPalette: false
	});

	getDragState(): DragState {
		return { ...this.drag };
	}

	/**
	 * ドラッグを開始して基本フィールドをセット
	 */
	setDragStart(
		blockId: string,
		startPosition: Position,
		currentMousePosition: Position,
		offset: Position,
		isFromPalette: boolean = false
	) {
		this.drag = {
			...this.drag,
			active: true,
			blockId,
			startPosition: { ...startPosition },
			currentPosition: { ...currentMousePosition },
			offset: { ...offset },
			snapTarget: null,
			connectionType: null,
			isFromPalette
		};
	}

	/**
	 * 現在位置を更新（即時反映）
	 */
	updateCurrentPosition(position: Position) {
		this.drag = {
			...this.drag,
			currentPosition: { ...position }
		};
	}

	/**
	 * スナップターゲットをセット
	 */
	setSnapTarget(target: SnapTarget | null) {
		this.drag = {
			...this.drag,
			snapTarget: target,
			connectionType: target
				? target.type === 'input'
					? 'output'
					: (target.type as Exclude<ConnectionType, 'value'>)
				: null
		};
	}

	/**
	 * ドラッグ状態をクリア
	 */
	clearDrag() {
		this.drag = {
			active: false,
			blockId: null,
			startPosition: { x: 0, y: 0 },
			currentPosition: { x: 0, y: 0 },
			offset: { x: 0, y: 0 },
			snapTarget: null,
			connectionType: null,
			isFromPalette: false
		};
	}
}

let dragStoreInstance: DragStore | null = null;

export const useDragStore = (): DragStore => {
	if (!dragStoreInstance) dragStoreInstance = new DragStore();
	return dragStoreInstance;
};
