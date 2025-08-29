/**
 * Unit tests for calculation utilities
 * Tests for mathematical operations, position calculations, and geometric operations
 */

import { describe, it, expect } from 'vitest';
import {
	// 基本的な数学操作
	calculateDistance,
	calculateMidpoint,
	clamp,
	lerp,
	radiansToDegrees,
	degreesToRadians,

	// 位置計算
	calculateRelativePosition,
	screenToCanvasPosition,
	canvasToScreenPosition,
	transformPosition,
	inverseTransformPosition,

	// 幾何学的操作
	isPointInRect,
	doRectsIntersect,
	distancePointToRect,
	circleRectCollision,

	// グリッドとスナップ
	snapToGrid,
	snapPositionToGrid,

	// バウンディングボックス計算
	calculateBoundingBox,
	calculateBlocksBoundingBox,

	// 衝突検出
	pointCircleCollision,
	circleCircleCollision,
	lineRectIntersection,
	lineLineIntersection,

	// 空間計算
	calculateVisibleBlocks,
	calculateAdaptiveGridSize,
	calculateScrollbarMetrics
} from './index';

import type { Position, Size, Block } from '../../types/domain';
import type { Viewport } from '../../types/ui';
import { BlockPathType, Connection } from '../../types/core';

describe('基本的な数学操作', () => {
	describe('calculateDistance', () => {
		it('2点間の距離を正しく計算する', () => {
			const point1: Position = { x: 0, y: 0 };
			const point2: Position = { x: 3, y: 4 };
			expect(calculateDistance(point1, point2)).toBe(5);
		});

		it('同じ点の距離は0', () => {
			const point: Position = { x: 10, y: 20 };
			expect(calculateDistance(point, point)).toBe(0);
		});

		it('負の座標でも正しく計算する', () => {
			const point1: Position = { x: -1, y: -1 };
			const point2: Position = { x: 2, y: 3 };
			expect(calculateDistance(point1, point2)).toBe(5);
		});
	});

	describe('calculateMidpoint', () => {
		it('2点の中点を正しく計算する', () => {
			const point1: Position = { x: 0, y: 0 };
			const point2: Position = { x: 10, y: 20 };
			const midpoint = calculateMidpoint(point1, point2);
			expect(midpoint).toEqual({ x: 5, y: 10 });
		});

		it('負の座標でも正しく計算する', () => {
			const point1: Position = { x: -5, y: -10 };
			const point2: Position = { x: 5, y: 10 };
			const midpoint = calculateMidpoint(point1, point2);
			expect(midpoint).toEqual({ x: 0, y: 0 });
		});
	});

	describe('clamp', () => {
		it('値を範囲内にクランプする', () => {
			expect(clamp(5, 0, 10)).toBe(5);
			expect(clamp(-5, 0, 10)).toBe(0);
			expect(clamp(15, 0, 10)).toBe(10);
		});

		it('境界値を正しく処理する', () => {
			expect(clamp(0, 0, 10)).toBe(0);
			expect(clamp(10, 0, 10)).toBe(10);
		});
	});

	describe('lerp', () => {
		it('線形補間を正しく計算する', () => {
			expect(lerp(0, 10, 0.5)).toBe(5);
			expect(lerp(0, 10, 0)).toBe(0);
			expect(lerp(0, 10, 1)).toBe(10);
		});

		it('負の値でも正しく補間する', () => {
			expect(lerp(-10, 10, 0.5)).toBe(0);
			expect(lerp(-5, 5, 0.25)).toBe(-2.5);
		});
	});

	describe('角度変換', () => {
		it('ラジアンから度に変換する', () => {
			expect(radiansToDegrees(Math.PI)).toBe(180);
			expect(radiansToDegrees(Math.PI / 2)).toBe(90);
			expect(radiansToDegrees(0)).toBe(0);
		});

		it('度からラジアンに変換する', () => {
			expect(degreesToRadians(180)).toBe(Math.PI);
			expect(degreesToRadians(90)).toBe(Math.PI / 2);
			expect(degreesToRadians(0)).toBe(0);
		});
	});
});

