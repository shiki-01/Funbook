/**
 * ドラッグバッチヘルパーのテスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DragBatchHelper } from './BatchStoreMixin';

describe('DragBatchHelper', () => {
	let dragBatchHelper: DragBatchHelper;

	beforeEach(() => {
		dragBatchHelper = new DragBatchHelper();
	});

	describe('ドラッグバッチの基本操作', () => {
		it('ドラッグバッチを開始・終了できる', () => {
			const blockId = 'test-block-1';

			expect(dragBatchHelper.isDragBatchActive()).toBe(false);

			dragBatchHelper.startDragBatch(blockId);
			expect(dragBatchHelper.isDragBatchActive()).toBe(true);

			const transaction = dragBatchHelper.getCurrentDragTransaction();
			expect(transaction).not.toBeNull();
			expect(transaction!.id).toBe(`drag-${blockId}`);

			const success = dragBatchHelper.endDragBatch();
			expect(success).toBe(true);
			expect(dragBatchHelper.isDragBatchActive()).toBe(false);
		});

		it('既存のドラッグバッチを自動的に終了して新しいバッチを開始する', () => {
			dragBatchHelper.startDragBatch('block-1');
			expect(dragBatchHelper.isDragBatchActive()).toBe(true);

			const firstTransaction = dragBatchHelper.getCurrentDragTransaction();
			expect(firstTransaction!.id).toBe('drag-block-1');

			// 新しいドラッグバッチを開始（既存のものは自動終了）
			dragBatchHelper.startDragBatch('block-2');
			expect(dragBatchHelper.isDragBatchActive()).toBe(true);

			const secondTransaction = dragBatchHelper.getCurrentDragTransaction();
			expect(secondTransaction!.id).toBe('drag-block-2');
		});
	});

	describe('位置更新のバッチ処理', () => {
		it('位置更新をバッチに追加できる', () => {
			const blockId = 'test-block';
			const position = { x: 100, y: 200 };
			let updateCalled = false;
			let rollbackCalled = false;

			dragBatchHelper.startDragBatch(blockId);

			dragBatchHelper.addPositionUpdate(
				blockId,
				position,
				() => {
					updateCalled = true;
				},
				() => {
					rollbackCalled = true;
				}
			);

			expect(updateCalled).toBe(false); // まだ実行されていない
			expect(rollbackCalled).toBe(false);

			const success = dragBatchHelper.endDragBatch(true);
			expect(success).toBe(true);
			expect(updateCalled).toBe(true); // コミット時に実行される
			expect(rollbackCalled).toBe(false);
		});

		it('複数の位置更新をバッチ処理できる', () => {
			const blockId = 'test-block';
			const positions = [
				{ x: 10, y: 20 },
				{ x: 30, y: 40 },
				{ x: 50, y: 60 }
			];
			const updateCalls: { x: number; y: number }[] = [];

			dragBatchHelper.startDragBatch(blockId);

			positions.forEach((pos, index) => {
				dragBatchHelper.addPositionUpdate(blockId, pos, () => {
					updateCalls.push(pos);
				});
			});

			dragBatchHelper.endDragBatch(true);

			expect(updateCalls).toHaveLength(3);
			expect(updateCalls).toEqual(positions);
		});
	});

	describe('スナップターゲット更新のバッチ処理', () => {
		it('スナップターゲット更新をバッチに追加できる', () => {
			const targetId = 'snap-target';
			let updateCalled = false;
			let rollbackCalled = false;

			dragBatchHelper.startDragBatch('drag-block');

			dragBatchHelper.addSnapTargetUpdate(
				targetId,
				() => {
					updateCalled = true;
				},
				() => {
					rollbackCalled = true;
				}
			);

			expect(updateCalled).toBe(false);

			const success = dragBatchHelper.endDragBatch(true);
			expect(success).toBe(true);
			expect(updateCalled).toBe(true);
			expect(rollbackCalled).toBe(false);
		});

		it('nullターゲットを処理できる', () => {
			let updateCalled = false;

			dragBatchHelper.startDragBatch('drag-block');

			dragBatchHelper.addSnapTargetUpdate(null, () => {
				updateCalled = true;
			});

			dragBatchHelper.endDragBatch(true);
			expect(updateCalled).toBe(true);
		});
	});

	describe('ロールバック機能', () => {
		it('ドラッグバッチをロールバックできる', () => {
			let updateCalled = false;
			let rollbackCalled = false;

			dragBatchHelper.startDragBatch('test-block');

			dragBatchHelper.addPositionUpdate(
				'test-block',
				{ x: 100, y: 200 },
				() => {
					updateCalled = true;
				},
				() => {
					rollbackCalled = true;
				}
			);

			const success = dragBatchHelper.endDragBatch(false); // ロールバック
			expect(success).toBe(false);
			expect(updateCalled).toBe(false);
			expect(rollbackCalled).toBe(true);
		});

		it('複数の操作をまとめてロールバックできる', () => {
			const rollbackCalls: string[] = [];

			dragBatchHelper.startDragBatch('test-block');

			dragBatchHelper.addPositionUpdate(
				'test-block',
				{ x: 10, y: 20 },
				() => {},
				() => {
					rollbackCalls.push('position');
				}
			);

			dragBatchHelper.addSnapTargetUpdate(
				'target-1',
				() => {},
				() => {
					rollbackCalls.push('snap');
				}
			);

			dragBatchHelper.endDragBatch(false);

			expect(rollbackCalls).toContain('position');
			expect(rollbackCalls).toContain('snap');
		});
	});

	describe('エラーハンドリング', () => {
		it('バッチが開始されていない状態での操作追加を防ぐ', () => {
			expect(() => {
				dragBatchHelper.addPositionUpdate('test-block', { x: 0, y: 0 }, () => {});
			}).toThrow('ドラッグバッチが開始されていません');

			expect(() => {
				dragBatchHelper.addSnapTargetUpdate('target', () => {});
			}).toThrow('ドラッグバッチが開始されていません');
		});

		it('バッチが開始されていない状態での終了を適切に処理する', () => {
			const success = dragBatchHelper.endDragBatch();
			expect(success).toBe(false);
		});
	});

	describe('パフォーマンステスト', () => {
		it('大量の位置更新を効率的に処理する', () => {
			const updateCount = 100;
			let executedUpdates = 0;
			const startTime = performance.now();

			dragBatchHelper.startDragBatch('perf-test-block');

			for (let i = 0; i < updateCount; i++) {
				dragBatchHelper.addPositionUpdate('perf-test-block', { x: i * 10, y: i * 20 }, () => {
					executedUpdates++;
				});
			}

			dragBatchHelper.endDragBatch(true);
			const endTime = performance.now();
			const executionTime = endTime - startTime;

			expect(executedUpdates).toBe(updateCount);
			expect(executionTime).toBeLessThan(50); // 50ms以内で完了

			console.log(`100回の位置更新実行時間: ${executionTime.toFixed(2)}ms`);
		});

		it('リアルタイムドラッグ操作をシミュレート', () => {
			const frameCount = 60; // 1秒間のフレーム数（60fps）
			let positionUpdates = 0;
			let snapUpdates = 0;
			const startTime = performance.now();

			dragBatchHelper.startDragBatch('realtime-drag-block');

			// 60フレーム分のドラッグ操作をシミュレート
			for (let frame = 0; frame < frameCount; frame++) {
				// 毎フレーム位置更新
				dragBatchHelper.addPositionUpdate(
					'realtime-drag-block',
					{ x: frame * 5, y: frame * 3 },
					() => {
						positionUpdates++;
					}
				);

				// 5フレームに1回スナップターゲット更新
				if (frame % 5 === 0) {
					dragBatchHelper.addSnapTargetUpdate(frame % 10 === 0 ? 'snap-target' : null, () => {
						snapUpdates++;
					});
				}
			}

			dragBatchHelper.endDragBatch(true);
			const endTime = performance.now();
			const executionTime = endTime - startTime;

			expect(positionUpdates).toBe(frameCount);
			expect(snapUpdates).toBe(12); // 60 / 5 = 12回
			expect(executionTime).toBeLessThan(16.67); // 1フレーム時間（60fps）以内

			console.log(`リアルタイムドラッグシミュレーション実行時間: ${executionTime.toFixed(2)}ms`);
			console.log(`フレームレート維持: ${executionTime < 16.67 ? 'OK' : 'NG'}`);
		});
	});
});
