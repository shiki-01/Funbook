/**
 * BlockStore ユニットテスト
 * ドメイン中心のブロック操作のテスト
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
	BlockStore,
	BlockValidationError,
	BlockRelationshipError,
	type BlockStoreType
} from './block.store.svelte';
import type { Block, BlockType, Position, BlockList } from '$lib/types/domain';
import { BlockPathType, Connection } from '$lib/types/core';

describe('BlockStore', () => {
	let blockStore: BlockStoreType;
	let mockBlockType: BlockType;
	let mockPosition: Position;

	beforeEach(() => {
		blockStore = new BlockStore();

		mockBlockType = {
			id: 'test-type',
			name: 'Test Block',
			type: BlockPathType.Move,
			version: '1.0.0',
			title: 'Test Block',
			output: 'test output',
			content: [],
			connection: Connection.Both,
			draggable: true,
			editable: true,
			deletable: true,
			color: '#blue'
		};

		mockPosition = { x: 100, y: 200 };
	});

	describe('ブロック作成', () => {
		it('新しいブロックを作成できる', () => {
			const blockId = blockStore.createBlock(mockBlockType, mockPosition);

			expect(blockId).toBeDefined();
			expect(typeof blockId).toBe('string');

			const createdBlock = blockStore.getBlock(blockId);
			expect(createdBlock).toBeDefined();
			expect(createdBlock?.id).toBe(blockId);
			expect(createdBlock?.name).toBe(mockBlockType.name);
			expect(createdBlock?.position).toEqual(mockPosition);
			expect(createdBlock?.zIndex).toBe(0);
			expect(createdBlock?.visibility).toBe(true);
		});

		it('位置を指定しない場合はデフォルト位置(0,0)で作成される', () => {
			const blockId = blockStore.createBlock(mockBlockType);
			const createdBlock = blockStore.getBlock(blockId);

			expect(createdBlock?.position).toEqual({ x: 0, y: 0 });
		});

		it('作成されたブロックは初期状態で関係を持たない', () => {
			const blockId = blockStore.createBlock(mockBlockType);
			const createdBlock = blockStore.getBlock(blockId);

			expect(createdBlock?.parentId).toBeUndefined();
			expect(createdBlock?.childId).toBeUndefined();
			expect(createdBlock?.valueTargetId).toBeUndefined();
			expect(createdBlock?.loopFirstChildId).toBeUndefined();
			expect(createdBlock?.loopLastChildId).toBeUndefined();
		});
	});

	describe('ブロック取得', () => {
		it('存在するブロックを取得できる', () => {
			const blockId = blockStore.createBlock(mockBlockType);
			const retrievedBlock = blockStore.getBlock(blockId);

			expect(retrievedBlock).toBeDefined();
			expect(retrievedBlock?.id).toBe(blockId);
		});

		it('存在しないブロックの取得はnullを返す', () => {
			const retrievedBlock = blockStore.getBlock('non-existent-id');
			expect(retrievedBlock).toBeNull();
		});

		it('すべてのブロックを取得できる', () => {
			const blockId1 = blockStore.createBlock(mockBlockType);
			const blockId2 = blockStore.createBlock(mockBlockType);

			const allBlocks = blockStore.getAllBlocks();
			expect(allBlocks).toHaveLength(2);
			expect(allBlocks.map((b) => b.id)).toContain(blockId1);
			expect(allBlocks.map((b) => b.id)).toContain(blockId2);
		});

		it('ブロック数を正しく取得できる', () => {
			expect(blockStore.getBlockCount()).toBe(0);

			blockStore.createBlock(mockBlockType);
			expect(blockStore.getBlockCount()).toBe(1);

			blockStore.createBlock(mockBlockType);
			expect(blockStore.getBlockCount()).toBe(2);
		});

		it('ブロックの存在チェックができる', () => {
			const blockId = blockStore.createBlock(mockBlockType);

			expect(blockStore.hasBlock(blockId)).toBe(true);
			expect(blockStore.hasBlock('non-existent-id')).toBe(false);
		});
	});

	describe('ブロック更新', () => {
		it('ブロックを更新できる', () => {
			const blockId = blockStore.createBlock(mockBlockType);
			const newPosition = { x: 300, y: 400 };

			blockStore.updateBlock(blockId, { position: newPosition, zIndex: 5 });

			const updatedBlock = blockStore.getBlock(blockId);
			expect(updatedBlock?.position).toEqual(newPosition);
			expect(updatedBlock?.zIndex).toBe(5);
		});

		it('存在しないブロックの更新はエラーを投げる', () => {
			expect(() => {
				blockStore.updateBlock('non-existent-id', { zIndex: 5 });
			}).toThrow(BlockValidationError);
		});

		it('無効なデータでの更新はエラーを投げる', () => {
			const blockId = blockStore.createBlock(mockBlockType);

			expect(() => {
				blockStore.updateBlock(blockId, { name: '' });
			}).toThrow(BlockValidationError);
		});
	});

	describe('ブロック削除', () => {
		it('ブロックを削除できる', () => {
			const blockId = blockStore.createBlock(mockBlockType);
			expect(blockStore.hasBlock(blockId)).toBe(true);

			blockStore.deleteBlock(blockId);
			expect(blockStore.hasBlock(blockId)).toBe(false);
			expect(blockStore.getBlock(blockId)).toBeNull();
		});

		it('存在しないブロックの削除は無視される', () => {
			expect(() => {
				blockStore.deleteBlock('non-existent-id');
			}).not.toThrow();
		});

		it('削除時に関係も解除される', () => {
			const parentId = blockStore.createBlock(mockBlockType);
			const childId = blockStore.createBlock(mockBlockType);

			blockStore.connectBlocks(parentId, childId);
			expect(blockStore.getBlock(parentId)?.childId).toBe(childId);
			expect(blockStore.getBlock(childId)?.parentId).toBe(parentId);

			blockStore.deleteBlock(childId);
			expect(blockStore.getBlock(parentId)?.childId).toBeUndefined();
		});
	});

	describe('ブロック接続', () => {
		it('2つのブロックを接続できる', () => {
			const parentId = blockStore.createBlock(mockBlockType);
			const childId = blockStore.createBlock(mockBlockType);

			blockStore.connectBlocks(parentId, childId);

			const parentBlock = blockStore.getBlock(parentId);
			const childBlock = blockStore.getBlock(childId);

			expect(parentBlock?.childId).toBe(childId);
			expect(childBlock?.parentId).toBe(parentId);
		});

		it('存在しないブロックの接続はエラーを投げる', () => {
			const blockId = blockStore.createBlock(mockBlockType);

			expect(() => {
				blockStore.connectBlocks(blockId, 'non-existent-id');
			}).toThrow(BlockRelationshipError);

			expect(() => {
				blockStore.connectBlocks('non-existent-id', blockId);
			}).toThrow(BlockRelationshipError);
		});

		it('自分自身への接続はエラーを投げる', () => {
			const blockId = blockStore.createBlock(mockBlockType);

			expect(() => {
				blockStore.connectBlocks(blockId, blockId);
			}).toThrow(BlockRelationshipError);
		});

		it('循環参照を作る接続はエラーを投げる', () => {
			const blockId1 = blockStore.createBlock(mockBlockType);
			const blockId2 = blockStore.createBlock(mockBlockType);
			const blockId3 = blockStore.createBlock(mockBlockType);

			// 1 -> 2 -> 3 の接続を作成
			blockStore.connectBlocks(blockId1, blockId2);
			blockStore.connectBlocks(blockId2, blockId3);

			// 3 -> 1 の接続は循環参照になるのでエラー
			expect(() => {
				blockStore.connectBlocks(blockId3, blockId1);
			}).toThrow(BlockRelationshipError);
		});

		it('既存の接続がある子ブロックは自動的に切断される', () => {
			const parent1Id = blockStore.createBlock(mockBlockType);
			const parent2Id = blockStore.createBlock(mockBlockType);
			const childId = blockStore.createBlock(mockBlockType);

			// 最初の接続
			blockStore.connectBlocks(parent1Id, childId);
			expect(blockStore.getBlock(parent1Id)?.childId).toBe(childId);
			expect(blockStore.getBlock(childId)?.parentId).toBe(parent1Id);

			// 新しい接続（既存の接続は自動的に切断される）
			blockStore.connectBlocks(parent2Id, childId);
			expect(blockStore.getBlock(parent1Id)?.childId).toBeUndefined();
			expect(blockStore.getBlock(parent2Id)?.childId).toBe(childId);
			expect(blockStore.getBlock(childId)?.parentId).toBe(parent2Id);
		});
	});

	describe('ブロック切断', () => {
		it('ブロックの接続を切断できる', () => {
			const parentId = blockStore.createBlock(mockBlockType);
			const childId = blockStore.createBlock(mockBlockType);

			blockStore.connectBlocks(parentId, childId);
			blockStore.disconnectBlocks(parentId, childId);

			expect(blockStore.getBlock(parentId)?.childId).toBeUndefined();
			expect(blockStore.getBlock(childId)?.parentId).toBeUndefined();
		});

		it('存在しないブロックの切断は無視される', () => {
			expect(() => {
				blockStore.disconnectBlocks('non-existent-1', 'non-existent-2');
			}).not.toThrow();
		});
	});

	describe('ループブロック接続', () => {
		let loopBlockType: BlockType;

		beforeEach(() => {
			loopBlockType = {
				...mockBlockType,
				id: 'loop-type',
				name: 'Loop Block',
				type: BlockPathType.Loop,
				title: 'Loop Block'
			};
		});

		it('ループブロックに子ブロックを接続できる', () => {
			const loopId = blockStore.createBlock(loopBlockType);
			const childId = blockStore.createBlock(mockBlockType);

			blockStore.connectBlocks(loopId, childId);

			const loopBlock = blockStore.getBlock(loopId);
			const childBlock = blockStore.getBlock(childId);

			expect(loopBlock?.loopFirstChildId).toBe(childId);
			expect(loopBlock?.loopLastChildId).toBe(childId);
			expect(childBlock?.parentId).toBe(loopId);
		});

		it('ループブロックに複数の子ブロックを接続できる', () => {
			const loopId = blockStore.createBlock(loopBlockType);
			const child1Id = blockStore.createBlock(mockBlockType);
			const child2Id = blockStore.createBlock(mockBlockType);

			blockStore.connectBlocks(loopId, child1Id);
			blockStore.connectBlocks(loopId, child2Id);

			const loopBlock = blockStore.getBlock(loopId);
			const child1Block = blockStore.getBlock(child1Id);

			expect(loopBlock?.loopFirstChildId).toBe(child1Id);
			expect(loopBlock?.loopLastChildId).toBe(child2Id);
			expect(child1Block?.childId).toBe(child2Id);
		});

		it('ループブロックから子ブロックを切断できる', () => {
			const loopId = blockStore.createBlock(loopBlockType);
			const childId = blockStore.createBlock(mockBlockType);

			blockStore.connectBlocks(loopId, childId);
			blockStore.disconnectBlocks(loopId, childId);

			const loopBlock = blockStore.getBlock(loopId);
			const childBlock = blockStore.getBlock(childId);

			expect(loopBlock?.loopFirstChildId).toBeUndefined();
			expect(loopBlock?.loopLastChildId).toBeUndefined();
			expect(childBlock?.parentId).toBeUndefined();
		});
	});

	describe('ブロックタイプ管理', () => {
		it('ブロックタイプを登録できる', () => {
			blockStore.registerBlockType(mockBlockType);

			const retrievedType = blockStore.getBlockType(mockBlockType.id);
			expect(retrievedType).toEqual(mockBlockType);
		});

		it('すべてのブロックタイプを取得できる', () => {
			const blockType2 = {
				...mockBlockType,
				id: 'test-type-2',
				name: 'Test Block 2'
			};

			blockStore.registerBlockType(mockBlockType);
			blockStore.registerBlockType(blockType2);

			const allTypes = blockStore.getAllBlockTypes();
			expect(allTypes).toHaveLength(2);
			expect(allTypes.map((t) => t.id)).toContain(mockBlockType.id);
			expect(allTypes.map((t) => t.id)).toContain(blockType2.id);
		});

		it('存在しないブロックタイプの取得はnullを返す', () => {
			const retrievedType = blockStore.getBlockType('non-existent-type');
			expect(retrievedType).toBeNull();
		});
	});

	describe('ブロックリスト管理', () => {
		let mockBlockList: BlockList;

		beforeEach(() => {
			mockBlockList = {
				name: 'Test List',
				block: {} as any,
				description: 'Test block list'
			};
		});

		it('ブロックリストを追加できる', () => {
			blockStore.addBlockList(mockBlockList);

			const retrievedList = blockStore.getBlockList(mockBlockList.name);
			expect(retrievedList).toEqual(mockBlockList);
		});

		it('ブロックリストを削除できる', () => {
			blockStore.addBlockList(mockBlockList);
			expect(blockStore.getBlockList(mockBlockList.name)).toBeDefined();

			blockStore.removeBlockList(mockBlockList.name);
			expect(blockStore.getBlockList(mockBlockList.name)).toBeNull();
		});

		it('すべてのブロックリストを取得できる', () => {
			const blockList2 = { ...mockBlockList, name: 'Test List 2' };

			blockStore.addBlockList(mockBlockList);
			blockStore.addBlockList(blockList2);

			const allLists = blockStore.getAllBlockLists();
			expect(allLists).toHaveLength(2);
			expect(allLists.map((l) => l.name)).toContain(mockBlockList.name);
			expect(allLists.map((l) => l.name)).toContain(blockList2.name);
		});
	});

	describe('ストアクリア', () => {
		beforeEach(() => {
			// テストデータを準備
			blockStore.createBlock(mockBlockType);
			blockStore.registerBlockType(mockBlockType);
			blockStore.addBlockList({
				name: 'Test List',
				block: {} as any,
				description: 'Test'
			});
		});

		it('すべてのブロックをクリアできる', () => {
			expect(blockStore.getBlockCount()).toBeGreaterThan(0);

			blockStore.clearAllBlocks();
			expect(blockStore.getBlockCount()).toBe(0);
			expect(blockStore.getAllBlocks()).toHaveLength(0);
		});

		it('すべてのブロックタイプをクリアできる', () => {
			expect(blockStore.getAllBlockTypes()).toHaveLength(1);

			blockStore.clearAllBlockTypes();
			expect(blockStore.getAllBlockTypes()).toHaveLength(0);
		});

		it('すべてのブロックリストをクリアできる', () => {
			expect(blockStore.getAllBlockLists()).toHaveLength(1);

			blockStore.clearAllBlockLists();
			expect(blockStore.getAllBlockLists()).toHaveLength(0);
		});

		it('ストア全体をクリアできる', () => {
			blockStore.clear();

			expect(blockStore.getBlockCount()).toBe(0);
			expect(blockStore.getAllBlockTypes()).toHaveLength(0);
			expect(blockStore.getAllBlockLists()).toHaveLength(0);
		});
	});

	describe('バリデーション', () => {
		it('必須フィールドが不足している場合はエラーを投げる', () => {
			const invalidBlockType = { ...mockBlockType, name: '' };

			expect(() => {
				blockStore.createBlock(invalidBlockType);
			}).toThrow(BlockValidationError);
		});

		it('接続の妥当性チェックが機能する', () => {
			const blockId = blockStore.createBlock(mockBlockType);

			expect(blockStore.validateBlockConnection(blockId, 'other-id')).toBe(true);

			expect(() => {
				blockStore.validateBlockConnection(blockId, blockId);
			}).toThrow(BlockRelationshipError);
		});
	});
});
