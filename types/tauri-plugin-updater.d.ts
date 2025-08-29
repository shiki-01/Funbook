declare module '@tauri-apps/plugin-updater' {
  export interface UpdateInfo {
    version: string;
    date?: string;
    body?: string;
    available: boolean;
    downloadAndInstall: () => Promise<void>;
  }
  export function check(): Promise<UpdateInfo | null>;
}
