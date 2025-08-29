/**
 * Canvas service implementation
 * Handles viewport management, coordinate transformations, and rendering optimizations
 */

import type { ICanvasService } from '$lib/types/services';
import type { Position, Viewport } from '$lib/types';
import type { Block } from '$lib/types/domain';
import type { Block as LegacyBlock } from '$lib/types';
import { useBlockStore } from '$lib/stores/block.store.svelte';
import { CanvasError } from '../../errors/AppError';
import { ERROR_CODES } from '../../errors/errorCodes';
import type { ErrorHandler } from '../error/ErrorHandler';
import { VirtualScrollService } from './VirtualScrollService';
import {
	memoizedScreenToCanvasPosition,
	memoizedCanvasToScreenPosition,
	memoizedCalculateVisibleBlocks,
	memoizedCalculateBlocksBoundingBox
} from '../../utils/calculations';
import { useCanvasStore } from '$lib/stores';

/**
 * Canvas service for managing viewport operations and coordinate transformations
 *
 * @remarks
 * このサービスは、キャンバスのビューポート管理、座標変換、レンダリング最適化を担当します。
 * UIコンポーネントから分離されたビジネスロジックを提供し、テスト可能な形で実装されています。
 */
export class CanvasService implements ICanvasService {
	private blockStore = useBlockStore();
	private canvasStore = useCanvasStore();
	private virtualScrollService: VirtualScrollService;

	constructor(private errorHandler: ErrorHandler) {
		this.virtualScrollService = new VirtualScrollService({
			margin: 200,
			defaultBlockWidth: 200,
			defaultBlockHeight: 60,
			enablePerformanceMonitoring: true
		});
	}

	/**
	 * スクリーン座標をキャンバス座標に変換
	 *
	 * @param screenPos - スクリーン座標
	 * @returns キャンバス座標
	 * @remarks
	 * ビューポートの位置とズームレベルを考慮して座標変換を行います。
	 * メモ化により頻繁な座標変換のパフォーマンスを向上させています。
	 */
	screenToCanvas(screenPos: Position): Position {
		try {
			// 座標の検証
			if (!this.isValidPosition(screenPos)) {
				const error = new CanvasError(
					`無効なスクリーン座標: x=${screenPos.x}, y=${screenPos.y}`,
					ERROR_CODES.CANVAS.COORDINATE_CONVERSION_FAILED,
					'medium',
					{ screenPos }
				);
				this.errorHandler.handleError(error, {
					component: 'CanvasService',
					action: 'screenToCanvas',
					additionalData: { screenPos }
				});
				return { x: 0, y: 0 }; // フォールバック値
			}

			const viewport = this.canvasStore.getViewport();
			// メモ化された座標変換を使用
			return memoizedScreenToCanvasPosition(screenPos, viewport);
		} catch (error) {
			const canvasError = new CanvasError(
				`座標変換に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
				ERROR_CODES.CANVAS.COORDINATE_CONVERSION_FAILED,
				'high',
				{ screenPos }
			);
			this.errorHandler.handleError(canvasError, {
				component: 'CanvasService',
				action: 'screenToCanvas',
				additionalData: { screenPos }
			});
			return { x: 0, y: 0 }; // フォールバック値
		}
	}

	/**
	 * キャンバス座標をスクリーン座標に変換
	 *
	 * @param canvasPos - キャンバス座標
	 * @returns スクリーン座標
	 * @remarks
	 * ビューポートの位置とズームレベルを考慮して座標変換を行います。
	 * メモ化により頻繁な座標変換のパフォーマンスを向上させています。
	 */
	canvasToScreen(canvasPos: Position): Position {
		const viewport = this.canvasStore.getViewport();
		// メモ化された座標変換を使用
		return memoizedCanvasToScreenPosition(canvasPos, viewport);
	}

	/**
	 * ビューポートの状態を更新
	 *
	 * @param viewport - 新しいビューポート状態
	 * @remarks
	 * ビューポートの位置とズームレベルを同時に更新します。
	 * ズームレベルは最小値と最大値の範囲内に制限されます。
	 */
	updateViewport(viewport: Viewport): void {
		try {
			// ビューポートの検証
			if (!this.isValidViewport(viewport)) {
				const error = new CanvasError(
					`無効なビューポート: x=${viewport.x}, y=${viewport.y}, zoom=${viewport.zoom}`,
					ERROR_CODES.CANVAS.INVALID_VIEWPORT,
					'medium',
					{ viewport }
				);
				this.errorHandler.handleError(error, {
					component: 'CanvasService',
					action: 'updateViewport',
					additionalData: { viewport }
				});
				return;
			}

			// ズームレベルを制限
			const clampedZoom = Math.max(0.1, Math.min(3.0, viewport.zoom));

			this.canvasStore.setViewportPosition({ x: viewport.x, y: viewport.y });
			this.canvasStore.setViewportZoom(clampedZoom);
		} catch (error) {
			const canvasError = new CanvasError(
				`ビューポート更新に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
				ERROR_CODES.CANVAS.VIEWPORT_UPDATE_FAILED,
				'high',
				{ viewport }
			);
			this.errorHandler.handleError(canvasError, {
				component: 'CanvasService',
				action: 'updateViewport',
				additionalData: { viewport }
			});
		}
	}

