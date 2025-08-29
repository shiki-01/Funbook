/**
 * BoardService - Board コンポーネント用の統合サービス
 * 複数のサービスを統合してBoard コンポーネントに必要な機能を提供
 */

import type {
	IBlockService,
	ICanvasService,
	IDragService,
	DragState,
	SnapTarget,
	Position,
	Block,
	Viewport
} from '$lib/types';
import { BlockService } from '../block/BlockService';
import { CanvasService } from '../canvas/CanvasService';
import { useDragService } from '../drag/DragService';
import { ErrorHandler } from '../error/ErrorHandler';
import { useBlockStore } from '$lib/stores/block.store.svelte';
import { useCanvasStore } from '$lib/stores/canvas.store.svelte';
import { BoardError } from '../../errors/AppError';
import { ERROR_CODES } from '../../errors/errorCodes';

/**
 * Board コンポーネント用の統合サービス
 * 複数のサービスを組み合わせてBoard固有の操作を提供
 */
export class BoardService {
	private blockService: IBlockService;
	private canvasService: ICanvasService;
	private dragService: IDragService;
	private errorHandler: ErrorHandler;
	private blockStore = useBlockStore();
	private canvasStore = useCanvasStore();

	constructor() {
		this.errorHandler = new ErrorHandler('info');
		this.blockService = new BlockService(this.blockStore, this.errorHandler);
		this.canvasService = new CanvasService(this.errorHandler);
		this.dragService = useDragService();
	}

	// ビューポート操作

	/**
	 * ビューポートを取得
	 * @returns 現在のビューポート
	 */
	getViewport(): Viewport {
		return this.canvasService.getViewport();
	}

	/**
	 * ビューポート位置を設定
	 * @param position - 新しい位置
	 */
	setViewportPosition(position: Position): void {
		try {
			this.canvasService.setViewportPosition(position);
		} catch (error) {
			const boardError = new BoardError(
				`ビューポート位置の設定に失敗しました: ${
					error instanceof Error ? error.message : String(error)
				}`,
				ERROR_CODES.CANVAS.VIEWPORT_UPDATE_FAILED,
				'medium',
				{ position }
			);
			this.errorHandler.handleError(boardError, {
				component: 'BoardService',
				action: 'setViewportPosition',
				additionalData: { position }
			});
		}
	}

	/**
	 * ビューポートズームを設定
	 * @param zoom - 新しいズーム値
	 */
	setViewportZoom(zoom: number): void {
		try {
			this.canvasService.setViewportZoom(zoom);
		} catch (error) {
			const boardError = new BoardError(
				`ビューポートズームの設定に失敗しました: ${
					error instanceof Error ? error.message : String(error)
				}`,
				ERROR_CODES.CANVAS.VIEWPORT_UPDATE_FAILED,
				'medium',
				{ zoom }
			);
			this.errorHandler.handleError(boardError, {
				component: 'BoardService',
				action: 'setViewportZoom',
				additionalData: { zoom }
			});
		}
	}

