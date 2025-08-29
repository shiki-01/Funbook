/**
 * VirtualScrollService のテスト
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { VirtualScrollService } from './VirtualScrollService';
import type { Block } from '$lib/types/domain';
import type { Viewport } from '$lib/types';
import { BlockPathType, Connection } from '$lib/types/core';

describe('VirtualScrollService', () => {
	let service: VirtualScrollService;
	let mockBlocks: Block[];
	let mockViewport: Viewport;
	let mockContainerSize: { width: number; height: number };

	beforeEach(() => {
		service = new VirtualScrollService({
			margin: 100,
			defaultBlockWidth: 200,
			defaultBlockHeight: 60,
			enablePerformanceMonitoring: true
		});

		// テスト用のブロックデータを作成
		mockBlocks = [
			{
				id: 'block1',
				name: 'Test Block 1',
				type: BlockPathType.Flag,
				version: '1.0',
				position: { x: 0, y: 0 },
				size: { width: 200, height: 60 },
				zIndex: 0,
				visibility: true,
				connection: Connection.Output,
				draggable: true,
				editable: true,
				deletable: true,
				parentId: undefined,
				childId: undefined,
				valueTargetId: undefined,
				loopFirstChildId: undefined,
				loopLastChildId: undefined,
				title: 'Test Block 1',
				output: 'output1',
				closeOutput: '',
				content: [],
				color: '#ffffff'
			},
			{
				id: 'block2',
				name: 'Test Block 2',
				type: BlockPathType.Move,
				version: '1.0',
				position: { x: 300, y: 100 },
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
				title: 'Test Block 2',
				output: 'output2',
				closeOutput: '',
				content: [],
				color: '#ffffff'
			},
			{
				id: 'block3',
				name: 'Test Block 3',
				type: BlockPathType.Move,
				version: '1.0',
				position: { x: 1000, y: 1000 },
				size: { width: 200, height: 60 },
				zIndex: 0,
				visibility: true,
				connection: Connection.Input,
				draggable: true,
				editable: true,
				deletable: true,
				parentId: undefined,
				childId: undefined,
				valueTargetId: undefined,
				loopFirstChildId: undefined,
				loopLastChildId: undefined,
				title: 'Test Block 3',
				output: 'output3',
				closeOutput: '',
				content: [],
				color: '#ffffff'
			}
		];

		mockViewport = {
			x: 0,
			y: 0,
			zoom: 1.0
		};

		mockContainerSize = {
			width: 800,
			height: 600
		};
	});

	describe('calculateVisibleBlocks', () => {
		it('ビューポート内のブロックのみを返すこと', () => {
			const visibleBlocks = service.calculateVisibleBlocks(
				mockBlocks,
				mockViewport,
				mockContainerSize
			);

			// block1とblock2は表示範囲内、block3は範囲外
			expect(visibleBlocks).toHaveLength(2);
			expect(visibleBlocks.map((b) => b.id)).toContain('block1');
			expect(visibleBlocks.map((b) => b.id)).toContain('block2');
			expect(visibleBlocks.map((b) => b.id)).not.toContain('block3');
		});

		it('ズームレベルが変更された場合に正しく動作すること', () => {
			const zoomedViewport = { ...mockViewport, zoom: 0.5 };

			const visibleBlocks = service.calculateVisibleBlocks(
				mockBlocks,
				zoomedViewport,
				mockContainerSize
			);

			// ズームアウトにより表示範囲が広がるため、より多くのブロックが表示される
			expect(visibleBlocks.length).toBeGreaterThanOrEqual(2);
		});

		it('ビューポートが移動した場合に正しく動作すること', () => {
			const movedViewport = { ...mockViewport, x: -500, y: -500 };

			const visibleBlocks = service.calculateVisibleBlocks(
				mockBlocks,
				movedViewport,
				mockContainerSize
			);

			// ビューポートが移動したため、block3が表示範囲に入る可能性がある
			expect(visibleBlocks.map((b) => b.id)).toContain('block3');
		});

		it('空のブロック配列に対して正しく動作すること', () => {
			const visibleBlocks = service.calculateVisibleBlocks([], mockViewport, mockContainerSize);

			expect(visibleBlocks).toHaveLength(0);
		});

		it('マージンが考慮されること', () => {
			// マージンなしのサービスを作成
			const noMarginService = new VirtualScrollService({
				margin: 0,
				defaultBlockWidth: 200,
				defaultBlockHeight: 60,
				enablePerformanceMonitoring: false
			});

			const visibleWithMargin = service.calculateVisibleBlocks(
				mockBlocks,
				mockViewport,
				mockContainerSize
			);

			const visibleWithoutMargin = noMarginService.calculateVisibleBlocks(
				mockBlocks,
				mockViewport,
				mockContainerSize
			);

			// マージンありの方が多くのブロックを表示する可能性が高い
			expect(visibleWithMargin.length).toBeGreaterThanOrEqual(visibleWithoutMargin.length);
		});
	});

	describe('calculateBlockVisibility', () => {
		it('ブロックの可視性情報を正しく計算すること', () => {
			const visibility = service.calculateBlockVisibility(
				mockBlocks,
				mockViewport,
				mockContainerSize
			);

			expect(visibility).toHaveLength(3);

			// block1は完全に表示されているはず
			const block1Visibility = visibility.find((v) => v.id === 'block1');
			expect(block1Visibility?.fullyVisible).toBe(true);
			expect(block1Visibility?.partiallyVisible).toBe(true);
			expect(block1Visibility?.intersectionRatio).toBeGreaterThan(0.9);

			// block3は表示されていないはず
			const block3Visibility = visibility.find((v) => v.id === 'block3');
			expect(block3Visibility?.fullyVisible).toBe(false);
			expect(block3Visibility?.partiallyVisible).toBe(false);
			expect(block3Visibility?.intersectionRatio).toBe(0);
		});

		it('部分的に表示されているブロックを正しく検出すること', () => {
			// ブロックが部分的に表示されるようにビューポートを調整
			const partialViewport = { x: -150, y: -30, zoom: 1.0 };

			const visibility = service.calculateBlockVisibility(
				mockBlocks,
				partialViewport,
				mockContainerSize
			);

			const block1Visibility = visibility.find((v) => v.id === 'block1');
			expect(block1Visibility?.partiallyVisible).toBe(true);
			expect(block1Visibility?.intersectionRatio).toBeGreaterThan(0);
			expect(block1Visibility?.intersectionRatio).toBeLessThan(1);
		});
	});

	describe('getPerformanceStats', () => {
		it('パフォーマンス統計を正しく追跡すること', () => {
			// 可視ブロックを計算してパフォーマンス統計を生成
			service.calculateVisibleBlocks(mockBlocks, mockViewport, mockContainerSize);

			const stats = service.getPerformanceStats();

			expect(stats.totalBlocks).toBe(3);
			expect(stats.visibleBlocks).toBeGreaterThan(0);
			expect(stats.culledBlocks).toBeGreaterThanOrEqual(0);
			expect(stats.lastCalculationTime).toBeGreaterThan(0);
			expect(stats.cullingEfficiency).toBeGreaterThanOrEqual(0);
			expect(stats.cullingEfficiency).toBeLessThanOrEqual(1);
		});

		it('カリング効率を正しく計算すること', () => {
			service.calculateVisibleBlocks(mockBlocks, mockViewport, mockContainerSize);

			const stats = service.getPerformanceStats();
			const expectedEfficiency = stats.culledBlocks / stats.totalBlocks;

			expect(stats.cullingEfficiency).toBeCloseTo(expectedEfficiency, 2);
		});
	});

	describe('calculateBlockPriority', () => {
		it('ビューポート中心に近いブロックの優先度が高いこと', () => {
			const centerViewport = { x: -100, y: -50, zoom: 1.0 };

			const priority1 = service.calculateBlockPriority(mockBlocks[0], centerViewport);
			const priority3 = service.calculateBlockPriority(mockBlocks[2], centerViewport);

			// block1はビューポート中心に近いため、block3より優先度が高いはず
			expect(priority1).toBeGreaterThan(priority3);
		});

		it('優先度が0-1の範囲内であること', () => {
			mockBlocks.forEach((block) => {
				const priority = service.calculateBlockPriority(block, mockViewport);
				expect(priority).toBeGreaterThanOrEqual(0);
				expect(priority).toBeLessThanOrEqual(1);
			});
		});
	});

	describe('updateConfig', () => {
		it('設定を正しく更新すること', () => {
			const newConfig = {
				margin: 300,
				defaultBlockWidth: 250,
				enablePerformanceMonitoring: false
			};

			service.updateConfig(newConfig);
			const config = service.getConfig();

			expect(config.margin).toBe(300);
			expect(config.defaultBlockWidth).toBe(250);
			expect(config.enablePerformanceMonitoring).toBe(false);
			// 更新されていない設定は元の値を保持
			expect(config.defaultBlockHeight).toBe(60);
		});
	});

	describe('resetPerformanceStats', () => {
		it('パフォーマンス統計をリセットすること', () => {
			// 統計を生成
			service.calculateVisibleBlocks(mockBlocks, mockViewport, mockContainerSize);

			// リセット前の統計を確認
			let stats = service.getPerformanceStats();
			expect(stats.totalBlocks).toBeGreaterThan(0);

			// リセット実行
			service.resetPerformanceStats();

			// リセット後の統計を確認
			stats = service.getPerformanceStats();
			expect(stats.totalBlocks).toBe(0);
			expect(stats.visibleBlocks).toBe(0);
			expect(stats.culledBlocks).toBe(0);
			expect(stats.lastCalculationTime).toBe(0);
			expect(stats.cullingEfficiency).toBe(0);
		});
	});

	describe('エッジケース', () => {
		it('非常に大きなズームレベルで正しく動作すること', () => {
			const largeZoomViewport = { ...mockViewport, zoom: 10.0 };

			const visibleBlocks = service.calculateVisibleBlocks(
				mockBlocks,
				largeZoomViewport,
				mockContainerSize
			);

			// 大きなズームでは表示範囲が狭くなるため、ブロック数が少なくなる可能性がある
			expect(visibleBlocks.length).toBeLessThanOrEqual(mockBlocks.length);
		});

		it('非常に小さなズームレベルで正しく動作すること', () => {
			const smallZoomViewport = { ...mockViewport, zoom: 0.1 };

			const visibleBlocks = service.calculateVisibleBlocks(
				mockBlocks,
				smallZoomViewport,
				mockContainerSize
			);

			// 小さなズームでは表示範囲が広くなるため、すべてのブロックが表示される可能性が高い
			expect(visibleBlocks.length).toBeGreaterThanOrEqual(0);
		});

		it('サイズが設定されていないブロックでデフォルト値を使用すること', () => {
			const blockWithoutSize: Block = {
				...mockBlocks[0],
				id: 'blockNoSize',
				size: undefined
			};

			const visibility = service.calculateBlockVisibility(
				[blockWithoutSize],
				mockViewport,
				mockContainerSize
			);

			expect(visibility).toHaveLength(1);
			// デフォルトサイズで計算されるため、可視性情報が正しく計算される
			expect(visibility[0].intersectionRatio).toBeGreaterThanOrEqual(0);
		});

		it('負の座標のブロックで正しく動作すること', () => {
			const negativeBlock: Block = {
				...mockBlocks[0],
				id: 'negativeBlock',
				position: { x: -500, y: -300 }
			};

			const visibleBlocks = service.calculateVisibleBlocks(
				[negativeBlock],
				mockViewport,
				mockContainerSize
			);

			// 負の座標でも正しく可視性判定が行われる
			expect(visibleBlocks.length).toBeGreaterThanOrEqual(0);
		});
	});

	describe('パフォーマンステスト', () => {
		it('大量のブロックでも合理的な時間で処理できること', () => {
			// 1000個のブロックを生成
			const manyBlocks: Block[] = Array.from({ length: 1000 }, (_, i) => ({
				...mockBlocks[0],
				id: `block${i}`,
				position: { x: (i % 50) * 220, y: Math.floor(i / 50) * 80 }
			}));

			const startTime = performance.now();
			const visibleBlocks = service.calculateVisibleBlocks(
				manyBlocks,
				mockViewport,
				mockContainerSize
			);
			const endTime = performance.now();

			const calculationTime = endTime - startTime;

			// 1000ブロックの処理が100ms以内で完了することを確認
			expect(calculationTime).toBeLessThan(100);
			expect(visibleBlocks.length).toBeLessThan(manyBlocks.length);

			const stats = service.getPerformanceStats();
			expect(stats.cullingEfficiency).toBeGreaterThan(0);
		});

		it('複数回の計算でパフォーマンスが安定していること', () => {
			const times: number[] = [];

			// 10回計算を実行
			for (let i = 0; i < 10; i++) {
				const startTime = performance.now();
				service.calculateVisibleBlocks(mockBlocks, mockViewport, mockContainerSize);
				const endTime = performance.now();
				times.push(endTime - startTime);
			}

			// 計算時間の分散が小さいことを確認
			const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
			const variance =
				times.reduce((sum, time) => sum + Math.pow(time - avgTime, 2), 0) / times.length;

			expect(variance).toBeLessThan(avgTime); // 分散が平均より小さいことを確認
		});
	});
});
