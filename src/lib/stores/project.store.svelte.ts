/**
 * プロジェクトストア - アプリケーションレベル状態管理
 * プロジェクトデータ管理、永続化、履歴追跡機能を提供
 */

import type { ProjectData, ProjectMetadata, Block, BlockList } from '$lib/types/domain';
import type { FileSystemAdapter } from '$lib/adapters/filesystem';
import { defaultFileSystemAdapter } from '$lib/adapters/filesystem';

/**
 * プロジェクト操作エラー
 */
export class ProjectError extends Error {
	constructor(
		message: string,
		public context?: Record<string, any>
	) {
		super(message);
		this.name = 'ProjectError';
	}
}

/**
 * プロジェクト永続化エラー
 */
export class ProjectPersistenceError extends Error {
	constructor(
		message: string,
		public filePath?: string
	) {
		super(message);
		this.name = 'ProjectPersistenceError';
	}
}

/**
 * 履歴エントリ
 */
interface HistoryEntry {
	id: string;
	timestamp: number;
	description: string;
	projectData: ProjectData;
}

/**
 * プロジェクト履歴管理
 */
interface ProjectHistory {
	entries: HistoryEntry[];
	currentIndex: number;
	maxEntries: number;
}

/**
 * プロジェクト状態
 */
interface ProjectState {
	isDirty: boolean;
	isLoading: boolean;
	isSaving: boolean;
	lastSaved: Date | null;
	filePath: string | null;
}

/**
 * アプリケーションレベル状態のためのプロジェクトストア
 * プロジェクトデータ管理、永続化、履歴追跡を統合管理
 */
export class ProjectStore {
	private fileSystem: FileSystemAdapter;

	constructor(fileSystem?: FileSystemAdapter) {
		this.fileSystem = fileSystem || defaultFileSystemAdapter;
		// 初期プロジェクトデータを履歴に追加
		this.addHistoryEntry('プロジェクト作成', this.projectData);
	}

	private projectData = $state<ProjectData>({
		version: '1.0.0',
		name: '新しいプロジェクト',
		description: '',
		blocks: [],
		blockLists: [],
		metadata: {
			createdAt: new Date().toISOString(),
			lastModified: new Date().toISOString(),
			author: '',
			tags: []
		},
		config: {
			HEADER_HEIGHT: 0,
			SIDEBAR_WIDTH: 0,
			BLOCK_MIN_WIDTH: 0,
			BLOCK_MIN_HEIGHT: 0,
			VALUE_BLOCK_MIN_HEIGHT: 0,
			BLOCK_PADDING: 0,
			GRID_SIZE: 0,
			ZOOM_MIN: 0,
			ZOOM_MAX: 0,
			ZOOM_STEP: 0
		},
		lastModified: ''
	});

	private projectState = $state<ProjectState>({
		isDirty: false,
		isLoading: false,
		isSaving: false,
		lastSaved: null,
		filePath: null
	});

	private history = $state<ProjectHistory>({
		entries: [],
		currentIndex: -1,
		maxEntries: 50
	});

	// プロジェクトデータ操作

	/**
	 * 新しいプロジェクトを作成
	 * @param name - プロジェクト名
	 * @param description - プロジェクト説明（オプション）
	 */
	createNewProject(name: string, description?: string): void {
		const newProjectData: ProjectData = {
			version: '1.0.0',
			name,
			description: description || '',
			blocks: [],
			blockLists: [],
			metadata: {
				createdAt: new Date().toISOString(),
				lastModified: new Date().toISOString(),
				author: '',
				tags: []
			},
			config: {
				HEADER_HEIGHT: 0,
				SIDEBAR_WIDTH: 0,
				BLOCK_MIN_WIDTH: 0,
				BLOCK_MIN_HEIGHT: 0,
				VALUE_BLOCK_MIN_HEIGHT: 0,
				BLOCK_PADDING: 0,
				GRID_SIZE: 0,
				ZOOM_MIN: 0,
				ZOOM_MAX: 0,
				ZOOM_STEP: 0
			},
			lastModified: ''
		};

		this.setProjectData(newProjectData);
		this.resetProjectState();
		this.clearHistory();
		this.addHistoryEntry('プロジェクト作成', newProjectData);
	}

