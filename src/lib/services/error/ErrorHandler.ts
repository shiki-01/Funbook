import { AppError } from '../../errors/AppError';

/**
 * エラーの種類を定義
 */
export type ErrorType = 'error' | 'warning' | 'info';

/**
 * エラーコンテキスト情報
 */
export interface ErrorContext {
	component?: string;
	action?: string;
	userId?: string;
	timestamp?: Date;
	userAgent?: string;
	url?: string;
	additionalData?: Record<string, any>;
}

/**
 * エラー報告のインターフェース
 */
export interface ErrorReport {
	id: string;
	error: AppError | Error;
	context: ErrorContext;
	timestamp: Date;
	resolved: boolean;
}

/**
 * ユーザー通知のインターフェース
 */
export interface UserNotification {
	id: string;
	message: string;
	type: ErrorType;
	duration?: number;
	actions?: Array<{
		label: string;
		action: () => void;
	}>;
}

/**
 * エラーハンドラーのインターフェース
 */
export interface IErrorHandler {
	handleError(error: AppError | Error, context?: ErrorContext): void;
	reportError(error: Error, context: ErrorContext): string;
	showUserError(message: string, type: ErrorType, duration?: number): void;
	getErrorReports(): ErrorReport[];
	clearErrorReports(): void;
	resolveError(reportId: string): void;
}

/**
 * 集中化されたエラーハンドリングサービス
 */
export class ErrorHandler implements IErrorHandler {
	private errorReports: Map<string, ErrorReport> = new Map();
	private notificationCallbacks: Array<(notification: UserNotification) => void> = [];
	private logLevel: 'debug' | 'info' | 'warn' | 'error' = 'info';

	/**
	 * ErrorHandlerのコンストラクタ
	 * @param logLevel ログレベル
	 */
	constructor(logLevel: 'debug' | 'info' | 'warn' | 'error' = 'info') {
		this.logLevel = logLevel;
	}

	/**
	 * エラーを処理する
	 * @param error 処理するエラー
	 * @param context エラーコンテキスト
	 */
	handleError(error: AppError | Error, context?: ErrorContext): void {
		const enhancedContext: ErrorContext = {
			timestamp: new Date(),
			userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
			url: typeof window !== 'undefined' ? window.location.href : undefined,
			...context
		};

		// エラーレポートを作成
		const reportId = this.reportError(error, enhancedContext);

		// AppErrorの場合は重要度に基づいて処理
		if (error instanceof AppError) {
			this.handleAppError(error, enhancedContext);
		} else {
			// 一般的なエラーの場合
			this.handleGenericError(error, enhancedContext);
		}

		// コンソールにログ出力
		this.logError(error, enhancedContext);
	}

	/**
	 * エラーを報告し、レポートIDを返す
	 * @param error 報告するエラー
	 * @param context エラーコンテキスト
	 * @returns レポートID
	 */
	reportError(error: Error, context: ErrorContext): string {
		const reportId = this.generateReportId();
		const report: ErrorReport = {
			id: reportId,
			error,
			context,
			timestamp: new Date(),
			resolved: false
		};

		this.errorReports.set(reportId, report);
		return reportId;
	}

	/**
	 * ユーザーにエラーメッセージを表示
	 * @param message 表示するメッセージ
	 * @param type エラーの種類
	 * @param duration 表示時間（ミリ秒）
	 */
	showUserError(message: string, type: ErrorType = 'error', duration?: number): void {
		const notification: UserNotification = {
			id: this.generateReportId(),
			message,
			type,
			duration
		};

		this.notifyUser(notification);
	}

	/**
	 * エラーレポートを取得
	 * @returns エラーレポートの配列
	 */
	getErrorReports(): ErrorReport[] {
		return Array.from(this.errorReports.values());
	}

	/**
	 * すべてのエラーレポートをクリア
	 */
	clearErrorReports(): void {
		this.errorReports.clear();
	}

