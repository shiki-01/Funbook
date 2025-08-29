/**
 * ストア通信サービス - 分離されたストア間の通信パターンを管理
 * ストア間の適切な通信と状態同期を提供
 */

import { useBlockStore } from '$lib/stores/block.store.svelte';
import { useCanvasStore } from '$lib/stores/canvas.store.svelte';
import { useProjectStore } from '$lib/stores/project.store.svelte';
import { ErrorHandler } from '$lib/services/error/ErrorHandler';
import { AppError } from '$lib/errors/AppError';
import { ERROR_CODES } from '$lib/errors/errorCodes';
import type { Block, BlockList } from '$lib/types';

/**
 * ストア通信エラー
 */
export class StoreCommunicationError extends AppError {
	constructor(
		message: string,
		public communicationType?: string
	) {
		super(message, ERROR_CODES.SYSTEM.STORE_COMMUNICATION_FAILED, 'medium');
		this.name = 'StoreCommunicationError';
	}
}

/**
 * 同期イベントタイプ
 */
type SyncEventType =
	| 'block_created'
	| 'block_updated'
	| 'block_deleted'
	| 'blocks_connected'
	| 'blocks_disconnected'
	| 'blocklist_added'
	| 'blocklist_removed'
	| 'canvas_viewport_changed'
	| 'canvas_selection_changed';

/**
 * 同期イベント
 */
interface SyncEvent {
	type: SyncEventType;
	payload: any;
	timestamp: number;
	source: 'block' | 'canvas' | 'project';
}

/**
 * ストア通信サービス
 * 分離されたストア間の適切な通信パターンと状態同期を管理
 */
export class StoreCommunicationService {
	private blockStore = useBlockStore();
	private canvasStore = useCanvasStore();
	private projectStore = useProjectStore();
	private errorHandler = new ErrorHandler();

	private syncEnabled = true;
	private eventQueue: SyncEvent[] = [];
	private isProcessingQueue = false;

	/**
	 * ブロック作成時の同期処理
	 * @param blockId - 作成されたブロックID
	 */
	async onBlockCreated(blockId: string): Promise<void> {
		if (!this.syncEnabled) return;

		try {
			const block = this.blockStore.getBlock(blockId);
			if (!block) {
				throw new StoreCommunicationError(
					`作成されたブロックが見つかりません: ${blockId}`,
					'block_created'
				);
			}

			// プロジェクトストアに同期
			const allBlocks = this.blockStore.getAllBlocks();
			this.projectStore.syncBlocks(allBlocks);

			// 同期イベントをキューに追加
			this.enqueueEvent({
				type: 'block_created',
				payload: { blockId, block },
				timestamp: Date.now(),
				source: 'block'
			});

			console.log(`Block created and synced: ${blockId}`);
		} catch (error) {
			this.errorHandler.handleError(
				new StoreCommunicationError(
					`ブロック作成同期エラー: ${error instanceof Error ? error.message : String(error)}`,
					'block_created'
				),
				{
					component: 'StoreCommunicationService',
					action: 'onBlockCreated',
					additionalData: { blockId }
				}
			);
		}
	}

	/**
	 * ブロック更新時の同期処理
	 * @param blockId - 更新されたブロックID
	 * @param updates - 更新内容
	 */
	async onBlockUpdated(blockId: string, updates: Partial<Block>): Promise<void> {
		if (!this.syncEnabled) return;

		try {
			const block = this.blockStore.getBlock(blockId);
			if (!block) {
				throw new StoreCommunicationError(
					`更新されたブロックが見つかりません: ${blockId}`,
					'block_updated'
				);
			}

			// 位置更新の場合はキャンバスストアにも通知
			if (updates.position) {
				// 選択状態の更新（必要に応じて）
				if (this.canvasStore.isBlockSelected(blockId)) {
					// 選択されたブロックの位置が変更された場合の処理
				}
			}

			// プロジェクトストアに同期
			const allBlocks = this.blockStore.getAllBlocks();
			this.projectStore.syncBlocks(allBlocks);

			// 同期イベントをキューに追加
			this.enqueueEvent({
				type: 'block_updated',
				payload: { blockId, updates, block },
				timestamp: Date.now(),
				source: 'block'
			});

			console.log(`Block updated and synced: ${blockId}`);
		} catch (error) {
			this.errorHandler.handleError(
				new StoreCommunicationError(
					`ブロック更新同期エラー: ${error instanceof Error ? error.message : String(error)}`,
					'block_updated'
				),
				{
					component: 'StoreCommunicationService',
					action: 'onBlockUpdated',
					additionalData: { blockId, updates }
				}
			);
		}
	}

