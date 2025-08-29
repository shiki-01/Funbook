<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import ErrorNotification from './ErrorNotification.svelte';
	import type { ErrorHandler, UserNotification } from '../../services/error/ErrorHandler';

	/**
	 * 通知コンテナのプロパティ
	 */
	export let errorHandler: ErrorHandler;
	export let position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' = 'top-right';
	export let maxNotifications = 5;

	let notifications: UserNotification[] = [];

	/**
	 * 通知を追加
	 * @param notification 追加する通知
	 */
	function addNotification(notification: UserNotification) {
		notifications = [notification, ...notifications];

		// 最大通知数を超えた場合、古い通知を削除
		if (notifications.length > maxNotifications) {
			notifications = notifications.slice(0, maxNotifications);
		}
	}

	/**
	 * 通知を削除
	 * @param id 削除する通知のID
	 */
	function removeNotification(id: string) {
		notifications = notifications.filter((n) => n.id !== id);
	}

	/**
	 * 位置に基づくCSSクラスを取得
	 * @param pos 位置
	 * @returns CSSクラス名
	 */
	function getPositionClass(pos: string): string {
		return `notification-container--${pos}`;
	}

	/**
	 * コンポーネントマウント時の処理
	 */
	onMount(() => {
		if (errorHandler) {
			errorHandler.onNotification(addNotification);
		}
	});

	/**
	 * コンポーネント破棄時の処理
	 */
	onDestroy(() => {
		if (errorHandler) {
			errorHandler.offNotification(addNotification);
		}
	});
</script>

<div class="notification-container {getPositionClass(position)}">
	{#each notifications as notification (notification.id)}
		<ErrorNotification {notification} onClose={removeNotification} />
	{/each}
</div>

<style>
	.notification-container {
		position: fixed;
		z-index: 9999;
		pointer-events: none;
	}

	.notification-container > :global(*) {
		pointer-events: auto;
	}

	.notification-container--top-right {
		top: 1rem;
		right: 1rem;
	}

	.notification-container--top-left {
		top: 1rem;
		left: 1rem;
	}

	.notification-container--bottom-right {
		bottom: 1rem;
		right: 1rem;
	}

	.notification-container--bottom-left {
		bottom: 1rem;
		left: 1rem;
	}

	/* レスポンシブ対応 */
	@media (max-width: 640px) {
		.notification-container {
			left: 1rem;
			right: 1rem;
		}

		.notification-container--top-right,
		.notification-container--top-left {
			top: 1rem;
		}

		.notification-container--bottom-right,
		.notification-container--bottom-left {
			bottom: 1rem;
		}
	}
</style>
