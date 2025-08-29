/**
 * ストア通信サービスのテスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StoreCommunicationService, StoreCommunicationError } from './StoreCommunicationService';
import { useBlockStore } from '$lib/stores/block.store.svelte';
import { useCanvasStore } from '$lib/stores/canvas.store.svelte';
import { useProjectStore } from '$lib/stores/project.store.svelte';
import type { Block } from '$lib/types';
import { BlockPathType, Connection } from '$lib/types';

// モックストア
vi.mock('$lib/stores/block.store.svelte');
vi.mock('$lib/stores/canvas.store.svelte');
vi.mock('$lib/stores/project.store.svelte');

describe('StoreCommunicationService', () => {
	let communicationService: StoreCommunicationService;
	let mockBlockStore: any;
	let mockCanvasStore: any;
	let mockProjectStore: any;

	beforeEach(() => {
		// モックストアの設定
		mockBlockStore = {
			getBlock: vi.fn(),
			getAllBlocks: vi.fn().mockReturnValue([]),
			getAllBlockLists: vi.fn().mockReturnValue([]),
			hasBlock: vi.fn().mockReturnValue(true)
		};

		mockCanvasStore = {
			isBlockSelected: vi.fn().mockReturnValue(false),
			getSelectedBlockIds: vi.fn().mockReturnValue([]),
			selectBlocks: vi.fn(),
			getInteractionState: vi.fn().mockReturnValue({
				isDragging: false,
				isSelecting: false,
				lastMousePos: { x: 0, y: 0 },
				hoveredBlockId: null
			}),
			setHoveredBlock: vi.fn(),
			getViewport: vi.fn().mockReturnValue({ x: 0, y: 0, zoom: 1 })
		};

		mockProjectStore = {
			syncBlocks: vi.fn(),
			syncBlockLists: vi.fn(),
			getProjectData: vi.fn().mockReturnValue({
				blocks: [],
				blockLists: [],
				version: '1.0.0',
				name: 'Test Project',
				description: '',
				metadata: {
					createdAt: new Date().toISOString(),
					lastModified: new Date().toISOString(),
					author: '',
					tags: []
				}
			})
		};

		// モック関数の設定
		vi.mocked(useBlockStore).mockReturnValue(mockBlockStore);
		vi.mocked(useCanvasStore).mockReturnValue(mockCanvasStore);
		vi.mocked(useProjectStore).mockReturnValue(mockProjectStore);

		communicationService = new StoreCommunicationService();
	});

	describe('onBlockCreated', () => {
		it('ブロック作成時に正常に同期処理を実行する', async () => {
			const testBlock: Block = {
				id: 'block1',
				name: 'test-block',
				title: 'Test Block',
				type: BlockPathType.Move,
				color: '#FF5733',
				output: 'test output',
				connection: Connection.Both,
				content: [],
				position: { x: 100, y: 100 },
				zIndex: 0,
				visibility: true,
				draggable: true,
				editable: true,
				deletable: true
			};

			mockBlockStore.getBlock.mockReturnValue(testBlock);
			mockBlockStore.getAllBlocks.mockReturnValue([testBlock]);

			await communicationService.onBlockCreated('block1');

			expect(mockBlockStore.getBlock).toHaveBeenCalledWith('block1');
			expect(mockProjectStore.syncBlocks).toHaveBeenCalledWith([testBlock]);
		});

		it('存在しないブロックの作成通知でエラーを処理する', async () => {
			mockBlockStore.getBlock.mockReturnValue(null);

			// エラーが発生してもthrowされないことを確認
			await expect(communicationService.onBlockCreated('nonexistent')).resolves.not.toThrow();
		});
	});

	describe('onBlockUpdated', () => {
		it('ブロック更新時に正常に同期処理を実行する', async () => {
			const testBlock: Block = {
				id: 'block1',
				name: 'test-block',
				title: 'Test Block',
				type: BlockPathType.Move,
				color: '#FF5733',
				output: 'test output',
				connection: Connection.Both,
				content: [],
				position: { x: 100, y: 100 },
				zIndex: 0,
				visibility: true,
				draggable: true,
				editable: true,
				deletable: true
			};

			const updates = { position: { x: 200, y: 200 } };

			mockBlockStore.getBlock.mockReturnValue(testBlock);
			mockBlockStore.getAllBlocks.mockReturnValue([testBlock]);

			await communicationService.onBlockUpdated('block1', updates);

			expect(mockBlockStore.getBlock).toHaveBeenCalledWith('block1');
			expect(mockProjectStore.syncBlocks).toHaveBeenCalledWith([testBlock]);
		});

		it('選択されたブロックの位置更新を処理する', async () => {
			const testBlock: Block = {
				id: 'block1',
				name: 'test-block',
				title: 'Test Block',
				type: BlockPathType.Move,
				color: '#FF5733',
				output: 'test output',
				connection: Connection.Both,
				content: [],
				position: { x: 100, y: 100 },
				zIndex: 0,
				visibility: true,
				draggable: true,
				editable: true,
				deletable: true
			};

			const updates = { position: { x: 200, y: 200 } };

			mockBlockStore.getBlock.mockReturnValue(testBlock);
			mockBlockStore.getAllBlocks.mockReturnValue([testBlock]);
			mockCanvasStore.isBlockSelected.mockReturnValue(true);

			await communicationService.onBlockUpdated('block1', updates);

			expect(mockCanvasStore.isBlockSelected).toHaveBeenCalledWith('block1');
		});
	});

	describe('onBlockDeleted', () => {
		it('ブロック削除時に正常に同期処理を実行する', async () => {
			mockCanvasStore.isBlockSelected.mockReturnValue(true);
			mockCanvasStore.getSelectedBlockIds.mockReturnValue(['block1', 'block2']);
			mockCanvasStore.getInteractionState.mockReturnValue({
				isDragging: false,
				isSelecting: false,
				lastMousePos: { x: 0, y: 0 },
				hoveredBlockId: 'block1'
			});

			await communicationService.onBlockDeleted('block1');

			expect(mockCanvasStore.selectBlocks).toHaveBeenCalledWith(['block2']);
			expect(mockCanvasStore.setHoveredBlock).toHaveBeenCalledWith(null);
			expect(mockProjectStore.syncBlocks).toHaveBeenCalled();
		});

		it('選択されていないブロックの削除を処理する', async () => {
			mockCanvasStore.isBlockSelected.mockReturnValue(false);
			mockCanvasStore.getInteractionState.mockReturnValue({
				isDragging: false,
				isSelecting: false,
				lastMousePos: { x: 0, y: 0 },
				hoveredBlockId: null
			});

			await communicationService.onBlockDeleted('block1');

			expect(mockCanvasStore.selectBlocks).not.toHaveBeenCalled();
			expect(mockProjectStore.syncBlocks).toHaveBeenCalled();
		});
	});

	describe('onBlocksConnected', () => {
		it('ブロック接続時に正常に同期処理を実行する', async () => {
			await communicationService.onBlocksConnected('parent1', 'child1');

			expect(mockProjectStore.syncBlocks).toHaveBeenCalled();
		});
	});

	describe('onBlocksDisconnected', () => {
		it('ブロック切断時に正常に同期処理を実行する', async () => {
			await communicationService.onBlocksDisconnected('parent1', 'child1');

			expect(mockProjectStore.syncBlocks).toHaveBeenCalled();
		});
	});

	describe('onBlockListAdded', () => {
		it('ブロックリスト追加時に正常に同期処理を実行する', async () => {
			const testBlockList = {
				name: 'test-list',
				block: {
					id: 'template1',
					name: 'template',
					title: 'Template Block',
					type: BlockPathType.Move,
					color: '#FF5733',
					output: 'template output',
					connection: Connection.Both,
					content: [],
					position: { x: 0, y: 0 },
					zIndex: 0,
					visibility: true,
					draggable: true,
					editable: true,
					deletable: true
				}
			};

			await communicationService.onBlockListAdded(testBlockList);

			expect(mockProjectStore.syncBlockLists).toHaveBeenCalled();
		});
	});

	describe('onBlockListRemoved', () => {
		it('ブロックリスト削除時に正常に同期処理を実行する', async () => {
			await communicationService.onBlockListRemoved('test-list');

			expect(mockProjectStore.syncBlockLists).toHaveBeenCalled();
		});
	});

	describe('checkStateConsistency', () => {
		it('一貫性のある状態で正常な結果を返す', async () => {
			const testBlocks: Block[] = [
				{
					id: 'block1',
					name: 'test-block',
					title: 'Test Block',
					type: BlockPathType.Move,
					color: '#FF5733',
					output: 'test output',
					connection: Connection.Both,
					content: [],
					position: { x: 100, y: 100 },
					zIndex: 0,
					visibility: true,
					draggable: true,
					editable: true,
					deletable: true
				}
			];

			mockBlockStore.getAllBlocks.mockReturnValue(testBlocks);
			mockBlockStore.getAllBlockLists.mockReturnValue([]);
			mockProjectStore.getProjectData.mockReturnValue({
				blocks: testBlocks,
				blockLists: [],
				version: '1.0.0',
				name: 'Test Project',
				description: '',
				metadata: {
					createdAt: new Date().toISOString(),
					lastModified: new Date().toISOString(),
					author: '',
					tags: []
				}
			});
			mockCanvasStore.getSelectedBlockIds.mockReturnValue(['block1']);
			mockBlockStore.hasBlock.mockReturnValue(true);

			const result = await communicationService.checkStateConsistency();

			expect(result.isConsistent).toBe(true);
			expect(result.issues).toHaveLength(0);
		});

		it('不整合のある状態で問題を検出する', async () => {
			mockBlockStore.getAllBlocks.mockReturnValue([]);
			mockBlockStore.getAllBlockLists.mockReturnValue([]);
			mockProjectStore.getProjectData.mockReturnValue({
				blocks: [{ id: 'block1' } as Block],
				blockLists: [],
				version: '1.0.0',
				name: 'Test Project',
				description: '',
				metadata: {
					createdAt: new Date().toISOString(),
					lastModified: new Date().toISOString(),
					author: '',
					tags: []
				}
			});
			mockCanvasStore.getSelectedBlockIds.mockReturnValue(['nonexistent']);
			mockBlockStore.hasBlock.mockReturnValue(false);

			const result = await communicationService.checkStateConsistency();

			expect(result.isConsistent).toBe(false);
			expect(result.issues.length).toBeGreaterThan(0);
		});
	});

	describe('sync control', () => {
		it('同期を無効化/有効化できる', () => {
			communicationService.disableSync();
			communicationService.enableSync();

			// 同期状態の変更が正常に動作することを確認
			expect(() => {
				communicationService.disableSync();
				communicationService.enableSync();
			}).not.toThrow();
		});
	});

	describe('event queue management', () => {
		it('イベントキューをクリアできる', () => {
			communicationService.clearEventQueue();

			const status = communicationService.getEventQueueStatus();
			expect(status.queueLength).toBe(0);
		});

		it('イベントキューの状態を取得できる', () => {
			const status = communicationService.getEventQueueStatus();

			expect(status).toHaveProperty('queueLength');
			expect(status).toHaveProperty('isProcessing');
			expect(status).toHaveProperty('syncEnabled');
		});
	});
});
