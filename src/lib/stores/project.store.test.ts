/**
 * プロジェクトストアのユニットテスト
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ProjectStore, ProjectError, ProjectPersistenceError } from './project.store.svelte';
import type { ProjectData, Block, BlockList } from '$lib/types/domain';
import { BlockPathType, Connection } from '$lib/types/core';
import type { FileSystemAdapter } from '$lib/adapters/filesystem';

// ファイルシステムアダプターをモック
vi.mock('$lib/adapters/filesystem', () => {
	const mockAdapter = {
		writeTextFile: vi.fn(),
		readTextFile: vi.fn()
	};

	return {
		defaultFileSystemAdapter: mockAdapter,
		TauriFileSystemAdapter: vi.fn().mockImplementation(() => mockAdapter)
	};
});

// モックファイルシステムアダプター
class MockFileSystemAdapter implements FileSystemAdapter {
	writeTextFile = vi.fn();
	readTextFile = vi.fn();
}

describe('ProjectStore', () => {
	let store: ProjectStore;
	let mockFileSystem: MockFileSystemAdapter;

	beforeEach(() => {
		mockFileSystem = new MockFileSystemAdapter();
		store = new ProjectStore(mockFileSystem);
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('プロジェクト作成', () => {
		it('新しいプロジェクトを作成できる', () => {
			const projectName = 'テストプロジェクト';
			const description = 'テスト用のプロジェクトです';

			store.createNewProject(projectName, description);

			const projectData = store.getProjectData();
			expect(projectData.name).toBe(projectName);
			expect(projectData.description).toBe(description);
			expect(projectData.version).toBe('1.0.0');
			expect(projectData.blocks).toEqual([]);
			expect(projectData.blockLists).toEqual([]);
			expect(projectData.metadata.createdAt).toBeDefined();
			expect(projectData.metadata.lastModified).toBeDefined();
		});

		it('説明なしで新しいプロジェクトを作成できる', () => {
			const projectName = 'シンプルプロジェクト';

			store.createNewProject(projectName);

			const projectData = store.getProjectData();
			expect(projectData.name).toBe(projectName);
			expect(projectData.description).toBe('');
		});

		it('新しいプロジェクト作成時に履歴がリセットされる', () => {
			// 最初に履歴を作成
			store.updateProjectName('古いプロジェクト');
			expect(store.canUndo()).toBe(true);

			// 新しいプロジェクトを作成
			store.createNewProject('新しいプロジェクト');

			// 履歴がリセットされていることを確認
			expect(store.canUndo()).toBe(false);
			expect(store.getHistoryEntries()).toHaveLength(1);
		});
	});

	describe('プロジェクトデータ操作', () => {
		it('プロジェクト名を更新できる', () => {
			const newName = '更新されたプロジェクト名';

			store.updateProjectName(newName);

			const projectData = store.getProjectData();
			expect(projectData.name).toBe(newName);
			expect(store.isDirty()).toBe(true);
		});

		it('空のプロジェクト名は拒否される', () => {
			expect(() => store.updateProjectName('')).toThrow(ProjectError);
			expect(() => store.updateProjectName('   ')).toThrow(ProjectError);
		});

		it('プロジェクト説明を更新できる', () => {
			const newDescription = '更新された説明';

			store.updateProjectDescription(newDescription);

			const projectData = store.getProjectData();
			expect(projectData.description).toBe(newDescription);
			expect(store.isDirty()).toBe(true);
		});

		it('プロジェクトメタデータを更新できる', () => {
			const metadata = {
				author: 'テスト作成者',
				tags: ['テスト', 'プロジェクト']
			};

			store.updateProjectMetadata(metadata);

			const projectData = store.getProjectData();
			expect(projectData.metadata.author).toBe(metadata.author);
			expect(projectData.metadata.tags).toEqual(metadata.tags);
			expect(store.isDirty()).toBe(true);
		});

		it('メタデータ更新時にlastModifiedが自動更新される', () => {
			const initialData = store.getProjectData();
			const initialLastModified = initialData.metadata.lastModified;

			// 少し待ってから更新
			setTimeout(() => {
				store.updateProjectMetadata({ author: '新しい作成者' });

				const updatedData = store.getProjectData();
				expect(updatedData.metadata.lastModified).not.toBe(initialLastModified);
			}, 10);
		});
	});

	describe('ブロックデータ同期', () => {
		it('ブロックデータを同期できる', () => {
			const blocks: Block[] = [
				{
					id: 'block1',
					name: 'テストブロック1',
					type: BlockPathType.Move,
					title: 'ブロック1',
					output: '出力1',
					content: [],
					position: { x: 0, y: 0 },
					zIndex: 0,
					visibility: true,
					connection: Connection.Both,
					draggable: true,
					editable: true,
					deletable: true
				}
			];

			store.syncBlocks(blocks);

			const projectData = store.getProjectData();
			expect(projectData.blocks).toEqual(blocks);
			expect(store.isDirty()).toBe(true);
		});

		it('ブロックリストを同期できる', () => {
			const blockLists: BlockList[] = [
				{
					name: 'テストリスト',
					block: {} as any,
					description: 'テスト用のブロックリスト'
				}
			];

			store.syncBlockLists(blockLists);

			const projectData = store.getProjectData();
			expect(projectData.blockLists).toEqual(blockLists);
			expect(store.isDirty()).toBe(true);
		});
	});

	describe('プロジェクト永続化', () => {
		const mockProjectData: ProjectData = {
			version: '1.0.0',
			name: 'テストプロジェクト',
			description: 'テスト用',
			blocks: [],
			blockLists: [],
			metadata: {
				createdAt: '2023-01-01T00:00:00.000Z',
				lastModified: '2023-01-01T00:00:00.000Z'
			}
		};

		it('プロジェクトを保存できる', async () => {
			const filePath = '/path/to/project.json';
			mockFileSystem.writeTextFile.mockResolvedValue(undefined);

			store.setProjectData(mockProjectData);
			await store.saveProject(filePath);

			expect(mockFileSystem.writeTextFile).toHaveBeenCalledWith(
				filePath,
				JSON.stringify(mockProjectData, null, 2)
			);
			expect(store.isDirty()).toBe(false);
			expect(store.getFilePath()).toBe(filePath);
			expect(store.getLastSaved()).toBeInstanceOf(Date);
		});

		it('保存中は重複保存を拒否する', async () => {
			const filePath = '/path/to/project.json';
			mockFileSystem.writeTextFile.mockImplementation(
				() => new Promise((resolve) => setTimeout(resolve, 100))
			);

			store.setProjectData(mockProjectData);
			const savePromise = store.saveProject(filePath);

			await expect(store.saveProject(filePath)).rejects.toThrow(ProjectError);
			await savePromise;
		});

		it('保存エラーを適切に処理する', async () => {
			const filePath = '/path/to/project.json';
			const errorMessage = 'ファイル書き込みエラー';
			mockFileSystem.writeTextFile.mockRejectedValue(new Error(errorMessage));

			store.setProjectData(mockProjectData);

			await expect(store.saveProject(filePath)).rejects.toThrow(ProjectPersistenceError);
			expect(store.isSaving()).toBe(false);
		});

		it('プロジェクトを読み込みできる', async () => {
			const filePath = '/path/to/project.json';
			mockFileSystem.readTextFile.mockResolvedValue(JSON.stringify(mockProjectData));

			await store.loadProject(filePath);

			expect(mockFileSystem.readTextFile).toHaveBeenCalledWith(filePath);
			expect(store.getProjectData()).toEqual(mockProjectData);
			expect(store.isDirty()).toBe(false);
			expect(store.getFilePath()).toBe(filePath);
		});

		it('読み込み中は重複読み込みを拒否する', async () => {
			const filePath = '/path/to/project.json';
			mockFileSystem.readTextFile.mockImplementation(
				() =>
					new Promise((resolve) => setTimeout(() => resolve(JSON.stringify(mockProjectData)), 100))
			);

			const loadPromise = store.loadProject(filePath);

			await expect(store.loadProject(filePath)).rejects.toThrow(ProjectError);
			await loadPromise;
		});

		it('読み込みエラーを適切に処理する', async () => {
			const filePath = '/path/to/project.json';
			const errorMessage = 'ファイル読み込みエラー';
			mockFileSystem.readTextFile.mockRejectedValue(new Error(errorMessage));

			await expect(store.loadProject(filePath)).rejects.toThrow(ProjectPersistenceError);
			expect(store.isLoading()).toBe(false);
		});

		it('無効なJSONファイルの読み込みを拒否する', async () => {
			const filePath = '/path/to/invalid.json';
			mockFileSystem.readTextFile.mockResolvedValue('invalid json');

			await expect(store.loadProject(filePath)).rejects.toThrow(ProjectPersistenceError);
		});

		it('プロジェクトをエクスポートできる', async () => {
			const filePath = '/path/to/export.json';
			mockFileSystem.writeTextFile.mockResolvedValue(undefined);

			store.setProjectData(mockProjectData);
			await store.exportProject(filePath);

			expect(mockFileSystem.writeTextFile).toHaveBeenCalledWith(
				filePath,
				JSON.stringify(mockProjectData, null, 2)
			);
		});

		it('エクスポートエラーを適切に処理する', async () => {
			const filePath = '/path/to/export.json';
			const errorMessage = 'エクスポートエラー';
			mockFileSystem.writeTextFile.mockRejectedValue(new Error(errorMessage));

			store.setProjectData(mockProjectData);

			await expect(store.exportProject(filePath)).rejects.toThrow(ProjectPersistenceError);
		});
	});

	describe('履歴管理（アンドゥ/リドゥ）', () => {
		it('アンドゥ/リドゥが正しく動作する', () => {
			const originalName = store.getProjectData().name;

			// 変更を加える
			store.updateProjectName('変更1');
			expect(store.getProjectData().name).toBe('変更1');
			expect(store.canUndo()).toBe(true);
			expect(store.canRedo()).toBe(false);

			// さらに変更を加える
			store.updateProjectName('変更2');
			expect(store.getProjectData().name).toBe('変更2');

			// アンドゥを実行
			const undoResult = store.undo();
			expect(undoResult).toBe(true);
			expect(store.getProjectData().name).toBe('変更1');
			expect(store.canRedo()).toBe(true);

			// さらにアンドゥを実行
			store.undo();
			expect(store.getProjectData().name).toBe(originalName);

			// リドゥを実行
			const redoResult = store.redo();
			expect(redoResult).toBe(true);
			expect(store.getProjectData().name).toBe('変更1');
		});

		it('アンドゥ不可能な状態でfalseを返す', () => {
			expect(store.canUndo()).toBe(false);
			expect(store.undo()).toBe(false);
		});

		it('リドゥ不可能な状態でfalseを返す', () => {
			expect(store.canRedo()).toBe(false);
			expect(store.redo()).toBe(false);
		});

		it('新しい変更後はリドゥできなくなる', () => {
			// 変更を加える
			store.updateProjectName('変更1');
			store.updateProjectName('変更2');

			// アンドゥしてリドゥ可能な状態にする
			store.undo();
			expect(store.canRedo()).toBe(true);

			// 新しい変更を加える
			store.updateProjectName('新しい変更');
			expect(store.canRedo()).toBe(false);
		});

		it('履歴エントリを取得できる', () => {
			store.updateProjectName('変更1');
			store.updateProjectName('変更2');

			const entries = store.getHistoryEntries();
			expect(entries).toHaveLength(3); // 初期 + 2回の変更
			expect(entries[0].description).toContain('プロジェクト作成');
			expect(entries[1].description).toContain('変更1');
			expect(entries[2].description).toContain('変更2');
		});

		it('現在の履歴インデックスを取得できる', () => {
			expect(store.getCurrentHistoryIndex()).toBe(0);

			store.updateProjectName('変更1');
			expect(store.getCurrentHistoryIndex()).toBe(1);

			store.undo();
			expect(store.getCurrentHistoryIndex()).toBe(0);
		});
	});

	describe('状態管理', () => {
		it('プロジェクト状態を正しく取得できる', () => {
			const state = store.getProjectState();
			expect(state.isDirty).toBe(false);
			expect(state.isLoading).toBe(false);
			expect(state.isSaving).toBe(false);
			expect(state.lastSaved).toBeNull();
			expect(state.filePath).toBeNull();
		});

		it('変更後にdirtyフラグが立つ', () => {
			expect(store.isDirty()).toBe(false);

			store.updateProjectName('新しい名前');
			expect(store.isDirty()).toBe(true);
		});

		it('保存後にdirtyフラグがクリアされる', async () => {
			const filePath = '/path/to/project.json';
			mockFileSystem.writeTextFile.mockResolvedValue(undefined);

			store.updateProjectName('新しい名前');
			expect(store.isDirty()).toBe(true);

			await store.saveProject(filePath);
			expect(store.isDirty()).toBe(false);
		});
	});

	describe('データ検証', () => {
		it('無効なプロジェクトデータを拒否する', () => {
			const invalidData = {
				// versionが欠如
				name: 'テスト',
				description: '',
				blocks: [],
				blockLists: [],
				metadata: {
					createdAt: '2023-01-01T00:00:00.000Z',
					lastModified: '2023-01-01T00:00:00.000Z'
				}
			} as unknown as ProjectData;

			expect(() => store.setProjectData(invalidData)).toThrow(ProjectError);
		});

		it('ブロックが配列でない場合を拒否する', () => {
			const invalidData = {
				version: '1.0.0',
				name: 'テスト',
				description: '',
				blocks: 'invalid' as any,
				blockLists: [],
				metadata: {
					createdAt: '2023-01-01T00:00:00.000Z',
					lastModified: '2023-01-01T00:00:00.000Z'
				}
			};

			expect(() => store.setProjectData(invalidData)).toThrow(ProjectError);
		});

		it('メタデータが欠如している場合を拒否する', () => {
			const invalidData = {
				version: '1.0.0',
				name: 'テスト',
				description: '',
				blocks: [],
				blockLists: []
				// metadataが欠如
			} as unknown as ProjectData;

			expect(() => store.setProjectData(invalidData)).toThrow(ProjectError);
		});
	});

	describe('シングルトンパターン', () => {
		it('useProjectStoreは同じインスタンスを返す', async () => {
			const { useProjectStore } = await import('./project.store.svelte');

			const store1 = useProjectStore();
			const store2 = useProjectStore();

			expect(store1).toBe(store2);
		});
	});
});
