/**
 * バッチ対応ストアミックスイン
 * ストアクラスにバッチ更新機能を追加
 */

import type { BatchOperation, TransactionState } from './BatchUpdateManager';
import { BatchUpdateManager, useBatchUpdateManager } from './BatchUpdateManager';

/**
 * バッチ対応ストアの基底インターフェース
 */
export interface BatchAwareStore {
	batchUpdate<T>(updates: () => T): T;
	beginTransaction(id?: string): TransactionState;
	addToTransaction(operation: BatchOperation): void;
	commitTransaction(): boolean;
	rollbackTransaction(): void;
	getCurrentTransaction(): TransactionState | null;
}

/**
 * バッチ対応ストアミックスイン
 * 既存のストアクラスにバッチ更新機能を追加するためのミックスイン
 */
export function withBatchUpdates<T extends new (...args: any[]) => {}>(Base: T) {
	return class extends Base implements BatchAwareStore {
		private batchManager = useBatchUpdateManager();

		/**
		 * バッチ更新を実行
		 * @param updates - 更新関数
		 * @returns 更新関数の戻り値
		 */
		batchUpdate<R>(updates: () => R): R {
			const transaction = this.batchManager.beginTransaction();

			try {
				const result = updates();
				this.batchManager.commitTransaction();
				return result;
			} catch (error) {
				this.batchManager.rollbackTransaction();
				throw error;
			}
		}

		/**
		 * トランザクションを開始
		 * @param id - トランザクションID
		 * @returns トランザクション状態
		 */
		beginTransaction(id?: string): TransactionState {
			return this.batchManager.beginTransaction(id);
		}

		/**
		 * トランザクションに操作を追加
		 * @param operation - 追加する操作
		 */
		addToTransaction(operation: BatchOperation): void {
			this.batchManager.addToTransaction(operation);
		}

		/**
		 * トランザクションをコミット
		 * @returns コミットに成功した場合はtrue
		 */
		commitTransaction(): boolean {
			return this.batchManager.commitTransaction();
		}

		/**
		 * トランザクションをロールバック
		 */
		rollbackTransaction(): void {
			this.batchManager.rollbackTransaction();
		}

		/**
		 * 現在のトランザクション状態を取得
		 * @returns トランザクション状態、なければnull
		 */
		getCurrentTransaction(): TransactionState | null {
			return this.batchManager.getCurrentTransaction();
		}

		/**
		 * バッチ操作を作成するヘルパー
		 * @param id - 操作ID
		 * @param type - 操作タイプ
		 * @param operation - 実行する操作
		 * @param rollback - ロールバック操作（オプション）
		 * @param priority - 優先度（デフォルト: 0）
		 * @returns バッチ操作
		 */
		protected createBatchOperation(
			id: string,
			type: 'block' | 'canvas' | 'project',
			operation: () => void,
			rollback?: () => void,
			priority: number = 0
		): BatchOperation {
			return {
				id,
				type,
				operation,
				rollback,
				priority
			};
		}

		/**
		 * 複数の状態更新をバッチで実行
		 * @param operations - 実行する操作の配列
		 */
		protected executeBatchOperations(operations: BatchOperation[]): void {
			const transaction = this.batchManager.beginTransaction();

			try {
				for (const operation of operations) {
					this.batchManager.addToTransaction(operation);
				}
				this.batchManager.commitTransaction();
			} catch (error) {
				this.batchManager.rollbackTransaction();
				throw error;
			}
		}
	};
}

/**
 * ドラッグ操作専用のバッチ更新ヘルパー
 */
export class DragBatchHelper {
	private batchManager: BatchUpdateManager;
	private dragTransaction: TransactionState | null = null;

	constructor() {
		// 独自のバッチマネージャーインスタンスを使用
		this.batchManager = new BatchUpdateManager();
	}

	/**
	 * ドラッグ操作のバッチ更新を開始
	 * @param blockId - ドラッグするブロックのID
	 */
	startDragBatch(blockId: string): void {
		if (this.dragTransaction) {
			this.endDragBatch();
		}

		this.dragTransaction = this.batchManager.beginTransaction(`drag-${blockId}`);
	}

