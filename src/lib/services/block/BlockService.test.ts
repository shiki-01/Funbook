/**
 * BlockService unit tests
 * Comprehensive tests for block operations, connections, and validation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BlockService } from './BlockService';
import type { IValidationService, ValidationResult } from '../../types/services';
import type { Block, BlockType, Position } from '../../types/domain';
import { BlockPathType, Connection } from '../../types/core';
import { AppError } from '../../types/services';
import { assertNonNullable } from '$lib/test/testUtils';
import {
	createMockValidationService,
	createMockBlockStore,
	createMockErrorHandler,
	createTestBlockTypeCustom
} from '$lib/test/blockTestHelpers';

const createTestPosition = (x = 0, y = 0): Position => ({ x, y });

describe('BlockService', () => {
	let blockService: BlockService;
	let mockValidationService: IValidationService;
	let mockBlockStore: any;
	let mockErrorHandler: any;

	beforeEach(() => {
		mockValidationService = createMockValidationService();
		mockBlockStore = createMockBlockStore();
		mockErrorHandler = createMockErrorHandler();
		blockService = new BlockService(mockBlockStore, mockErrorHandler, mockValidationService);
	});

	describe('createBlock', () => {
		it('新しいブロックを正常に作成する', () => {
			const blockType = createTestBlockTypeCustom();
			const position = createTestPosition(10, 20);

			const result = blockService.createBlock(blockType, position);

			expect(result).toBeDefined();
			expect(result).not.toBeNull();
			expect(result).not.toBeUndefined();

			if (result == null) {
				throw new Error('result is null/undefined');
			}

			expect(result.id).toBeTruthy();
			expect(result.name).toBe(blockType.name);
			expect(result.type).toBe(blockType.type);
			expect(result.position).toEqual(position);
			expect(result.zIndex).toBe(0);
			expect(result.visibility).toBe(true);
			expect(result.parentId).toBeUndefined();
			expect(result.childId).toBeUndefined();
		});

		it('ブロックタイプの内容を正しくコピーする', () => {
			const blockType = createTestBlockTypeCustom({
				title: 'Custom Title',
				output: 'custom output',
				color: '#ff0000',
				content: [
					{
						id: 'content1',
						type: 'Text',
						data: { title: 'Test Content' }
					}
				]
			});
			const position = createTestPosition();

			const result = blockService.createBlock(blockType, position);

			expect(result).not.toBeNull();
			expect(result).not.toBeUndefined();

			if (result == null) {
				throw new Error('result is null/undefined');
			}

			expect(result.title).toBe('Custom Title');
			expect(result.output).toBe('custom output');
			expect(result.color).toBe('#ff0000');
			expect(result.content).toHaveLength(1);
			expect(result.content[0].id).toBe('content1');
			// 内容が深いコピーされていることを確認
			expect(result.content).not.toBe(blockType.content);
		});

		it('検証サービスを呼び出す', () => {
			const blockType = createTestBlockTypeCustom();
			const position = createTestPosition();

			blockService.createBlock(blockType, position);

			expect(mockValidationService.validateBlock).toHaveBeenCalledTimes(1);
		});

		it('検証に失敗した場合はnullを返す', () => {
			const blockType = createTestBlockTypeCustom();
			const position = createTestPosition();

			vi.mocked(mockValidationService.validateBlock).mockReturnValue({
				valid: false,
				errors: [{ code: 'INVALID_TYPE', message: '無効なブロックタイプ' }],
				warnings: []
			});

			const result = blockService.createBlock(blockType, position);
			expect(result).toBeNull();
			expect(mockErrorHandler.handleError).toHaveBeenCalled();
		});

		it('検証サービスがない場合でも動作する', () => {
			const serviceWithoutValidation = new BlockService(mockBlockStore, mockErrorHandler);
			const blockType = createTestBlockTypeCustom();
			const position = createTestPosition();

			const result = serviceWithoutValidation.createBlock(blockType, position);

			expect(result).toBeDefined();
			expect(result!.id).toBeTruthy();
		});
	});

	describe('updateBlock', () => {
		let testBlock: Block;

		beforeEach(() => {
			const blockType = createTestBlockTypeCustom();
			const position = createTestPosition();
			const created = blockService.createBlock(blockType, position);
			assertNonNullable(created);
			testBlock = created;
		});

		it('ブロックを正常に更新する', () => {
			const updates = {
				title: 'Updated Title',
				position: createTestPosition(100, 200),
				zIndex: 5
			};

			blockService.updateBlock(testBlock.id, updates);

			const updatedBlock = blockService.getBlock(testBlock.id);
			expect(updatedBlock).toBeDefined();
			expect(updatedBlock!.title).toBe('Updated Title');
			expect(updatedBlock!.position).toEqual({ x: 100, y: 200 });
			expect(updatedBlock!.zIndex).toBe(5);
			expect(updatedBlock!.id).toBe(testBlock.id); // IDは変更されない
		});

		it('存在しないブロックの更新でエラーハンドラーを呼び出す', () => {
			const nonExistentId = 'non-existent-id';
			const updates = { title: 'New Title' };

			blockService.updateBlock(nonExistentId, updates);
			expect(mockErrorHandler.handleError).toHaveBeenCalled();
		});

		it('更新時に検証を実行する', () => {
			const updates = { title: 'Updated Title' };

			blockService.updateBlock(testBlock.id, updates);

			expect(mockValidationService.validateBlock).toHaveBeenCalledTimes(2); // 作成時 + 更新時
		});

		it('更新の検証に失敗した場合はエラーハンドラーを呼び出す', () => {
			// 更新時の検証を失敗させる
			vi.mocked(mockValidationService.validateBlock).mockReturnValue({
				valid: false,
				errors: [{ code: 'INVALID_UPDATE', message: '無効な更新' }],
				warnings: []
			});

			const updates = { title: 'Invalid Title' };

			blockService.updateBlock(testBlock.id, updates);
			expect(mockErrorHandler.handleError).toHaveBeenCalled();
		});
	});

	describe('deleteBlock', () => {
		let testBlock: Block;

		beforeEach(() => {
			const blockType = createTestBlockTypeCustom();
			const position = createTestPosition();
			const created = blockService.createBlock(blockType, position);
			assertNonNullable(created);
			testBlock = created;
		});

		it('ブロックを正常に削除する', () => {
			blockService.deleteBlock(testBlock.id);

			const deletedBlock = blockService.getBlock(testBlock.id);
			expect(deletedBlock).toBeNull();
		});

		it('存在しないブロックの削除でエラーハンドラーを呼び出す', () => {
			const nonExistentId = 'non-existent-id';

			blockService.deleteBlock(nonExistentId);
			expect(mockErrorHandler.handleError).toHaveBeenCalled();
		});

		it('親ブロックとの接続を解除してから削除する', () => {
			// 親ブロックを作成
			const parentBlockType = createTestBlockTypeCustom({
				connection: Connection.Output
			});
			const parentBlock = blockService.createBlock(parentBlockType, createTestPosition());

			// 子ブロックを作成
			const childBlockType = createTestBlockTypeCustom({
				connection: Connection.Input
			});
			const childBlock = blockService.createBlock(childBlockType, createTestPosition());

			assertNonNullable(parentBlock);
			assertNonNullable(childBlock);

			// 接続
			blockService.connectBlocks(parentBlock.id, childBlock.id);

			// 子ブロックを削除
			blockService.deleteBlock(childBlock.id);

			// 親ブロックの childId がクリアされていることを確認
			const updatedParent = blockService.getBlock(parentBlock.id);
			expect(updatedParent!.childId).toBeUndefined();
		});

		it('ループブロックの削除時にループ内の子ブロックとの接続を解除する', () => {
			// ループブロックを作成
			const loopBlockType = createTestBlockTypeCustom({
				type: BlockPathType.Loop,
				connection: Connection.Both
			});
			const loopBlock = blockService.createBlock(loopBlockType, createTestPosition());

			// ループ内の子ブロックを作成
			const childBlockType = createTestBlockTypeCustom({
				connection: Connection.Both
			});
			const childBlock = blockService.createBlock(childBlockType, createTestPosition());

			assertNonNullable(loopBlock);
			assertNonNullable(childBlock);

			// ループに接続
			blockService.connectBlocks(loopBlock.id, childBlock.id);

			// ループブロックを削除
			blockService.deleteBlock(loopBlock.id);

			// 子ブロックの parentId がクリアされていることを確認
			const updatedChild = blockService.getBlock(childBlock.id);
			expect(updatedChild!.parentId).toBeUndefined();
		});
	});

	describe('connectBlocks', () => {
		let parentBlock: Block;
		let childBlock: Block;

		beforeEach(() => {
			const parentBlockType = createTestBlockTypeCustom({
				connection: Connection.Output
			});
			const childBlockType = createTestBlockTypeCustom({
				connection: Connection.Input
			});

			const createParent = blockService.createBlock(parentBlockType, createTestPosition());
			const createChild = blockService.createBlock(childBlockType, createTestPosition());

			assertNonNullable(createParent);
			assertNonNullable(createChild);

			parentBlock = createParent;
			childBlock = createChild;
		});

		it('2つのブロックを正常に接続する', () => {
			blockService.connectBlocks(parentBlock.id, childBlock.id);

			const updatedParent = blockService.getBlock(parentBlock.id);
			const updatedChild = blockService.getBlock(childBlock.id);

			expect(updatedParent!.childId).toBe(childBlock.id);
			expect(updatedChild!.parentId).toBe(parentBlock.id);
			expect(updatedChild!.zIndex).toBe(parentBlock.zIndex + 1);
		});

		it('接続検証を実行する', () => {
			blockService.connectBlocks(parentBlock.id, childBlock.id);

			expect(mockBlockStore.validateBlockConnection).toHaveBeenCalledWith(
				parentBlock.id,
				childBlock.id
			);
		});

		it('接続検証に失敗した場合はfalseを返す', () => {
			// BlockStoreの検証を失敗させる
			mockBlockStore.validateBlockConnection.mockReturnValue(false);

			const result = blockService.connectBlocks(parentBlock.id, childBlock.id);
			expect(result).toBe(false);
			expect(mockErrorHandler.handleError).toHaveBeenCalled();
		});

		it('既存の接続を解除してから新しい接続を作成する', () => {
			// 別の親ブロックを作成
			const anotherParentType = createTestBlockTypeCustom({
				connection: Connection.Output
			});
			const anotherParent = blockService.createBlock(anotherParentType, createTestPosition());

			assertNonNullable(parentBlock);
			assertNonNullable(anotherParent);

			// 最初の接続
			blockService.connectBlocks(parentBlock.id, childBlock.id);

			// 別の親に接続
			blockService.connectBlocks(anotherParent.id, childBlock.id);

			// 最初の親の childId がクリアされていることを確認
			const originalParent = blockService.getBlock(parentBlock.id);
			expect(originalParent!.childId).toBeUndefined();

			// 新しい親に接続されていることを確認
			const newParent = blockService.getBlock(anotherParent.id);
			const updatedChild = blockService.getBlock(childBlock.id);
			expect(newParent!.childId).toBe(childBlock.id);
			expect(updatedChild!.parentId).toBe(anotherParent.id);
		});

		it('ループブロックへの接続を正しく処理する', () => {
			// ループブロックを作成
			const loopBlockType = createTestBlockTypeCustom({
				type: BlockPathType.Loop,
				connection: Connection.Both
			});
			const loopBlock = blockService.createBlock(loopBlockType, createTestPosition());

			assertNonNullable(loopBlock);

			blockService.connectBlocks(loopBlock.id, childBlock.id);

			const updatedLoop = blockService.getBlock(loopBlock.id);
			const updatedChild = blockService.getBlock(childBlock.id);

			expect(updatedLoop!.loopFirstChildId).toBe(childBlock.id);
			expect(updatedLoop!.loopLastChildId).toBe(childBlock.id);
			expect(updatedChild!.parentId).toBe(loopBlock.id);
		});
	});

	describe('disconnectBlock', () => {
		let parentBlock: Block;
		let childBlock: Block;

		beforeEach(() => {
			const parentBlockType = createTestBlockTypeCustom({
				connection: Connection.Output
			});
			const childBlockType = createTestBlockTypeCustom({
				connection: Connection.Input
			});

			const createParent = blockService.createBlock(parentBlockType, createTestPosition());
			const createChild = blockService.createBlock(childBlockType, createTestPosition());

			assertNonNullable(createParent);
			assertNonNullable(createChild);

			parentBlock = createParent;
			childBlock = createChild;

			blockService.connectBlocks(parentBlock.id, childBlock.id);
		});

		it('ブロックの接続を正常に解除する', () => {
			blockService.disconnectBlock(childBlock.id);

			const updatedParent = blockService.getBlock(parentBlock.id);
			const updatedChild = blockService.getBlock(childBlock.id);

			expect(updatedParent!.childId).toBeUndefined();
			expect(updatedChild!.parentId).toBeUndefined();
		});

		it('接続されていないブロックの切断は何もしない', () => {
			const unconnectedBlockType = createTestBlockTypeCustom();
			const unconnectedBlock = blockService.createBlock(unconnectedBlockType, createTestPosition());

			assertNonNullable(unconnectedBlock);

			// エラーを投げずに正常に完了することを確認
			expect(() => blockService.disconnectBlock(unconnectedBlock.id)).not.toThrow();
		});

		it('親ブロックが存在しない場合は子ブロックの親IDのみクリアする', () => {
			// 親ブロックを削除
			blockService.deleteBlock(parentBlock.id);

			// 子ブロックの切断を試行
			blockService.disconnectBlock(childBlock.id);

			const updatedChild = blockService.getBlock(childBlock.id);
			expect(updatedChild!.parentId).toBeUndefined();
		});
	});

	describe('validateBlockConnection', () => {
		let outputBlock: Block;
		let inputBlock: Block;
		let bothBlock: Block;
		let noneBlock: Block;

		beforeEach(() => {
			const createOut = blockService.createBlock(
				createTestBlockTypeCustom({ connection: Connection.Output }),
				createTestPosition()
			);
			const createInput = blockService.createBlock(
				createTestBlockTypeCustom({ connection: Connection.Input }),
				createTestPosition()
			);
			const createBoth = blockService.createBlock(
				createTestBlockTypeCustom({ connection: Connection.Both }),
				createTestPosition()
			);
			const createNone = blockService.createBlock(
				createTestBlockTypeCustom({ connection: Connection.None }),
				createTestPosition()
			);

			assertNonNullable(createOut);
			assertNonNullable(createInput);
			assertNonNullable(createBoth);
			assertNonNullable(createNone);

			outputBlock = createOut;
			inputBlock = createInput;
			bothBlock = createBoth;
			noneBlock = createNone;
		});

		it('有効な接続を正しく検証する', () => {
			expect(blockService.validateBlockConnection(outputBlock.id, inputBlock.id)).toBe(true);
			expect(blockService.validateBlockConnection(bothBlock.id, inputBlock.id)).toBe(true);
			expect(blockService.validateBlockConnection(outputBlock.id, bothBlock.id)).toBe(true);
			expect(blockService.validateBlockConnection(bothBlock.id, bothBlock.id)).toBe(false); // 自己接続
		});

		it('無効な接続を正しく拒否する', () => {
			expect(blockService.validateBlockConnection(inputBlock.id, outputBlock.id)).toBe(false);
			expect(blockService.validateBlockConnection(noneBlock.id, inputBlock.id)).toBe(false);
			expect(blockService.validateBlockConnection(outputBlock.id, noneBlock.id)).toBe(false);
		});

		it('自己接続を拒否する', () => {
			expect(blockService.validateBlockConnection(outputBlock.id, outputBlock.id)).toBe(false);
		});

		it('存在しないブロックの接続を拒否する', () => {
			expect(blockService.validateBlockConnection('non-existent', inputBlock.id)).toBe(false);
			expect(blockService.validateBlockConnection(outputBlock.id, 'non-existent')).toBe(false);
		});

		it('循環参照を検出する', () => {
			// A -> B -> C の接続を作成
			const blockA = blockService.createBlock(
				createTestBlockTypeCustom({ connection: Connection.Both }),
				createTestPosition()
			);
			const blockB = blockService.createBlock(
				createTestBlockTypeCustom({ connection: Connection.Both }),
				createTestPosition()
			);
			const blockC = blockService.createBlock(
				createTestBlockTypeCustom({ connection: Connection.Both }),
				createTestPosition()
			);

			assertNonNullable(blockA);
			assertNonNullable(blockB);
			assertNonNullable(blockC);

			blockService.connectBlocks(blockA.id, blockB.id);
			blockService.connectBlocks(blockB.id, blockC.id);

			// C -> A の接続は循環参照を作成するため無効
			expect(blockService.validateBlockConnection(blockC.id, blockA.id)).toBe(false);
		});

		it('BlockStoreの検証を使用する', () => {
			blockService.validateBlockConnection(outputBlock.id, inputBlock.id);

			expect(mockBlockStore.validateBlockConnection).toHaveBeenCalledWith(
				outputBlock.id,
				inputBlock.id
			);
		});
	});

	describe('getBlock', () => {
		it('存在するブロックを返す', () => {
			const blockType = createTestBlockTypeCustom();
			const createdBlock = blockService.createBlock(blockType, createTestPosition());

			assertNonNullable(createdBlock);

			const retrievedBlock = blockService.getBlock(createdBlock.id);

			expect(retrievedBlock).toEqual(createdBlock);
		});

		it('存在しないブロックに対してnullを返す', () => {
			const result = blockService.getBlock('non-existent-id');

			expect(result).toBeNull();
		});
	});

	describe('getAllBlocks', () => {
		it('すべてのブロックを返す', () => {
			const blockType1 = createTestBlockTypeCustom({ name: 'Block1' });
			const blockType2 = createTestBlockTypeCustom({ name: 'Block2' });

			const block1 = blockService.createBlock(blockType1, createTestPosition());
			const block2 = blockService.createBlock(blockType2, createTestPosition());

			const allBlocks = blockService.getAllBlocks();

			expect(allBlocks).toHaveLength(2);
			expect(allBlocks).toContainEqual(block1);
			expect(allBlocks).toContainEqual(block2);
		});

		it('ブロックがない場合は空配列を返す', () => {
			const allBlocks = blockService.getAllBlocks();

			expect(allBlocks).toEqual([]);
		});
	});

	describe('removeBlockWithChildren', () => {
		it('ブロックとその子ブロックを再帰的に削除する', () => {
			// 親 -> 子1 -> 子2 の構造を作成
			const parentType = createTestBlockTypeCustom({ connection: Connection.Both });
			const child1Type = createTestBlockTypeCustom({ connection: Connection.Both });
			const child2Type = createTestBlockTypeCustom({ connection: Connection.Input });

			const parent = blockService.createBlock(parentType, createTestPosition());
			const child1 = blockService.createBlock(child1Type, createTestPosition());
			const child2 = blockService.createBlock(child2Type, createTestPosition());

			assertNonNullable(parent);
			assertNonNullable(child1);
			assertNonNullable(child2);

			blockService.connectBlocks(parent.id, child1.id);
			blockService.connectBlocks(child1.id, child2.id);

			// 親ブロックを子ブロックと一緒に削除
			blockService.removeBlockWithChildren(parent.id);

			// すべてのブロックが削除されていることを確認
			expect(blockService.getBlock(parent.id)).toBeNull();
			expect(blockService.getBlock(child1.id)).toBeNull();
			expect(blockService.getBlock(child2.id)).toBeNull();
		});

		it('ループブロックとその内部の子ブロックを削除する', () => {
			// ループブロックとループ内の子ブロックを作成
			const loopType = createTestBlockTypeCustom({
				type: BlockPathType.Loop,
				connection: Connection.Both
			});
			const childType = createTestBlockTypeCustom({ connection: Connection.Both });

			const loopBlock = blockService.createBlock(loopType, createTestPosition());
			const childBlock = blockService.createBlock(childType, createTestPosition());

			assertNonNullable(loopBlock);
			assertNonNullable(childBlock);

			blockService.connectBlocks(loopBlock.id, childBlock.id);

			// ループブロックを削除
			blockService.removeBlockWithChildren(loopBlock.id);

			// 両方のブロックが削除されていることを確認
			expect(blockService.getBlock(loopBlock.id)).toBeNull();
			expect(blockService.getBlock(childBlock.id)).toBeNull();
		});

		it('存在しないブロックの削除は何もしない', () => {
			expect(() => blockService.removeBlockWithChildren('non-existent')).not.toThrow();
		});
	});

	describe('ループブロック特有の機能', () => {
		let loopBlock: Block;
		let child1: Block;
		let child2: Block;

		beforeEach(() => {
			const loopType = createTestBlockTypeCustom({
				type: BlockPathType.Loop,
				connection: Connection.Both
			});
			const childType = createTestBlockTypeCustom({ connection: Connection.Both });

			const createLoop = blockService.createBlock(loopType, createTestPosition());
			const createChild1 = blockService.createBlock(childType, createTestPosition());
			const createChild2 = blockService.createBlock(childType, createTestPosition());

			assertNonNullable(createLoop);
			assertNonNullable(createChild1);
			assertNonNullable(createChild2);

			loopBlock = createLoop;
			child1 = createChild1;
			child2 = createChild2;
		});

		it('ループに複数の子ブロックを順次接続する', () => {
			blockService.connectBlocks(loopBlock.id, child1.id);
			blockService.connectBlocks(loopBlock.id, child2.id);

			const updatedLoop = blockService.getBlock(loopBlock.id);
			const updatedChild1 = blockService.getBlock(child1.id);
			const updatedChild2 = blockService.getBlock(child2.id);

			expect(updatedLoop!.loopFirstChildId).toBe(child1.id);
			expect(updatedLoop!.loopLastChildId).toBe(child2.id);
			expect(updatedChild1!.childId).toBe(child2.id);
			expect(updatedChild2!.parentId).toBe(loopBlock.id);
		});

		it('ループの最初の子ブロックを切断する', () => {
			blockService.connectBlocks(loopBlock.id, child1.id);
			blockService.connectBlocks(loopBlock.id, child2.id);

			blockService.disconnectBlock(child1.id);

			const updatedLoop = blockService.getBlock(loopBlock.id);
			const updatedChild1 = blockService.getBlock(child1.id);

			expect(updatedLoop!.loopFirstChildId).toBe(child2.id);
			expect(updatedChild1!.parentId).toBeUndefined();
		});

		it('ループの中間の子ブロックを切断する', () => {
			const child3 = blockService.createBlock(
				createTestBlockTypeCustom({ connection: Connection.Both }),
				createTestPosition()
			);

			assertNonNullable(child3);

			blockService.connectBlocks(loopBlock.id, child1.id);
			blockService.connectBlocks(loopBlock.id, child2.id);
			blockService.connectBlocks(loopBlock.id, child3.id);

			blockService.disconnectBlock(child2.id);

			const updatedLoop = blockService.getBlock(loopBlock.id);
			const updatedChild1 = blockService.getBlock(child1.id);
			const updatedChild2 = blockService.getBlock(child2.id);

			expect(updatedLoop!.loopFirstChildId).toBe(child1.id);
			expect(updatedLoop!.loopLastChildId).toBe(child3.id);
			expect(updatedChild1!.childId).toBe(child3.id);
			expect(updatedChild2!.parentId).toBeUndefined();
		});
	});

	describe('エラーハンドリング', () => {
		it('予期しないエラーをエラーハンドラーで処理する', () => {
			// BlockStoreのcreateBlockをモックして例外を投げる
			mockBlockStore.createBlock.mockImplementation(() => {
				throw new Error('UUID generation failed');
			});

			const blockType = createTestBlockTypeCustom();
			const position = createTestPosition();

			const result = blockService.createBlock(blockType, position);
			expect(result).toBeNull();
			expect(mockErrorHandler.handleError).toHaveBeenCalled();
		});

		it('検証サービスのエラーをエラーハンドラーで処理する', () => {
			const blockType = createTestBlockTypeCustom();
			const position = createTestPosition();

			vi.mocked(mockValidationService.validateBlock).mockImplementation(() => {
				throw new AppError('Custom validation error', 'CUSTOM_ERROR', 'high');
			});

			const result = blockService.createBlock(blockType, position);
			expect(result).toBeNull();
			expect(mockErrorHandler.handleError).toHaveBeenCalled();
		});
	});
});
