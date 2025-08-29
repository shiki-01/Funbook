import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Svelteコンポーネントテスト用の環境設定
if (typeof global !== 'undefined' && !global.CSS) {
	(global as any).CSS = { supports: () => false };
}

// Mock crypto.randomUUID for tests
Object.defineProperty(globalThis, 'crypto', {
	value: {
		randomUUID: vi.fn(() => 'test-uuid-' + Math.random().toString(36).substring(2, 9))
	}
});

// Mock ResizeObserver
(globalThis as any).ResizeObserver = vi.fn().mockImplementation(() => ({
	observe: vi.fn(),
	unobserve: vi.fn(),
	disconnect: vi.fn()
}));

// Mock IntersectionObserver
(globalThis as any).IntersectionObserver = vi.fn().mockImplementation(() => ({
	observe: vi.fn(),
	unobserve: vi.fn(),
	disconnect: vi.fn()
}));

// Mock document.elementsFromPoint
if (typeof document !== 'undefined' && !document.elementsFromPoint) {
	(document as any).elementsFromPoint = vi.fn().mockReturnValue([]);
}

// Mock Tauri API
vi.mock('@tauri-apps/api/fs', () => ({
	writeTextFile: vi.fn(),
	readTextFile: vi.fn()
}));

// Mock filesystem adapter
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
