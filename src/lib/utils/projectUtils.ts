import type { ProjectData, Block, BlockList } from '$lib/types';
import type { BlockTemplateData } from '$lib/types';
import { useBlockStore } from '../stores/block.store.svelte';

/**
 * プロジェクトデータをエクスポート
 */
export function exportProjectData(projectName: string = 'Untitled Project'): ProjectData {
	const blockStore = useBlockStore();

	return {
		version: '1.0.0',
		name: projectName,
		blocks: blockStore.getAllBlocks(),
		blockLists: blockStore.getAllBlockLists(),
		config: blockStore.Config,
		lastModified: new Date().toISOString(),
		metadata: {
			createdAt: '',
			lastModified: ''
		}
	};
}

/** テンプレート（ブロックリストのみ）をエクスポート */
export function exportBlockTemplate(templateName: string = 'Untitled Template'): BlockTemplateData {
	const blockStore = useBlockStore();
	return {
		version: '1.0.0',
		name: templateName,
		blockLists: blockStore.getAllBlockLists(),
		lastModified: new Date().toISOString(),
		metadata: null
	};
}

/**
 * プロジェクトデータをインポート
 */
export function importProjectData(projectData: ProjectData): void {
	const blockStore = useBlockStore();

	try {
		// 設定を更新
		if (projectData.config) {
			blockStore.Config = projectData.config;
		}

		// 既存のデータをクリア
		blockStore.clearAllBlocks();
		blockStore.clearAllBlockLists();

		// ブロックリストを復元
		if (projectData.blockLists) {
			projectData.blockLists.forEach((blockList: BlockList) => {
				blockStore.addBlockList(blockList);
			});
		}

		// ブロックを復元
		if (projectData.blocks) {
			projectData.blocks.forEach((block: Block) => {
				blockStore.restoreBlock(block);
			});
		}

		console.log(`プロジェクト "${projectData.name}" をロードしました`);
	} catch (error) {
		console.error('プロジェクトのインポート中にエラーが発生しました:', error);
		throw error;
	}
}

/**
 * プロジェクトファイルの保存
 */
export async function saveProjectToFile(projectData: ProjectData): Promise<string | null> {
	try {
		// Tauri v2のAPIを使用してファイルダイアログを表示
		const { save } = await import('@tauri-apps/plugin-dialog');
		const { writeTextFile } = await import('@tauri-apps/plugin-fs');

		const filePath = await save({
			filters: [
				{
					name: 'Funbook Project',
					extensions: ['fbpr']
				}
			],
			defaultPath: `${projectData.name}.fbpr`
		});

		if (filePath) {
			const jsonData = JSON.stringify(projectData, null, 2);
			await writeTextFile(filePath, jsonData);
			return filePath;
		}

		return null;
	} catch (error) {
		console.error('プロジェクトの保存中にエラーが発生しました:', error);
		// Tauri APIが利用できない場合はブラウザのダウンロード機能を使用
		return saveProjectToDownload(projectData);
	}
}

/** テンプレートファイルの保存 (.fbtpl) */
export async function saveTemplateToFile(templateData: BlockTemplateData): Promise<string | null> {
	try {
		const { save } = await import('@tauri-apps/plugin-dialog');
		const { writeTextFile } = await import('@tauri-apps/plugin-fs');

		const filePath = await save({
			filters: [
				{ name: 'Funbook Template', extensions: ['fbtpl'] }
			],
			defaultPath: `${templateData.name}.fbtpl`
		});

		if (filePath) {
			await writeTextFile(filePath, JSON.stringify(templateData, null, 2));
			return filePath;
		}
		return null;
	} catch (e) {
		console.error('テンプレート保存失敗', e);
		return saveTemplateToDownload(templateData);
	}
}

/**
 * プロジェクトファイルのロード
 */
