import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ErrorHandler } from './ErrorHandler';
import { AppError, BlockError } from '../../errors/AppError';
import type { ErrorContext, UserNotification } from './ErrorHandler';

// コンソールメソッドをモック
const mockConsole = {
	error: vi.fn(),
	warn: vi.fn(),
	info: vi.fn()
};

vi.stubGlobal('console', mockConsole);

describe('ErrorHandler', () => {
	let errorHandler: ErrorHandler;

	beforeEach(() => {
		errorHandler = new ErrorHandler();
		mockConsole.error.mockClear();
		mockConsole.warn.mockClear();
		mockConsole.info.mockClear();
	});

	describe('handleError', () => {
		it('AppErrorを適切に処理できる', () => {
			const error = new AppError('テストエラー', 'TEST_ERROR', 'medium');
			const context: ErrorContext = { component: 'TestComponent' };

			errorHandler.handleError(error, context);

			const reports = errorHandler.getErrorReports();
			expect(reports).toHaveLength(1);
			expect(reports[0].error).toBe(error);
			expect(reports[0].context.component).toBe('TestComponent');
		});

		it('一般的なErrorを適切に処理できる', () => {
			const error = new Error('一般的なエラー');
			const context: ErrorContext = { action: 'test-action' };

			errorHandler.handleError(error, context);

			const reports = errorHandler.getErrorReports();
			expect(reports).toHaveLength(1);
			expect(reports[0].error).toBe(error);
			expect(reports[0].context.action).toBe('test-action');
		});

		it('コンテキストが自動的に拡張される', () => {
			const error = new AppError('テストエラー', 'TEST_ERROR', 'low');

			errorHandler.handleError(error);

			const reports = errorHandler.getErrorReports();
			expect(reports[0].context.timestamp).toBeInstanceOf(Date);
		});
	});

	describe('reportError', () => {
		it('エラーレポートを作成し、IDを返す', () => {
			const error = new Error('テストエラー');
			const context: ErrorContext = { component: 'TestComponent' };

			const reportId = errorHandler.reportError(error, context);

			expect(reportId).toMatch(/^error_\d+_[a-z0-9]+$/);

			const reports = errorHandler.getErrorReports();
			expect(reports).toHaveLength(1);
			expect(reports[0].id).toBe(reportId);
			expect(reports[0].resolved).toBe(false);
		});
	});

	describe('showUserError', () => {
		it('通知コールバックが呼び出される', () => {
			const mockCallback = vi.fn();
			errorHandler.onNotification(mockCallback);

			errorHandler.showUserError('テストメッセージ', 'error', 5000);

			expect(mockCallback).toHaveBeenCalledWith(
				expect.objectContaining({
					message: 'テストメッセージ',
					type: 'error',
					duration: 5000
				})
			);
		});

		it('デフォルト値が適用される', () => {
			const mockCallback = vi.fn();
			errorHandler.onNotification(mockCallback);

			errorHandler.showUserError('テストメッセージ');

			expect(mockCallback).toHaveBeenCalledWith(
				expect.objectContaining({
					message: 'テストメッセージ',
					type: 'error',
					duration: undefined
				})
			);
		});
	});

	describe('getErrorReports', () => {
		it('すべてのエラーレポートを返す', () => {
			const error1 = new Error('エラー1');
			const error2 = new Error('エラー2');

			errorHandler.reportError(error1, {});
			errorHandler.reportError(error2, {});

			const reports = errorHandler.getErrorReports();
			expect(reports).toHaveLength(2);
		});
	});

	describe('clearErrorReports', () => {
		it('すべてのエラーレポートをクリアする', () => {
			const error = new Error('テストエラー');
			errorHandler.reportError(error, {});

			expect(errorHandler.getErrorReports()).toHaveLength(1);

			errorHandler.clearErrorReports();
			expect(errorHandler.getErrorReports()).toHaveLength(0);
		});
	});

	describe('resolveError', () => {
		it('エラーを解決済みとしてマークする', () => {
			const error = new Error('テストエラー');
			const reportId = errorHandler.reportError(error, {});

			errorHandler.resolveError(reportId);

			const reports = errorHandler.getErrorReports();
			expect(reports[0].resolved).toBe(true);
		});

		it('存在しないIDの場合は何もしない', () => {
			errorHandler.resolveError('non-existent-id');
			// エラーが発生しないことを確認
			expect(errorHandler.getErrorReports()).toHaveLength(0);
		});
	});

	describe('notification callbacks', () => {
		it('複数のコールバックを登録できる', () => {
			const callback1 = vi.fn();
			const callback2 = vi.fn();

			errorHandler.onNotification(callback1);
			errorHandler.onNotification(callback2);

			errorHandler.showUserError('テストメッセージ');

			expect(callback1).toHaveBeenCalled();
			expect(callback2).toHaveBeenCalled();
		});

		it('コールバックを削除できる', () => {
			const callback1 = vi.fn();
			const callback2 = vi.fn();

			errorHandler.onNotification(callback1);
			errorHandler.onNotification(callback2);
			errorHandler.offNotification(callback1);

			errorHandler.showUserError('テストメッセージ');

			expect(callback1).not.toHaveBeenCalled();
			expect(callback2).toHaveBeenCalled();
		});

		it('コールバックでエラーが発生しても他のコールバックは実行される', () => {
			const errorCallback = vi.fn(() => {
				throw new Error('コールバックエラー');
			});
			const normalCallback = vi.fn();

			errorHandler.onNotification(errorCallback);
			errorHandler.onNotification(normalCallback);

			errorHandler.showUserError('テストメッセージ');

			expect(errorCallback).toHaveBeenCalled();
			expect(normalCallback).toHaveBeenCalled();
			expect(mockConsole.error).toHaveBeenCalledWith(
				'通知コールバックでエラーが発生しました:',
				expect.any(Error)
			);
		});
	});

	describe('logging', () => {
		it('高重要度のAppErrorはconsole.errorでログ出力される', () => {
			const error = new AppError('高重要度エラー', 'HIGH_ERROR', 'high');

			errorHandler.handleError(error);

			expect(mockConsole.error).toHaveBeenCalledWith(
				'[ERROR]',
				expect.objectContaining({
					error: expect.objectContaining({
						message: '高重要度エラー',
						code: 'HIGH_ERROR',
						severity: 'high'
					})
				})
			);
		});

		it('中重要度のAppErrorはconsole.warnでログ出力される', () => {
			const error = new AppError('中重要度エラー', 'MEDIUM_ERROR', 'medium');

			errorHandler.handleError(error);

			expect(mockConsole.warn).toHaveBeenCalledWith(
				'[WARN]',
				expect.objectContaining({
					error: expect.objectContaining({
						message: '中重要度エラー',
						code: 'MEDIUM_ERROR',
						severity: 'medium'
					})
				})
			);
		});

		it('低重要度のAppErrorはconsole.infoでログ出力される', () => {
			const error = new AppError('低重要度エラー', 'LOW_ERROR', 'low');

			errorHandler.handleError(error);

			expect(mockConsole.info).toHaveBeenCalledWith(
				'[INFO]',
				expect.objectContaining({
					error: expect.objectContaining({
						message: '低重要度エラー',
						code: 'LOW_ERROR',
						severity: 'low'
					})
				})
			);
		});

		it('一般的なErrorはconsole.errorでログ出力される', () => {
			const error = new Error('一般的なエラー');

			errorHandler.handleError(error);

			expect(mockConsole.error).toHaveBeenCalledWith(
				'[ERROR]',
				expect.objectContaining({
					error: expect.objectContaining({
						message: '一般的なエラー'
					})
				})
			);
		});

		it('ログレベルに応じてログ出力が制御される', () => {
			const errorHandlerWarnLevel = new ErrorHandler('warn');
			const lowError = new AppError('低重要度エラー', 'LOW_ERROR', 'low');

			errorHandlerWarnLevel.handleError(lowError);

			// warn レベルでは low 重要度のエラーはログ出力されない
			expect(mockConsole.info).not.toHaveBeenCalled();
		});
	});

	describe('user-friendly messages', () => {
		it('BlockErrorに対してユーザーフレンドリーなメッセージを生成する', () => {
			const mockCallback = vi.fn();
			errorHandler.onNotification(mockCallback);

			const error = new BlockError('Block not found', 'BLOCK_NOT_FOUND', 'medium', 'block-123');
			errorHandler.handleError(error);

			expect(mockCallback).toHaveBeenCalledWith(
				expect.objectContaining({
					message: 'ブロックが見つかりません。',
					type: 'warning'
				})
			);
		});

		it('未知のエラーコードの場合は元のメッセージを使用する', () => {
			const mockCallback = vi.fn();
			errorHandler.onNotification(mockCallback);

			const error = new AppError('カスタムエラーメッセージ', 'UNKNOWN_ERROR', 'medium');
			errorHandler.handleError(error);

			expect(mockCallback).toHaveBeenCalledWith(
				expect.objectContaining({
					message: 'カスタムエラーメッセージ'
				})
			);
		});

		it('メッセージが空の場合はデフォルトメッセージを使用する', () => {
			const mockCallback = vi.fn();
			errorHandler.onNotification(mockCallback);

			const error = new AppError('', 'UNKNOWN_ERROR', 'medium');
			errorHandler.handleError(error);

			expect(mockCallback).toHaveBeenCalledWith(
				expect.objectContaining({
					message: '不明なエラーが発生しました。'
				})
			);
		});
	});

	describe('severity-based handling', () => {
		it('高重要度エラーは長時間表示される', () => {
			const mockCallback = vi.fn();
			errorHandler.onNotification(mockCallback);

			const error = new AppError('高重要度エラー', 'HIGH_ERROR', 'high');
			errorHandler.handleError(error);

			expect(mockCallback).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'error',
					duration: 10000
				})
			);
		});

		it('中重要度エラーは中程度の時間表示される', () => {
			const mockCallback = vi.fn();
			errorHandler.onNotification(mockCallback);

			const error = new AppError('中重要度エラー', 'MEDIUM_ERROR', 'medium');
			errorHandler.handleError(error);

			expect(mockCallback).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'warning',
					duration: 5000
				})
			);
		});

		it('低重要度エラーは短時間表示される', () => {
			const mockCallback = vi.fn();
			errorHandler.onNotification(mockCallback);

			const error = new AppError('低重要度エラー', 'LOW_ERROR', 'low');
			errorHandler.handleError(error);

			expect(mockCallback).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'info',
					duration: 3000
				})
			);
		});
	});
});