	/**
	 * プロジェクトデータを設定
	 * @param data - プロジェクトデータ
	 */
	setProjectData(data: ProjectData): void {
		this.validateProjectData(data);
		this.projectData = { ...data };
		this.markAsDirty();
	}

	/**
	 * プロジェクトデータを取得
	 * @returns 現在のプロジェクトデータ
	 */
	getProjectData(): ProjectData {
		return {
			...this.projectData,
			blocks: [...this.projectData.blocks],
			blockLists: [...this.projectData.blockLists],
			metadata: { ...this.projectData.metadata }
		};
	}

	/**
	 * プロジェクト名を更新
	 * @param name - 新しいプロジェクト名
	 */
	updateProjectName(name: string): void {
		if (!name.trim()) {
			throw new ProjectError('プロジェクト名は空にできません');
		}

		const updatedData = {
			...this.projectData,
			name: name.trim(),
			metadata: {
				...this.projectData.metadata,
				lastModified: new Date().toISOString()
			}
		};

		this.projectData = updatedData;
		this.markAsDirty();
		this.addHistoryEntry(`プロジェクト名を「${name}」に変更`, updatedData);
	}

	/**
	 * プロジェクト説明を更新
	 * @param description - 新しいプロジェクト説明
	 */
	updateProjectDescription(description: string): void {
		const updatedData = {
			...this.projectData,
			description,
			metadata: {
				...this.projectData.metadata,
				lastModified: new Date().toISOString()
			}
		};

		this.projectData = updatedData;
		this.markAsDirty();
		this.addHistoryEntry('プロジェクト説明を更新', updatedData);
	}

	/**
	 * プロジェクトメタデータを更新
	 * @param metadata - 新しいメタデータ
	 */
	updateProjectMetadata(metadata: Partial<ProjectMetadata>): void {
		const updatedData = {
			...this.projectData,
			metadata: {
				...this.projectData.metadata,
				...metadata,
				lastModified: new Date().toISOString()
			}
		};

		this.projectData = updatedData;
		this.markAsDirty();
		this.addHistoryEntry('プロジェクトメタデータを更新', updatedData);
	}

	// ブロックデータ同期

	/**
	 * ブロックデータを同期
	 * @param blocks - ブロック配列
	 */
	syncBlocks(blocks: Block[]): void {
		const updatedData = {
			...this.projectData,
			blocks: [...blocks],
			metadata: {
				...this.projectData.metadata,
				lastModified: new Date().toISOString()
			}
		};

		this.projectData = updatedData;
		this.markAsDirty();
		this.addHistoryEntry('ブロックデータを同期', updatedData);
	}

	/**
	 * ブロックリストを同期
	 * @param blockLists - ブロックリスト配列
	 */
	syncBlockLists(blockLists: BlockList[]): void {
		const updatedData = {
			...this.projectData,
			blockLists: [...blockLists],
			metadata: {
				...this.projectData.metadata,
				lastModified: new Date().toISOString()
			}
		};

		this.projectData = updatedData;
		this.markAsDirty();
		this.addHistoryEntry('ブロックリストを同期', updatedData);
	}

	// 永続化操作

	/**
	 * プロジェクトを保存
	 * @param filePath - 保存先ファイルパス（オプション）
	 * @returns 保存処理のPromise
	 */
	async saveProject(filePath?: string): Promise<void> {
		if (this.projectState.isSaving) {
			throw new ProjectError('既に保存処理が実行中です');
		}

		this.projectState = {
			...this.projectState,
			isSaving: true
		};

		try {
			const targetPath = filePath || this.projectState.filePath;
			if (!targetPath) {
				throw new ProjectPersistenceError('保存先ファイルパスが指定されていません');
			}

			// ファイルシステムアダプターを使用してファイルに保存
			const projectJson = JSON.stringify(this.projectData, null, 2);
			await this.fileSystem.writeTextFile(targetPath, projectJson);

			this.projectState = {
				...this.projectState,
				isSaving: false,
				isDirty: false,
				lastSaved: new Date(),
				filePath: targetPath
			};

			// メタデータを更新
			const updatedData = {
				...this.projectData,
				metadata: {
					...this.projectData.metadata,
					lastModified: new Date().toISOString()
				}
			};
			this.projectData = updatedData;
		} catch (error) {
			this.projectState = {
				...this.projectState,
				isSaving: false
			};

			if (error instanceof Error) {
				throw new ProjectPersistenceError(
					`プロジェクトの保存に失敗しました: ${error.message}`,
					filePath
				);
			}
			throw new ProjectPersistenceError('プロジェクトの保存に失敗しました', filePath);
		}
	}

