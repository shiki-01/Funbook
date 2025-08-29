/**
 * BlockService - ブロック操作のためのサービス実装
 * ブロックのCRUD操作、接続管理、検証を提供
 */

import type { IBlockService, IValidationService } from '../../types/services';
import type { Block, BlockType, Position } from '../../types/domain';
import { BlockPathType } from '../../types/core';
import { BlockError } from '../../errors/AppError';
import { ERROR_CODES } from '../../errors/errorCodes';
import type { ErrorHandler } from '../error/ErrorHandler';
import type { BlockStore } from '../../stores/block.store.svelte';

/**
 * ブロックサービスの実装クラス
 * ブロックの作成、更新、削除、接続管理を行う
 */
export class BlockService implements IBlockService {
	private blockStore: BlockStore;
	private errorHandler: ErrorHandler;
	private validationService?: IValidationService;

	/**
	 * コンストラクタ
	 * @param blockStore - ブロックストア
	 * @param errorHandler - エラーハンドラー
	 * @param validationService - 検証サービス（オプション）
	 */
	constructor(
		blockStore: BlockStore,
		errorHandler: ErrorHandler,
		validationService?: IValidationService
	) {
		this.blockStore = blockStore;
		this.errorHandler = errorHandler;
		this.validationService = validationService;
	}

	/**
	 * 新しいブロックを作成
	 * @param type - ブロックタイプ
	 * @param position - 初期位置
	 * @returns 作成されたブロック、失敗した場合はnull
	 */
	createBlock(type: BlockType, position: Position): Block | null {
		try {
			// 位置の検証
			if (!this.isValidPosition(position)) {
				const error = new BlockError(
					`無効な位置が指定されました: x=${position.x}, y=${position.y}`,
					ERROR_CODES.BLOCK.INVALID_POSITION,
					'medium',
					undefined,
					{ position }
				);
				this.errorHandler.handleError(error, {
					component: 'BlockService',
					action: 'createBlock',
					additionalData: { type: type.type, position }
				});
				return null;
			}

			// 検証を実行（BlockStoreが作成前に検証するが、追加の検証も可能）
			if (this.validationService) {
				// 仮のブロックオブジェクトを作成して検証
				const tempBlock: Block = {
					...type,
					id: 'temp-id',
					position,
					size: undefined,
					zIndex: 0,
					visibility: true,
					parentId: undefined,
					childId: undefined,
					valueTargetId: null,
					loopFirstChildId: undefined,
					loopLastChildId: undefined
				};

				const validation = this.validationService.validateBlock(tempBlock);
				if (!validation.valid) {
					const error = new BlockError(
						`ブロック作成の検証に失敗しました: ${validation.errors
							.map((e) => e.message)
							.join(', ')}`,
						ERROR_CODES.BLOCK.CREATION_FAILED,
						'medium',
						undefined,
						{ blockType: type.type, errors: validation.errors }
					);
					this.errorHandler.handleError(error, {
						component: 'BlockService',
						action: 'createBlock',
						additionalData: { type: type.type, position }
					});
					return null;
				}
			}

			// BlockStoreのcreateBlockメソッドを使用（IDを返す）
			const blockId = this.blockStore.createBlock(type, position);
			return this.blockStore.getBlock(blockId);
		} catch (error) {
			const blockError = new BlockError(
				`ブロックの作成に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
				ERROR_CODES.BLOCK.CREATION_FAILED,
				'high',
				undefined,
				{ blockType: type.type, position }
			);
			this.errorHandler.handleError(blockError, {
				component: 'BlockService',
				action: 'createBlock',
				additionalData: { type: type.type, position }
			});
			return null;
		}
	}

	/**
	 * ブロックを更新
	 * @param id - 更新するブロックのID
	 * @param updates - 更新内容
	 */
	updateBlock(id: string, updates: Partial<Block>): void {
		try {
			const existingBlock = this.blockStore.getBlock(id);
			if (!existingBlock) {
				const error = new BlockError(
					`ブロックが見つかりません: ${id}`,
					ERROR_CODES.BLOCK.NOT_FOUND,
					'medium',
					id
				);
				this.errorHandler.handleError(error, {
					component: 'BlockService',
					action: 'updateBlock',
					additionalData: { blockId: id, updates }
				});
				return;
			}

			const updatedBlock: Block = {
				...existingBlock,
				...updates,
				id // IDは変更不可
			};

			// 検証を実行
			if (this.validationService) {
				const validation = this.validationService.validateBlock(updatedBlock);
				if (!validation.valid) {
					const error = new BlockError(
						`ブロック更新の検証に失敗しました: ${validation.errors
							.map((e) => e.message)
							.join(', ')}`,
						ERROR_CODES.BLOCK.UPDATE_FAILED,
						'medium',
						id,
						{ errors: validation.errors }
					);
					this.errorHandler.handleError(error, {
						component: 'BlockService',
						action: 'updateBlock',
						additionalData: { blockId: id, updates }
					});
					return;
				}
			}

			this.blockStore.updateBlock(id, updates);
		} catch (error) {
			const blockError = new BlockError(
				`ブロックの更新に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
				ERROR_CODES.BLOCK.UPDATE_FAILED,
				'high',
				id,
				{ updates }
			);
			this.errorHandler.handleError(blockError, {
				component: 'BlockService',
				action: 'updateBlock',
				additionalData: { blockId: id, updates }
			});
		}
	}