	/**
	 * 現在表示されているブロックを計算
	 *
	 * @param containerSize - コンテナのサイズ（オプション）
	 * @returns 表示されているブロックの配列
	 * @remarks
	 * 仮想スクロールサービスを使用してビューポートの範囲内にあるブロックのみを返します。
	 * パフォーマンス最適化のため、画面外のブロックは除外されます。
	 * メモ化により同じビューポートでの計算結果をキャッシュしています。
	 */
	calculateVisibleBlocks(containerSize?: { width: number; height: number }): Block[] {
		const viewport = this.canvasStore.getViewport();
		const allBlocks = this.blockStore.getAllBlocks();

		// コンテナサイズが指定されていない場合はウィンドウサイズを使用
		const size = containerSize || {
			width: window.innerWidth || 1920,
			height: window.innerHeight || 1080
		};

		// レガシーブロック型をドメインブロック型に変換
		const domainBlocks = allBlocks.map((block) => this.convertLegacyBlockToDomainBlock(block));

		// メモ化された可視ブロック計算を使用
		return memoizedCalculateVisibleBlocks(domainBlocks, viewport, size);
	}

	/**
	 * レンダリング最適化を実行
	 *
	 * @param containerSize - コンテナのサイズ（オプション）
	 * @remarks
	 * 仮想スクロールとパフォーマンス監視を含む包括的なレンダリング最適化を実行します。
	 */
	optimizeRendering(containerSize?: { width: number; height: number }): void {
		const visibleBlocks = this.calculateVisibleBlocks(containerSize);
		const performanceStats = this.virtualScrollService.getPerformanceStats();

		// パフォーマンス監視のためのログ（開発時のみ）
		if (process.env.NODE_ENV === 'development') {
			console.debug('Rendering optimization stats:', {
				totalBlocks: performanceStats.totalBlocks,
				visibleBlocks: performanceStats.visibleBlocks,
				culledBlocks: performanceStats.culledBlocks,
				cullingEfficiency: `${(performanceStats.cullingEfficiency * 100).toFixed(1)}%`,
				calculationTime: `${performanceStats.lastCalculationTime.toFixed(2)}ms`
			});
		}
	}

	/**
	 * 現在のビューポート状態を取得
	 *
	 * @returns 現在のビューポート状態
	 */
	getViewport(): Viewport {
		return this.canvasStore.getViewport();
	}

	/**
	 * ビューポートの位置を設定
	 *
	 * @param position - 新しいビューポート位置
	 * @remarks
	 * ズームレベルは変更せず、位置のみを更新します。
	 */
	setViewportPosition(position: Position): void {
		this.canvasStore.setViewportPosition(position);
	}

	/**
	 * ビューポートのズームレベルを設定
	 *
	 * @param zoom - 新しいズームレベル
	 * @remarks
	 * ズームレベルは0.1から3.0の範囲に制限されます。
	 */
	setViewportZoom(zoom: number): void {
		const clampedZoom = Math.max(0.1, Math.min(3.0, zoom));
		this.canvasStore.setViewportZoom(clampedZoom);
	}

	/**
	 * マウスイベントからキャンバス座標を取得
	 *
	 * @param event - マウスイベント
	 * @param containerElement - キャンバスコンテナ要素
	 * @returns キャンバス座標
	 * @remarks
	 * マウスイベントの座標をコンテナ要素の相対座標に変換してから、
	 * キャンバス座標に変換します。
	 */
	eventToCanvas(event: MouseEvent, containerElement: HTMLElement): Position {
		const rect = containerElement.getBoundingClientRect();
		const screenPos = {
			x: event.clientX - rect.left,
			y: event.clientY - rect.top
		};

		return this.screenToCanvas(screenPos);
	}

