/**
 * Memoization utilities for expensive calculations
 * Provides specialized caching for coordinate transformations, block size calculations, and connection paths
 */

import type { Position, Size, Block, Viewport } from '../../types';
import { memoize, weakMemoize } from '../helpers';

// ===== ブロックサイズ計算のメモ化 =====

/**
 * ブロックサイズ計算のキャッシュキー生成
 * @param block - ブロック
 * @param context - 計算コンテキスト（ズームレベルなど）
 * @returns キャッシュキー
 */
function createBlockSizeKey(
	block: Block,
	context: { zoom: number; containerWidth?: number }
): string {
	return `${block.id}-${block.type}-${context.zoom.toFixed(3)}-${context.containerWidth || 0}`;
}

/**
 * ブロックサイズ計算をメモ化
 * @param calculateFn - サイズ計算関数
 * @returns メモ化されたサイズ計算関数
 */
export function memoizeBlockSizeCalculation<T extends Block>(
	calculateFn: (block: T, context: { zoom: number; containerWidth?: number }) => Size
) {
	return memoize(calculateFn, createBlockSizeKey);
}

/**
 * 複数ブロックのバウンディングボックス計算をメモ化
 * @param calculateFn - バウンディングボックス計算関数
 * @returns メモ化された計算関数
 */
export function memoizeBoundingBoxCalculation(
	calculateFn: (blocks: Block[], margin?: number) => Position & Size
) {
	return memoize(calculateFn, (blocks: Block[], margin = 0) => {
		const blockIds = blocks
			.map((b) => b.id)
			.sort()
			.join(',');
		const positions = blocks.map((b) => `${b.position.x},${b.position.y}`).join('|');
		return `bbox-${blockIds}-${positions}-${margin}`;
	});
}

// ===== 座標変換のメモ化 =====

/**
 * 座標変換のキャッシュキー生成
 * @param position - 位置
 * @param viewport - ビューポート
 * @returns キャッシュキー
 */
function createCoordinateTransformKey(position: Position, viewport: Viewport): string {
	return `${position.x.toFixed(2)},${position.y.toFixed(2)}-${viewport.x.toFixed(2)},${viewport.y.toFixed(2)}-${viewport.zoom.toFixed(3)}`;
}

/**
 * スクリーン座標からキャンバス座標への変換をメモ化
 * @param transformFn - 変換関数
 * @returns メモ化された変換関数
 */
export function memoizeScreenToCanvasTransform(
	transformFn: (screenPos: Position, viewport: Viewport) => Position
) {
	return memoize(transformFn, createCoordinateTransformKey);
}

/**
 * キャンバス座標からスクリーン座標への変換をメモ化
 * @param transformFn - 変換関数
 * @returns メモ化された変換関数
 */
export function memoizeCanvasToScreenTransform(
	transformFn: (canvasPos: Position, viewport: Viewport) => Position
) {
	return memoize(transformFn, createCoordinateTransformKey);
}

/**
 * ビューポート変換をメモ化
 * @param transformFn - 変換関数
 * @returns メモ化された変換関数
 */
export function memoizeViewportTransform(
	transformFn: (position: Position, viewport: { x: number; y: number; zoom: number }) => Position
) {
	return memoize(
		transformFn,
		(position: Position, viewport: { x: number; y: number; zoom: number }) => {
			return `${position.x.toFixed(2)},${position.y.toFixed(2)}-${viewport.x.toFixed(2)},${viewport.y.toFixed(2)}-${viewport.zoom.toFixed(3)}`;
		}
	);
}

// ===== 接続パス計算のメモ化 =====

/**
 * 接続パス計算のキャッシュキー生成
 * @param startPos - 開始位置
 * @param endPos - 終了位置
 * @param options - オプション
 * @returns キャッシュキー
 */
