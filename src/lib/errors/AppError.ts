/**
 * アプリケーションエラーの基底クラス
 * すべてのカスタムエラーはこのクラスを継承する
 */
export class AppError extends Error {
	/**
	 * AppErrorのコンストラクタ
	 * @param message エラーメッセージ
	 * @param code エラーコード
	 * @param severity エラーの重要度
	 * @param context 追加のコンテキスト情報
	 */
	constructor(
		message: string,
		public readonly code: string,
		public readonly severity: 'low' | 'medium' | 'high',
		public readonly context?: Record<string, any>
	) {
		super(message);
		this.name = this.constructor.name;

		// スタックトレースを適切に設定
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, this.constructor);
		}
	}

	/**
	 * エラーをJSON形式で出力
	 * @returns エラー情報のオブジェクト
	 */
	toJSON(): Record<string, any> {
		return {
			name: this.name,
			message: this.message,
			code: this.code,
			severity: this.severity,
			context: this.context,
			stack: this.stack
		};
	}
}

/**
 * ブロック操作に関連するエラー
 */
export class BlockError extends AppError {
	constructor(
		message: string,
		code: string,
		severity: 'low' | 'medium' | 'high' = 'medium',
		public readonly blockId?: string,
		context?: Record<string, any>
	) {
		super(message, code, severity, { ...context, blockId });
	}
}

/**
 * キャンバス操作に関連するエラー
 */
export class CanvasError extends AppError {
	constructor(
		message: string,
		code: string,
		severity: 'low' | 'medium' | 'high' = 'medium',
		context?: Record<string, any>
	) {
		super(message, code, severity, context);
	}
}

/**
 * ドラッグ&ドロップ操作に関連するエラー
 */
export class DragError extends AppError {
	constructor(
		message: string,
		code: string,
		severity: 'low' | 'medium' | 'high' = 'low',
		public readonly draggedBlockId?: string,
		context?: Record<string, any>
	) {
		super(message, code, severity, { ...context, draggedBlockId });
	}
}

/**
 * バリデーションエラー
 */
export class ValidationError extends AppError {
	constructor(
		message: string,
		public readonly field?: string,
		public readonly value?: any,
		context?: Record<string, any>
	) {
		super(message, 'VALIDATION_ERROR', 'medium', { ...context, field, value });
	}
}

/**
 * プロジェクト操作に関連するエラー
 */
export class ProjectError extends AppError {
	constructor(
		message: string,
		code: string,
		severity: 'low' | 'medium' | 'high' = 'high',
		context?: Record<string, any>
	) {
		super(message, code, severity, context);
	}
}

/**
 * ネットワーク関連のエラー
 */
export class NetworkError extends AppError {
	constructor(
		message: string,
		public readonly statusCode?: number,
		context?: Record<string, any>
	) {
		super(message, 'NETWORK_ERROR', 'medium', { ...context, statusCode });
	}
}

/**
 * 設定関連のエラー
 */
export class ConfigError extends AppError {
	constructor(
		message: string,
		public readonly configKey?: string,
		context?: Record<string, any>
	) {
		super(message, 'CONFIG_ERROR', 'high', { ...context, configKey });
	}
}

/**
 * Board操作に関連するエラー
 */
export class BoardError extends AppError {
	constructor(
		message: string,
		code: string,
		severity: 'low' | 'medium' | 'high' = 'medium',
		context?: Record<string, any>
	) {
		super(message, code, severity, context);
	}
}