describe('位置計算', () => {
	describe('screenToCanvasPosition', () => {
		it('スクリーン座標をキャンバス座標に変換する', () => {
			const screenPos: Position = { x: 100, y: 100 };
			const viewport: Viewport = { x: 50, y: 50, zoom: 1 };
			const result = screenToCanvasPosition(screenPos, viewport);
			expect(result).toEqual({ x: 50, y: 50 });
		});

		it('ズームを考慮して変換する', () => {
			const screenPos: Position = { x: 100, y: 100 };
			const viewport: Viewport = { x: 0, y: 0, zoom: 2 };
			const result = screenToCanvasPosition(screenPos, viewport);
			expect(result).toEqual({ x: 50, y: 50 });
		});

		it('オフセットを考慮して変換する', () => {
			const screenPos: Position = { x: 100, y: 100 };
			const viewport: Viewport = { x: 0, y: 0, zoom: 1 };
			const offset: Position = { x: 10, y: 10 };
			const result = screenToCanvasPosition(screenPos, viewport, offset);
			expect(result).toEqual({ x: 90, y: 90 });
		});
	});

	describe('canvasToScreenPosition', () => {
		it('キャンバス座標をスクリーン座標に変換する', () => {
			const canvasPos: Position = { x: 50, y: 50 };
			const viewport: Viewport = { x: 50, y: 50, zoom: 1 };
			const result = canvasToScreenPosition(canvasPos, viewport);
			expect(result).toEqual({ x: 100, y: 100 });
		});

		it('ズームを考慮して変換する', () => {
			const canvasPos: Position = { x: 50, y: 50 };
			const viewport: Viewport = { x: 0, y: 0, zoom: 2 };
			const result = canvasToScreenPosition(canvasPos, viewport);
			expect(result).toEqual({ x: 100, y: 100 });
		});
	});

	describe('transformPosition と inverseTransformPosition', () => {
		it('変換と逆変換が一致する', () => {
			const originalPos: Position = { x: 100, y: 200 };
			const viewport = { x: 50, y: 100, zoom: 1.5 };

			const transformed = transformPosition(originalPos, viewport);
			const restored = inverseTransformPosition(transformed, viewport);

			expect(restored.x).toBeCloseTo(originalPos.x);
			expect(restored.y).toBeCloseTo(originalPos.y);
		});
	});
});

describe('幾何学的操作', () => {
	describe('isPointInRect', () => {
		const rect = { x: 10, y: 10, width: 20, height: 20 };

		it('矩形内の点を正しく判定する', () => {
			expect(isPointInRect({ x: 15, y: 15 }, rect)).toBe(true);
			expect(isPointInRect({ x: 10, y: 10 }, rect)).toBe(true);
			expect(isPointInRect({ x: 30, y: 30 }, rect)).toBe(true);
		});

		it('矩形外の点を正しく判定する', () => {
			expect(isPointInRect({ x: 5, y: 15 }, rect)).toBe(false);
			expect(isPointInRect({ x: 15, y: 5 }, rect)).toBe(false);
			expect(isPointInRect({ x: 35, y: 15 }, rect)).toBe(false);
			expect(isPointInRect({ x: 15, y: 35 }, rect)).toBe(false);
		});
	});

	describe('doRectsIntersect', () => {
		it('交差する矩形を正しく判定する', () => {
			const rect1 = { x: 0, y: 0, width: 20, height: 20 };
			const rect2 = { x: 10, y: 10, width: 20, height: 20 };
			expect(doRectsIntersect(rect1, rect2)).toBe(true);
		});

		it('交差しない矩形を正しく判定する', () => {
			const rect1 = { x: 0, y: 0, width: 10, height: 10 };
			const rect2 = { x: 20, y: 20, width: 10, height: 10 };
			expect(doRectsIntersect(rect1, rect2)).toBe(false);
		});

		it('隣接する矩形を正しく判定する', () => {
			const rect1 = { x: 0, y: 0, width: 10, height: 10 };
			const rect2 = { x: 11, y: 0, width: 10, height: 10 };
			expect(doRectsIntersect(rect1, rect2)).toBe(false);
		});
	});

	describe('distancePointToRect', () => {
		const rect = { x: 10, y: 10, width: 20, height: 20 };

		it('矩形内の点の距離は0', () => {
			expect(distancePointToRect({ x: 15, y: 15 }, rect)).toBe(0);
		});

		it('矩形外の点の距離を正しく計算する', () => {
			expect(distancePointToRect({ x: 5, y: 15 }, rect)).toBe(5);
			expect(distancePointToRect({ x: 35, y: 15 }, rect)).toBe(5);
			expect(distancePointToRect({ x: 15, y: 5 }, rect)).toBe(5);
			expect(distancePointToRect({ x: 15, y: 35 }, rect)).toBe(5);
		});
	});

	describe('circleRectCollision', () => {
		const rect = { x: 10, y: 10, width: 20, height: 20 };

		it('円と矩形の衝突を正しく判定する', () => {
			expect(circleRectCollision({ x: 20, y: 20 }, 5, rect)).toBe(true);
			expect(circleRectCollision({ x: 5, y: 20 }, 10, rect)).toBe(true);
			expect(circleRectCollision({ x: 0, y: 0 }, 5, rect)).toBe(false);
		});
	});
});

