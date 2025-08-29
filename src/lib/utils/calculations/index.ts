/**
 * Mathematical operations and calculations
 * Pure functions for position calculations and geometric operations
 */

import type { Position, Size, Block } from '../../types/domain';
import type { Viewport } from '../../types/ui';
import {
	memoizeScreenToCanvasTransform,
	memoizeCanvasToScreenTransform,
	memoizeViewportTransform,
	memoizeBoundingBoxCalculation,
	memoizeVisibilityCalculation,
	memoizeGridCalculation,
	memoizeSnapCalculation,
	memoizeDistanceCalculation,
	memoizeCollisionDetection
} from './memoization';

// Re-export memoization utilities
export * from './memoization';
export * from './connectionPaths';
export * from './blockSizes';

// ===== 基本的な数学操作 =====

/**
 * 2点間の距離を計算
 * @param point1 - 最初の点
 * @param point2 - 2番目の点
 * @returns 2点間の距離
 */
export function calculateDistance(point1: Position, point2: Position): number {
	const dx = point2.x - point1.x;
	const dy = point2.y - point1.y;
	return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 2つの位置の中点を計算
 * @param point1 - 最初の点
 * @param point2 - 2番目の点
 * @returns 中点の位置
 */
export function calculateMidpoint(point1: Position, point2: Position): Position {
	return {
		x: (point1.x + point2.x) / 2,
		y: (point1.y + point2.y) / 2
	};
}

/**
 * 値を最小値と最大値の間にクランプ
 * @param value - クランプする値
 * @param min - 最小値
 * @param max - 最大値
 * @returns クランプされた値
 */
export function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

/**
 * 2つの値の間で線形補間
 * @param start - 開始値
 * @param end - 終了値
 * @param factor - 補間係数（0-1）
 * @returns 補間された値
 */
export function lerp(start: number, end: number, factor: number): number {
	return start + (end - start) * factor;
}

/**
 * 角度をラジアンから度に変換
 * @param radians - ラジアン値
 * @returns 度数値
 */
export function radiansToDegrees(radians: number): number {
	return radians * (180 / Math.PI);
}

/**
 * 角度を度からラジアンに変換
 * @param degrees - 度数値
 * @returns ラジアン値
 */
export function degreesToRadians(degrees: number): number {
	return degrees * (Math.PI / 180);
}

// ===== 位置計算 =====

/**
 * マウスイベントから要素内での相対位置を計算
 * @param event - マウスイベント
 * @param element - 対象要素
 * @returns 要素内での相対位置
 */
export function calculateRelativePosition(event: MouseEvent, element: HTMLElement): Position {
	const rect = element.getBoundingClientRect();
	return {
		x: event.clientX - rect.left,
		y: event.clientY - rect.top
	};
}

/**
 * ビューポートを考慮したキャンバス座標を計算
 * @param screenPosition - スクリーン座標
 * @param viewport - ビューポート情報
 * @param offset - オフセット（オプション）
 * @returns キャンバス座標
 */
export function screenToCanvasPosition(
	screenPosition: Position,
	viewport: Viewport,
	offset: Position = { x: 0, y: 0 }
): Position {
	return {
		x: (screenPosition.x - viewport.x) / viewport.zoom - offset.x,
		y: (screenPosition.y - viewport.y) / viewport.zoom - offset.y
	};
}

/**
 * キャンバス座標をスクリーン座標に変換
 * @param canvasPosition - キャンバス座標
 * @param viewport - ビューポート情報
 * @returns スクリーン座標
 */
export function canvasToScreenPosition(canvasPosition: Position, viewport: Viewport): Position {
	return {
		x: canvasPosition.x * viewport.zoom + viewport.x,
		y: canvasPosition.y * viewport.zoom + viewport.y
	};
}

/**
 * ビューポートによる位置変換
 * @param position - 変換する位置
 * @param viewport - ビューポート情報
 * @returns 変換された位置
 */
export function transformPosition(
	position: Position,
	viewport: { x: number; y: number; zoom: number }
): Position {
	return {
		x: position.x * viewport.zoom + viewport.x,
		y: position.y * viewport.zoom + viewport.y
	};
}

/**
 * ビューポートによる逆位置変換
 * @param position - 変換する位置
 * @param viewport - ビューポート情報
 * @returns 逆変換された位置
 */
export function inverseTransformPosition(
	position: Position,
	viewport: { x: number; y: number; zoom: number }
): Position {
	return {
		x: (position.x - viewport.x) / viewport.zoom,
		y: (position.y - viewport.y) / viewport.zoom
	};
}

// ===== 幾何学的操作 =====

/**
 * 点が矩形内にあるかチェック
 * @param point - チェックする点
 * @param rect - 矩形（位置とサイズ）
 * @returns 点が矩形内にある場合true
 */
export function isPointInRect(point: Position, rect: Position & Size): boolean {
	return (
		point.x >= rect.x &&
		point.x <= rect.x + rect.width &&
		point.y >= rect.y &&
		point.y <= rect.y + rect.height
	);
}

/**
 * 2つの矩形が交差するかチェック
 * @param rect1 - 最初の矩形
 * @param rect2 - 2番目の矩形
 * @returns 矩形が交差する場合true
 */
export function doRectsIntersect(rect1: Position & Size, rect2: Position & Size): boolean {
	return !(
		rect1.x + rect1.width < rect2.x ||
		rect2.x + rect2.width < rect1.x ||
		rect1.y + rect1.height < rect2.y ||
		rect2.y + rect2.height < rect1.y
	);
}

/**
 * 点と矩形の最短距離を計算
 * @param point - 点
 * @param rect - 矩形
 * @returns 最短距離
 */
export function distancePointToRect(point: Position, rect: Position & Size): number {
	const dx = Math.max(rect.x - point.x, 0, point.x - (rect.x + rect.width));
	const dy = Math.max(rect.y - point.y, 0, point.y - (rect.y + rect.height));
	return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 円と矩形の衝突判定
 * @param center - 円の中心
 * @param radius - 円の半径
 * @param rect - 矩形
 * @returns 衝突している場合true
 */
export function circleRectCollision(
	center: Position,
	radius: number,
	rect: Position & Size
): boolean {
	return distancePointToRect(center, rect) <= radius;
}

// ===== グリッドとスナップ =====

/**
 * 値をグリッドにスナップ
 * @param value - スナップする値
 * @param gridSize - グリッドサイズ
 * @returns スナップされた値
 */
export function snapToGrid(value: number, gridSize: number): number {
	return Math.round(value / gridSize) * gridSize;
}

/**
 * 位置をグリッドにスナップ
 * @param position - スナップする位置
 * @param gridSize - グリッドサイズ
 * @returns スナップされた位置
 */
export function snapPositionToGrid(position: Position, gridSize: number): Position {
	return {
		x: snapToGrid(position.x, gridSize),
		y: snapToGrid(position.y, gridSize)
	};
}

// ===== バウンディングボックス計算 =====

/**
 * 複数の位置からバウンディングボックスを計算
 * @param positions - 位置の配列
 * @returns バウンディングボックス
 */
export function calculateBoundingBox(positions: Position[]): Position & Size {
	if (positions.length === 0) {
		return { x: 0, y: 0, width: 0, height: 0 };
	}

	let minX = positions[0].x;
	let minY = positions[0].y;
	let maxX = positions[0].x;
	let maxY = positions[0].y;

	for (const pos of positions) {
		minX = Math.min(minX, pos.x);
		minY = Math.min(minY, pos.y);
		maxX = Math.max(maxX, pos.x);
		maxY = Math.max(maxY, pos.y);
	}

	return {
		x: minX,
		y: minY,
		width: maxX - minX,
		height: maxY - minY
	};
}

/**
 * ブロックのバウンディングボックスを計算
 * @param blocks - ブロックの配列
 * @param margin - マージン（オプション）
 * @returns バウンディングボックス
 */
export function calculateBlocksBoundingBox(blocks: Block[], margin: number = 0): Position & Size {
	if (blocks.length === 0) {
		return { x: -margin, y: -margin, width: margin * 2, height: margin * 2 };
	}

	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;

	blocks.forEach((block) => {
		// ブロックの概算サイズ（実際のサイズが不明な場合）
		const blockWidth = 200;
		const blockHeight = 60;

		minX = Math.min(minX, block.position.x);
		minY = Math.min(minY, block.position.y);
		maxX = Math.max(maxX, block.position.x + blockWidth);
		maxY = Math.max(maxY, block.position.y + blockHeight);
	});

	return {
		x: minX - margin,
		y: minY - margin,
		width: maxX - minX + margin * 2,
		height: maxY - minY + margin * 2
	};
}

// ===== 衝突検出 =====

/**
 * 点と円の衝突判定
 * @param point - 点
 * @param center - 円の中心
 * @param radius - 円の半径
 * @returns 衝突している場合true
 */
export function pointCircleCollision(point: Position, center: Position, radius: number): boolean {
	return calculateDistance(point, center) <= radius;
}

/**
 * 2つの円の衝突判定
 * @param center1 - 最初の円の中心
 * @param radius1 - 最初の円の半径
 * @param center2 - 2番目の円の中心
 * @param radius2 - 2番目の円の半径
 * @returns 衝突している場合true
 */
export function circleCircleCollision(
	center1: Position,
	radius1: number,
	center2: Position,
	radius2: number
): boolean {
	return calculateDistance(center1, center2) <= radius1 + radius2;
}

/**
 * 線分と矩形の交差判定
 * @param lineStart - 線分の開始点
 * @param lineEnd - 線分の終了点
 * @param rect - 矩形
 * @returns 交差している場合true
 */
export function lineRectIntersection(
	lineStart: Position,
	lineEnd: Position,
	rect: Position & Size
): boolean {
	// 線分が矩形の内部を通るかチェック
	if (isPointInRect(lineStart, rect) || isPointInRect(lineEnd, rect)) {
		return true;
	}

	// 線分と矩形の各辺の交差をチェック
	const rectCorners = [
		{ x: rect.x, y: rect.y },
		{ x: rect.x + rect.width, y: rect.y },
		{ x: rect.x + rect.width, y: rect.y + rect.height },
		{ x: rect.x, y: rect.y + rect.height }
	];

	for (let i = 0; i < rectCorners.length; i++) {
		const corner1 = rectCorners[i];
		const corner2 = rectCorners[(i + 1) % rectCorners.length];

		if (lineLineIntersection(lineStart, lineEnd, corner1, corner2)) {
			return true;
		}
	}

	return false;
}

/**
 * 2つの線分の交差判定
 * @param line1Start - 最初の線分の開始点
 * @param line1End - 最初の線分の終了点
 * @param line2Start - 2番目の線分の開始点
 * @param line2End - 2番目の線分の終了点
 * @returns 交差している場合true
 */
export function lineLineIntersection(
	line1Start: Position,
	line1End: Position,
	line2Start: Position,
	line2End: Position
): boolean {
	const d1 = direction(line2Start, line2End, line1Start);
	const d2 = direction(line2Start, line2End, line1End);
	const d3 = direction(line1Start, line1End, line2Start);
	const d4 = direction(line1Start, line1End, line2End);

	if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
		return true;
	}

	if (d1 === 0 && onSegment(line2Start, line1Start, line2End)) return true;
	if (d2 === 0 && onSegment(line2Start, line1End, line2End)) return true;
	if (d3 === 0 && onSegment(line1Start, line2Start, line1End)) return true;
	if (d4 === 0 && onSegment(line1Start, line2End, line1End)) return true;

	return false;
}

/**
 * 3点の方向を計算（内部ヘルパー関数）
 */
function direction(a: Position, b: Position, c: Position): number {
	return (c.x - a.x) * (b.y - a.y) - (b.x - a.x) * (c.y - a.y);
}

/**
 * 点が線分上にあるかチェック（内部ヘルパー関数）
 */
function onSegment(a: Position, b: Position, c: Position): boolean {
	return (
		b.x <= Math.max(a.x, c.x) &&
		b.x >= Math.min(a.x, c.x) &&
		b.y <= Math.max(a.y, c.y) &&
		b.y >= Math.min(a.y, c.y)
	);
}

// ===== 空間計算 =====

/**
 * 可視領域内のブロックを計算
 * @param blocks - 全ブロック
 * @param viewport - ビューポート
 * @param containerSize - コンテナサイズ
 * @param blockSize - ブロックサイズ（オプション）
 * @returns 可視ブロックの配列
 */
export function calculateVisibleBlocks(
	blocks: Block[],
	viewport: Viewport,
	containerSize: Size,
	blockSize: Size = { width: 200, height: 60 }
): Block[] {
	// 可視領域を計算
	const visibleArea = {
		x: -viewport.x / viewport.zoom,
		y: -viewport.y / viewport.zoom,
		width: containerSize.width / viewport.zoom,
		height: containerSize.height / viewport.zoom
	};

	// マージンを追加（画面外のブロックも少し含める）
	const margin = Math.max(blockSize.width, blockSize.height);
	const expandedArea = {
		x: visibleArea.x - margin,
		y: visibleArea.y - margin,
		width: visibleArea.width + margin * 2,
		height: visibleArea.height + margin * 2
	};

	return blocks.filter((block) => {
		const blockRect = {
			x: block.position.x,
			y: block.position.y,
			width: blockSize.width,
			height: blockSize.height
		};

		return doRectsIntersect(blockRect, expandedArea);
	});
}

/**
 * ズームレベルに基づいてグリッドサイズを計算
 * @param baseGridSize - 基本グリッドサイズ
 * @param zoom - ズームレベル
 * @returns 調整されたグリッドサイズ
 */
export function calculateAdaptiveGridSize(baseGridSize: number, zoom: number): number {
	if (zoom < 0.5) {
		return baseGridSize * 4;
	} else if (zoom < 1) {
		return baseGridSize * 2;
	} else if (zoom > 2) {
		return baseGridSize / 2;
	}
	return baseGridSize;
}

/**
 * スクロールバーの位置とサイズを計算
 * @param contentSize - コンテンツサイズ
 * @param containerSize - コンテナサイズ
 * @param scrollPosition - スクロール位置
 * @returns スクロールバーの情報
 */
export function calculateScrollbarMetrics(
	contentSize: number,
	containerSize: number,
	scrollPosition: number
): {
	thumbSize: number;
	thumbPosition: number;
	visible: boolean;
} {
	const ratio = containerSize / contentSize;
	const thumbSize = Math.max(20, containerSize * ratio);
	const maxScrollPosition = contentSize - containerSize;
	const scrollRatio = maxScrollPosition > 0 ? scrollPosition / maxScrollPosition : 0;
	const maxThumbPosition = containerSize - thumbSize;
	const thumbPosition = Math.max(0, Math.min(maxThumbPosition, scrollRatio * maxThumbPosition));

	return {
		thumbSize,
		thumbPosition,
		visible: ratio < 1
	};
}

// ===== メモ化された高コスト計算 =====

/**
 * メモ化されたスクリーン座標からキャンバス座標への変換
 * 頻繁に呼び出される座標変換をキャッシュして性能を向上
 */
export const memoizedScreenToCanvasPosition =
	memoizeScreenToCanvasTransform(screenToCanvasPosition);

/**
 * メモ化されたキャンバス座標からスクリーン座標への変換
 * 頻繁に呼び出される座標変換をキャッシュして性能を向上
 */
export const memoizedCanvasToScreenPosition =
	memoizeCanvasToScreenTransform(canvasToScreenPosition);

/**
 * メモ化されたビューポート位置変換
 * ドラッグ操作中の頻繁な位置変換をキャッシュ
 */
export const memoizedTransformPosition = memoizeViewportTransform(transformPosition);

/**
 * メモ化されたビューポート逆位置変換
 * ドラッグ操作中の頻繁な逆変換をキャッシュ
 */
export const memoizedInverseTransformPosition = memoizeViewportTransform(inverseTransformPosition);

/**
 * メモ化されたブロックバウンディングボックス計算
 * 複数ブロックの境界計算をキャッシュして性能を向上
 */
export const memoizedCalculateBlocksBoundingBox = memoizeBoundingBoxCalculation(
	calculateBlocksBoundingBox
);

/**
 * メモ化された可視ブロック計算
 * ビューポート変更時の可視性計算をキャッシュ
 */
export const memoizedCalculateVisibleBlocks = memoizeVisibilityCalculation(calculateVisibleBlocks);

/**
 * メモ化されたアダプティブグリッドサイズ計算
 * ズームレベル変更時のグリッドサイズ計算をキャッシュ
 */
export const memoizedCalculateAdaptiveGridSize = memoizeGridCalculation(calculateAdaptiveGridSize);

/**
 * メモ化されたグリッドスナップ位置計算
 * ドラッグ操作中のスナップ計算をキャッシュ
 */
export const memoizedSnapPositionToGrid = memoizeSnapCalculation(snapPositionToGrid);

/**
 * メモ化された距離計算
 * 頻繁な距離計算をキャッシュして性能を向上
 */
export const memoizedCalculateDistance = memoizeDistanceCalculation(calculateDistance);

/**
 * メモ化された矩形交差判定
 * 衝突検出の計算をキャッシュして性能を向上
 */
export const memoizedDoRectsIntersect = memoizeCollisionDetection(doRectsIntersect);