	/**
	 * ブロック削除時の同期処理
	 * @param blockId - 削除されたブロックID
	 */
	async onBlockDeleted(blockId: string): Promise<void> {
		if (!this.syncEnabled) return;

		try {
			// キャンバスストアから選択状態を削除
			if (this.canvasStore.isBlockSelected(blockId)) {
				const selectedIds = this.canvasStore.getSelectedBlockIds().filter((id) => id !== blockId);
				this.canvasStore.selectBlocks(selectedIds);
			}

			// ホバー状態をクリア
			const interactionState = this.canvasStore.getInteractionState();
			if (interactionState.hoveredBlockId === blockId) {
				this.canvasStore.setHoveredBlock(null);
			}

			// プロジェクトストアに同期
			const allBlocks = this.blockStore.getAllBlocks();
			this.projectStore.syncBlocks(allBlocks);

			// 同期イベントをキューに追加
			this.enqueueEvent({
				type: 'block_deleted',
				payload: { blockId },
				timestamp: Date.now(),
				source: 'block'
			});

			console.log(`Block deleted and synced: ${blockId}`);
		} catch (error) {
			this.errorHandler.handleError(
				new StoreCommunicationError(
					`ブロック削除同期エラー: ${error instanceof Error ? error.message : String(error)}`,
					'block_deleted'
				),
				{
					component: 'StoreCommunicationService',
					action: 'onBlockDeleted',
					additionalData: { blockId }
				}
			);
		}
	}

	/**
	 * ブロック接続時の同期処理
	 * @param parentId - 親ブロックID
	 * @param childId - 子ブロックID
	 */
	async onBlocksConnected(parentId: string, childId: string): Promise<void> {
		if (!this.syncEnabled) return;

		try {
			// プロジェクトストアに同期
			const allBlocks = this.blockStore.getAllBlocks();
			this.projectStore.syncBlocks(allBlocks);

			// 同期イベントをキューに追加
			this.enqueueEvent({
				type: 'blocks_connected',
				payload: { parentId, childId },
				timestamp: Date.now(),
				source: 'block'
			});

			console.log(`Blocks connected and synced: ${parentId} -> ${childId}`);
		} catch (error) {
			this.errorHandler.handleError(
				new StoreCommunicationError(
					`ブロック接続同期エラー: ${error instanceof Error ? error.message : String(error)}`,
					'blocks_connected'
				),
				{
					component: 'StoreCommunicationService',
					action: 'onBlocksConnected',
					additionalData: { parentId, childId }
				}
			);
		}
	}

	/**
	 * ブロック切断時の同期処理
	 * @param parentId - 親ブロックID
	 * @param childId - 子ブロックID
	 */
	async onBlocksDisconnected(parentId: string, childId: string): Promise<void> {
		if (!this.syncEnabled) return;

		try {
			// プロジェクトストアに同期
			const allBlocks = this.blockStore.getAllBlocks();
			this.projectStore.syncBlocks(allBlocks);

			// 同期イベントをキューに追加
			this.enqueueEvent({
				type: 'blocks_disconnected',
				payload: { parentId, childId },
				timestamp: Date.now(),
				source: 'block'
			});

			console.log(`Blocks disconnected and synced: ${parentId} -X- ${childId}`);
		} catch (error) {
			this.errorHandler.handleError(
				new StoreCommunicationError(
					`ブロック切断同期エラー: ${error instanceof Error ? error.message : String(error)}`,
					'blocks_disconnected'
				),
				{
					component: 'StoreCommunicationService',
					action: 'onBlocksDisconnected',
					additionalData: { parentId, childId }
				}
			);
		}
	}