	/**
	 * エラーを解決済みとしてマーク
	 * @param reportId レポートID
	 */
	resolveError(reportId: string): void {
		const report = this.errorReports.get(reportId);
		if (report) {
			report.resolved = true;
		}
	}

	/**
	 * 通知コールバックを登録
	 * @param callback 通知コールバック関数
	 */
	onNotification(callback: (notification: UserNotification) => void): void {
		this.notificationCallbacks.push(callback);
	}

	/**
	 * 通知コールバックを削除
	 * @param callback 削除するコールバック関数
	 */
	offNotification(callback: (notification: UserNotification) => void): void {
		const index = this.notificationCallbacks.indexOf(callback);
		if (index > -1) {
			this.notificationCallbacks.splice(index, 1);
		}
	}

	/**
	 * AppErrorを処理
	 * @param error AppError
	 * @param context エラーコンテキスト
	 */
	private handleAppError(error: AppError, context: ErrorContext): void {
		const userMessage = this.createUserFriendlyMessage(error);

		switch (error.severity) {
			case 'high':
				this.showUserError(userMessage, 'error', 10000);
				break;
			case 'medium':
				this.showUserError(userMessage, 'warning', 5000);
				break;
			case 'low':
				this.showUserError(userMessage, 'info', 3000);
				break;
		}
	}

	/**
	 * 一般的なエラーを処理
	 * @param error Error
	 * @param context エラーコンテキスト
	 */
	private handleGenericError(error: Error, context: ErrorContext): void {
		const userMessage = '予期しないエラーが発生しました。しばらく待ってから再試行してください。';
		this.showUserError(userMessage, 'error', 8000);
	}

	/**
	 * ユーザーフレンドリーなメッセージを作成
	 * @param error AppError
	 * @returns ユーザーフレンドリーなメッセージ
	 */
	private createUserFriendlyMessage(error: AppError): string {
		// エラーコードに基づいてユーザーフレンドリーなメッセージを生成
		const codeToMessageMap: Record<string, string> = {
			BLOCK_NOT_FOUND: 'ブロックが見つかりません。',
			BLOCK_CONNECTION_FAILED: 'ブロックの接続に失敗しました。',
			CANVAS_RENDERING_FAILED: 'キャンバスの描画に失敗しました。',
			DRAG_DROP_FAILED: 'ドラッグ&ドロップ操作に失敗しました。',
			PROJECT_SAVE_FAILED: 'プロジェクトの保存に失敗しました。',
			PROJECT_LOAD_FAILED: 'プロジェクトの読み込みに失敗しました。',
			VALIDATION_REQUIRED_FIELD: '必須フィールドが入力されていません。'
		};

		return codeToMessageMap[error.code] || error.message || '不明なエラーが発生しました。';
	}

	/**
	 * ユーザーに通知
	 * @param notification 通知情報
	 */
	private notifyUser(notification: UserNotification): void {
		this.notificationCallbacks.forEach((callback) => {
			try {
				callback(notification);
			} catch (error) {
				console.error('通知コールバックでエラーが発生しました:', error);
			}
		});
	}

	/**
	 * エラーをログに出力
	 * @param error エラー
	 * @param context エラーコンテキスト
	 */
	private logError(error: AppError | Error, context: ErrorContext): void {
		const logData = {
			error:
				error instanceof AppError
					? error.toJSON()
					: {
							name: error.name,
							message: error.message,
							stack: error.stack
						},
			context
		};

		if (error instanceof AppError) {
			switch (error.severity) {
				case 'high':
					console.error('[ERROR]', logData);
					break;
				case 'medium':
					if (this.logLevel === 'debug' || this.logLevel === 'info' || this.logLevel === 'warn') {
						console.warn('[WARN]', logData);
					}
					break;
				case 'low':
					if (this.logLevel === 'debug' || this.logLevel === 'info') {
						console.info('[INFO]', logData);
					}
					break;
			}
		} else {
			console.error('[ERROR]', logData);
		}
	}

	/**
	 * レポートIDを生成
	 * @returns ユニークなレポートID
	 */
	private generateReportId(): string {
		return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}
}
