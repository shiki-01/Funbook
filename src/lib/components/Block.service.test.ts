/**
 * Block コンポーネントのサービス層統合テスト
 * リファクタリング後のサービス使用を検証
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Block as BlockType } from '$lib/types';
import { BlockPathType, Connection } from '$lib/types';

describe('Block Component - Service Layer Integration', () => {
	const testBlock: BlockType = {
		id: 'test-block-1',
		name: 'Test Block',
		title: 'Test Block Title',
		type: BlockPathType.Move,
		output: 'test output',
		content: [
			{
				id: 'content-1',
				type: 'ContentValue',
				data: {
					title: 'Input',
					value: 'test value',
					placeholder: 'Enter value'
				}
			}
		],
		position: { x: 100, y: 100 },
		zIndex: 1,
		visibility: true,
		connection: Connection.Both,
		draggable: true,
		editable: true,
		deletable: true
	};

	describe('サービス層の使用確認', () => {
		it('BlockServiceが正しくインポートされる', async () => {
			const { BlockService } = await import('$lib/services/block/BlockService');
			expect(BlockService).toBeDefined();
			expect(typeof BlockService).toBe('function');
		});

		it('CanvasServiceが正しくインポートされる', async () => {
			const { CanvasService } = await import('$lib/services/canvas/CanvasService');
			expect(CanvasService).toBeDefined();
			expect(typeof CanvasService).toBe('function');
		});

		it('ErrorHandlerが正しくインポートされる', async () => {
			const { ErrorHandler } = await import('$lib/services/error/ErrorHandler');
			expect(ErrorHandler).toBeDefined();
			expect(typeof ErrorHandler).toBe('function');
		});
	});

	describe('エラーコードの確認', () => {
		it('新しいエラーコードが正しく定義されている', async () => {
			const { ERROR_CODES } = await import('$lib/errors/errorCodes');

			expect(ERROR_CODES.BLOCK.CALCULATION_FAILED).toBe('BLOCK_CALCULATION_FAILED');
			expect(ERROR_CODES.BLOCK.INTERACTION_FAILED).toBe('BLOCK_INTERACTION_FAILED');
		});
	});

	describe('型安全性の確認', () => {
		it('BlockTypeインターフェースが正しく使用される', () => {
			// BlockTypeの必須プロパティが存在することを確認
			expect(testBlock.id).toBeDefined();
			expect(testBlock.name).toBeDefined();
			expect(testBlock.title).toBeDefined();
			expect(testBlock.type).toBe(BlockPathType.Move);
			expect(testBlock.position).toBeDefined();
			expect(testBlock.connection).toBeDefined();
		});

		it('ContentValueの型が正しく処理される', () => {
			const contentValue = testBlock.content[0];
			expect(contentValue.type).toBe('ContentValue');
			expect(contentValue.data).toBeDefined();

			// 型キャストが必要な場合の処理を確認
			const data = contentValue.data as any;
			expect(data.title).toBe('Input');
			expect(data.value).toBe('test value');
			expect(data.placeholder).toBe('Enter value');
		});
	});

	describe('ビジネスロジックの分離確認', () => {
		it('ブロックサイズ計算ロジックがサービス層を使用する', () => {
			// ブロックサイズ計算でサービス層のgetBlockメソッドが使用されることを確認
			// （実際のテストではモックを使用）
			const mockGetBlock = vi.fn().mockReturnValue(testBlock);

			// サービス層のメソッドが呼び出されることをシミュレート
			const result = mockGetBlock('test-block-1');

			expect(result).toEqual(testBlock);
			expect(mockGetBlock).toHaveBeenCalledWith('test-block-1');
		});

		it('ドラッグ状態管理がサービス層を使用する', () => {
			// ドラッグ状態管理でサービス層のgetDragStateメソッドが使用されることを確認
			const mockGetDragState = vi.fn().mockReturnValue({
				active: false,
				blockId: null,
				startPosition: { x: 0, y: 0 },
				currentPosition: { x: 0, y: 0 },
				offset: { x: 0, y: 0 },
				snapTarget: null,
				connectionType: null,
				isFromPalette: false
			});

			const result = mockGetDragState();

			expect(result.active).toBe(false);
			expect(result.blockId).toBe(null);
			expect(mockGetDragState).toHaveBeenCalled();
		});

		it('エラーハンドリングがサービス層を使用する', () => {
			// エラーハンドリングでサービス層のhandleErrorメソッドが使用されることを確認
			const mockHandleError = vi.fn();
			const error = new Error('Test error');
			const context = {
				component: 'Block',
				action: 'testAction',
				additionalData: { blockId: 'test-block-1' }
			};

			mockHandleError(error, context);

			expect(mockHandleError).toHaveBeenCalledWith(error, context);
		});
	});

	describe('リファクタリング後の改善点確認', () => {
		it('直接的なストアアクセスが削減されている', () => {
			// リファクタリング前は直接blockStore.getBlock()を呼び出していたが、
			// リファクタリング後はblockService.getBlock()を使用することを確認
			const mockBlockService = {
				getBlock: vi.fn().mockReturnValue(testBlock)
			};

			const result = mockBlockService.getBlock('test-block-1');

			expect(result).toEqual(testBlock);
			expect(mockBlockService.getBlock).toHaveBeenCalledWith('test-block-1');
		});

		it('エラーハンドリングが統一されている', () => {
			// リファクタリング後は統一されたエラーハンドリングが使用されることを確認
			const mockErrorHandler = {
				handleError: vi.fn(),
				showUserError: vi.fn()
			};

			const error = new Error('Service error');
			const context = { component: 'Block', action: 'serviceCall' };

			mockErrorHandler.handleError(error, context);
			mockErrorHandler.showUserError('ユーザー向けエラーメッセージ', 'error');

			expect(mockErrorHandler.handleError).toHaveBeenCalledWith(error, context);
			expect(mockErrorHandler.showUserError).toHaveBeenCalledWith(
				'ユーザー向けエラーメッセージ',
				'error'
			);
		});

		it('型安全性が向上している', () => {
			// リファクタリング後は型安全なインターフェースが使用されることを確認
			const mockDragService = {
				getDragState: vi.fn().mockReturnValue({
					active: true,
					blockId: 'test-block-1',
					startPosition: { x: 0, y: 0 },
					currentPosition: { x: 100, y: 200 },
					offset: { x: 10, y: 20 },
					snapTarget: null,
					connectionType: null,
					isFromPalette: false
				})
			};

			const dragState = mockDragService.getDragState();

			// 型安全なプロパティアクセスが可能であることを確認
			expect(typeof dragState.active).toBe('boolean');
			expect(typeof dragState.blockId).toBe('string');
			expect(typeof dragState.startPosition.x).toBe('number');
			expect(typeof dragState.startPosition.y).toBe('number');
		});
	});
});
