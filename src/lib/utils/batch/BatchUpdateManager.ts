/**
 * バッチ更新マネージャー
 * 状態更新をバッチ処理して再レンダリングを最小化
 */

/**
 * バッチ更新操作の型定義
 */
export interface BatchOperation {
	id: string;
	type: 'block' | 'canvas' | 'project';
	operation: () => void;
	rollback?: () => void;
	priority: number;
}

/**
 * トランザクション状態
 */
export interface TransactionState {
	id: string;
	operations: BatchOperation[];
	startTime: number;
	committed: boolean;
	rolledBack: boolean;
}

/**
 * バッチ更新統計
 */
export interface BatchStats {
	totalOperations: number;
	batchedOperations: number;
	executionTime: number;
	renderReductions: number;
}

/**
 * バッチ更新マネージャークラス
 * 複数の状態更新を効率的にバッチ処理
 */
export class BatchUpdateManager {
	private pendingOperations: BatchOperation[] = [];
	private currentTransaction: TransactionState | null = null;
	private batchTimeout: number | null = null;
	private isProcessing = false;
	private stats: BatchStats = {
		totalOperations: 0,
		batchedOperations: 0,
		executionTime: 0,
		renderReductions: 0
	};

	private readonly BATCH_DELAY = 16; // 1フレーム分の遅延（60fps）
	private readonly MAX_BATCH_SIZE = 100;

	/**
	 * バッチ操作を追加
	 * @param operation - 追加する操作
	 */
	addOperation(operation: BatchOperation): void {
		this.pendingOperations.push(operation);
		this.stats.totalOperations++;

		// 優先度でソート
		this.pendingOperations.sort((a, b) => b.priority - a.priority);

		// バッチ処理をスケジュール
		this.scheduleBatch();
	}

	/**
	 * トランザクションを開始
	 * @param id - トランザクションID
	 * @returns トランザクション状態
	 */
	beginTransaction(id?: string): TransactionState {
		if (this.currentTransaction) {
			throw new Error('既にトランザクションが開始されています');
		}

		this.currentTransaction = {
			id: id || crypto.randomUUID(),
			operations: [],
			startTime: performance.now(),
			committed: false,
			rolledBack: false
		};

		return this.currentTransaction;
	}

	/**
	 * トランザクションに操作を追加
	 * @param operation - 追加する操作
	 */
	addToTransaction(operation: BatchOperation): void {
		if (!this.currentTransaction) {
			throw new Error('トランザクションが開始されていません');
		}

		this.currentTransaction.operations.push(operation);
	}

	/**
	 * トランザクションをコミット
	 * @returns コミットに成功した場合はtrue
	 */
	commitTransaction(): boolean {
		if (!this.currentTransaction) {
			throw new Error('コミットするトランザクションがありません');
		}

		try {
			const startTime = performance.now();

			// トランザクション内の操作を実行
			for (const operation of this.currentTransaction.operations) {
				operation.operation();
			}

			this.currentTransaction.committed = true;
			const executionTime = performance.now() - startTime;

			// 統計を更新
			this.stats.batchedOperations += this.currentTransaction.operations.length;
			this.stats.executionTime += executionTime;
			this.stats.renderReductions += Math.max(0, this.currentTransaction.operations.length - 1);

			this.currentTransaction = null;
			return true;
		} catch (error) {
			console.error('トランザクションのコミットに失敗:', error);
			this.rollbackTransaction();
			return false;
		}
	}

	/**
	 * トランザクションをロールバック
	 */
	rollbackTransaction(): void {
		if (!this.currentTransaction) {
			throw new Error('ロールバックするトランザクションがありません');
		}

		try {
			// ロールバック操作を逆順で実行
			const operations = [...this.currentTransaction.operations].reverse();
			for (const operation of operations) {
				if (operation.rollback) {
					operation.rollback();
				}
			}

			this.currentTransaction.rolledBack = true;
		} catch (error) {
			console.error('トランザクションのロールバックに失敗:', error);
		} finally {
			this.currentTransaction = null;
		}
	}

	/**
	 * 現在のトランザクション状態を取得
	 * @returns トランザクション状態、なければnull
	 */
	getCurrentTransaction(): TransactionState | null {
		return this.currentTransaction ? { ...this.currentTransaction } : null;
	}

	/**
	 * 保留中の操作を即座に実行
	 */
	flush(): void {
		if (this.batchTimeout) {
			clearTimeout(this.batchTimeout);
			this.batchTimeout = null;
		}
		this.processBatch();
	}

	/**
	 * バッチ統計を取得
	 * @returns バッチ統計
	 */
	getStats(): BatchStats {
		return { ...this.stats };
	}

	/**
	 * 統計をリセット
	 */
	resetStats(): void {
		this.stats = {
			totalOperations: 0,
			batchedOperations: 0,
			executionTime: 0,
			renderReductions: 0
		};
	}

	/**
	 * バッチ処理をスケジュール
	 */
	private scheduleBatch(): void {
		if (this.batchTimeout || this.isProcessing) {
			return;
		}

		// 最大バッチサイズに達した場合は即座に処理
		if (this.pendingOperations.length >= this.MAX_BATCH_SIZE) {
			this.processBatch();
			return;
		}

		// 遅延バッチ処理をスケジュール
		this.batchTimeout = window.setTimeout(() => {
			this.processBatch();
		}, this.BATCH_DELAY);
	}

	/**
	 * バッチ処理を実行
	 */
	private processBatch(): void {
		if (this.isProcessing || this.pendingOperations.length === 0) {
			return;
		}

		this.isProcessing = true;
		this.batchTimeout = null;

		const startTime = performance.now();
		const operations = [...this.pendingOperations];
		this.pendingOperations = [];

		try {
			// 操作を実行
			for (const operation of operations) {
				operation.operation();
			}

			// 統計を更新
			const executionTime = performance.now() - startTime;
			this.stats.batchedOperations += operations.length;
			this.stats.executionTime += executionTime;
			this.stats.renderReductions += Math.max(0, operations.length - 1);
		} catch (error) {
			console.error('バッチ処理中にエラーが発生:', error);

			// エラーが発生した場合、ロールバック可能な操作を実行
			for (const operation of operations) {
				if (operation.rollback) {
					try {
						operation.rollback();
					} catch (rollbackError) {
						console.error('ロールバック中にエラーが発生:', rollbackError);
					}
				}
			}
		} finally {
			this.isProcessing = false;
		}
	}
}

/**
 * グローバルバッチ更新マネージャーインスタンス
 */
let globalBatchManager: BatchUpdateManager | null = null;

/**
 * バッチ更新マネージャーのインスタンスを取得
 * @returns バッチ更新マネージャーインスタンス
 */
export const useBatchUpdateManager = (): BatchUpdateManager => {
	if (!globalBatchManager) {
		globalBatchManager = new BatchUpdateManager();
	}
	return globalBatchManager;
};
