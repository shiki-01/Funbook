/**
 * ファイルシステム操作アダプター
 */

/**
 * ファイルシステム操作インターフェース
 */
export interface FileSystemAdapter {
	writeTextFile(path: string, content: string): Promise<void>;
	readTextFile(path: string): Promise<string>;
}

/**
 * Tauri ファイルシステムアダプター
 */
export class TauriFileSystemAdapter implements FileSystemAdapter {
	async writeTextFile(path: string, content: string): Promise<void> {
		const { writeTextFile } = await import('@tauri-apps/plugin-fs');
		return writeTextFile(path, content);
	}

	async readTextFile(path: string): Promise<string> {
		const { readTextFile } = await import('@tauri-apps/plugin-fs');
		return readTextFile(path);
	}
}

/**
 * デフォルトのファイルシステムアダプターインスタンス
 */
export const defaultFileSystemAdapter = new TauriFileSystemAdapter();
