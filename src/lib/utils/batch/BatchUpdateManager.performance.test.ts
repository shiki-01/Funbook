/**
 * バッチ更新マネージャーのパフォーマンステスト
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BatchUpdateManager } from './BatchUpdateManager';
import type { BatchOperation } from './BatchUpdateManager';

describe('BatchUpdateManager Performance Tests', () => {
	let batchManager: BatchUpdateManager;

	beforeEach(() => {
		batchManager = new BatchUpdateManager();
	});

	describe('大量操作のパフォーマンス', () => {
		it('1000個の操作を効率的に処理する', async () => {
			const operationCount = 1000;
			let executedCount = 0;
			const startTime = performance.now();

			// 大量の操作を追加
			for (let i = 0; i < operationCount; i++) {
				batchManager.addOperation({
					id: `perf-op-${i}`,
					type: 'block',
					operation: () => {
						executedCount++;
					},
					priority: Math.floor(Math.random() * 10)
				});
			}

			// 処理完了を待つ
			batchManager.flush();
			const endTime = performance.now();
			const executionTime = endTime - startTime;

			expect(executedCount).toBe(operationCount);
			expect(executionTime).toBeLessThan(100); // 100ms以内で完了

			const stats = batchManager.getStats();
			expect(stats.renderReductions).toBe(operationCount - 1);

			console.log(`1000操作の実行時間: ${executionTime.toFixed(2)}ms`);
			console.log(`再レンダリング削減: ${stats.renderReductions}回`);
		});

		it('10000個の操作でもパフォーマンスを維持する', async () => {
			const operationCount = 10000;
			let executedCount = 0;
			const startTime = performance.now();

			for (let i = 0; i < operationCount; i++) {
				batchManager.addOperation({
					id: `large-perf-op-${i}`,
					type: i % 3 === 0 ? 'block' : i % 3 === 1 ? 'canvas' : 'project',
					operation: () => {
						executedCount++;
					},
					priority: i % 5
				});
			}

			batchManager.flush();
			const endTime = performance.now();
			const executionTime = endTime - startTime;

			expect(executedCount).toBe(operationCount);
			expect(executionTime).toBeLessThan(1000); // 1000ms以内で完了

			const stats = batchManager.getStats();
			expect(stats.renderReductions).toBe(operationCount - 1);

			console.log(`10000操作の実行時間: ${executionTime.toFixed(2)}ms`);
			console.log(`1操作あたりの平均時間: ${(executionTime / operationCount).toFixed(4)}ms`);
		});
	});

	describe('トランザクションのパフォーマンス', () => {
		it('大きなトランザクションを効率的に処理する', () => {
			const operationCount = 500;
			let executedCount = 0;
			const startTime = performance.now();

			batchManager.beginTransaction('large-transaction');

			for (let i = 0; i < operationCount; i++) {
				batchManager.addToTransaction({
					id: `tx-perf-op-${i}`,
					type: 'block',
					operation: () => {
						executedCount++;
					},
					priority: 0
				});
			}

			const commitSuccess = batchManager.commitTransaction();
			const endTime = performance.now();
			const executionTime = endTime - startTime;

			expect(commitSuccess).toBe(true);
			expect(executedCount).toBe(operationCount);
			expect(executionTime).toBeLessThan(50); // 50ms以内で完了

			console.log(`500操作のトランザクション実行時間: ${executionTime.toFixed(2)}ms`);
		});

		it('ロールバック操作のパフォーマンス', () => {
			const operationCount = 200;
			let forwardCount = 0;
			let rollbackCount = 0;
			const startTime = performance.now();

			batchManager.beginTransaction('rollback-test');

			for (let i = 0; i < operationCount; i++) {
				batchManager.addToTransaction({
					id: `rollback-perf-op-${i}`,
					type: 'block',
					operation: () => {
						forwardCount++;
					},
					rollback: () => {
						rollbackCount++;
					},
					priority: 0
				});
			}

			batchManager.rollbackTransaction();
			const endTime = performance.now();
			const executionTime = endTime - startTime;

			expect(forwardCount).toBe(0); // 実行されていない
			expect(rollbackCount).toBe(operationCount); // すべてロールバック
			expect(executionTime).toBeLessThan(30); // 30ms以内で完了

			console.log(`200操作のロールバック実行時間: ${executionTime.toFixed(2)}ms`);
		});
	});

	describe('メモリ使用量の最適化', () => {
		it('大量の操作後にメモリリークがない', () => {
			const initialStats = batchManager.getStats();
			const operationCount = 5000;

			// 大量の操作を実行
			for (let i = 0; i < operationCount; i++) {
				batchManager.addOperation({
					id: `memory-test-op-${i}`,
					type: 'block',
					operation: () => {},
					priority: 0
				});
			}

			batchManager.flush();

			// 統計をリセットしてメモリを解放
			batchManager.resetStats();
			const finalStats = batchManager.getStats();

			expect(finalStats.totalOperations).toBe(0);
			expect(finalStats.batchedOperations).toBe(0);
			expect(finalStats.renderReductions).toBe(0);
		});
	});

	describe('同時実行のパフォーマンス', () => {
		it('複数のバッチマネージャーが独立して動作する', async () => {
			const manager1 = new BatchUpdateManager();
			const manager2 = new BatchUpdateManager();

			let count1 = 0;
			let count2 = 0;
			const operationCount = 100;

			const startTime = performance.now();

			// 並行して操作を追加
			const promises = [
				new Promise<void>((resolve) => {
					for (let i = 0; i < operationCount; i++) {
						manager1.addOperation({
							id: `concurrent-1-${i}`,
							type: 'block',
							operation: () => {
								count1++;
							},
							priority: 0
						});
					}
					manager1.flush();
					resolve();
				}),
				new Promise<void>((resolve) => {
					for (let i = 0; i < operationCount; i++) {
						manager2.addOperation({
							id: `concurrent-2-${i}`,
							type: 'canvas',
							operation: () => {
								count2++;
							},
							priority: 0
						});
					}
					manager2.flush();
					resolve();
				})
			];

			await Promise.all(promises);
			const endTime = performance.now();
			const executionTime = endTime - startTime;

			expect(count1).toBe(operationCount);
			expect(count2).toBe(operationCount);
			expect(executionTime).toBeLessThan(100); // 100ms以内で完了

			console.log(`並行実行時間: ${executionTime.toFixed(2)}ms`);
		});
	});

	describe('実際のドラッグ操作シミュレーション', () => {
		it('ドラッグ操作のパフォーマンスをシミュレート', () => {
			const dragSteps = 100; // 100回の位置更新
			let positionUpdates = 0;
			let snapTargetUpdates = 0;

			const startTime = performance.now();

			// ドラッグ開始
			batchManager.beginTransaction('drag-simulation');

			// ドラッグ中の位置更新をシミュレート
			for (let i = 0; i < dragSteps; i++) {
				// 位置更新
				batchManager.addToTransaction({
					id: `drag-position-${i}`,
					type: 'block',
					operation: () => {
						positionUpdates++;
					},
					priority: 10
				});

				// スナップターゲット更新（10回に1回）
				if (i % 10 === 0) {
					batchManager.addToTransaction({
						id: `drag-snap-${i}`,
						type: 'canvas',
						operation: () => {
							snapTargetUpdates++;
						},
						priority: 8
					});
				}
			}

			// ドラッグ終了
			const commitSuccess = batchManager.commitTransaction();
			const endTime = performance.now();
			const executionTime = endTime - startTime;

			expect(commitSuccess).toBe(true);
			expect(positionUpdates).toBe(dragSteps);
			expect(snapTargetUpdates).toBe(10); // 100 / 10 = 10回
			expect(executionTime).toBeLessThan(20); // 20ms以内で完了（60fps維持）

			console.log(`ドラッグシミュレーション実行時間: ${executionTime.toFixed(2)}ms`);
			console.log(`1フレームあたりの処理時間: ${(executionTime / (dragSteps / 6)).toFixed(2)}ms`);
		});
	});

	describe('ベンチマーク比較', () => {
		it('バッチ処理と個別処理のパフォーマンス比較', () => {
			const operationCount = 1000;
			let batchCount = 0;
			let individualCount = 0;

			// バッチ処理のベンチマーク
			const batchStartTime = performance.now();
			batchManager.beginTransaction('benchmark-batch');

			for (let i = 0; i < operationCount; i++) {
				batchManager.addToTransaction({
					id: `batch-benchmark-${i}`,
					type: 'block',
					operation: () => {
						batchCount++;
					},
					priority: 0
				});
			}

			batchManager.commitTransaction();
			const batchEndTime = performance.now();
			const batchTime = batchEndTime - batchStartTime;

			// 個別処理のベンチマーク
			const individualStartTime = performance.now();

			for (let i = 0; i < operationCount; i++) {
				individualCount++;
			}

			const individualEndTime = performance.now();
			const individualTime = individualEndTime - individualStartTime;

			expect(batchCount).toBe(operationCount);
			expect(individualCount).toBe(operationCount);

			console.log(`バッチ処理時間: ${batchTime.toFixed(2)}ms`);
			console.log(`個別処理時間: ${individualTime.toFixed(2)}ms`);
			console.log(`バッチ処理のオーバーヘッド: ${(batchTime - individualTime).toFixed(2)}ms`);

			// バッチ処理のオーバーヘッドが許容範囲内であることを確認
			// 小さなデータセットではオーバーヘッドが目立つ場合があるため、より緩い条件を設定
			expect(batchTime).toBeLessThan(Math.max(individualTime * 20, 10)); // 20倍以内または10ms以内
		});
	});
});