	/**
	 * ビューポートの可視範囲を計算
	 *
	 * @returns ビューポートの境界
	 * @private
	 */
	private getViewportBounds() {
		const viewport = this.canvasStore.getViewport();

		// 画面サイズを取得（デフォルト値を使用）
		const screenWidth = window.innerWidth || 1920;
		const screenHeight = window.innerHeight || 1080;

		// ビューポートの可視範囲を計算
		const left = -viewport.x / viewport.zoom;
		const top = -viewport.y / viewport.zoom;
		const right = left + screenWidth / viewport.zoom;
		const bottom = top + screenHeight / viewport.zoom;

		return { left, top, right, bottom };
	}

	/**
	 * キャンバスの境界を計算
	 *
	 * @param margin - ブロック周りのマージン（デフォルト: 500）
	 * @returns キャンバスの境界
	 * @remarks
	 * すべてのブロックを含む最小の矩形にマージンを追加した境界を返します。
	 * メモ化により同じブロック配置での計算結果をキャッシュしています。
	 */
	calculateCanvasBounds(margin: number = 500) {
		const blocks = this.blockStore.getAllBlocks();

		if (blocks.length === 0) {
			return {
				minX: -margin,
				minY: -margin,
				maxX: margin,
				maxY: margin,
				width: margin * 2,
				height: margin * 2
			};
		}

		// レガシーブロック型をドメインブロック型に変換
		const domainBlocks = blocks.map((block) => this.convertLegacyBlockToDomainBlock(block));

		// メモ化されたバウンディングボックス計算を使用
		const boundingBox = memoizedCalculateBlocksBoundingBox(domainBlocks, margin);

		return {
			minX: boundingBox.x,
			minY: boundingBox.y,
			maxX: boundingBox.x + boundingBox.width,
			maxY: boundingBox.y + boundingBox.height,
			width: boundingBox.width,
			height: boundingBox.height
		};
	}

	/**
	 * ズーム操作を実行
	 *
	 * @param delta - ズーム変化量（正の値でズームイン、負の値でズームアウト）
	 * @param centerPoint - ズームの中心点（オプション）
	 * @remarks
	 * 指定された中心点を基準にズーム操作を行います。
	 * 中心点が指定されない場合は、現在のビューポートの中心を使用します。
	 */
	zoom(delta: number, centerPoint?: Position): void {
		const viewport = this.canvasStore.getViewport();
		const newZoom = Math.max(0.1, Math.min(3.0, viewport.zoom + delta));

		if (centerPoint) {
			// 指定された点を中心にズーム
			const zoomRatio = newZoom / viewport.zoom;
			const newPosition = {
				x: viewport.x - (centerPoint.x - viewport.x) * (zoomRatio - 1),
				y: viewport.y - (centerPoint.y - viewport.y) * (zoomRatio - 1)
			};

			this.canvasStore.setViewportPosition(newPosition);
		}

		this.canvasStore.setViewportZoom(newZoom);
	}

	/**
	 * ビューポートを指定された位置に中央揃え
	 *
	 * @param targetPosition - 中央に配置する位置
	 * @param containerSize - コンテナのサイズ（オプション）
	 * @remarks
	 * 指定された位置が画面の中央に来るようにビューポートを調整します。
	 */
	centerViewportOn(
		targetPosition: Position,
		containerSize?: { width: number; height: number }
	): void {
		const viewport = this.canvasStore.getViewport();
		const size = containerSize || { width: window.innerWidth, height: window.innerHeight };

		const newPosition = {
			x: size.width / 2 - targetPosition.x * viewport.zoom,
			y: size.height / 2 - targetPosition.y * viewport.zoom
		};

		this.canvasStore.setViewportPosition(newPosition);
	}

	/**
	 * ビューポートをリセット
	 *
	 * @param containerSize - コンテナのサイズ（オプション）
	 * @remarks
	 * ズームレベルを1.0に戻し、キャンバスの中心を画面の中心に配置します。
	 */
	resetViewport(containerSize?: { width: number; height: number }): void {
		const size = containerSize || { width: window.innerWidth, height: window.innerHeight };

		this.canvasStore.setViewportZoom(1.0);
		this.canvasStore.setViewportPosition({
			x: size.width / 2,
			y: size.height / 2
		});
	}