	/**
	 * ブロックリスト追加時の同期処理
	 * @param blockList - 追加されたブロックリスト
	 */
	async onBlockListAdded(blockList: BlockList): Promise<void> {
		if (!this.syncEnabled) return;

		try {
			// プロジェクトストアに同期
			const allBlockLists = this.blockStore.getAllBlockLists();
			this.projectStore.syncBlockLists(allBlockLists);

			// 同期イベントをキューに追加
			this.enqueueEvent({
				type: 'blocklist_added',
				payload: { blockList },
				timestamp: Date.now(),
				source: 'block'
			});

			console.log(`BlockList added and synced: ${blockList.name}`);
		} catch (error) {
			this.errorHandler.handleError(
				new StoreCommunicationError(
					`ブロックリスト追加同期エラー: ${error instanceof Error ? error.message : String(error)}`,
					'blocklist_added'
				),
				{
					component: 'StoreCommunicationService',
					action: 'onBlockListAdded',
					additionalData: { blockListName: blockList.name }
				}
			);
		}
	}

	/**
	 * ブロックリスト削除時の同期処理
	 * @param blockListName - 削除されたブロックリスト名
	 */
	async onBlockListRemoved(blockListName: string): Promise<void> {
		if (!this.syncEnabled) return;

		try {
			// プロジェクトストアに同期
			const allBlockLists = this.blockStore.getAllBlockLists();
			this.projectStore.syncBlockLists(allBlockLists);

			// 同期イベントをキューに追加
			this.enqueueEvent({
				type: 'blocklist_removed',
				payload: { blockListName },
				timestamp: Date.now(),
				source: 'block'
			});

			console.log(`BlockList removed and synced: ${blockListName}`);
		} catch (error) {
			this.errorHandler.handleError(
				new StoreCommunicationError(
					`ブロックリスト削除同期エラー: ${error instanceof Error ? error.message : String(error)}`,
					'blocklist_removed'
				),
				{
					component: 'StoreCommunicationService',
					action: 'onBlockListRemoved',
					additionalData: { blockListName }
				}
			);
		}
	}

	/**
	 * キャンバスビューポート変更時の同期処理
	 */
	async onCanvasViewportChanged(): Promise<void> {
		if (!this.syncEnabled) return;

		try {
			const viewport = this.canvasStore.getViewport();

			// 同期イベントをキューに追加
			this.enqueueEvent({
				type: 'canvas_viewport_changed',
				payload: { viewport },
				timestamp: Date.now(),
				source: 'canvas'
			});

			// 必要に応じて他のストアに通知
			// 現在は特別な同期処理は不要
		} catch (error) {
			this.errorHandler.handleError(
				new StoreCommunicationError(
					`キャンバスビューポート変更同期エラー: ${error instanceof Error ? error.message : String(error)}`,
					'canvas_viewport_changed'
				),
				{
					component: 'StoreCommunicationService',
					action: 'onCanvasViewportChanged'
				}
			);
		}
	}

	/**
	 * キャンバス選択変更時の同期処理
	 * @param selectedBlockIds - 選択されたブロックIDの配列
	 */
	async onCanvasSelectionChanged(selectedBlockIds: string[]): Promise<void> {
		if (!this.syncEnabled) return;

		try {
			// 同期イベントをキューに追加
			this.enqueueEvent({
				type: 'canvas_selection_changed',
				payload: { selectedBlockIds },
				timestamp: Date.now(),
				source: 'canvas'
			});

			// 必要に応じて他のストアに通知
			// 現在は特別な同期処理は不要
		} catch (error) {
			this.errorHandler.handleError(
				new StoreCommunicationError(
					`キャンバス選択変更同期エラー: ${error instanceof Error ? error.message : String(error)}`,
					'canvas_selection_changed'
				),
				{
					component: 'StoreCommunicationService',
					action: 'onCanvasSelectionChanged',
					additionalData: { selectedBlockIds }
				}
			);
		}
	}