	/**
	 * ドラッグ位置更新をバッチに追加
	 * @param blockId - ブロックID
	 * @param position - 新しい位置
	 * @param updateFunction - 位置更新関数
	 * @param rollbackFunction - ロールバック関数
	 */
	addPositionUpdate(
		blockId: string,
		position: { x: number; y: number },
		updateFunction: () => void,
		rollbackFunction?: () => void
	): void {
		if (!this.dragTransaction) {
			throw new Error('ドラッグバッチが開始されていません');
		}

		const operation: BatchOperation = {
			id: `position-update-${blockId}-${Date.now()}`,
			type: 'block',
			operation: updateFunction,
			rollback: rollbackFunction,
			priority: 10 // ドラッグ操作は高優先度
		};

		this.batchManager.addToTransaction(operation);
	}

	/**
	 * 即時に updateFunction を実行し、コミット時は再実行せずロールバックのみ可能にする更新。
	 * ドラッグ中の視覚的追随用。
	 */
	addImmediatePositionUpdate(
		blockId: string,
		updateFunction: () => void,
		rollbackFunction?: () => void
	): void {
		if (!this.dragTransaction) {
			throw new Error('ドラッグバッチが開始されていません');
		}
		// 即時適用
		updateFunction();
		const operation: BatchOperation = {
			id: `immediate-position-update-${blockId}-${Date.now()}`,
			type: 'block',
			// コミット時は再適用不要なので no-op
			operation: () => {},
			rollback: rollbackFunction,
			priority: 10
		};
		this.batchManager.addToTransaction(operation);
	}

	/**
	 * スナップターゲット更新をバッチに追加
	 * @param targetId - ターゲットID
	 * @param updateFunction - 更新関数
	 * @param rollbackFunction - ロールバック関数
	 */
	addSnapTargetUpdate(
		targetId: string | null,
		updateFunction: () => void,
		rollbackFunction?: () => void
	): void {
		if (!this.dragTransaction) {
			throw new Error('ドラッグバッチが開始されていません');
		}

		const operation: BatchOperation = {
			id: `snap-target-update-${targetId || 'none'}-${Date.now()}`,
			type: 'canvas',
			operation: updateFunction,
			rollback: rollbackFunction,
			priority: 8 // スナップターゲットは中優先度
		};

		this.batchManager.addToTransaction(operation);
	}

	/**
	 * ドラッグ操作のバッチ更新を終了
	 * @param commit - コミットするかどうか（デフォルト: true）
	 * @returns コミットに成功した場合はtrue
	 */
	endDragBatch(commit: boolean = true): boolean {
		if (!this.dragTransaction) {
			return false;
		}

		try {
			if (commit) {
				const success = this.batchManager.commitTransaction();
				this.dragTransaction = null;
				return success;
			} else {
				this.batchManager.rollbackTransaction();
				this.dragTransaction = null;
				return false;
			}
		} catch (error) {
			console.error('ドラッグバッチの終了に失敗:', error);
			this.dragTransaction = null;
			return false;
		}
	}

	/**
	 * 現在のドラッグトランザクション状態を取得
	 * @returns トランザクション状態、なければnull
	 */
	getCurrentDragTransaction(): TransactionState | null {
		return this.dragTransaction;
	}

	/**
	 * ドラッグ操作が進行中かチェック
	 * @returns 進行中の場合はtrue
	 */
	isDragBatchActive(): boolean {
		return this.dragTransaction !== null;
	}
}

/**
 * グローバルドラッグバッチヘルパーインスタンス
 */
let globalDragBatchHelper: DragBatchHelper | null = null;

/**
 * ドラッグバッチヘルパーのインスタンスを取得
 * @returns ドラッグバッチヘルパーインスタンス
 */
export const useDragBatchHelper = (): DragBatchHelper => {
	if (!globalDragBatchHelper) {
		globalDragBatchHelper = new DragBatchHelper();
	}
	return globalDragBatchHelper;
};