	/**
	 * ズーム操作を実行
	 * @param delta - ズーム変化量
	 * @param centerPoint - ズームの中心点（オプション）
	 */
	zoom(delta: number, centerPoint?: Position): void {
		try {
			this.canvasService.zoom(delta, centerPoint);
		} catch (error) {
			const boardError = new BoardError(
				`ズーム操作に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
				ERROR_CODES.CANVAS.VIEWPORT_UPDATE_FAILED,
				'medium',
				{ delta, centerPoint }
			);
			this.errorHandler.handleError(boardError, {
				component: 'BoardService',
				action: 'zoom',
				additionalData: { delta, centerPoint }
			});
		}
	}

	/**
	 * ビューポートをリセット
	 * @param containerSize - コンテナのサイズ（オプション）
	 */
	resetViewport(containerSize?: { width: number; height: number }): void {
		try {
			this.canvasService.resetViewport(containerSize);
		} catch (error) {
			const boardError = new BoardError(
				`ビューポートリセットに失敗しました: ${
					error instanceof Error ? error.message : String(error)
				}`,
				ERROR_CODES.CANVAS.VIEWPORT_UPDATE_FAILED,
				'medium',
				{ containerSize }
			);
			this.errorHandler.handleError(boardError, {
				component: 'BoardService',
				action: 'resetViewport',
				additionalData: { containerSize }
			});
		}
	}

	// ブロック操作

	/**
	 * すべてのブロックを取得
	 * @returns すべてのブロックの配列
	 */
	getAllBlocks(): Block[] {
		return this.blockService.getAllBlocks();
	}

	/**
	 * ブロックを取得
	 * @param id - ブロックID
	 * @returns ブロック、見つからない場合はnull
	 */
	getBlock(id: string): Block | null {
		return this.blockService.getBlock(id);
	}

	/**
	 * ブロックを更新
	 * @param id - ブロックID
	 * @param updates - 更新内容
	 */
	updateBlock(id: string, updates: Partial<Block>): void {
		this.blockService.updateBlock(id, updates);
	}

	/**
	 * 2つのブロックを接続
	 * @param parentId - 親ブロックID
	 * @param childId - 子ブロックID
	 * @returns 接続に成功した場合はtrue
	 */
	connectBlocks(parentId: string, childId: string, isLoop: boolean): boolean {
		return this.blockService.connectBlocks(parentId, childId, isLoop);
	}

	/**
	 * ブロックの接続を解除
	 * @param id - 接続を解除するブロックのID
	 */
	disconnectBlock(id: string): void {
		this.blockService.disconnectBlock(id);
	}

	/**
	 * ブロックとその子ブロックを削除
	 * @param id - 削除するブロックのID
	 */
	removeBlockWithChildren(id: string): void {
		this.blockService.removeBlockWithChildren(id);
	}

	// ドラッグ操作

	/**
	 * ドラッグ操作を開始
	 * @param blockId - ドラッグするブロックのID
	 * @param offset - ドラッグ開始時のオフセット位置
	 * @returns ドラッグ開始に成功した場合はtrue
	 */
	startDrag(blockId: string, offset: Position): boolean {
		return this.dragService.startDrag(blockId, offset);
	}

	/**
	 * ドラッグ位置を更新
	 * @param position - 新しいドラッグ位置
	 */
	updateDragPosition(position: Position): void {
		this.dragService.updateDragPosition(position);
	}

	/**
	 * ドラッグ操作を終了
	 * @param targetId - ドロップターゲットのID（オプション）
	 * @returns ドロップに成功した場合はtrue
	 */
	endDrag(targetId?: string): boolean {
		return this.dragService.endDrag(targetId);
	}

	/**
	 * ドロップターゲットを検索
	 * @param position - 検索位置
	 * @returns 見つかったスナップターゲット、なければnull
	 */
	findDropTarget(position: Position): SnapTarget | null {
		return this.dragService.findDropTarget(position);
	}

	/**
	 * 現在のドラッグ状態を取得
	 * @returns ドラッグ状態
	 */
	getDragState(): DragState {
		return this.dragService.getDragState();
	}

	/**
	 * ドラッグ状態をクリア
	 */
	clearDrag(): void {
		this.dragService.clearDrag();
	}

	/**
	 * スナップターゲットを設定
	 * @param target - 設定するスナップターゲット
	 */
	setSnapTarget(target: SnapTarget | null): void {
		this.dragService.setSnapTarget(target);
	}

	// キャンバス操作

	/**
	 * スクリーン座標をキャンバス座標に変換
	 * @param screenPos - スクリーン座標
	 * @returns キャンバス座標
	 */
	screenToCanvas(screenPos: Position): Position {
		return this.canvasService.screenToCanvas(screenPos);
	}

	/**
	 * キャンバス座標をスクリーン座標に変換
	 * @param canvasPos - キャンバス座標
	 * @returns スクリーン座標
	 */
	canvasToScreen(canvasPos: Position): Position {
		return this.canvasService.canvasToScreen(canvasPos);
	}

	/**
	 * マウスイベントからキャンバス座標を取得
	 * @param event - マウスイベント
	 * @param containerElement - キャンバスコンテナ要素
	 * @returns キャンバス座標
	 */
	eventToCanvas(event: MouseEvent, containerElement: HTMLElement): Position {
		return this.canvasService.eventToCanvas(event, containerElement);
	}

	/**
	 * 現在表示されているブロックを計算
	 * @param containerSize - コンテナのサイズ（オプション）
	 * @returns 表示されているブロックの配列
	 */
	calculateVisibleBlocks(containerSize?: { width: number; height: number }): Block[] {
		return this.canvasService.calculateVisibleBlocks();
	}

	/**
	 * キャンバスの境界を計算
	 * @param margin - ブロック周りのマージン（デフォルト: 500）
	 * @returns キャンバスの境界
	 */
	calculateCanvasBounds(margin: number = 500) {
		return this.canvasService.calculateCanvasBounds(margin);
	}

	/**
	 * レンダリング最適化を実行
	 * @param containerSize - コンテナのサイズ（オプション）
	 */
	optimizeRendering(containerSize?: { width: number; height: number }): void {
		this.canvasService.optimizeRendering();
	}

	// キャンバス状態操作（CanvasStoreとの統合）

	/**
	 * キャンバスドラッグ状態を設定
	 * @param isDragging - ドラッグ中かどうか
	 * @param mousePos - マウス位置（オプション）
	 */
	setCanvasDragging(isDragging: boolean, mousePos?: Position): void {
		try {
			this.canvasStore.setCanvasDragging(isDragging, mousePos);
		} catch (error) {
			const boardError = new BoardError(
				`キャンバスドラッグ状態の設定に失敗しました: ${
					error instanceof Error ? error.message : String(error)
				}`,
				ERROR_CODES.CANVAS.VIEWPORT_UPDATE_FAILED,
				'low',
				{ isDragging, mousePos }
			);
			this.errorHandler.handleError(boardError, {
				component: 'BoardService',
				action: 'setCanvasDragging',
				additionalData: { isDragging, mousePos }
			});
		}
	}

	/**
	 * インタラクション状態を取得
	 * @returns 現在のインタラクション状態
	 */
	getInteractionState() {
		return this.canvasStore.getInteractionState();
	}

	/**
	 * ホバー中のブロックIDを設定
	 * @param blockId - ブロックID、ホバーしていない場合はnull
	 */
	setHoveredBlock(blockId: string | null): void {
		this.canvasStore.setHoveredBlock(blockId);
	}

	// 統合操作

	/**
	 * マウス移動イベントを処理
	 * @param event - マウスイベント
	 * @param containerElement - キャンバスコンテナ要素
	 */
	handleMouseMove(event: MouseEvent, containerElement: HTMLElement): void {
		try {
			const dragState = this.getDragState();
			const interactionState = this.getInteractionState();

			// デバッグ: ドラッグ状態と対象ブロックの存在確認（高頻度なので必要時のみ出力）
			// if (process.env.NODE_ENV === 'development') {
			// 	console.debug('[BoardService] mousemove dragState', dragState);
			// }

			// ドラッグ中の場合
			if (dragState.active && dragState.blockId) {
				// ブロックが途中で削除/未ロードの場合のガード
				const draggingBlock = this.getBlock(dragState.blockId);
				if (!draggingBlock) {
					// eslint-disable-next-line no-console
					this.clearDrag();
					return;
				}
				const canvasPos = this.eventToCanvas(event, containerElement);
				// 入力座標が NaN になるケース防止
				if (Number.isFinite(canvasPos.x) && Number.isFinite(canvasPos.y)) {
					try {
						this.updateDragPosition(canvasPos);
					} catch (e: any) {
						// drag 更新中の個別例外は低優先でログし drag 継続
						// eslint-disable-next-line no-console
						console.warn('[BoardService] updateDragPosition failed (soft)', {
							error: e?.message,
							stack: e?.stack
						});
					}
				}
			}
			// キャンバスドラッグ中の場合
			else if (interactionState.isDragging) {
				const deltaX = event.clientX - interactionState.lastMousePos.x;
				const deltaY = event.clientY - interactionState.lastMousePos.y;

				const viewport = this.getViewport();
				const canvasBounds = this.calculateCanvasBounds();

				const newPosition = {
					x: Math.min(0, Math.max(-canvasBounds.width, viewport.x + deltaX)),
					y: Math.min(0, Math.max(-canvasBounds.height, viewport.y + deltaY))
				};

				this.setViewportPosition(newPosition);
				this.setCanvasDragging(true, { x: event.clientX, y: event.clientY });
			}
		} catch (error) {
			const boardError = new BoardError(
				`マウス移動処理に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
				ERROR_CODES.CANVAS.COORDINATE_CONVERSION_FAILED,
				'low',
				{ eventType: 'mousemove' }
			);
			this.errorHandler.handleError(boardError, {
				component: 'BoardService',
				action: 'handleMouseMove',
				additionalData: { eventType: 'mousemove' }
			});
		}
	}

