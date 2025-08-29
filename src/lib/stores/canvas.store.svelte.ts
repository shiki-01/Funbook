/**
 * キャンバスストア - UI状態管理
 * ビューポート、選択、インタラクション状態を管理
 */

import type {
	Viewport,
	CanvasState,
	SelectionState,
	InteractionState,
	PerformanceState
} from '$lib/types/ui';
import type { Position } from '$lib/types';
import { withBatchUpdates } from '$lib/utils/batch/BatchStoreMixin';
import type { BatchOperation } from '$lib/utils/batch/BatchUpdateManager';

/**
 * キャンバス状態検証エラー
 */
export class CanvasStateError extends Error {
	constructor(
		message: string,
		public context?: Record<string, any>
	) {
		super(message);
		this.name = 'CanvasStateError';
	}
}

/**
 * UI状態管理のためのキャンバスストア
 * ビューポート、選択、インタラクション状態を分離して管理
 */
class BaseCanvasStore {
	protected viewport = $state<Viewport>({
		x: 0,
		y: 0,
		zoom: 1.0
	});

	protected selection = $state<SelectionState>({
		selectedBlockIds: new Set<string>(),
		lastSelectedId: null,
		selectionBox: null
	});

	protected interaction = $state<InteractionState>({
		isDragging: false,
		isSelecting: false,
		lastMousePos: { x: 0, y: 0 },
		hoveredBlockId: null
	});

	protected performance = $state<PerformanceState>({
		visibleBlocks: new Set<string>(),
		renderCount: 0,
		lastRenderTime: 0
	});

	// ビューポート操作

	/**
	 * ビューポートを設定
	 * @param newViewport - 新しいビューポート
	 */
	setViewport(newViewport: Viewport): void {
		this.validateViewport(newViewport);
		this.viewport = { ...newViewport };
	}

	/**
	 * ビューポート位置を設定
	 * @param position - 新しい位置
	 */
	setViewportPosition(position: Position): void {
		this.viewport = {
			...this.viewport,
			x: position.x,
			y: position.y
		};
	}

	/**
	 * ビューポートズームを設定
	 * @param zoom - 新しいズーム値
	 */
	setViewportZoom(zoom: number): void {
		if (zoom <= 0) {
			throw new CanvasStateError('Zoom must be greater than 0', { zoom });
		}
		this.viewport = {
			...this.viewport,
			zoom
		};
	}

	/**
	 * ビューポートを取得
	 * @returns 現在のビューポート
	 */
	getViewport(): Viewport {
		return { ...this.viewport };
	}

	/**
	 * ビューポートを相対的に移動
	 * @param deltaX - X軸の移動量
	 * @param deltaY - Y軸の移動量
	 */
	moveViewport(deltaX: number, deltaY: number): void {
		this.viewport = {
			...this.viewport,
			x: this.viewport.x + deltaX,
			y: this.viewport.y + deltaY
		};
	}

	/**
	 * ビューポートをリセット
	 */
	resetViewport(): void {
		this.viewport = {
			x: 0,
			y: 0,
			zoom: 1.0
		};
	}

	// 選択状態操作

	/**
	 * ブロックを選択
	 * @param blockId - ブロックID
	 * @param multiSelect - 複数選択モード
	 */
	selectBlock(blockId: string, multiSelect: boolean = false): void {
		if (!multiSelect) {
			this.selection = {
				...this.selection,
				selectedBlockIds: new Set([blockId]),
				lastSelectedId: blockId
			};
		} else {
			const newSelectedIds = new Set(this.selection.selectedBlockIds);
			if (newSelectedIds.has(blockId)) {
				newSelectedIds.delete(blockId);
			} else {
				newSelectedIds.add(blockId);
			}
			this.selection = {
				...this.selection,
				selectedBlockIds: newSelectedIds,
				lastSelectedId: blockId
			};
		}
	}

	/**
	 * 複数のブロックを選択
	 * @param blockIds - ブロックIDの配列
	 */
	selectBlocks(blockIds: string[]): void {
		this.selection = {
			...this.selection,
			selectedBlockIds: new Set(blockIds),
			lastSelectedId: blockIds[blockIds.length - 1] || null
		};
	}