	/**
	 * 状態一貫性チェックを実行
	 * @returns 一貫性チェック結果
	 */
	async checkStateConsistency(): Promise<{
		isConsistent: boolean;
		issues: string[];
	}> {
		const issues: string[] = [];

		try {
			// ブロックストアとプロジェクトストアの一貫性チェック
			const blockStoreBlocks = this.blockStore.getAllBlocks();
			const projectData = this.projectStore.getProjectData();

			if (blockStoreBlocks.length !== projectData.blocks.length) {
				issues.push(
					`ブロック数の不整合: BlockStore=${blockStoreBlocks.length}, ProjectStore=${projectData.blocks.length}`
				);
			}

			// ブロックリストの一貫性チェック
			const blockStoreLists = this.blockStore.getAllBlockLists();
			if (blockStoreLists.length !== projectData.blockLists.length) {
				issues.push(
					`ブロックリスト数の不整合: BlockStore=${blockStoreLists.length}, ProjectStore=${projectData.blockLists.length}`
				);
			}

			// 選択状態の一貫性チェック
			const selectedIds = this.canvasStore.getSelectedBlockIds();
			for (const selectedId of selectedIds) {
				if (!this.blockStore.hasBlock(selectedId)) {
					issues.push(`選択されたブロックが存在しません: ${selectedId}`);
				}
			}

			return {
				isConsistent: issues.length === 0,
				issues
			};
		} catch (error) {
			issues.push(
				`一貫性チェック中にエラーが発生しました: ${error instanceof Error ? error.message : String(error)}`
			);
			return {
				isConsistent: false,
				issues
			};
		}
	}

	/**
	 * 同期を一時的に無効化
	 */
	disableSync(): void {
		this.syncEnabled = false;
		console.log('Store synchronization disabled');
	}

	/**
	 * 同期を有効化
	 */
	enableSync(): void {
		this.syncEnabled = true;
		console.log('Store synchronization enabled');
	}

	/**
	 * 同期イベントをキューに追加
	 * @param event - 同期イベント
	 */
	private enqueueEvent(event: SyncEvent): void {
		this.eventQueue.push(event);
		this.processEventQueue();
	}

	/**
	 * イベントキューを処理
	 */
	private async processEventQueue(): Promise<void> {
		if (this.isProcessingQueue || this.eventQueue.length === 0) {
			return;
		}

		this.isProcessingQueue = true;

		try {
			while (this.eventQueue.length > 0) {
				const event = this.eventQueue.shift();
				if (event) {
					await this.processEvent(event);
				}
			}
		} catch (error) {
			this.errorHandler.handleError(
				new StoreCommunicationError(
					`イベントキュー処理エラー: ${error instanceof Error ? error.message : String(error)}`,
					'process_event_queue'
				),
				{
					component: 'StoreCommunicationService',
					action: 'processEventQueue'
				}
			);
		} finally {
			this.isProcessingQueue = false;
		}
	}

	/**
	 * 個別イベントを処理
	 * @param event - 処理するイベント
	 */
	private async processEvent(event: SyncEvent): Promise<void> {
		// 現在は特別な処理は不要
		// 将来的にイベントベースの追加処理が必要になった場合はここに実装
		console.log(`Processed sync event: ${event.type}`, event.payload);
	}

	/**
	 * イベントキューをクリア
	 */
	clearEventQueue(): void {
		this.eventQueue = [];
		console.log('Event queue cleared');
	}

	/**
	 * 現在のイベントキューの状態を取得
	 * @returns イベントキューの状態
	 */
	getEventQueueStatus(): {
		queueLength: number;
		isProcessing: boolean;
		syncEnabled: boolean;
	} {
		return {
			queueLength: this.eventQueue.length,
			isProcessing: this.isProcessingQueue,
			syncEnabled: this.syncEnabled
		};
	}
}

// シングルトンインスタンス
let storeCommunicationServiceInstance: StoreCommunicationService | null = null;

/**
 * ストア通信サービスのインスタンスを取得
 * @returns ストア通信サービスインスタンス
 */
export const useStoreCommunicationService = (): StoreCommunicationService => {
	if (!storeCommunicationServiceInstance) {
		storeCommunicationServiceInstance = new StoreCommunicationService();
	}
	return storeCommunicationServiceInstance;
};
