import { describe, it, expect } from 'vitest';
import { ERROR_CODES, type ErrorCode } from './errorCodes';

describe('ERROR_CODES', () => {
	describe('BLOCK error codes', () => {
		it('すべてのブロック関連エラーコードが定義されている', () => {
			expect(ERROR_CODES.BLOCK.NOT_FOUND).toBe('BLOCK_NOT_FOUND');
			expect(ERROR_CODES.BLOCK.INVALID_TYPE).toBe('BLOCK_INVALID_TYPE');
			expect(ERROR_CODES.BLOCK.INVALID_POSITION).toBe('BLOCK_INVALID_POSITION');
			expect(ERROR_CODES.BLOCK.CONNECTION_FAILED).toBe('BLOCK_CONNECTION_FAILED');
			expect(ERROR_CODES.BLOCK.CIRCULAR_DEPENDENCY).toBe('BLOCK_CIRCULAR_DEPENDENCY');
			expect(ERROR_CODES.BLOCK.MAX_CONNECTIONS_EXCEEDED).toBe('BLOCK_MAX_CONNECTIONS_EXCEEDED');
			expect(ERROR_CODES.BLOCK.CREATION_FAILED).toBe('BLOCK_CREATION_FAILED');
			expect(ERROR_CODES.BLOCK.UPDATE_FAILED).toBe('BLOCK_UPDATE_FAILED');
			expect(ERROR_CODES.BLOCK.DELETE_FAILED).toBe('BLOCK_DELETE_FAILED');
		});

		it('ブロックエラーコードが一意である', () => {
			const codes = Object.values(ERROR_CODES.BLOCK);
			const uniqueCodes = new Set(codes);
			expect(codes.length).toBe(uniqueCodes.size);
		});
	});

	describe('CANVAS error codes', () => {
		it('すべてのキャンバス関連エラーコードが定義されている', () => {
			expect(ERROR_CODES.CANVAS.INVALID_VIEWPORT).toBe('CANVAS_INVALID_VIEWPORT');
			expect(ERROR_CODES.CANVAS.COORDINATE_CONVERSION_FAILED).toBe(
				'CANVAS_COORDINATE_CONVERSION_FAILED'
			);
			expect(ERROR_CODES.CANVAS.RENDERING_FAILED).toBe('CANVAS_RENDERING_FAILED');
			expect(ERROR_CODES.CANVAS.ZOOM_OUT_OF_BOUNDS).toBe('CANVAS_ZOOM_OUT_OF_BOUNDS');
			expect(ERROR_CODES.CANVAS.VIEWPORT_UPDATE_FAILED).toBe('CANVAS_VIEWPORT_UPDATE_FAILED');
		});

		it('キャンバスエラーコードが一意である', () => {
			const codes = Object.values(ERROR_CODES.CANVAS);
			const uniqueCodes = new Set(codes);
			expect(codes.length).toBe(uniqueCodes.size);
		});
	});

	describe('DRAG error codes', () => {
		it('すべてのドラッグ関連エラーコードが定義されている', () => {
			expect(ERROR_CODES.DRAG.INVALID_BLOCK).toBe('DRAG_INVALID_BLOCK');
			expect(ERROR_CODES.DRAG.DROP_TARGET_INVALID).toBe('DRAG_DROP_TARGET_INVALID');
			expect(ERROR_CODES.DRAG.DRAG_START_FAILED).toBe('DRAG_START_FAILED');
			expect(ERROR_CODES.DRAG.DRAG_UPDATE_FAILED).toBe('DRAG_UPDATE_FAILED');
			expect(ERROR_CODES.DRAG.DROP_FAILED).toBe('DRAG_DROP_FAILED');
			expect(ERROR_CODES.DRAG.SNAP_CALCULATION_FAILED).toBe('DRAG_SNAP_CALCULATION_FAILED');
		});

		it('ドラッグエラーコードが一意である', () => {
			const codes = Object.values(ERROR_CODES.DRAG);
			const uniqueCodes = new Set(codes);
			expect(codes.length).toBe(uniqueCodes.size);
		});
	});

	describe('PROJECT error codes', () => {
		it('すべてのプロジェクト関連エラーコードが定義されている', () => {
			expect(ERROR_CODES.PROJECT.SAVE_FAILED).toBe('PROJECT_SAVE_FAILED');
			expect(ERROR_CODES.PROJECT.LOAD_FAILED).toBe('PROJECT_LOAD_FAILED');
			expect(ERROR_CODES.PROJECT.INVALID_FORMAT).toBe('PROJECT_INVALID_FORMAT');
			expect(ERROR_CODES.PROJECT.CORRUPTED_DATA).toBe('PROJECT_CORRUPTED_DATA');
			expect(ERROR_CODES.PROJECT.PERMISSION_DENIED).toBe('PROJECT_PERMISSION_DENIED');
			expect(ERROR_CODES.PROJECT.FILE_NOT_FOUND).toBe('PROJECT_FILE_NOT_FOUND');
		});

		it('プロジェクトエラーコードが一意である', () => {
			const codes = Object.values(ERROR_CODES.PROJECT);
			const uniqueCodes = new Set(codes);
			expect(codes.length).toBe(uniqueCodes.size);
		});
	});

	describe('VALIDATION error codes', () => {
		it('すべてのバリデーション関連エラーコードが定義されている', () => {
			expect(ERROR_CODES.VALIDATION.REQUIRED_FIELD).toBe('VALIDATION_REQUIRED_FIELD');
			expect(ERROR_CODES.VALIDATION.INVALID_FORMAT).toBe('VALIDATION_INVALID_FORMAT');
			expect(ERROR_CODES.VALIDATION.OUT_OF_RANGE).toBe('VALIDATION_OUT_OF_RANGE');
			expect(ERROR_CODES.VALIDATION.TYPE_MISMATCH).toBe('VALIDATION_TYPE_MISMATCH');
		});

		it('バリデーションエラーコードが一意である', () => {
			const codes = Object.values(ERROR_CODES.VALIDATION);
			const uniqueCodes = new Set(codes);
			expect(codes.length).toBe(uniqueCodes.size);
		});
	});

	describe('SYSTEM error codes', () => {
		it('すべてのシステム関連エラーコードが定義されている', () => {
			expect(ERROR_CODES.SYSTEM.INITIALIZATION_FAILED).toBe('SYSTEM_INITIALIZATION_FAILED');
			expect(ERROR_CODES.SYSTEM.MEMORY_LIMIT_EXCEEDED).toBe('SYSTEM_MEMORY_LIMIT_EXCEEDED');
			expect(ERROR_CODES.SYSTEM.PERFORMANCE_DEGRADED).toBe('SYSTEM_PERFORMANCE_DEGRADED');
			expect(ERROR_CODES.SYSTEM.UNKNOWN_ERROR).toBe('SYSTEM_UNKNOWN_ERROR');
		});

		it('システムエラーコードが一意である', () => {
			const codes = Object.values(ERROR_CODES.SYSTEM);
			const uniqueCodes = new Set(codes);
			expect(codes.length).toBe(uniqueCodes.size);
		});
	});

	describe('Global uniqueness', () => {
		it('すべてのエラーコードがグローバルに一意である', () => {
			const allCodes: string[] = [];

			Object.values(ERROR_CODES).forEach((category) => {
				Object.values(category).forEach((code) => {
					allCodes.push(code);
				});
			});

			const uniqueCodes = new Set(allCodes);
			expect(allCodes.length).toBe(uniqueCodes.size);
		});

		it('エラーコードが適切な命名規則に従っている', () => {
			const allCodes: string[] = [];

			Object.values(ERROR_CODES).forEach((category) => {
				Object.values(category).forEach((code) => {
					allCodes.push(code);
				});
			});

			allCodes.forEach((code) => {
				// すべて大文字でアンダースコア区切りであることを確認
				expect(code).toMatch(/^[A-Z_]+$/);
				// 適切なプレフィックスを持つことを確認
				expect(
					code.startsWith('BLOCK_') ||
						code.startsWith('CANVAS_') ||
						code.startsWith('DRAG_') ||
						code.startsWith('PROJECT_') ||
						code.startsWith('VALIDATION_') ||
						code.startsWith('SYSTEM_')
				).toBe(true);
			});
		});
	});

	describe('ErrorCode type', () => {
		it('ErrorCode型が正しく定義されている', () => {
			// TypeScriptの型チェックのためのテスト
			const validCodes: ErrorCode[] = [
				ERROR_CODES.BLOCK.NOT_FOUND,
				ERROR_CODES.CANVAS.INVALID_VIEWPORT,
				ERROR_CODES.DRAG.INVALID_BLOCK,
				ERROR_CODES.PROJECT.SAVE_FAILED,
				ERROR_CODES.VALIDATION.REQUIRED_FIELD,
				ERROR_CODES.SYSTEM.UNKNOWN_ERROR
			];

			validCodes.forEach((code) => {
				expect(typeof code).toBe('string');
			});
		});
	});

	describe('Error code categories', () => {
		it('各カテゴリが適切な数のエラーコードを持つ', () => {
			expect(Object.keys(ERROR_CODES.BLOCK)).toHaveLength(9);
			expect(Object.keys(ERROR_CODES.CANVAS)).toHaveLength(5);
			expect(Object.keys(ERROR_CODES.DRAG)).toHaveLength(6);
			expect(Object.keys(ERROR_CODES.PROJECT)).toHaveLength(6);
			expect(Object.keys(ERROR_CODES.VALIDATION)).toHaveLength(4);
			expect(Object.keys(ERROR_CODES.SYSTEM)).toHaveLength(4);
		});

		it('エラーコードカテゴリが適切に構造化されている', () => {
			expect(ERROR_CODES).toHaveProperty('BLOCK');
			expect(ERROR_CODES).toHaveProperty('CANVAS');
			expect(ERROR_CODES).toHaveProperty('DRAG');
			expect(ERROR_CODES).toHaveProperty('PROJECT');
			expect(ERROR_CODES).toHaveProperty('VALIDATION');
			expect(ERROR_CODES).toHaveProperty('SYSTEM');
		});
	});
});