describe('グリッドとスナップ', () => {
	describe('snapToGrid', () => {
		it('値をグリッドにスナップする', () => {
			expect(snapToGrid(23, 10)).toBe(20);
			expect(snapToGrid(27, 10)).toBe(30);
			expect(snapToGrid(25, 10)).toBe(30);
		});

		it('負の値もスナップする', () => {
			expect(snapToGrid(-23, 10)).toBe(-20);
			expect(snapToGrid(-27, 10)).toBe(-30);
		});
	});

	describe('snapPositionToGrid', () => {
		it('位置をグリッドにスナップする', () => {
			const position: Position = { x: 23, y: 27 };
			const snapped = snapPositionToGrid(position, 10);
			expect(snapped).toEqual({ x: 20, y: 30 });
		});
	});
});

describe('バウンディングボックス計算', () => {
	describe('calculateBoundingBox', () => {
		it('複数の位置からバウンディングボックスを計算する', () => {
			const positions: Position[] = [
				{ x: 10, y: 20 },
				{ x: 30, y: 10 },
				{ x: 20, y: 40 }
			];
			const bbox = calculateBoundingBox(positions);
			expect(bbox).toEqual({ x: 10, y: 10, width: 20, height: 30 });
		});

		it('空の配列では空のバウンディングボックスを返す', () => {
			const bbox = calculateBoundingBox([]);
			expect(bbox).toEqual({ x: 0, y: 0, width: 0, height: 0 });
		});

		it('単一の位置では幅と高さが0のバウンディングボックスを返す', () => {
			const positions: Position[] = [{ x: 10, y: 20 }];
			const bbox = calculateBoundingBox(positions);
			expect(bbox).toEqual({ x: 10, y: 20, width: 0, height: 0 });
		});
	});

	describe('calculateBlocksBoundingBox', () => {
		const createMockBlock = (id: string, x: number, y: number): Block => ({
			id,
			name: `block-${id}`,
			title: `Block ${id}`,
			type: BlockPathType.Move,
			position: { x, y },
			zIndex: 1,
			visibility: true,
			connection: Connection.Both,
			draggable: true,
			editable: true,
			deletable: true,
			output: 'output',
			content: []
		});

		it('ブロックのバウンディングボックスを計算する', () => {
			const blocks: Block[] = [createMockBlock('1', 0, 0), createMockBlock('2', 100, 50)];
			const bbox = calculateBlocksBoundingBox(blocks, 10);
			expect(bbox.x).toBe(-10);
			expect(bbox.y).toBe(-10);
			expect(bbox.width).toBe(320); // 100 + 200 + 20 (margin)
			expect(bbox.height).toBe(130); // 50 + 60 + 20 (margin)
		});

		it('空のブロック配列ではマージンのみのバウンディングボックスを返す', () => {
			const bbox = calculateBlocksBoundingBox([], 50);
			expect(bbox).toEqual({ x: -50, y: -50, width: 100, height: 100 });
		});
	});
});

