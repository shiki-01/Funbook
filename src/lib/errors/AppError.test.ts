import { describe, it, expect } from 'vitest';
import {
	AppError,
	BlockError,
	CanvasError,
	DragError,
	ValidationError,
	ProjectError,
	NetworkError,
	ConfigError
} from './AppError';

describe('AppError', () => {
	it('基本的なAppErrorを作成できる', () => {
		const error = new AppError('テストエラー', 'TEST_ERROR', 'medium');

		expect(error.message).toBe('テストエラー');
		expect(error.code).toBe('TEST_ERROR');
		expect(error.severity).toBe('medium');
		expect(error.name).toBe('AppError');
		expect(error instanceof Error).toBe(true);
	});

	it('コンテキスト情報を含むAppErrorを作成できる', () => {
		const context = { userId: '123', action: 'test' };
		const error = new AppError('テストエラー', 'TEST_ERROR', 'high', context);

		expect(error.context).toEqual(context);
	});

	it('toJSON()でエラー情報をオブジェクトとして取得できる', () => {
		const context = { test: 'value' };
		const error = new AppError('テストエラー', 'TEST_ERROR', 'low', context);
		const json = error.toJSON();

		expect(json.name).toBe('AppError');
		expect(json.message).toBe('テストエラー');
		expect(json.code).toBe('TEST_ERROR');
		expect(json.severity).toBe('low');
		expect(json.context).toEqual(context);
		expect(json.stack).toBeDefined();
	});

	it('スタックトレースが適切に設定される', () => {
		const error = new AppError('テストエラー', 'TEST_ERROR', 'medium');
		expect(error.stack).toBeDefined();
		expect(error.stack).toContain('AppError');
	});
});

describe('BlockError', () => {
	it('BlockErrorを作成できる', () => {
		const error = new BlockError('ブロックエラー', 'BLOCK_ERROR', 'high', 'block-123');

		expect(error.message).toBe('ブロックエラー');
		expect(error.code).toBe('BLOCK_ERROR');
		expect(error.severity).toBe('high');
		expect(error.blockId).toBe('block-123');
		expect(error.name).toBe('BlockError');
		expect(error instanceof AppError).toBe(true);
	});

	it('デフォルトの重要度がmediumである', () => {
		const error = new BlockError('ブロックエラー', 'BLOCK_ERROR');
		expect(error.severity).toBe('medium');
	});

	it('blockIdがコンテキストに含まれる', () => {
		const error = new BlockError('ブロックエラー', 'BLOCK_ERROR', 'medium', 'block-456');
		expect(error.context?.blockId).toBe('block-456');
	});
});

describe('CanvasError', () => {
	it('CanvasErrorを作成できる', () => {
		const error = new CanvasError('キャンバスエラー', 'CANVAS_ERROR');

		expect(error.message).toBe('キャンバスエラー');
		expect(error.code).toBe('CANVAS_ERROR');
		expect(error.severity).toBe('medium');
		expect(error.name).toBe('CanvasError');
	});

	it('コンテキスト情報を含むCanvasErrorを作成できる', () => {
		const context = { viewport: { x: 0, y: 0, zoom: 1 } };
		const error = new CanvasError('キャンバスエラー', 'CANVAS_ERROR', 'high', context);

		expect(error.context).toEqual(context);
	});
});

describe('DragError', () => {
	it('DragErrorを作成できる', () => {
		const error = new DragError('ドラッグエラー', 'DRAG_ERROR', 'low', 'drag-block-123');

		expect(error.message).toBe('ドラッグエラー');
		expect(error.code).toBe('DRAG_ERROR');
		expect(error.severity).toBe('low');
		expect(error.draggedBlockId).toBe('drag-block-123');
		expect(error.name).toBe('DragError');
	});

	it('デフォルトの重要度がlowである', () => {
		const error = new DragError('ドラッグエラー', 'DRAG_ERROR');
		expect(error.severity).toBe('low');
	});

	it('draggedBlockIdがコンテキストに含まれる', () => {
		const error = new DragError('ドラッグエラー', 'DRAG_ERROR', 'medium', 'drag-789');
		expect(error.context?.draggedBlockId).toBe('drag-789');
	});
});

describe('ValidationError', () => {
	it('ValidationErrorを作成できる', () => {
		const error = new ValidationError('バリデーションエラー', 'name', 'invalid-value');

		expect(error.message).toBe('バリデーションエラー');
		expect(error.code).toBe('VALIDATION_ERROR');
		expect(error.severity).toBe('medium');
		expect(error.field).toBe('name');
		expect(error.value).toBe('invalid-value');
		expect(error.name).toBe('ValidationError');
	});

	it('フィールドと値がコンテキストに含まれる', () => {
		const error = new ValidationError('バリデーションエラー', 'email', 'invalid@');
		expect(error.context?.field).toBe('email');
		expect(error.context?.value).toBe('invalid@');
	});
});

describe('ProjectError', () => {
	it('ProjectErrorを作成できる', () => {
		const error = new ProjectError('プロジェクトエラー', 'PROJECT_ERROR');

		expect(error.message).toBe('プロジェクトエラー');
		expect(error.code).toBe('PROJECT_ERROR');
		expect(error.severity).toBe('high');
		expect(error.name).toBe('ProjectError');
	});

	it('デフォルトの重要度がhighである', () => {
		const error = new ProjectError('プロジェクトエラー', 'PROJECT_ERROR');
		expect(error.severity).toBe('high');
	});
});

describe('NetworkError', () => {
	it('NetworkErrorを作成できる', () => {
		const error = new NetworkError('ネットワークエラー', 404);

		expect(error.message).toBe('ネットワークエラー');
		expect(error.code).toBe('NETWORK_ERROR');
		expect(error.severity).toBe('medium');
		expect(error.statusCode).toBe(404);
		expect(error.name).toBe('NetworkError');
	});

	it('ステータスコードがコンテキストに含まれる', () => {
		const error = new NetworkError('ネットワークエラー', 500);
		expect(error.context?.statusCode).toBe(500);
	});
});

describe('ConfigError', () => {
	it('ConfigErrorを作成できる', () => {
		const error = new ConfigError('設定エラー', 'api.endpoint');

		expect(error.message).toBe('設定エラー');
		expect(error.code).toBe('CONFIG_ERROR');
		expect(error.severity).toBe('high');
		expect(error.configKey).toBe('api.endpoint');
		expect(error.name).toBe('ConfigError');
	});

	it('設定キーがコンテキストに含まれる', () => {
		const error = new ConfigError('設定エラー', 'database.url');
		expect(error.context?.configKey).toBe('database.url');
	});
});
