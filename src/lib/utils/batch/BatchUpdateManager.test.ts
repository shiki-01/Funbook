/**
 * バッチ更新マネージャーのユニットテスト
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { BatchUpdateManager } from './BatchUpdateManager';
import type { BatchOperation } from './BatchUpdateManager';

describe('BatchUpdateManager', () => {
	let batchManager: BatchUpdateManager;

	beforeEach(() => {
		batchManager = new BatchUpdateManager();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('基本的なバッチ操作', () => {
		it('単一の操作を実行できる', () => {
			let executed = false;
			const operation: BatchOperation = {
				id: 'test-op',
				type: 'block',
				operation: () => {
					executed = true;
				},
				priority: 0
			};

			batchManager.addOperation(operation);
			vi.advanceTimersByTime(20);

			expect(executed).toBe(true);
		});

		it('複数の操作を優先度順に実行する', () => {
			const executionOrder: number[] = [];

			const operations: BatchOperation[] = [
				{
					id: 'low-priority',
					type: 'block',
					operation: () => executionOrder.push(1),
					priority: 1
				},
				{
					id: 'high-priority',
					type: 'block',
					operation: () => executionOrder.push(3),
					priority: 3
				},
				{
					id: 'medium-priority',
					type: 'block',
					operation: () => executionOrder.push(2),
					priority: 2
				}
			];

			operations.forEach((op) => batchManager.addOperation(op));
			vi.advanceTimersByTime(20);

			expect(executionOrder).toEqual([3, 2, 1]);
		});

		it('統計を正しく記録する', () => {
			const operations: BatchOperation[] = [
				{
					id: 'op1',
					type: 'block',
					operation: () => {},
					priority: 0
				},
				{
					id: 'op2',
					type: 'canvas',
					operation: () => {},
					priority: 0
				}
			];

			operations.forEach((op) => batchManager.addOperation(op));
			vi.advanceTimersByTime(20);

			const stats = batchManager.getStats();
			expect(stats.totalOperations).toBe(2);
			expect(stats.batchedOperations).toBe(2);
			expect(stats.renderReductions).toBe(1); // 2操作 - 1 = 1回の再レンダリング削減
		});
	});

	describe('トランザクション機能', () => {
		it('トランザクションを開始・コミットできる', () => {
			let executed = false;

			const transaction = batchManager.beginTransaction('test-transaction');
			expect(transaction.id).toBe('test-transaction');

			batchManager.addToTransaction({
				id: 'tx-op',
				type: 'block',
				operation: () => {
					executed = true;
				},
				priority: 0
			});

			expect(executed).toBe(false); // まだ実行されていない

			const success = batchManager.commitTransaction();
			expect(success).toBe(true);
			expect(executed).toBe(true);
		});

		it('トランザクションをロールバックできる', () => {
			let value = 0;

			batchManager.beginTransaction();
			batchManager.addToTransaction({
				id: 'tx-op',
				type: 'block',
				operation: () => {
					value = 10;
				},
				rollback: () => {
					value = 0;
				},
				priority: 0
			});

			batchManager.commitTransaction();
			expect(value).toBe(10);

			// 新しいトランザクションでロールバックをテスト
			batchManager.beginTransaction();
			batchManager.addToTransaction({
				id: 'tx-op-2',
				type: 'block',
				operation: () => {
					value = 20;
				},
				rollback: () => {
					value = 10;
				},
				priority: 0
			});

			batchManager.rollbackTransaction();
			expect(value).toBe(10); // ロールバックされた
		});

		it('エラー時に自動的にロールバックする', () => {
			let value = 0;

			batchManager.beginTransaction();
			batchManager.addToTransaction({
				id: 'tx-op-1',
				type: 'block',
				operation: () => {
					value = 5;
				},
				rollback: () => {
					value = 0;
				},
				priority: 0
			});

			batchManager.addToTransaction({
				id: 'tx-op-2',
				type: 'block',
				operation: () => {
					throw new Error('Test error');
				},
				rollback: () => {
					value = 0;
				},
				priority: 0
			});

			const success = batchManager.commitTransaction();
			expect(success).toBe(false);
			expect(value).toBe(0); // ロールバックされた
		});
	});

	describe('パフォーマンス最適化', () => {
		it('大量の操作を効率的に処理する', () => {
			const operationCount = 1000;
			let executedCount = 0;

			for (let i = 0; i < operationCount; i++) {
				batchManager.addOperation({
					id: `op-${i}`,
					type: 'block',
					operation: () => {
						executedCount++;
					},
					priority: 0
				});
			}

			vi.advanceTimersByTime(20);

			expect(executedCount).toBe(operationCount);

			const stats = batchManager.getStats();
			expect(stats.renderReductions).toBe(operationCount - 1);
		});

		it('最大バッチサイズに達すると即座に実行する', () => {
			let executedCount = 0;
			const maxBatchSize = 100;

			// 最大バッチサイズ分の操作を追加
			for (let i = 0; i < maxBatchSize; i++) {
				batchManager.addOperation({
					id: `op-${i}`,
					type: 'block',
					operation: () => {
						executedCount++;
					},
					priority: 0
				});
			}

			// タイマーを進めなくても実行される
			expect(executedCount).toBe(maxBatchSize);
		});

		it('flush()で保留中の操作を即座に実行する', () => {
			let executed = false;

			batchManager.addOperation({
				id: 'test-op',
				type: 'block',
				operation: () => {
					executed = true;
				},
				priority: 0
			});

			expect(executed).toBe(false);

			batchManager.flush();
			expect(executed).toBe(true);
		});
	});

	describe('エラーハンドリング', () => {
		it('操作中のエラーを適切に処理する', () => {
			let rollbackExecuted = false;

			batchManager.addOperation({
				id: 'error-op',
				type: 'block',
				operation: () => {
					throw new Error('Test error');
				},
				rollback: () => {
					rollbackExecuted = true;
				},
				priority: 0
			});

			vi.advanceTimersByTime(20);
			expect(rollbackExecuted).toBe(true);
		});

		it('重複するトランザクション開始を防ぐ', () => {
			batchManager.beginTransaction();

			expect(() => {
				batchManager.beginTransaction();
			}).toThrow('既にトランザクションが開始されています');
		});

		it('トランザクション外での操作追加を防ぐ', () => {
			expect(() => {
				batchManager.addToTransaction({
					id: 'test-op',
					type: 'block',
					operation: () => {},
					priority: 0
				});
			}).toThrow('トランザクションが開始されていません');
		});
	});

	describe('統計とモニタリング', () => {
		it('統計をリセットできる', () => {
			batchManager.addOperation({
				id: 'test-op',
				type: 'block',
				operation: () => {},
				priority: 0
			});

			vi.advanceTimersByTime(20);

			let stats = batchManager.getStats();
			expect(stats.totalOperations).toBeGreaterThan(0);

			batchManager.resetStats();
			stats = batchManager.getStats();
			expect(stats.totalOperations).toBe(0);
			expect(stats.batchedOperations).toBe(0);
			expect(stats.renderReductions).toBe(0);
		});

		it('実行時間を記録する', () => {
			batchManager.addOperation({
				id: 'test-op',
				type: 'block',
				operation: () => {
					// 少し時間のかかる処理をシミュレート
					const start = performance.now();
					while (performance.now() - start < 1) {
						// 忙しい待機
					}
				},
				priority: 0
			});

			vi.advanceTimersByTime(20);

			const stats = batchManager.getStats();
			expect(stats.executionTime).toBeGreaterThan(0);
		});
	});
});