	/**
	 * すべての選択を解除
	 */
	clearSelection(): void {
		this.selection = {
			...this.selection,
			selectedBlockIds: new Set(),
			lastSelectedId: null,
			selectionBox: null
		};
	}

	/**
	 * 選択されたブロックIDを取得
	 * @returns 選択されたブロックIDの配列
	 */
	getSelectedBlockIds(): string[] {
		return Array.from(this.selection.selectedBlockIds);
	}

	/**
	 * ブロックが選択されているかチェック
	 * @param blockId - ブロックID
	 * @returns 選択されている場合はtrue
	 */
	isBlockSelected(blockId: string): boolean {
		return this.selection.selectedBlockIds.has(blockId);
	}

	/**
	 * 選択ボックスを開始
	 * @param startPosition - 開始位置
	 */
	startSelectionBox(startPosition: Position): void {
		this.selection = {
			...this.selection,
			selectionBox: {
				start: { ...startPosition },
				end: { ...startPosition },
				active: true
			}
		};
		this.interaction = {
			...this.interaction,
			isSelecting: true
		};
	}

	/**
	 * 選択ボックスを更新
	 * @param endPosition - 終了位置
	 */
	updateSelectionBox(endPosition: Position): void {
		if (!this.selection.selectionBox) {
			throw new CanvasStateError('Selection box not started');
		}
		this.selection = {
			...this.selection,
			selectionBox: {
				...this.selection.selectionBox,
				end: { ...endPosition }
			}
		};
	}

	/**
	 * 選択ボックスを終了
	 */
	endSelectionBox(): void {
		this.selection = {
			...this.selection,
			selectionBox: null
		};
		this.interaction = {
			...this.interaction,
			isSelecting: false
		};
	}

	// インタラクション状態操作

	/**
	 * ドラッグ状態を設定
	 * @param isDragging - ドラッグ中かどうか
	 */
	setDragging(isDragging: boolean): void {
		this.interaction = {
			...this.interaction,
			isDragging
		};
	}

	/**
	 * キャンバスドラッグ状態を設定
	 * @param isDragging - ドラッグ中かどうか
	 * @param mousePos - マウス位置（オプション）
	 */
	setCanvasDragging(isDragging: boolean, mousePos?: Position): void {
		this.interaction = {
			...this.interaction,
			isDragging,
			lastMousePos: mousePos || this.interaction.lastMousePos
		};
	}

	/**
	 * 最後のマウス位置を設定
	 * @param position - マウス位置
	 */
	setLastMousePosition(position: Position): void {
		this.interaction = {
			...this.interaction,
			lastMousePos: { ...position }
		};
	}

	/**
	 * ホバー中のブロックIDを設定
	 * @param blockId - ブロックID、ホバーしていない場合はnull
	 */
	setHoveredBlock(blockId: string | null): void {
		this.interaction = {
			...this.interaction,
			hoveredBlockId: blockId
		};
	}

	/**
	 * インタラクション状態を取得
	 * @returns 現在のインタラクション状態
	 */
	getInteractionState(): InteractionState {
		return { ...this.interaction };
	}

	/**
	 * インタラクション状態をリセット
	 */
	resetInteractionState(): void {
		this.interaction = {
			isDragging: false,
			isSelecting: false,
			lastMousePos: { x: 0, y: 0 },
			hoveredBlockId: null
		};
	}

	// パフォーマンス状態操作

	/**
	 * 表示中のブロックを設定
	 * @param blockIds - 表示中のブロックIDの配列
	 */
	setVisibleBlocks(blockIds: string[]): void {
		this.performance = {
			...this.performance,
			visibleBlocks: new Set(blockIds)
		};
	}

	/**
	 * 仮想スクロールのパフォーマンス統計を更新
	 * @param stats - パフォーマンス統計
	 */
	updateVirtualScrollStats(stats: {
		totalBlocks: number;
		visibleBlocks: number;
		culledBlocks: number;
		calculationTime: number;
		cullingEfficiency: number;
	}): void {
		this.performance = {
			...this.performance,
			renderCount: this.performance.renderCount + 1,
			lastRenderTime: stats.calculationTime
		};
	}

	/**
	 * レンダリング統計を更新
	 * @param renderTime - レンダリング時間（ミリ秒）
	 */
	updateRenderStats(renderTime: number): void {
		this.performance = {
			...this.performance,
			renderCount: this.performance.renderCount + 1,
			lastRenderTime: renderTime
		};
	}