describe('衝突検出', () => {
	describe('pointCircleCollision', () => {
		it('点と円の衝突を正しく判定する', () => {
			const center: Position = { x: 0, y: 0 };
			expect(pointCircleCollision({ x: 3, y: 4 }, center, 5)).toBe(true);
			expect(pointCircleCollision({ x: 3, y: 4 }, center, 4)).toBe(false);
			expect(pointCircleCollision({ x: 0, y: 0 }, center, 1)).toBe(true);
		});
	});

	describe('circleCircleCollision', () => {
		it('2つの円の衝突を正しく判定する', () => {
			const center1: Position = { x: 0, y: 0 };
			const center2: Position = { x: 5, y: 0 };
			expect(circleCircleCollision(center1, 3, center2, 3)).toBe(true);
			expect(circleCircleCollision(center1, 2, center2, 2)).toBe(false);
			expect(circleCircleCollision(center1, 2.5, center2, 2.5)).toBe(true);
		});
	});

	describe('lineLineIntersection', () => {
		it('交差する線分を正しく判定する', () => {
			const line1Start: Position = { x: 0, y: 0 };
			const line1End: Position = { x: 10, y: 10 };
			const line2Start: Position = { x: 0, y: 10 };
			const line2End: Position = { x: 10, y: 0 };
			expect(lineLineIntersection(line1Start, line1End, line2Start, line2End)).toBe(true);
		});

		it('交差しない線分を正しく判定する', () => {
			const line1Start: Position = { x: 0, y: 0 };
			const line1End: Position = { x: 5, y: 5 };
			const line2Start: Position = { x: 10, y: 0 };
			const line2End: Position = { x: 15, y: 5 };
			expect(lineLineIntersection(line1Start, line1End, line2Start, line2End)).toBe(false);
		});
	});
});

describe('空間計算', () => {
	describe('calculateVisibleBlocks', () => {
		const createMockBlock = (id: string, x: number, y: number): Block => ({
			id,
			name: `block-${id}`,
			title: `Block ${id}`,
			type: BlockPathType.Move,
			position: { x, y },
			zIndex: 1,
			visibility: true,
			connection: Connection.Both,
			draggable: true,
			editable: true,
			deletable: true,
			output: 'output',
			content: []
		});

		it('可視領域内のブロックを正しく計算する', () => {
			const blocks: Block[] = [
				createMockBlock('1', 0, 0),
				createMockBlock('2', 500, 500),
				createMockBlock('3', 1000, 1000)
			];
			const viewport: Viewport = { x: 0, y: 0, zoom: 1 };
			const containerSize: Size = { width: 800, height: 600 };

			const visibleBlocks = calculateVisibleBlocks(blocks, viewport, containerSize);
			expect(visibleBlocks.length).toBeGreaterThan(0);
			expect(visibleBlocks.some((b) => b.id === '1')).toBe(true);
		});
	});

	describe('calculateAdaptiveGridSize', () => {
		it('ズームレベルに応じてグリッドサイズを調整する', () => {
			expect(calculateAdaptiveGridSize(20, 0.25)).toBe(80); // zoom < 0.5
			expect(calculateAdaptiveGridSize(20, 0.75)).toBe(40); // zoom < 1
			expect(calculateAdaptiveGridSize(20, 1.5)).toBe(20); // 1 <= zoom <= 2
			expect(calculateAdaptiveGridSize(20, 3)).toBe(10); // zoom > 2
		});
	});

	describe('calculateScrollbarMetrics', () => {
		it('スクロールバーのメトリクスを正しく計算する', () => {
			const metrics = calculateScrollbarMetrics(1000, 500, 250);
			expect(metrics.visible).toBe(true);
			expect(metrics.thumbSize).toBeGreaterThanOrEqual(20);
			expect(metrics.thumbPosition).toBeGreaterThanOrEqual(0);
		});

		it('コンテンツがコンテナより小さい場合は非表示', () => {
			const metrics = calculateScrollbarMetrics(400, 500, 0);
			expect(metrics.visible).toBe(false);
		});

		it('最小サムサイズを保持する', () => {
			const metrics = calculateScrollbarMetrics(10000, 100, 0);
			expect(metrics.thumbSize).toBe(20);
		});
	});
});

describe('エラーケース', () => {
	it('NaNや無限大の値を適切に処理する', () => {
		expect(calculateDistance({ x: NaN, y: 0 }, { x: 0, y: 0 })).toBeNaN();
		expect(clamp(Infinity, 0, 10)).toBe(10);
		expect(clamp(-Infinity, 0, 10)).toBe(0);
	});

	it('ゼロ除算を適切に処理する', () => {
		const viewport = { x: 0, y: 0, zoom: 0 };
		expect(() => inverseTransformPosition({ x: 100, y: 100 }, viewport)).not.toThrow();
	});
});
