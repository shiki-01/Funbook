/**
 * 仮想スクロールサービス
 * 大きなブロックコレクションのためのビューポートベースレンダリング最適化
 */

import type { Position, Viewport } from '$lib/types';
import type { Block } from '$lib/types/domain';

/**
 * ブロックの可視性情報
 */
export interface BlockVisibility {
	/** ブロックID */
	id: string;
	/** 完全に表示されているかどうか */
	fullyVisible: boolean;
	/** 部分的に表示されているかどうか */
	partiallyVisible: boolean;
	/** ビューポートとの交差面積（0-1の範囲） */
	intersectionRatio: number;
}

/**
 * 仮想スクロール設定
 */
export interface VirtualScrollConfig {
	/** ビューポート外のマージン（ピクセル） */
	margin: number;
	/** ブロックのデフォルト幅 */
	defaultBlockWidth: number;
	/** ブロックのデフォルト高さ */
	defaultBlockHeight: number;
	/** パフォーマンス監視を有効にするかどうか */
	enablePerformanceMonitoring: boolean;
}

/**
 * パフォーマンス統計
 */
export interface PerformanceStats {
	/** 総ブロック数 */
	totalBlocks: number;
	/** 表示中のブロック数 */
	visibleBlocks: number;
	/** カリングされたブロック数 */
	culledBlocks: number;
	/** 最後の計算時間（ミリ秒） */
	lastCalculationTime: number;
	/** カリング効率（0-1の範囲） */
	cullingEfficiency: number;
}

/**
 * 仮想スクロールサービス
 * ビューポートベースのブロックレンダリング最適化を提供
 */
export class VirtualScrollService {
	private config: VirtualScrollConfig;
	private performanceStats: PerformanceStats;

	constructor(config: Partial<VirtualScrollConfig> = {}) {
		this.config = {
			margin: 200,
			defaultBlockWidth: 200,
			defaultBlockHeight: 60,
			enablePerformanceMonitoring: true,
			...config
		};

		this.performanceStats = {
			totalBlocks: 0,
			visibleBlocks: 0,
			culledBlocks: 0,
			lastCalculationTime: 0,
			cullingEfficiency: 0
		};
	}

	/**
	 * ビューポート内の可視ブロックを計算
	 *
	 * @param blocks - すべてのブロック
	 * @param viewport - 現在のビューポート
	 * @param containerSize - コンテナのサイズ
	 * @returns 可視ブロックの配列
	 */
	calculateVisibleBlocks(
		blocks: Block[],
		viewport: Viewport,
		containerSize: { width: number; height: number }
	): Block[] {
		const startTime = performance.now();

		// ビューポートの可視範囲を計算（マージン付き）
		const visibleBounds = this.calculateVisibleBounds(viewport, containerSize);

		// 可視ブロックをフィルタリング
		const visibleBlocks = blocks.filter((block) => {
			return this.isBlockVisible(block, visibleBounds);
		});

		// パフォーマンス統計を更新
		if (this.config.enablePerformanceMonitoring) {
			const endTime = performance.now();
			this.updatePerformanceStats(blocks.length, visibleBlocks.length, endTime - startTime);
		}

		return visibleBlocks;
	}

	/**
	 * ブロックの詳細な可視性情報を計算
	 *
	 * @param blocks - すべてのブロック
	 * @param viewport - 現在のビューポート
	 * @param containerSize - コンテナのサイズ
	 * @returns ブロックの可視性情報の配列
	 */
	calculateBlockVisibility(
		blocks: Block[],
		viewport: Viewport,
		containerSize: { width: number; height: number }
	): BlockVisibility[] {
		const visibleBounds = this.calculateVisibleBounds(viewport, containerSize);

		return blocks.map((block) => {
			const blockBounds = this.getBlockBounds(block);
			const intersection = this.calculateIntersection(blockBounds, visibleBounds);
			const blockArea = blockBounds.width * blockBounds.height;
			const intersectionRatio = blockArea > 0 ? intersection.area / blockArea : 0;

			return {
				id: block.id,
				fullyVisible: intersectionRatio >= 0.99, // 99%以上表示されている場合は完全表示とみなす
				partiallyVisible: intersectionRatio > 0,
				intersectionRatio
			};
		});
	}

	/**
	 * ビューポートの可視範囲を計算
	 *
	 * @param viewport - ビューポート
	 * @param containerSize - コンテナサイズ
	 * @returns 可視範囲の境界
	 * @private
	 */
	private calculateVisibleBounds(
		viewport: Viewport,
		containerSize: { width: number; height: number }
	) {
		// ビューポートの逆変換でキャンバス座標での可視範囲を計算
		const left = (-viewport.x - this.config.margin) / viewport.zoom;
		const top = (-viewport.y - this.config.margin) / viewport.zoom;
		const right = (containerSize.width - viewport.x + this.config.margin) / viewport.zoom;
		const bottom = (containerSize.height - viewport.y + this.config.margin) / viewport.zoom;

		return {
			left,
			top,
			right,
			bottom,
			width: right - left,
			height: bottom - top
		};
	}

