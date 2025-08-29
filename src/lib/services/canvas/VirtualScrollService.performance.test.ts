/**
 * VirtualScrollService のパフォーマンステスト
 * 大きなデータセットでの仮想スクロール性能を検証
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { VirtualScrollService } from './VirtualScrollService';
import type { Block } from '$lib/types/domain';
import type { Viewport } from '$lib/types';
import { BlockPathType, Connection } from '$lib/types/core';

describe('VirtualScrollService Performance Tests', () => {
	let service: VirtualScrollService;
	let mockViewport: Viewport;
	let mockContainerSize: { width: number; height: number };

	beforeEach(() => {
		service = new VirtualScrollService({
			margin: 200,
			defaultBlockWidth: 200,
			defaultBlockHeight: 60,
			enablePerformanceMonitoring: true
		});

		mockViewport = {
			x: 0,
			y: 0,
			zoom: 1.0
		};

		mockContainerSize = {
			width: 1920,
			height: 1080
		};
	});

	/**
	 * テスト用のブロックを大量生成
	 * @param count - 生成するブロック数
	 * @param gridSize - グリッドサイズ（ブロックを格子状に配置）
	 * @returns ブロックの配列
	 */
	function generateBlocks(count: number, gridSize: number = 50): Block[] {
		return Array.from({ length: count }, (_, i) => ({
			id: `block${i}`,
			name: `Block ${i}`,
			type: BlockPathType.Move,
			version: '1.0',
			position: {
				x: (i % gridSize) * 220,
				y: Math.floor(i / gridSize) * 80
			},
			size: { width: 200, height: 60 },
			zIndex: 0,
			visibility: true,
			connection: Connection.Both,
			draggable: true,
			editable: true,
			deletable: true,
			parentId: undefined,
			childId: undefined,
			valueTargetId: undefined,
			loopFirstChildId: undefined,
			loopLastChildId: undefined,
			title: `Block ${i}`,
			output: `output${i}`,
			closeOutput: '',
			content: [],
			color: '#ffffff'
		}));
	}

	describe('大量ブロックでのパフォーマンス', () => {
		it('100ブロックで高速に処理できること', () => {
			const blocks = generateBlocks(100);

			const startTime = performance.now();
			const visibleBlocks = service.calculateVisibleBlocks(blocks, mockViewport, mockContainerSize);
			const endTime = performance.now();

			const calculationTime = endTime - startTime;

			expect(calculationTime).toBeLessThan(10); // 10ms以内
			expect(visibleBlocks.length).toBeLessThan(blocks.length);

			const stats = service.getPerformanceStats();
			expect(stats.cullingEfficiency).toBeGreaterThan(0);
		});

		it('1,000ブロックで合理的な時間で処理できること', () => {
			const blocks = generateBlocks(1000);

			const startTime = performance.now();
			const visibleBlocks = service.calculateVisibleBlocks(blocks, mockViewport, mockContainerSize);
			const endTime = performance.now();

			const calculationTime = endTime - startTime;

			expect(calculationTime).toBeLessThan(50); // 50ms以内
			expect(visibleBlocks.length).toBeLessThan(blocks.length);

			const stats = service.getPerformanceStats();
			expect(stats.cullingEfficiency).toBeGreaterThan(0.5); // 50%以上のカリング効率
		});

		it('10,000ブロックでも実用的な時間で処理できること', () => {
			const blocks = generateBlocks(10000);

			const startTime = performance.now();
			const visibleBlocks = service.calculateVisibleBlocks(blocks, mockViewport, mockContainerSize);
			const endTime = performance.now();

			const calculationTime = endTime - startTime;

			expect(calculationTime).toBeLessThan(200); // 200ms以内
			expect(visibleBlocks.length).toBeLessThan(blocks.length);

			const stats = service.getPerformanceStats();
			expect(stats.cullingEfficiency).toBeGreaterThan(0.8); // 80%以上のカリング効率
		});

		it('100,000ブロックでも処理可能であること', () => {
			const blocks = generateBlocks(100000);

			const startTime = performance.now();
			const visibleBlocks = service.calculateVisibleBlocks(blocks, mockViewport, mockContainerSize);
			const endTime = performance.now();

			const calculationTime = endTime - startTime;

			expect(calculationTime).toBeLessThan(1000); // 1秒以内
			expect(visibleBlocks.length).toBeLessThan(blocks.length);

			const stats = service.getPerformanceStats();
			expect(stats.cullingEfficiency).toBeGreaterThan(0.9); // 90%以上のカリング効率
		});
	});

	describe('連続実行でのパフォーマンス安定性', () => {
		it('複数回の計算で安定したパフォーマンスを維持すること', () => {
			const blocks = generateBlocks(1000);
			const times: number[] = [];

			// 20回連続で計算を実行
			for (let i = 0; i < 20; i++) {
				const startTime = performance.now();
				service.calculateVisibleBlocks(blocks, mockViewport, mockContainerSize);
				const endTime = performance.now();
				times.push(endTime - startTime);
			}

			const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
			const maxTime = Math.max(...times);
			const minTime = Math.min(...times);

			// 最大時間と最小時間の差が平均時間の5倍以内であることを確認（テスト環境での変動を考慮）
			expect(maxTime - minTime).toBeLessThan(avgTime * 5);

			// すべての計算が100ms以内で完了することを確認
			times.forEach((time) => {
				expect(time).toBeLessThan(100);
			});
		});

		it('異なるビューポートでの計算が安定していること', () => {
			const blocks = generateBlocks(5000);
			const viewports = [
				{ x: 0, y: 0, zoom: 1.0 },
				{ x: -1000, y: -500, zoom: 1.0 },
				{ x: -2000, y: -1000, zoom: 0.5 },
				{ x: -500, y: -250, zoom: 2.0 },
				{ x: -5000, y: -3000, zoom: 0.2 }
			];

			const times: number[] = [];

			viewports.forEach((viewport) => {
				const startTime = performance.now();
				service.calculateVisibleBlocks(blocks, viewport, mockContainerSize);
				const endTime = performance.now();
				times.push(endTime - startTime);
			});

			// すべての計算が合理的な時間で完了することを確認
			times.forEach((time) => {
				expect(time).toBeLessThan(150);
			});
		});
	});

	describe('メモリ使用量の最適化', () => {
		it('大量ブロック処理後にメモリリークが発生しないこと', () => {
			const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

			// 大量のブロックで複数回処理を実行
			for (let i = 0; i < 10; i++) {
				const blocks = generateBlocks(10000);
				service.calculateVisibleBlocks(blocks, mockViewport, mockContainerSize);

				// 明示的にガベージコレクションを促す（可能な場合）
				if (global.gc) {
					global.gc();
				}
			}

			const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;

			// メモリ使用量の増加が合理的な範囲内であることを確認
			if (initialMemory > 0 && finalMemory > 0) {
				const memoryIncrease = finalMemory - initialMemory;
				const memoryIncreaseRatio = memoryIncrease / initialMemory;

				// メモリ使用量の増加が初期値の50%以内であることを確認
				expect(memoryIncreaseRatio).toBeLessThan(0.5);
			}
		});
	});

	describe('異なる設定でのパフォーマンス比較', () => {
		it('マージンサイズがパフォーマンスに与える影響を測定すること', () => {
			const blocks = generateBlocks(5000);

			const smallMarginService = new VirtualScrollService({
				margin: 50,
				defaultBlockWidth: 200,
				defaultBlockHeight: 60,
				enablePerformanceMonitoring: true
			});

			const largeMarginService = new VirtualScrollService({
				margin: 500,
				defaultBlockWidth: 200,
				defaultBlockHeight: 60,
				enablePerformanceMonitoring: true
			});

			// 小さなマージンでの計算
			const startTime1 = performance.now();
			const visibleBlocks1 = smallMarginService.calculateVisibleBlocks(
				blocks,
				mockViewport,
				mockContainerSize
			);
			const endTime1 = performance.now();

			// 大きなマージンでの計算
			const startTime2 = performance.now();
			const visibleBlocks2 = largeMarginService.calculateVisibleBlocks(
				blocks,
				mockViewport,
				mockContainerSize
			);
			const endTime2 = performance.now();

			const time1 = endTime1 - startTime1;
			const time2 = endTime2 - startTime2;

			// 大きなマージンの方が多くのブロックを処理するため、時間がかかる可能性がある
			expect(visibleBlocks2.length).toBeGreaterThanOrEqual(visibleBlocks1.length);

			// ただし、どちらも合理的な時間で完了すること
			expect(time1).toBeLessThan(100);
			expect(time2).toBeLessThan(100);
		});

		it('パフォーマンス監視の有無による影響を測定すること', () => {
			const blocks = generateBlocks(5000);

			const monitoringService = new VirtualScrollService({
				margin: 200,
				defaultBlockWidth: 200,
				defaultBlockHeight: 60,
				enablePerformanceMonitoring: true
			});

			const noMonitoringService = new VirtualScrollService({
				margin: 200,
				defaultBlockWidth: 200,
				defaultBlockHeight: 60,
				enablePerformanceMonitoring: false
			});

			// パフォーマンス監視ありでの計算
			const startTime1 = performance.now();
			monitoringService.calculateVisibleBlocks(blocks, mockViewport, mockContainerSize);
			const endTime1 = performance.now();

			// パフォーマンス監視なしでの計算
			const startTime2 = performance.now();
			noMonitoringService.calculateVisibleBlocks(blocks, mockViewport, mockContainerSize);
			const endTime2 = performance.now();

			const time1 = endTime1 - startTime1;
			const time2 = endTime2 - startTime2;

			// パフォーマンス監視のオーバーヘッドは合理的な範囲内であること（テスト環境での変動を考慮）
			expect(Math.abs(time1 - time2)).toBeLessThan(Math.max(time1, time2) * 0.5); // 50%以内の差
		});
	});

	describe('極端なケースでのパフォーマンス', () => {
		it('すべてのブロックが表示範囲外の場合に高速処理できること', () => {
			const blocks = generateBlocks(10000);

			// すべてのブロックが表示範囲外になるようにビューポートを設定
			const farViewport = { x: -100000, y: -100000, zoom: 1.0 };

			const startTime = performance.now();
			const visibleBlocks = service.calculateVisibleBlocks(blocks, farViewport, mockContainerSize);
			const endTime = performance.now();

			const calculationTime = endTime - startTime;

			expect(calculationTime).toBeLessThan(100); // 100ms以内
			expect(visibleBlocks.length).toBe(0); // 表示ブロックなし

			const stats = service.getPerformanceStats();
			expect(stats.cullingEfficiency).toBe(1.0); // 100%カリング
		});

		it('すべてのブロックが表示範囲内の場合でも合理的な時間で処理できること', () => {
			// 小さな範囲にブロックを密集させる
			const blocks = Array.from({ length: 1000 }, (_, i) => ({
				id: `block${i}`,
				name: `Block ${i}`,
				type: BlockPathType.Move,
				version: '1.0',
				position: {
					x: (i % 10) * 50, // 密集配置
					y: Math.floor(i / 10) * 30
				},
				size: { width: 40, height: 25 },
				zIndex: 0,
				visibility: true,
				connection: Connection.Both,
				draggable: true,
				editable: true,
				deletable: true,
				parentId: undefined,
				childId: undefined,
				valueTargetId: undefined,
				loopFirstChildId: undefined,
				loopLastChildId: undefined,
				title: `Block ${i}`,
				output: `output${i}`,
				closeOutput: '',
				content: [],
				color: '#ffffff'
			}));

			const startTime = performance.now();
			const visibleBlocks = service.calculateVisibleBlocks(blocks, mockViewport, mockContainerSize);
			const endTime = performance.now();

			const calculationTime = endTime - startTime;

			expect(calculationTime).toBeLessThan(100); // 100ms以内
			expect(visibleBlocks.length).toBeGreaterThan(0);

			const stats = service.getPerformanceStats();
			expect(stats.cullingEfficiency).toBeLessThan(0.8); // カリング効率は比較的低い
		});
	});
});
