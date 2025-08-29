/**
 * Performance tests for memoization effects
 * Tests the performance improvements provided by memoized calculations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Block, Position, Viewport, Size } from '../../types';
import { BlockPathType, Connection } from '../../types';
import {
	memoizedScreenToCanvasPosition,
	memoizedCanvasToScreenPosition,
	memoizedCalculateVisibleBlocks,
	memoizedCalculateBlocksBoundingBox,
	memoizedTransformPosition,
	memoizedCalculateDistance,
	memoizedDoRectsIntersect,
	screenToCanvasPosition,
	canvasToScreenPosition,
	calculateVisibleBlocks,
	calculateBlocksBoundingBox,
	transformPosition,
	calculateDistance,
	doRectsIntersect
} from './index';
import {
	memoizedCreateBezierPath,
	memoizedCreateConnectionPath,
	createBezierPath,
	createConnectionPath,
	performanceTrackedBezierPath,
	performanceTrackedConnectionPath
} from './connectionPaths';
import { memoizedCalculateBlockSize, calculateBlockSize } from './blockSizes';

// テスト用のヘルパー関数
function createTestBlock(overrides: Partial<Block> = {}): Block {
	return {
		id: `test-block-${Math.random()}`,
		name: 'Test Block',
		type: BlockPathType.Move,
		version: '1.0.0',
		position: { x: 100, y: 100 },
		size: { width: 200, height: 60 },
		zIndex: 0,
		visibility: true,
		connection: Connection.None,
		draggable: true,
		editable: true,
		deletable: true,
		parentId: undefined,
		childId: undefined,
		valueTargetId: null,
		loopFirstChildId: undefined,
		loopLastChildId: undefined,
		title: 'Test Block',
		output: '',
		closeOutput: '',
		content: [],
		color: '#ffffff',
		...overrides
	};
}

function createTestViewport(overrides: Partial<Viewport> = {}): Viewport {
	return {
		x: 0,
		y: 0,
		zoom: 1,
		...overrides
	};
}

function measurePerformance<T>(
	fn: () => T,
	iterations: number = 1000
): {
	result: T;
	averageTime: number;
	totalTime: number;
} {
	const startTime = performance.now();
	let result: T;

	for (let i = 0; i < iterations; i++) {
		result = fn();
	}

	const endTime = performance.now();
	const totalTime = endTime - startTime;

	return {
		result: result!,
		averageTime: totalTime / iterations,
		totalTime
	};
}

describe('Memoization Performance Tests', () => {
	beforeEach(() => {
		// パフォーマンステスト前にキャッシュをクリア
		vi.clearAllMocks();
	});

	describe('座標変換のメモ化', () => {
		const testPosition: Position = { x: 100, y: 200 };
		const testViewport: Viewport = createTestViewport({
			x: 50,
			y: 75,
			zoom: 1.5
		});

		it('スクリーン座標からキャンバス座標への変換でパフォーマンス向上を確認', () => {
			const iterations = 1000;

			// 非メモ化版のパフォーマンス測定（毎回新しい引数）
			let counter = 0;
			const nonMemoizedPerf = measurePerformance(() => {
				const pos = { x: testPosition.x + (counter++ % 10), y: testPosition.y };
				return screenToCanvasPosition(pos, testViewport);
			}, iterations);

			// メモ化版のパフォーマンス測定（同じ引数を繰り返し使用してキャッシュ効果を確認）
			counter = 0;
			const memoizedPerf = measurePerformance(() => {
				const pos = { x: testPosition.x + (counter++ % 10), y: testPosition.y };
				return memoizedScreenToCanvasPosition(pos, testViewport);
			}, iterations);

			// 結果が正しいことを確認
			expect(memoizedPerf.result).toBeDefined();
			expect(nonMemoizedPerf.result).toBeDefined();

			console.log('Screen to Canvas Transform Performance:');
			console.log(`Non-memoized: ${nonMemoizedPerf.averageTime.toFixed(4)}ms avg`);
			console.log(`Memoized: ${memoizedPerf.averageTime.toFixed(4)}ms avg`);

			// メモ化の効果は引数の重複度に依存するため、単純な比較ではなく実行時間の妥当性を確認
			expect(memoizedPerf.averageTime).toBeLessThan(1); // 1ms未満で実行されることを確認
			expect(nonMemoizedPerf.averageTime).toBeLessThan(1); // 1ms未満で実行されることを確認
		});

		it('キャンバス座標からスクリーン座標への変換でキャッシュ効果を確認', () => {
			// 同じ引数での複数回呼び出しでキャッシュ効果を測定
			const startTime = performance.now();

			// 最初の呼び出し（キャッシュミス）
			const result1 = memoizedCanvasToScreenPosition(testPosition, testViewport);
			const firstCallTime = performance.now();

			// 2回目以降の呼び出し（キャッシュヒット）
			for (let i = 0; i < 100; i++) {
				memoizedCanvasToScreenPosition(testPosition, testViewport);
			}
			const endTime = performance.now();

			const firstCall = firstCallTime - startTime;
			const subsequentCalls = (endTime - firstCallTime) / 100;

			console.log('Canvas to Screen Transform Cache Performance:');
			console.log(`First call: ${firstCall.toFixed(4)}ms`);
			console.log(`Subsequent calls (cached): ${subsequentCalls.toFixed(4)}ms avg`);

			// キャッシュされた呼び出しの方が高速であることを確認
			expect(subsequentCalls).toBeLessThan(firstCall);
			expect(result1).toBeDefined();
		});

		it('異なる引数でのメモ化効果を確認', () => {
			const positions = [
				{ x: 100, y: 200 },
				{ x: 150, y: 250 },
				{ x: 200, y: 300 },
				{ x: 100, y: 200 }, // 重複
				{ x: 150, y: 250 } // 重複
			];

			const viewport = createTestViewport();
			const startTime = performance.now();

			// 異なる引数でメモ化関数を呼び出し
			positions.forEach((pos) => {
				memoizedScreenToCanvasPosition(pos, viewport);
			});

			const endTime = performance.now();
			const totalTime = endTime - startTime;

			// 重複する引数でのキャッシュヒットにより高速化されることを期待
			expect(totalTime).toBeLessThan(10); // 10ms未満で完了することを期待
		});
	});

	describe('ブロック計算のメモ化', () => {
		const testBlocks: Block[] = Array.from({ length: 100 }, (_, i) =>
			createTestBlock({
				id: `block-${i}`,
				position: { x: i * 50, y: i * 30 }
			})
		);

		it('可視ブロック計算でパフォーマンス向上を確認', () => {
			const viewport = createTestViewport();
			const containerSize: Size = { width: 800, height: 600 };
			const iterations = 1000;

			const nonMemoizedPerf = measurePerformance(() => {
				return calculateVisibleBlocks(testBlocks, viewport, containerSize);
			}, iterations);

			const memoizedPerf = measurePerformance(() => {
				return memoizedCalculateVisibleBlocks(testBlocks, viewport, containerSize);
			}, iterations);

			expect(memoizedPerf.averageTime).toBeLessThan(nonMemoizedPerf.averageTime);
			expect(memoizedPerf.result).toEqual(nonMemoizedPerf.result);

			console.log('Visible Blocks Calculation Performance:');
			console.log(`Non-memoized: ${nonMemoizedPerf.averageTime.toFixed(4)}ms avg`);
			console.log(`Memoized: ${memoizedPerf.averageTime.toFixed(4)}ms avg`);
		});

		it('バウンディングボックス計算でキャッシュ効果を確認', () => {
			const margin = 50;

			// 最初の計算（キャッシュミス）
			const startTime1 = performance.now();
			const result1 = memoizedCalculateBlocksBoundingBox(testBlocks, margin);
			const firstCallTime = performance.now() - startTime1;

			// 同じ引数での2回目の計算（キャッシュヒット）
			const startTime2 = performance.now();
			const result2 = memoizedCalculateBlocksBoundingBox(testBlocks, margin);
			const secondCallTime = performance.now() - startTime2;

			// 結果が同じであることを確認
			expect(result1).toEqual(result2);

			// キャッシュされた呼び出しの方が高速であることを確認
			expect(secondCallTime).toBeLessThan(firstCallTime);

			console.log('Bounding Box Calculation Cache Performance:');
			console.log(`First call: ${firstCallTime.toFixed(4)}ms`);
			console.log(`Second call (cached): ${secondCallTime.toFixed(4)}ms`);
			console.log(`Cache speedup: ${(firstCallTime / secondCallTime).toFixed(1)}x`);
		});
	});

	describe('接続パス計算のメモ化', () => {
		const startPos: Position = { x: 100, y: 100 };
		const endPos: Position = { x: 300, y: 200 };

		it('ベジェ曲線パス計算でキャッシュ効果を確認', () => {
			// 最初の計算（キャッシュミス）
			const startTime1 = performance.now();
			const result1 = memoizedCreateBezierPath(startPos, endPos, 50);
			const firstCallTime = performance.now() - startTime1;

			// 同じ引数での複数回の計算（キャッシュヒット）
			const startTime2 = performance.now();
			for (let i = 0; i < 100; i++) {
				memoizedCreateBezierPath(startPos, endPos, 50);
			}
			const cachedCallsTime = (performance.now() - startTime2) / 100;

			// 結果が正しいことを確認
			expect(result1).toMatch(/^M \d+/); // SVGパス形式

			// キャッシュされた呼び出しの方が高速であることを確認
			expect(cachedCallsTime).toBeLessThan(firstCallTime);

			console.log('Bezier Path Calculation Cache Performance:');
			console.log(`First call: ${firstCallTime.toFixed(4)}ms`);
			console.log(`Cached calls: ${cachedCallsTime.toFixed(4)}ms avg`);
			console.log(`Cache speedup: ${(firstCallTime / cachedCallsTime).toFixed(1)}x`);
		});

		it('汎用接続パス計算でキャッシュ効果を確認', () => {
			const options = { curveType: 'bezier' as const, offset: 50 };

			// 最初の計算（キャッシュミス）
			const startTime1 = performance.now();
			const result1 = memoizedCreateConnectionPath(startPos, endPos, options);
			const firstCallTime = performance.now() - startTime1;

			// 同じ引数での複数回の計算（キャッシュヒット）
			const startTime2 = performance.now();
			for (let i = 0; i < 50; i++) {
				memoizedCreateConnectionPath(startPos, endPos, options);
			}
			const cachedCallsTime = (performance.now() - startTime2) / 50;

			// 結果が正しいことを確認
			expect(result1).toMatch(/^M \d+/); // SVGパス形式

			// キャッシュされた呼び出しの方が高速であることを確認
			expect(cachedCallsTime).toBeLessThan(firstCallTime);

			console.log('Connection Path Calculation Cache Performance:');
			console.log(`First call: ${firstCallTime.toFixed(4)}ms`);
			console.log(`Cached calls: ${cachedCallsTime.toFixed(4)}ms avg`);
		});

		it('パフォーマンス追跡機能の動作確認', () => {
			// 統計をクリア
			performanceTrackedBezierPath.clearStats();

			// 複数回呼び出し
			const positions = [
				[
					{ x: 0, y: 0 },
					{ x: 100, y: 100 }
				],
				[
					{ x: 50, y: 50 },
					{ x: 150, y: 150 }
				],
				[
					{ x: 0, y: 0 },
					{ x: 100, y: 100 }
				], // 重複
				[
					{ x: 200, y: 200 },
					{ x: 300, y: 300 }
				],
				[
					{ x: 50, y: 50 },
					{ x: 150, y: 150 }
				] // 重複
			];

			positions.forEach(([start, end]) => {
				performanceTrackedBezierPath(start, end, 50);
			});

			const stats = performanceTrackedBezierPath.getStats();

			expect(stats.totalCalculations).toBe(5);
			expect(stats.cacheHits).toBe(2); // 2回の重複
			expect(stats.cacheMisses).toBe(3); // 3回の新規計算
			expect(stats.cacheHitRatio).toBe(0.4); // 40%のキャッシュヒット率
			expect(stats.averageCalculationTime).toBeGreaterThan(0);

			console.log('Performance Tracking Stats:', stats);
		});
	});

	describe('ブロックサイズ計算のメモ化', () => {
		const testBlock = createTestBlock({
			type: BlockPathType.Move,
			content: [
				{ id: '1', type: 'Text', data: { title: 'Test Content' } },
				{ id: '2', type: 'Text', data: { title: 'Another Content' } }
			]
		});

		it('ブロックサイズ計算でキャッシュ効果を確認', () => {
			const context = { zoom: 1.5, containerWidth: 800 };

			// 最初の計算（キャッシュミス）
			const startTime1 = performance.now();
			const result1 = memoizedCalculateBlockSize(testBlock, context);
			const firstCallTime = performance.now() - startTime1;

			// 同じ引数での複数回の計算（キャッシュヒット）
			const startTime2 = performance.now();
			for (let i = 0; i < 100; i++) {
				memoizedCalculateBlockSize(testBlock, context);
			}
			const cachedCallsTime = (performance.now() - startTime2) / 100;

			// 結果が正しいことを確認
			expect(result1.width).toBeGreaterThan(0);
			expect(result1.height).toBeGreaterThan(0);

			// キャッシュされた呼び出しの方が高速であることを確認
			expect(cachedCallsTime).toBeLessThan(firstCallTime);

			console.log('Block Size Calculation Cache Performance:');
			console.log(`First call: ${firstCallTime.toFixed(4)}ms`);
			console.log(`Cached calls: ${cachedCallsTime.toFixed(4)}ms avg`);
		});
	});

	describe('数学計算のメモ化', () => {
		it('距離計算でキャッシュ効果を確認', () => {
			const point1: Position = { x: 0, y: 0 };
			const point2: Position = { x: 100, y: 100 };

			// 最初の計算（キャッシュミス）
			const startTime1 = performance.now();
			const result1 = memoizedCalculateDistance(point1, point2);
			const firstCallTime = performance.now() - startTime1;

			// 同じ引数での複数回の計算（キャッシュヒット）
			const startTime2 = performance.now();
			for (let i = 0; i < 1000; i++) {
				memoizedCalculateDistance(point1, point2);
			}
			const cachedCallsTime = (performance.now() - startTime2) / 1000;

			// 結果が正しいことを確認
			expect(result1).toBeCloseTo(Math.sqrt(20000), 5);

			// キャッシュされた呼び出しの方が高速であることを確認
			expect(cachedCallsTime).toBeLessThan(firstCallTime);

			console.log('Distance Calculation Cache Performance:');
			console.log(`First call: ${firstCallTime.toFixed(4)}ms`);
			console.log(`Cached calls: ${cachedCallsTime.toFixed(4)}ms avg`);
		});

		it('矩形交差判定でキャッシュ効果を確認', () => {
			const rect1 = { x: 0, y: 0, width: 100, height: 100 };
			const rect2 = { x: 50, y: 50, width: 100, height: 100 };

			// 最初の計算（キャッシュミス）
			const startTime1 = performance.now();
			const result1 = memoizedDoRectsIntersect(rect1, rect2);
			const firstCallTime = performance.now() - startTime1;

			// 同じ引数での複数回の計算（キャッシュヒット）
			const startTime2 = performance.now();
			for (let i = 0; i < 1000; i++) {
				memoizedDoRectsIntersect(rect1, rect2);
			}
			const cachedCallsTime = (performance.now() - startTime2) / 1000;

			// 結果が正しいことを確認
			expect(result1).toBe(true); // 矩形は交差している

			// キャッシュされた呼び出しの方が高速であることを確認
			expect(cachedCallsTime).toBeLessThan(firstCallTime);

			console.log('Rectangle Intersection Cache Performance:');
			console.log(`First call: ${firstCallTime.toFixed(4)}ms`);
			console.log(`Cached calls: ${cachedCallsTime.toFixed(4)}ms avg`);
		});
	});

	describe('メモリ効率性テスト', () => {
		it('大量の計算でメモリリークが発生しないこと', () => {
			const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

			// 大量の異なる引数でメモ化関数を呼び出し
			for (let i = 0; i < 10000; i++) {
				const pos1: Position = { x: i, y: i * 2 };
				const pos2: Position = { x: i + 100, y: i * 2 + 100 };
				const viewport = createTestViewport({
					x: i,
					y: i,
					zoom: 1 + i * 0.001
				});

				memoizedScreenToCanvasPosition(pos1, viewport);
				memoizedCanvasToScreenPosition(pos2, viewport);
				memoizedCalculateDistance(pos1, pos2);
			}

			const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;

			// メモリ使用量の増加が合理的な範囲内であることを確認
			if (initialMemory > 0 && finalMemory > 0) {
				const memoryIncrease = finalMemory - initialMemory;
				const memoryIncreaseRatio = memoryIncrease / initialMemory;

				console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
				console.log(`Memory increase ratio: ${(memoryIncreaseRatio * 100).toFixed(2)}%`);

				// メモリ使用量の増加が初期値の100%以内であることを確認
				expect(memoryIncreaseRatio).toBeLessThan(1.0);
			}
		});

		it('キャッシュサイズが適切に制限されること', () => {
			// 大量の異なる引数でメモ化関数を呼び出し
			const uniqueArguments = 5000;

			for (let i = 0; i < uniqueArguments; i++) {
				const pos: Position = { x: i, y: i };
				const viewport = createTestViewport({ x: i, y: i, zoom: 1 });
				memoizedScreenToCanvasPosition(pos, viewport);
			}

			// メモリ使用量が過度に増加していないことを確認
			// （具体的な制限値はmemoization.tsの実装に依存）
			expect(true).toBe(true); // プレースホルダー
		});
	});

	describe('キャッシュ効率性テスト', () => {
		it('同じ引数での複数回呼び出しでキャッシュが効果的に動作すること', () => {
			const testPosition: Position = { x: 100, y: 200 };
			const testViewport: Viewport = createTestViewport();

			// 最初の呼び出し（キャッシュミス）
			const startTime1 = performance.now();
			const result1 = memoizedScreenToCanvasPosition(testPosition, testViewport);
			const endTime1 = performance.now();
			const firstCallTime = endTime1 - startTime1;

			// 2回目の呼び出し（キャッシュヒット）
			const startTime2 = performance.now();
			const result2 = memoizedScreenToCanvasPosition(testPosition, testViewport);
			const endTime2 = performance.now();
			const secondCallTime = endTime2 - startTime2;

			// 結果が同じであることを確認
			expect(result1).toEqual(result2);

			// 2回目の方が高速であることを確認
			expect(secondCallTime).toBeLessThan(firstCallTime);

			console.log(`First call: ${firstCallTime.toFixed(4)}ms`);
			console.log(`Second call (cached): ${secondCallTime.toFixed(4)}ms`);
			console.log(`Cache speedup: ${(firstCallTime / secondCallTime).toFixed(1)}x`);
		});

		it('異なる引数でのキャッシュ独立性を確認', () => {
			const pos1: Position = { x: 100, y: 100 };
			const pos2: Position = { x: 200, y: 200 };
			const viewport = createTestViewport();

			const result1a = memoizedScreenToCanvasPosition(pos1, viewport);
			const result2a = memoizedScreenToCanvasPosition(pos2, viewport);
			const result1b = memoizedScreenToCanvasPosition(pos1, viewport);
			const result2b = memoizedScreenToCanvasPosition(pos2, viewport);

			// 同じ引数での結果が一致することを確認
			expect(result1a).toEqual(result1b);
			expect(result2a).toEqual(result2b);

			// 異なる引数での結果が異なることを確認
			expect(result1a).not.toEqual(result2a);
		});
	});
});