	/**
	 * マウスアップイベントを処理
	 * @param event - マウスイベント
	 * @param containerElement - キャンバスコンテナ要素
	 */
	handleMouseUp(event: MouseEvent, containerElement: HTMLElement): void {
		try {
			const dragState = this.getDragState();

			// ドラッグ中の場合
			if (dragState.active && dragState.blockId) {
				// スナップターゲットがある場合は接続を試行
				const success = this.endDrag(dragState.snapTarget?.blockId);

				if (!success) {
					// ドロップに失敗した場合の処理
					this.clearDrag();
				}
			}

			// キャンバスドラッグを終了
			this.setCanvasDragging(false);
		} catch (error) {
			const boardError = new BoardError(
				`マウスアップ処理に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
				ERROR_CODES.DRAG.DROP_FAILED,
				'medium',
				{ eventType: 'mouseup' }
			);
			this.errorHandler.handleError(boardError, {
				component: 'BoardService',
				action: 'handleMouseUp',
				additionalData: { eventType: 'mouseup' }
			});
		}
	}

	/**
	 * ホイールイベントを処理（ズーム）
	 * @param event - ホイールイベント
	 * @param containerElement - キャンバスコンテナ要素
	 */
	handleWheel(event: WheelEvent, containerElement: HTMLElement): void {
		if (!event.ctrlKey) return;

		try {
			event.preventDefault();

			const delta = event.deltaY > 0 ? -0.1 : 0.1;
			const rect = containerElement.getBoundingClientRect();
			const centerPoint = {
				x: event.clientX - rect.left,
				y: event.clientY - rect.top
			};

			this.zoom(delta, centerPoint);
		} catch (error) {
			const boardError = new BoardError(
				`ホイール処理に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
				ERROR_CODES.CANVAS.VIEWPORT_UPDATE_FAILED,
				'low',
				{ eventType: 'wheel' }
			);
			this.errorHandler.handleError(boardError, {
				component: 'BoardService',
				action: 'handleWheel',
				additionalData: { eventType: 'wheel' }
			});
		}
	}

	/**
	 * エラーハンドラーを取得
	 * @returns エラーハンドラー
	 */
	getErrorHandler(): ErrorHandler {
		return this.errorHandler;
	}

	/**
	 * サービスの依存関係を取得（テスト用）
	 * @returns サービスの依存関係
	 */
	getServices() {
		return {
			blockService: this.blockService,
			canvasService: this.canvasService,
			dragService: this.dragService,
			errorHandler: this.errorHandler
		};
	}
}