function createConnectionPathKey(
	startPos: Position,
	endPos: Position,
	options: {
		curveType?: 'bezier' | 'straight' | 'step' | 'rounded';
		offset?: number;
		stepRatio?: number;
		radius?: number;
	} = {}
): string {
	const { curveType = 'bezier', offset = 0, stepRatio = 0.5, radius = 10 } = options;
	return `path-${startPos.x.toFixed(2)},${startPos.y.toFixed(2)}-${endPos.x.toFixed(2)},${endPos.y.toFixed(2)}-${curveType}-${offset}-${stepRatio}-${radius}`;
}

/**
 * 接続パス計算をメモ化
 * @param pathFn - パス計算関数
 * @returns メモ化されたパス計算関数
 */
export function memoizeConnectionPath(
	pathFn: (
		startPos: Position,
		endPos: Position,
		options?: {
			curveType?: 'bezier' | 'straight' | 'step' | 'rounded';
			offset?: number;
			stepRatio?: number;
			radius?: number;
		}
	) => string
) {
	return memoize(pathFn, createConnectionPathKey);
}

/**
 * ベジェ曲線パス計算をメモ化
 * @param bezierFn - ベジェ曲線計算関数
 * @returns メモ化されたベジェ曲線計算関数
 */
export function memoizeBezierPath(
	bezierFn: (start: Position, end: Position, controlOffset?: number) => string
) {
	return memoize(bezierFn, (start: Position, end: Position, controlOffset = 50) => {
		return `bezier-${start.x.toFixed(2)},${start.y.toFixed(2)}-${end.x.toFixed(2)},${end.y.toFixed(2)}-${controlOffset}`;
	});
}

/**
 * 接続ポイント位置計算をメモ化
 * @param positionFn - 位置計算関数
 * @returns メモ化された位置計算関数
 */
export function memoizeConnectionPointPosition(
	positionFn: (blockElement: HTMLElement, connectionType: 'input' | 'output') => Position | null
) {
	// HTMLElementをキーとして使用するためWeakMapベースのメモ化を使用
	return weakMemoize((key: { element: HTMLElement; type: 'input' | 'output' }) => {
		return positionFn(key.element, key.type);
	});
}

// ===== 可視性計算のメモ化 =====

/**
 * 可視ブロック計算のキャッシュキー生成
 * @param viewport - ビューポート
 * @param containerSize - コンテナサイズ
 * @param blockCount - ブロック数
 * @returns キャッシュキー
 */
function createVisibilityKey(viewport: Viewport, containerSize: Size, blockCount: number): string {
	return `visibility-${viewport.x.toFixed(2)},${viewport.y.toFixed(2)}-${viewport.zoom.toFixed(3)}-${containerSize.width}x${containerSize.height}-${blockCount}`;
}

/**
 * 可視ブロック計算をメモ化
 * @param visibilityFn - 可視性計算関数
 * @returns メモ化された可視性計算関数
 */
export function memoizeVisibilityCalculation(
	visibilityFn: (blocks: Block[], viewport: Viewport, containerSize: Size) => Block[]
) {
	return memoize(visibilityFn, (blocks: Block[], viewport: Viewport, containerSize: Size) => {
		return createVisibilityKey(viewport, containerSize, blocks.length);
	});
}

// ===== グリッド計算のメモ化 =====

/**
 * グリッドサイズ計算をメモ化
 * @param gridFn - グリッドサイズ計算関数
 * @returns メモ化されたグリッドサイズ計算関数
 */
export function memoizeGridCalculation(gridFn: (baseSize: number, zoom: number) => number) {
	return memoize(gridFn, (baseSize: number, zoom: number) => {
		return `grid-${baseSize}-${zoom.toFixed(3)}`;
	});
}

/**
 * スナップ位置計算をメモ化
 * @param snapFn - スナップ計算関数
 * @returns メモ化されたスナップ計算関数
 */
export function memoizeSnapCalculation(snapFn: (position: Position, gridSize: number) => Position) {
	return memoize(snapFn, (position: Position, gridSize: number) => {
		return `snap-${position.x.toFixed(2)},${position.y.toFixed(2)}-${gridSize}`;
	});
}

// ===== 衝突検出のメモ化 =====

/**
 * 衝突検出計算をメモ化
 * @param collisionFn - 衝突検出関数
 * @returns メモ化された衝突検出関数
 */