	/**
	 * ブロックを削除
	 * @param id - 削除するブロックのID
	 */
	deleteBlock(id: string): void {
		try {
			const block = this.blockStore.getBlock(id);
			if (!block) {
				const error = new BlockError(
					`削除対象のブロックが見つかりません: ${id}`,
					ERROR_CODES.BLOCK.NOT_FOUND,
					'medium',
					id
				);
				this.errorHandler.handleError(error, {
					component: 'BlockService',
					action: 'deleteBlock',
					additionalData: { blockId: id }
				});
				return;
			}

			// 親ブロックとの接続を解除
			if (block.parentId) {
				this.disconnectBlock(id);
			}

			// BlockStoreのdeleteBlockメソッドが関係の解除も処理する
			this.blockStore.deleteBlock(id);
		} catch (error) {
			const blockError = new BlockError(
				`ブロックの削除に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
				ERROR_CODES.BLOCK.DELETE_FAILED,
				'high',
				id
			);
			this.errorHandler.handleError(blockError, {
				component: 'BlockService',
				action: 'deleteBlock',
				additionalData: { blockId: id }
			});
		}
	}

	/**
	 * 2つのブロックを接続
	 * @param parentId - 親ブロックのID
	 * @param childId - 子ブロックのID
	 * @returns 接続に成功した場合はtrue
	 */
	connectBlocks(parentId: string, childId: string, isLoop: boolean): boolean {
		try {
			// 接続の検証
			if (!this.validateBlockConnection(parentId, childId)) {
				const error = new BlockError(
					`ブロック接続の検証に失敗しました: ${parentId} -> ${childId}`,
					ERROR_CODES.BLOCK.CONNECTION_FAILED,
					'medium',
					parentId,
					{ parentId, childId }
				);
				this.errorHandler.handleError(error, {
					component: 'BlockService',
					action: 'connectBlocks',
					additionalData: { parentId, childId }
				});
				return false;
			}

			const parentBlock = this.blockStore.getBlock(parentId);
			const childBlock = this.blockStore.getBlock(childId);

			if (!parentBlock || !childBlock) {
				const error = new BlockError(
					`接続対象のブロックが見つかりません: parent=${parentId}, child=${childId}`,
					ERROR_CODES.BLOCK.NOT_FOUND,
					'medium',
					parentId,
					{ parentId, childId }
				);
				this.errorHandler.handleError(error, {
					component: 'BlockService',
					action: 'connectBlocks',
					additionalData: { parentId, childId }
				});
				return false;
			}

			// 循環依存のチェックはBlockStore.validateBlockConnectionで行われる

			// 既存の接続を解除
			if (childBlock.parentId) {
				this.disconnectBlock(childId);
			}

			// BlockStoreの接続メソッドを使用
			this.blockStore.connectBlocks(parentId, childId, isLoop);
			return true;
		} catch (error) {
			const blockError = new BlockError(
				`ブロック接続に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
				ERROR_CODES.BLOCK.CONNECTION_FAILED,
				'high',
				parentId,
				{ parentId, childId }
			);
			this.errorHandler.handleError(blockError, {
				component: 'BlockService',
				action: 'connectBlocks',
				additionalData: { parentId, childId }
			});
			return false;
		}
	}