	/**
	 * パフォーマンス統計をリセット
	 */
	resetPerformanceStats(): void {
		this.performance = {
			visibleBlocks: new Set(),
			renderCount: 0,
			lastRenderTime: 0
		};
	}

	/**
	 * パフォーマンス状態を取得
	 * @returns 現在のパフォーマンス状態
	 */
	getPerformanceState(): PerformanceState {
		return {
			...this.performance,
			visibleBlocks: new Set(this.performance.visibleBlocks)
		};
	}

	// 統合状態操作

	/**
	 * 完全なキャンバス状態を取得
	 * @returns 現在のキャンバス状態
	 */
	getCanvasState(): CanvasState {
		return {
			viewport: this.getViewport(),
			selection: {
				...this.selection,
				selectedBlockIds: new Set(this.selection.selectedBlockIds)
			},
			interaction: this.getInteractionState(),
			performance: this.getPerformanceState()
		};
	}

	/**
	 * キャンバス状態をリセット
	 */
	resetCanvasState(): void {
		this.resetViewport();
		this.clearSelection();
		this.resetInteractionState();
		this.resetPerformanceStats();
	}

	/**
	 * ドラッグ操作をバッチで更新
	 * @param updates - ドラッグ更新の配列
	 */
	updateDragStateBatch(
		updates: Array<{
			type: 'position' | 'dragging' | 'hoveredBlock' | 'snapTarget';
			data: any;
		}>
	): void {
		// 簡単なバッチ更新実装 - すべての更新を一度に適用
		const originalState = { ...this.interaction };

		try {
			updates.forEach((update) => {
				switch (update.type) {
					case 'position':
						this.setLastMousePosition(update.data);
						break;
					case 'dragging':
						this.setDragging(update.data);
						break;
					case 'hoveredBlock':
						this.setHoveredBlock(update.data);
						break;
					case 'snapTarget':
						// スナップターゲット更新のロジックを追加
						break;
				}
			});
		} catch (error) {
			// エラーが発生した場合は元の状態に戻す
			this.interaction = originalState;
			throw error;
		}
	}

	// プライベートヘルパーメソッド

	/**
	 * ビューポートの妥当性をチェック
	 * @param viewport - チェックするビューポート
	 */
	private validateViewport(viewport: Viewport): void {
		if (typeof viewport.x !== 'number' || !isFinite(viewport.x)) {
			throw new CanvasStateError('Viewport x must be a finite number', {
				viewport
			});
		}
		if (typeof viewport.y !== 'number' || !isFinite(viewport.y)) {
			throw new CanvasStateError('Viewport y must be a finite number', {
				viewport
			});
		}
		if (typeof viewport.zoom !== 'number' || viewport.zoom <= 0 || !isFinite(viewport.zoom)) {
			throw new CanvasStateError('Viewport zoom must be a positive finite number', { viewport });
		}
	}
}

// バッチ更新機能を追加したキャンバスストア
const BatchEnabledCanvasStore = withBatchUpdates(BaseCanvasStore);

export class CanvasStore extends BatchEnabledCanvasStore {
	/**
	 * 複数の選択操作をバッチで実行
	 * @param operations - 選択操作の配列
	 */
	batchSelectOperations(operations: Array<() => void>): void {
		const batchOps: BatchOperation[] = operations.map((op, index) => {
			const originalSelection = {
				...this.selection,
				selectedBlockIds: new Set(this.selection.selectedBlockIds)
			};

			return this.createBatchOperation(
				`select-operation-${index}`,
				'canvas',
				op,
				() => {
					this.selection = originalSelection;
				},
				5
			);
		});

		this.executeBatchOperations(batchOps);
	}
}

export type CanvasStoreType = InstanceType<typeof CanvasStore>;

// シングルトンインスタンス
let canvasStoreInstance: CanvasStore | null = null;

/**
 * キャンバスストアのインスタンスを取得
 * シングルトンパターンで単一のインスタンスを保証
 * @returns キャンバスストアインスタンス
 */
export const useCanvasStore = (): CanvasStore => {
	if (!canvasStoreInstance) {
		canvasStoreInstance = new CanvasStore();
	}
	return canvasStoreInstance;
};