export function memoizeCollisionDetection(
	collisionFn: (rect1: Position & Size, rect2: Position & Size) => boolean
) {
	return memoize(collisionFn, (rect1: Position & Size, rect2: Position & Size) => {
		return `collision-${rect1.x},${rect1.y},${rect1.width},${rect1.height}-${rect2.x},${rect2.y},${rect2.width},${rect2.height}`;
	});
}

/**
 * 距離計算をメモ化
 * @param distanceFn - 距離計算関数
 * @returns メモ化された距離計算関数
 */
export function memoizeDistanceCalculation(
	distanceFn: (point1: Position, point2: Position) => number
) {
	return memoize(distanceFn, (point1: Position, point2: Position) => {
		return `distance-${point1.x.toFixed(2)},${point1.y.toFixed(2)}-${point2.x.toFixed(2)},${point2.y.toFixed(2)}`;
	});
}

// ===== キャッシュ管理 =====

/**
 * メモ化キャッシュのクリア用インターフェース
 */
export interface MemoizedFunction<T extends (...args: any[]) => any> {
	(...args: Parameters<T>): ReturnType<T>;
	clearCache?: () => void;
}

/**
 * キャッシュサイズ制限付きメモ化
 * @param fn - メモ化する関数
 * @param maxCacheSize - 最大キャッシュサイズ
 * @param keyFn - キー生成関数
 * @returns メモ化された関数
 */
export function memoizeWithLimit<TArgs extends any[], TReturn>(
	fn: (...args: TArgs) => TReturn,
	maxCacheSize: number = 1000,
	keyFn?: (...args: TArgs) => string
): MemoizedFunction<(...args: TArgs) => TReturn> {
	const cache = new Map<string, { value: TReturn; timestamp: number }>();

	const memoizedFn = (...args: TArgs): TReturn => {
		const key = keyFn ? keyFn(...args) : JSON.stringify(args);

		if (cache.has(key)) {
			const cached = cache.get(key)!;
			// LRU: アクセス時にタイムスタンプを更新
			cached.timestamp = Date.now();
			return cached.value;
		}

		// キャッシュサイズ制限チェック
		if (cache.size >= maxCacheSize) {
			// 最も古いエントリを削除
			let oldestKey = '';
			let oldestTime = Infinity;

			for (const [k, v] of cache.entries()) {
				if (v.timestamp < oldestTime) {
					oldestTime = v.timestamp;
					oldestKey = k;
				}
			}

			if (oldestKey) {
				cache.delete(oldestKey);
			}
		}

		const result = fn(...args);
		cache.set(key, { value: result, timestamp: Date.now() });
		return result;
	};

	// キャッシュクリア機能を追加
	memoizedFn.clearCache = () => {
		cache.clear();
	};

	return memoizedFn;
}

/**
 * TTL（Time To Live）付きメモ化
 * @param fn - メモ化する関数
 * @param ttlMs - キャッシュの有効期限（ミリ秒）
 * @param keyFn - キー生成関数
 * @returns メモ化された関数
 */
export function memoizeWithTTL<TArgs extends any[], TReturn>(
	fn: (...args: TArgs) => TReturn,
	ttlMs: number = 60000, // デフォルト1分
	keyFn?: (...args: TArgs) => string
): MemoizedFunction<(...args: TArgs) => TReturn> {
	const cache = new Map<string, { value: TReturn; expiry: number }>();

	const memoizedFn = (...args: TArgs): TReturn => {
		const key = keyFn ? keyFn(...args) : JSON.stringify(args);
		const now = Date.now();

		if (cache.has(key)) {
			const cached = cache.get(key)!;
			if (now < cached.expiry) {
				return cached.value;
			} else {
				cache.delete(key);
			}
		}

		const result = fn(...args);
		cache.set(key, { value: result, expiry: now + ttlMs });
		return result;
	};

	// キャッシュクリア機能を追加
	memoizedFn.clearCache = () => {
		cache.clear();
	};

	return memoizedFn;
}