export async function loadProjectFromFile(): Promise<ProjectData | null> {
	try {
		// Tauri v2のAPIを使用してファイルダイアログを表示
		const { open } = await import('@tauri-apps/plugin-dialog');
		const { readTextFile } = await import('@tauri-apps/plugin-fs');

		const filePath = await open({
			filters: [
				{
					name: 'Funbook Project',
					extensions: ['fbpr']
				}
			],
			multiple: false
		});

		if (filePath && typeof filePath === 'string') {
			const fileContent = await readTextFile(filePath);
			const projectData: ProjectData = JSON.parse(fileContent);

			// バージョンチェック
			if (!projectData.version) {
				throw new Error('不正なプロジェクトファイルです');
			}

			return projectData;
		}

		return null;
	} catch (error) {
		console.error('プロジェクトのロード中にエラーが発生しました:', error);
		// Tauri APIが利用できない場合はブラウザのファイル入力を使用
		return loadProjectFromUpload();
	}
}

/** テンプレートファイルのロード (.fbtpl) */
export async function loadTemplateFromFile(): Promise<BlockTemplateData | null> {
	try {
		const { open } = await import('@tauri-apps/plugin-dialog');
		const { readTextFile } = await import('@tauri-apps/plugin-fs');
		const filePath = await open({
			filters: [ { name: 'Funbook Template', extensions: ['fbtpl'] } ],
			multiple: false
		});
		if (filePath && typeof filePath === 'string') {
			const content = await readTextFile(filePath);
			const tpl: BlockTemplateData = JSON.parse(content);
			if (!tpl.version || !Array.isArray(tpl.blockLists)) {
				throw new Error('不正なテンプレートファイル');
			}
			return tpl;
		}
		return null;
	} catch (e) {
		console.error('テンプレートロード失敗', e);
		return loadTemplateFromUpload();
	}
}

/** テンプレート適用（既存ブロック/接続は保持し palette をマージ） */
export function applyTemplateToPalette(template: BlockTemplateData): void {
	const blockStore = useBlockStore();
	if (!template?.blockLists) return;
	template.blockLists.forEach((bl) => blockStore.addBlockList(bl));
}

/**
 * ブラウザのダウンロード機能を使用してプロジェクトを保存（フォールバック）
 */
function saveProjectToDownload(projectData: ProjectData): string {
	const jsonData = JSON.stringify(projectData, null, 2);
	const blob = new Blob([jsonData], { type: 'application/json' });
	const url = URL.createObjectURL(blob);

	const a = document.createElement('a');
	a.href = url;
	a.download = `${projectData.name}.fbpr`;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);

	return `${projectData.name}.scrp`;
}

/**
 * ブラウザのファイル入力を使用してプロジェクトをロード（フォールバック）
 */
function loadProjectFromUpload(): Promise<ProjectData | null> {
	return new Promise((resolve) => {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = '.fbpr';

		input.onchange = (event) => {
			const file = (event.target as HTMLInputElement).files?.[0];
			if (file) {
				const reader = new FileReader();
				reader.onload = (e) => {
					try {
						const content = e.target?.result as string;
						const projectData: ProjectData = JSON.parse(content);
						resolve(projectData);
					} catch (error) {
						console.error('ファイルの解析中にエラーが発生しました:', error);
						resolve(null);
					}
				};
				reader.readAsText(file);
			} else {
				resolve(null);
			}
		};

		input.click();
	});
}

/** ブラウザ保存フォールバック: テンプレート */
function saveTemplateToDownload(templateData: BlockTemplateData): string {
	const jsonData = JSON.stringify(templateData, null, 2);
	const blob = new Blob([jsonData], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `${templateData.name}.fbtpl`;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
	return `${templateData.name}.fbtpl`;
}

/** ブラウザ読み込みフォールバック: テンプレート */
function loadTemplateFromUpload(): Promise<BlockTemplateData | null> {
	return new Promise((resolve) => {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = '.fbtpl';
		input.onchange = (e) => {
			const file = (e.target as HTMLInputElement).files?.[0];
			if (file) {
				const reader = new FileReader();
				reader.onload = (ev) => {
					try {
						const content = ev.target?.result as string;
						const tpl: BlockTemplateData = JSON.parse(content);
						resolve(tpl);
					} catch (err) {
						console.error('テンプレート解析失敗', err);
						resolve(null);
					}
				};
				reader.readAsText(file);
			} else {
				resolve(null);
			}
		};
		input.click();
	});
}
