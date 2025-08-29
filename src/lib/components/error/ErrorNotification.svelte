<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import type { UserNotification, ErrorType } from '../../services/error/ErrorHandler';

	/**
	 * 通知コンポーネントのプロパティ
	 */
	export let notification: UserNotification;
	export let onClose: (id: string) => void = () => {};
	export let autoClose = true;

	let visible = true;
	let timeoutId: number | null = null;

	/**
	 * エラータイプに基づくアイコンを取得
	 * @param type エラータイプ
	 * @returns アイコンの文字列
	 */
	function getIcon(type: ErrorType): string {
		switch (type) {
			case 'error':
				return '❌';
			case 'warning':
				return '⚠️';
			case 'info':
				return 'ℹ️';
			default:
				return '📢';
		}
	}

	/**
	 * エラータイプに基づくCSSクラスを取得
	 * @param type エラータイプ
	 * @returns CSSクラス名
	 */
	function getTypeClass(type: ErrorType): string {
		return `notification--${type}`;
	}

	/**
	 * 通知を閉じる
	 */
	function close() {
		visible = false;
		if (timeoutId) {
			clearTimeout(timeoutId);
		}
		onClose(notification.id);
	}

	/**
	 * アクションボタンのクリックハンドラー
	 * @param action アクション関数
	 */
	function handleAction(action: () => void) {
		try {
			action();
			close();
		} catch (error) {
			console.error('通知アクションでエラーが発生しました:', error);
		}
	}

	/**
	 * コンポーネントマウント時の処理
	 */
	onMount(() => {
		if (autoClose && notification.duration) {
			timeoutId = window.setTimeout(() => {
				close();
			}, notification.duration);
		}
	});

	/**
	 * コンポーネント破棄時の処理
	 */
	onDestroy(() => {
		if (timeoutId) {
			clearTimeout(timeoutId);
		}
	});
</script>

{#if visible}
	<div
		class="notification {getTypeClass(notification.type)}"
		transition:fly={{ y: -50, duration: 300 }}
		role="alert"
		aria-live="polite"
	>
		<div class="notification__content">
			<div class="notification__icon">
				{getIcon(notification.type)}
			</div>

			<div class="notification__message">
				{notification.message}
			</div>

			<div class="notification__actions">
				{#if notification.actions && notification.actions.length > 0}
					{#each notification.actions as action}
						<button
							class="notification__action-button"
							on:click={() => handleAction(action.action)}
						>
							{action.label}
						</button>
					{/each}
				{/if}

				<button class="notification__close-button" on:click={close} aria-label="通知を閉じる">
					✕
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.notification {
		display: flex;
		align-items: center;
		padding: 1rem;
		margin-bottom: 0.5rem;
		border-radius: 8px;
		box-shadow:
			0 4px 6px -1px rgba(0, 0, 0, 0.1),
			0 2px 4px -1px rgba(0, 0, 0, 0.06);
		max-width: 400px;
		min-width: 300px;
	}

	.notification--error {
		background-color: #fef2f2;
		border-left: 4px solid #dc2626;
		color: #7f1d1d;
	}

	.notification--warning {
		background-color: #fffbeb;
		border-left: 4px solid #f59e0b;
		color: #92400e;
	}

	.notification--info {
		background-color: #eff6ff;
		border-left: 4px solid #3b82f6;
		color: #1e40af;
	}

	.notification__content {
		display: flex;
		align-items: flex-start;
		width: 100%;
		gap: 0.75rem;
	}

	.notification__icon {
		font-size: 1.25rem;
		flex-shrink: 0;
		margin-top: 0.125rem;
	}

	.notification__message {
		flex: 1;
		line-height: 1.5;
		font-weight: 500;
	}

	.notification__actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	.notification__action-button {
		padding: 0.25rem 0.75rem;
		border: none;
		border-radius: 4px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.notification--error .notification__action-button {
		background-color: #dc2626;
		color: white;
	}

	.notification--error .notification__action-button:hover {
		background-color: #b91c1c;
	}

	.notification--warning .notification__action-button {
		background-color: #f59e0b;
		color: white;
	}

	.notification--warning .notification__action-button:hover {
		background-color: #d97706;
	}

	.notification--info .notification__action-button {
		background-color: #3b82f6;
		color: white;
	}

	.notification--info .notification__action-button:hover {
		background-color: #2563eb;
	}

	.notification__close-button {
		background: none;
		border: none;
		font-size: 1rem;
		cursor: pointer;
		padding: 0.25rem;
		border-radius: 4px;
		opacity: 0.7;
		transition:
			opacity 0.2s,
			background-color 0.2s;
	}

	.notification__close-button:hover {
		opacity: 1;
		background-color: rgba(0, 0, 0, 0.1);
	}
</style>
