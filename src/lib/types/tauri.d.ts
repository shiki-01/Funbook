declare module '@tauri-apps/plugin-dialog' {
	export interface SaveDialogOptions {
		filters?: { name: string; extensions: string[] }[];
		defaultPath?: string;
	}

	export interface OpenDialogOptions {
		filters?: { name: string; extensions: string[] }[];
		multiple?: boolean;
	}

	export function save(options?: SaveDialogOptions): Promise<string | null>;
	export function open(options?: OpenDialogOptions): Promise<string | string[] | null>;
}

declare module '@tauri-apps/plugin-fs' {
	export function writeTextFile(path: string, contents: string): Promise<void>;
	export function readTextFile(path: string): Promise<string>;
}