	/**
	 * ブロックの境界を取得
	 *
	 * @param block - ブロック
	 * @returns ブロックの境界
	 * @private
	 */
	private getBlockBounds(block: Block) {
		// ブロックのサイズを取得（設定されていない場合はデフォルト値を使用）
		const width = block.size?.width || this.config.defaultBlockWidth;
		const height = block.size?.height || this.config.defaultBlockHeight;

		return {
			left: block.position.x,
			top: block.position.y,
			right: block.position.x + width,
			bottom: block.position.y + height,
			width,
			height
		};
	}

	/**
	 * ブロックが可視範囲内にあるかチェック
	 *
	 * @param block - ブロック
	 * @param visibleBounds - 可視範囲
	 * @returns 可視範囲内にある場合はtrue
	 * @private
	 */
	private isBlockVisible(block: Block, visibleBounds: any): boolean {
		const blockBounds = this.getBlockBounds(block);

		// 境界の重なりをチェック
		return !(
			blockBounds.right < visibleBounds.left ||
			blockBounds.left > visibleBounds.right ||
			blockBounds.bottom < visibleBounds.top ||
			blockBounds.top > visibleBounds.bottom
		);
	}

	/**
	 * 2つの矩形の交差面積を計算
	 *
	 * @param rect1 - 矩形1
	 * @param rect2 - 矩形2
	 * @returns 交差情報
	 * @private
	 */
	private calculateIntersection(rect1: any, rect2: any) {
		const left = Math.max(rect1.left, rect2.left);
		const top = Math.max(rect1.top, rect2.top);
		const right = Math.min(rect1.right, rect2.right);
		const bottom = Math.min(rect1.bottom, rect2.bottom);

		const width = Math.max(0, right - left);
		const height = Math.max(0, bottom - top);
		const area = width * height;

		return {
			left,
			top,
			right,
			bottom,
			width,
			height,
			area
		};
	}

	/**
	 * パフォーマンス統計を更新
	 *
	 * @param totalBlocks - 総ブロック数
	 * @param visibleBlocks - 表示中のブロック数
	 * @param calculationTime - 計算時間
	 * @private
	 */
	private updatePerformanceStats(
		totalBlocks: number,
		visibleBlocks: number,
		calculationTime: number
	): void {
		const culledBlocks = totalBlocks - visibleBlocks;
		const cullingEfficiency = totalBlocks > 0 ? culledBlocks / totalBlocks : 0;

		this.performanceStats = {
			totalBlocks,
			visibleBlocks,
			culledBlocks,
			lastCalculationTime: calculationTime,
			cullingEfficiency
		};
	}

	/**
	 * パフォーマンス統計を取得
	 *
	 * @returns 現在のパフォーマンス統計
	 */
	getPerformanceStats(): PerformanceStats {
		return { ...this.performanceStats };
	}

	/**
	 * 設定を更新
	 *
	 * @param newConfig - 新しい設定
	 */
	updateConfig(newConfig: Partial<VirtualScrollConfig>): void {
		this.config = { ...this.config, ...newConfig };
	}

	/**
	 * 現在の設定を取得
	 *
	 * @returns 現在の設定
	 */
	getConfig(): VirtualScrollConfig {
		return { ...this.config };
	}

	/**
	 * パフォーマンス統計をリセット
	 */
	resetPerformanceStats(): void {
		this.performanceStats = {
			totalBlocks: 0,
			visibleBlocks: 0,
			culledBlocks: 0,
			lastCalculationTime: 0,
			cullingEfficiency: 0
		};
	}

	/**
	 * ブロックの優先度を計算（将来の拡張用）
	 *
	 * @param block - ブロック
	 * @param viewport - ビューポート
	 * @returns 優先度（0-1の範囲、1が最高優先度）
	 */
	calculateBlockPriority(block: Block, viewport: Viewport): number {
		const blockBounds = this.getBlockBounds(block);
		const blockCenter = {
			x: blockBounds.left + blockBounds.width / 2,
			y: blockBounds.top + blockBounds.height / 2
		};

		// ビューポートの中心からの距離を計算
		const viewportCenter = {
			x: -viewport.x / viewport.zoom,
			y: -viewport.y / viewport.zoom
		};

		const distance = Math.sqrt(
			Math.pow(blockCenter.x - viewportCenter.x, 2) + Math.pow(blockCenter.y - viewportCenter.y, 2)
		);

		// 距離が近いほど優先度が高い（0-1の範囲に正規化）
		const maxDistance = 1000; // 最大距離の仮定値
		return Math.max(0, 1 - distance / maxDistance);
	}
}