	/**
	 * ブロックの接続を解除
	 * @param id - 接続を解除するブロックのID
	 */
	disconnectBlock(id: string): void {
		try {
			const block = this.blockStore.getBlock(id);
			if (!block || !block.parentId) {
				return; // 接続されていない場合は何もしない
			}

			// BlockStoreの切断メソッドを使用
			this.blockStore.disconnectBlocks(block.parentId, id);
		} catch (error) {
			const blockError = new BlockError(
				`ブロック切断に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
				ERROR_CODES.BLOCK.CONNECTION_FAILED,
				'high',
				id
			);
			this.errorHandler.handleError(blockError, {
				component: 'BlockService',
				action: 'disconnectBlock',
				additionalData: { blockId: id }
			});
		}
	}

	/**
	 * ブロック接続の検証
	 * @param parentId - 親ブロックのID
	 * @param childId - 子ブロックのID
	 * @returns 接続が有効な場合はtrue
	 */
	validateBlockConnection(parentId: string, childId: string): boolean {
		try {
			// BlockStoreの検証メソッドを使用
			return this.blockStore.validateBlockConnection(parentId, childId);
		} catch (error) {
			// BlockStoreの検証でエラーが発生した場合はfalseを返す
			console.error('ブロック接続検証エラー:', error);
			return false;
		}
	}

	/**
	 * ブロックを取得
	 * @param id - 取得するブロックのID
	 * @returns ブロック、見つからない場合はnull
	 */
	getBlock(id: string): Block | null {
		const block = this.blockStore.getBlock(id);
		if (!block) {
			const error = new BlockError(
				`ブロックが見つかりません: ${id}`,
				ERROR_CODES.BLOCK.NOT_FOUND,
				'medium',
				id
			);
			this.errorHandler.handleError(error, {
				component: 'BlockService',
				action: 'getBlock',
				additionalData: { blockId: id }
			});
			return null;
		}
		return block;
	}

	/**
	 * すべてのブロックを取得
	 * @returns すべてのブロックの配列
	 */
	getAllBlocks(): Block[] {
		return this.blockStore.getAllBlocks();
	}

	/**
	 * ブロックとその子ブロックを再帰的に削除
	 * @param id - 削除するブロックのID
	 */
	removeBlockWithChildren(id: string): void {
		try {
			const block = this.blockStore.getBlock(id);
			if (!block) {
				return;
			}

			// 子ブロックを先に削除
			if (block.childId) {
				this.removeBlockWithChildren(block.childId);
			}

			// ループブロックの場合、ループ内の子ブロックも削除
			// BlockStore.deleteBlockが関係の解除と子ブロックの削除を処理する
			if (block.type === BlockPathType.Loop && block.loopFirstChildId) {
				// ループ内の子ブロックを再帰的に削除
				let currentId = block.loopFirstChildId;
				while (currentId) {
					const currentBlock = this.blockStore.getBlock(currentId);
					if (!currentBlock) break;

					const nextId = currentBlock.childId;
					this.removeBlockWithChildren(currentId);

					if (typeof nextId === 'undefined') {
						console.error(`子の ID を取得できませんでした: ${currentBlock}`);
						break;
					}

					currentId = nextId;
				}
			}

			// ブロック自体を削除
			this.deleteBlock(id);
		} catch (error) {
			const blockError = new BlockError(
				`ブロックとその子ブロックの削除に失敗しました: ${
					error instanceof Error ? error.message : String(error)
				}`,
				ERROR_CODES.BLOCK.DELETE_FAILED,
				'high',
				id
			);
			this.errorHandler.handleError(blockError, {
				component: 'BlockService',
				action: 'removeBlockWithChildren',
				additionalData: { blockId: id }
			});
		}
	}

	/**
	 * 位置が有効かどうかをチェック
	 * @param position - チェックする位置
	 * @returns 有効な場合はtrue
	 */
	private isValidPosition(position: Position): boolean {
		return (
			typeof position.x === 'number' &&
			typeof position.y === 'number' &&
			!isNaN(position.x) &&
			!isNaN(position.y) &&
			isFinite(position.x) &&
			isFinite(position.y)
		);
	}
}
