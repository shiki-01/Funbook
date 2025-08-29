/**
 * エラーハンドリングモジュールのエクスポート
 */

// エラークラス
export {
	AppError,
	BlockError,
	CanvasError,
	DragError,
	ValidationError,
	ProjectError,
	NetworkError,
	ConfigError
} from './AppError';

// エラーコード
export { ERROR_CODES, type ErrorCode } from './errorCodes';

// エラーハンドラー
export {
	ErrorHandler,
	type IErrorHandler,
	type ErrorContext,
	type ErrorReport,
	type UserNotification,
	type ErrorType
} from '../services/error/ErrorHandler';
