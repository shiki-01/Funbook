<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { ErrorHandler } from '../../services/error/ErrorHandler';
	import type { ErrorContext } from '../../services/error/ErrorHandler';

	/**
	 * エラー境界コンポーネントのプロパティ
	 */
	export let errorHandler: ErrorHandler;
	export let fallbackComponent: any = null;
	export let context: Partial<ErrorContext> = {};
	export let showErrorDetails = false;

	let hasError = false;
	let errorInfo: { error: Error; context: ErrorContext } | null = null;
	let errorHandlerInstance: ErrorHandler;

	/**
	 * コンポーネントマウント時の処理
	 */
	onMount(() => {
		errorHandlerInstance = errorHandler || new ErrorHandler();

		// グローバルエラーハンドラーを設定
		const handleGlobalError = (event: ErrorEvent) => {
			handleError(event.error, {
				component: 'ErrorBoundary',
				action: 'global_error',
				...context
			});
		};

		const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
			handleError(new Error(event.reason), {
				component: 'ErrorBoundary',
				action: 'unhandled_rejection',
				...context
			});
		};

		window.addEventListener('error', handleGlobalError);
		window.addEventListener('unhandledrejection', handleUnhandledRejection);

		return () => {
			window.removeEventListener('error', handleGlobalError);
			window.removeEventListener('unhandledrejection', handleUnhandledRejection);
		};
	});

	/**
	 * エラーを処理する関数
	 * @param error 発生したエラー
	 * @param errorContext エラーコンテキスト
	 */
	function handleError(error: Error, errorContext: ErrorContext) {
		hasError = true;
		errorInfo = { error, context: errorContext };

		if (errorHandlerInstance) {
			errorHandlerInstance.handleError(error, errorContext);
		}
	}

	/**
	 * エラー状態をリセット
	 */
	function resetError() {
		hasError = false;
		errorInfo = null;
	}

	/**
	 * エラー詳細の表示/非表示を切り替え
	 */
	function toggleErrorDetails() {
		showErrorDetails = !showErrorDetails;
	}
</script>

{#if hasError && errorInfo}
	{#if fallbackComponent}
		<svelte:component
			this={fallbackComponent}
			error={errorInfo.error}
			context={errorInfo.context}
			onRetry={resetError}
		/>
	{:else}
		<div class="error-boundary">
			<div class="error-boundary__content">
				<h2 class="error-boundary__title">エラーが発生しました</h2>
				<p class="error-boundary__message">
					申し訳ございませんが、予期しないエラーが発生しました。
				</p>

				<div class="error-boundary__actions">
					<button
						class="error-boundary__button error-boundary__button--primary"
						on:click={resetError}
					>
						再試行
					</button>

					<button
						class="error-boundary__button error-boundary__button--secondary"
						on:click={toggleErrorDetails}
					>
						{showErrorDetails ? '詳細を非表示' : '詳細を表示'}
					</button>
				</div>

				{#if showErrorDetails && errorInfo}
					<div class="error-boundary__details">
						<h3>エラー詳細</h3>
						<div class="error-boundary__error-info">
							<p><strong>エラー名:</strong> {errorInfo.error.name}</p>
							<p><strong>メッセージ:</strong> {errorInfo.error.message}</p>
							{#if errorInfo.context.component}
								<p><strong>コンポーネント:</strong> {errorInfo.context.component}</p>
							{/if}
							{#if errorInfo.context.action}
								<p><strong>アクション:</strong> {errorInfo.context.action}</p>
							{/if}
							{#if errorInfo.error.stack}
								<details class="error-boundary__stack">
									<summary>スタックトレース</summary>
									<pre>{errorInfo.error.stack}</pre>
								</details>
							{/if}
						</div>
					</div>
				{/if}
			</div>
		</div>
	{/if}
{:else}
	<slot />
{/if}

<style>
	.error-boundary {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 200px;
		padding: 2rem;
		background-color: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: 8px;
		margin: 1rem;
	}

	.error-boundary__content {
		text-align: center;
		max-width: 500px;
	}

	.error-boundary__title {
		color: #dc2626;
		font-size: 1.5rem;
		font-weight: 600;
		margin-bottom: 1rem;
	}

	.error-boundary__message {
		color: #7f1d1d;
		margin-bottom: 1.5rem;
		line-height: 1.5;
	}

	.error-boundary__actions {
		display: flex;
		gap: 1rem;
		justify-content: center;
		margin-bottom: 1.5rem;
	}

	.error-boundary__button {
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-weight: 500;
		transition: background-color 0.2s;
	}

	.error-boundary__button--primary {
		background-color: #dc2626;
		color: white;
	}

	.error-boundary__button--primary:hover {
		background-color: #b91c1c;
	}

	.error-boundary__button--secondary {
		background-color: #f3f4f6;
		color: #374151;
		border: 1px solid #d1d5db;
	}

	.error-boundary__button--secondary:hover {
		background-color: #e5e7eb;
	}

	.error-boundary__details {
		text-align: left;
		background-color: white;
		padding: 1rem;
		border-radius: 4px;
		border: 1px solid #e5e7eb;
	}

	.error-boundary__details h3 {
		margin-top: 0;
		margin-bottom: 1rem;
		color: #374151;
	}

	.error-boundary__error-info p {
		margin: 0.5rem 0;
		color: #6b7280;
	}

	.error-boundary__stack {
		margin-top: 1rem;
	}

	.error-boundary__stack summary {
		cursor: pointer;
		color: #6b7280;
		font-weight: 500;
	}

	.error-boundary__stack pre {
		margin-top: 0.5rem;
		padding: 1rem;
		background-color: #f9fafb;
		border: 1px solid #e5e7eb;
		border-radius: 4px;
		font-size: 0.875rem;
		overflow-x: auto;
		white-space: pre-wrap;
		color: #374151;
	}
</style>