	/**
	 * ブロックの詳細な可視性情報を取得
	 *
	 * @param containerSize - コンテナのサイズ（オプション）
	 * @returns ブロックの可視性情報の配列
	 */
	getBlockVisibility(containerSize?: { width: number; height: number }) {
		const viewport = this.canvasStore.getViewport();
		const allBlocks = this.blockStore.getAllBlocks();

		const size = containerSize || {
			width: window.innerWidth || 1920,
			height: window.innerHeight || 1080
		};

		const domainBlocks = allBlocks.map((block) => this.convertLegacyBlockToDomainBlock(block));
		return this.virtualScrollService.calculateBlockVisibility(domainBlocks, viewport, size);
	}

	/**
	 * 仮想スクロールのパフォーマンス統計を取得
	 *
	 * @returns パフォーマンス統計
	 */
	getVirtualScrollPerformanceStats() {
		return this.virtualScrollService.getPerformanceStats();
	}

	/**
	 * 仮想スクロールの設定を更新
	 *
	 * @param config - 新しい設定
	 */
	updateVirtualScrollConfig(
		config: Partial<{
			margin: number;
			defaultBlockWidth: number;
			defaultBlockHeight: number;
			enablePerformanceMonitoring: boolean;
		}>
	) {
		this.virtualScrollService.updateConfig(config);
	}

	/**
	 * 仮想スクロールの設定を取得
	 *
	 * @returns 現在の設定
	 */
	getVirtualScrollConfig() {
		return this.virtualScrollService.getConfig();
	}

	/**
	 * レガシーブロック型をドメインブロック型に変換
	 *
	 * @param legacyBlock - レガシーブロック
	 * @returns ドメインブロック
	 * @private
	 */
	private convertLegacyBlockToDomainBlock(legacyBlock: LegacyBlock): Block {
		return {
			// BlockMetadata
			id: legacyBlock.id,
			name: legacyBlock.name,
			type: legacyBlock.type,
			version: undefined,

			// BlockLayout
			position: legacyBlock.position,
			size: undefined,
			zIndex: legacyBlock.zIndex,
			visibility: true, // デフォルト値

			// BlockBehavior
			connection: legacyBlock.connection,
			draggable: true, // デフォルト値
			editable: true, // デフォルト値
			deletable: true, // デフォルト値

			// BlockRelationship
			parentId: legacyBlock.parentId,
			childId: legacyBlock.childId,
			valueTargetId: legacyBlock.valueTargetId,
			loopFirstChildId: legacyBlock.loopFirstChildId,
			loopLastChildId: legacyBlock.loopLastChildId,

			// Block specific properties
			title: legacyBlock.title,
			output: legacyBlock.output,
			closeOutput: legacyBlock.closeOutput,
			content: this.convertLegacyContentToDomainContent(legacyBlock.content || []),
			color: legacyBlock.color
		};
	}

	/**
	 * レガシーコンテンツ型をドメインコンテンツ型に変換
	 *
	 * @param legacyContent - レガシーコンテンツ配列
	 * @returns ドメインコンテンツ配列
	 * @private
	 */
	private convertLegacyContentToDomainContent(legacyContent: any[]): any[] {
		return legacyContent.map((content) => ({
			id: content.id,
			type: content.content?.type || 'Text',
			data: content.content?.content || { title: '' },
			validation: undefined
		}));
	}

	/**
	 * 位置が有効かどうかをチェック
	 * @param position - チェックする位置
	 * @returns 有効な場合はtrue
	 * @private
	 */
	private isValidPosition(position: Position): boolean {
		return (
			typeof position.x === 'number' &&
			typeof position.y === 'number' &&
			!isNaN(position.x) &&
			!isNaN(position.y) &&
			isFinite(position.x) &&
			isFinite(position.y)
		);
	}

	/**
	 * ビューポートが有効かどうかをチェック
	 * @param viewport - チェックするビューポート
	 * @returns 有効な場合はtrue
	 * @private
	 */
	private isValidViewport(viewport: Viewport): boolean {
		return (
			this.isValidPosition({ x: viewport.x, y: viewport.y }) &&
			typeof viewport.zoom === 'number' &&
			!isNaN(viewport.zoom) &&
			isFinite(viewport.zoom) &&
			viewport.zoom > 0
		);
	}
}