	/**
	 * プロジェクトを読み込み
	 * @param filePath - 読み込み元ファイルパス
	 * @returns 読み込み処理のPromise
	 */
	async loadProject(filePath: string): Promise<void> {
		if (this.projectState.isLoading) {
			throw new ProjectError('既に読み込み処理が実行中です');
		}

		this.projectState = {
			...this.projectState,
			isLoading: true
		};

		try {
			// ファイルシステムアダプターを使用してファイルから読み込み
			const projectJson = await this.fileSystem.readTextFile(filePath);
			const projectData: ProjectData = JSON.parse(projectJson);

			this.validateProjectData(projectData);

			this.projectData = projectData;
			this.projectState = {
				isDirty: false,
				isLoading: false,
				isSaving: false,
				lastSaved: new Date(),
				filePath
			};

			this.clearHistory();
			this.addHistoryEntry('プロジェクトを読み込み', projectData);
		} catch (error) {
			this.projectState = {
				...this.projectState,
				isLoading: false
			};

			if (error instanceof Error) {
				throw new ProjectPersistenceError(
					`プロジェクトの読み込みに失敗しました: ${error.message}`,
					filePath
				);
			}
			throw new ProjectPersistenceError('プロジェクトの読み込みに失敗しました', filePath);
		}
	}

	/**
	 * プロジェクトをエクスポート
	 * @param filePath - エクスポート先ファイルパス
	 * @param format - エクスポート形式（現在はJSONのみ）
	 * @returns エクスポート処理のPromise
	 */
	async exportProject(filePath: string, format: 'json' = 'json'): Promise<void> {
		try {
			let exportData: string;
			switch (format) {
				case 'json':
					exportData = JSON.stringify(this.projectData, null, 2);
					break;
				default:
					throw new ProjectError(`サポートされていないエクスポート形式: ${format}`);
			}

			await this.fileSystem.writeTextFile(filePath, exportData);
		} catch (error) {
			if (error instanceof Error) {
				throw new ProjectPersistenceError(
					`プロジェクトのエクスポートに失敗しました: ${error.message}`,
					filePath
				);
			}
			throw new ProjectPersistenceError('プロジェクトのエクスポートに失敗しました', filePath);
		}
	}

	// 履歴管理（アンドゥ/リドゥ）

	/**
	 * アンドゥを実行
	 * @returns アンドゥが実行された場合はtrue
	 */
	undo(): boolean {
		if (!this.canUndo()) {
			return false;
		}

		this.history = {
			...this.history,
			currentIndex: this.history.currentIndex - 1
		};

		const entry = this.history.entries[this.history.currentIndex];
		this.projectData = { ...entry.projectData };
		this.markAsDirty();

		return true;
	}

	/**
	 * リドゥを実行
	 * @returns リドゥが実行された場合はtrue
	 */
	redo(): boolean {
		if (!this.canRedo()) {
			return false;
		}

		this.history = {
			...this.history,
			currentIndex: this.history.currentIndex + 1
		};

		const entry = this.history.entries[this.history.currentIndex];
		this.projectData = { ...entry.projectData };
		this.markAsDirty();

		return true;
	}

	/**
	 * アンドゥが可能かチェック
	 * @returns アンドゥ可能な場合はtrue
	 */
	canUndo(): boolean {
		return this.history.currentIndex > 0;
	}

	/**
	 * リドゥが可能かチェック
	 * @returns リドゥ可能な場合はtrue
	 */
	canRedo(): boolean {
		return this.history.currentIndex < this.history.entries.length - 1;
	}

	/**
	 * 履歴エントリを取得
	 * @returns 履歴エントリの配列
	 */
	getHistoryEntries(): HistoryEntry[] {
		return [...this.history.entries];
	}

	/**
	 * 現在の履歴インデックスを取得
	 * @returns 現在の履歴インデックス
	 */
	getCurrentHistoryIndex(): number {
		return this.history.currentIndex;
	}

	// 状態取得

	/**
	 * プロジェクト状態を取得
	 * @returns 現在のプロジェクト状態
	 */
	getProjectState(): ProjectState {
		return { ...this.projectState };
	}

	/**
	 * プロジェクトが変更されているかチェック
	 * @returns 変更されている場合はtrue
	 */
	isDirty(): boolean {
		return this.projectState.isDirty;
	}

	/**
	 * プロジェクトが読み込み中かチェック
	 * @returns 読み込み中の場合はtrue
	 */
	isLoading(): boolean {
		return this.projectState.isLoading;
	}

	/**
	 * プロジェクトが保存中かチェック
	 * @returns 保存中の場合はtrue
	 */
	isSaving(): boolean {
		return this.projectState.isSaving;
	}

	/**
	 * 最後の保存日時を取得
	 * @returns 最後の保存日時、未保存の場合はnull
	 */
	getLastSaved(): Date | null {
		return this.projectState.lastSaved;
	}

	/**
	 * ファイルパスを取得
	 * @returns 現在のファイルパス、未設定の場合はnull
	 */
	getFilePath(): string | null {
		return this.projectState.filePath;
	}

	// プライベートヘルパーメソッド

	/**
	 * プロジェクトデータの妥当性をチェック
	 * @param data - チェックするプロジェクトデータ
	 */
	private validateProjectData(data: ProjectData): void {
		if (!data.version) {
			throw new ProjectError('プロジェクトデータにバージョンが必要です');
		}
		if (!data.name) {
			throw new ProjectError('プロジェクトデータに名前が必要です');
		}
		if (!Array.isArray(data.blocks)) {
			throw new ProjectError('プロジェクトデータのブロックは配列である必要があります');
		}
		if (!Array.isArray(data.blockLists)) {
			throw new ProjectError('プロジェクトデータのブロックリストは配列である必要があります');
		}
		if (!data.metadata) {
			throw new ProjectError('プロジェクトデータにメタデータが必要です');
		}
		if (!data.metadata.createdAt) {
			throw new ProjectError('プロジェクトメタデータに作成日時が必要です');
		}
		if (!data.metadata.lastModified) {
			throw new ProjectError('プロジェクトメタデータに最終更新日時が必要です');
		}
	}

	/**
	 * プロジェクトを変更済みとしてマーク
	 */
	private markAsDirty(): void {
		this.projectState = {
			...this.projectState,
			isDirty: true
		};
	}

	/**
	 * プロジェクト状態をリセット
	 */
	private resetProjectState(): void {
		this.projectState = {
			isDirty: false,
			isLoading: false,
			isSaving: false,
			lastSaved: null,
			filePath: null
		};
	}

	/**
	 * 履歴エントリを追加
	 * @param description - 操作の説明
	 * @param projectData - プロジェクトデータ
	 */
	private addHistoryEntry(description: string, projectData: ProjectData): void {
		const entry: HistoryEntry = {
			id: crypto.randomUUID(),
			timestamp: Date.now(),
			description,
			projectData: {
				...projectData,
				blocks: [...projectData.blocks],
				blockLists: [...projectData.blockLists],
				metadata: { ...projectData.metadata }
			}
		};

		// 現在のインデックス以降のエントリを削除（新しい分岐を作成）
		const newEntries = this.history.entries.slice(0, this.history.currentIndex + 1);
		newEntries.push(entry);

		// 最大エントリ数を超えた場合は古いエントリを削除
		if (newEntries.length > this.history.maxEntries) {
			newEntries.shift();
		}

		this.history = {
			...this.history,
			entries: newEntries,
			currentIndex: newEntries.length - 1
		};
	}

	/**
	 * 履歴をクリア
	 */
	private clearHistory(): void {
		this.history = {
			entries: [],
			currentIndex: -1,
			maxEntries: 50
		};
	}
}

// シングルトンインスタンス
let projectStoreInstance: ProjectStore | null = null;

/**
 * プロジェクトストアのインスタンスを取得
 * シングルトンパターンで単一のインスタンスを保証
 * @returns プロジェクトストアインスタンス
 */
export const useProjectStore = (): ProjectStore => {
	if (!projectStoreInstance) {
		projectStoreInstance = new ProjectStore();
	}
	return projectStoreInstance;
};
