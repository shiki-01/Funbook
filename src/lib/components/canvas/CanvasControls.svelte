<!--
  CanvasControls.svelte
  ズームとナビゲーションのためのコントロールコンポーネント
  
  @remarks
  このコンポーネントは、キャンバスのズーム操作とナビゲーション機能を提供します。
  アクセシビリティを考慮し、キーボードナビゲーションもサポートしています。
-->

<script lang="ts">
	import type { Viewport } from '$lib/types/ui';
	import type { ICanvasService } from '$lib/types/services';

	interface Props {
		/** 現在のビューポート状態 */
		viewport: Viewport;
		/** キャンバスサービスインスタンス */
		canvasService: ICanvasService;
		/** コンテナ要素のサイズ */
		containerSize?: { width: number; height: number };
		/** 最小ズームレベル */
		minZoom?: number;
		/** 最大ズームレベル */
		maxZoom?: number;
		/** ズームステップ */
		zoomStep?: number;
		/** コントロールの位置 */
		position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
		/** コンパクトモード */
		compact?: boolean;
		/** ズーム変更時のコールバック */
		onZoomChange?: (zoom: number) => void;
		/** ビューポートリセット時のコールバック */
		onViewportReset?: () => void;
		/** 位置変更時のコールバック */
		onPositionChange?: (position: { x: number; y: number }) => void;
	}

	let {
		viewport,
		canvasService,
		containerSize,
		minZoom = 0.1,
		maxZoom = 3.0,
		zoomStep = 0.1,
		position = 'bottom-right',
		compact = false,
		onZoomChange,
		onViewportReset,
		onPositionChange
	}: Props = $props();

	// ズームレベルの表示用計算
	const zoomPercentage = $derived(Math.round(viewport.zoom * 100));

	// ズームイン可能かどうか
	const canZoomIn = $derived(viewport.zoom < maxZoom);

	// ズームアウト可能かどうか
	const canZoomOut = $derived(viewport.zoom > minZoom);

	/**
	 * ズームイン操作
	 * @param centerPoint - ズームの中心点（オプション）
	 */
	const zoomIn = (centerPoint?: { x: number; y: number }) => {
		if (!canZoomIn) return;

		const newZoom = Math.min(maxZoom, viewport.zoom + zoomStep);
		canvasService.zoom(zoomStep, centerPoint);
		onZoomChange?.(newZoom);
	};

	/**
	 * ズームアウト操作
	 * @param centerPoint - ズームの中心点（オプション）
	 */
	const zoomOut = (centerPoint?: { x: number; y: number }) => {
		if (!canZoomOut) return;

		const newZoom = Math.max(minZoom, viewport.zoom - zoomStep);
		canvasService.zoom(-zoomStep, centerPoint);
		onZoomChange?.(newZoom);
	};

	/**
	 * ビューポートをリセット
	 */
	const resetViewport = () => {
		canvasService.resetViewport(containerSize);
		onViewportReset?.();
	};

	/**
	 * キーボードイベントハンドラ
	 * @param event - キーボードイベント
	 */
	const handleKeyDown = (event: KeyboardEvent) => {
		// Ctrl/Cmd + Plus でズームイン
		if ((event.ctrlKey || event.metaKey) && (event.key === '+' || event.key === '=')) {
			event.preventDefault();
			zoomIn();
			return;
		}

		// Ctrl/Cmd + Minus でズームアウト
		if ((event.ctrlKey || event.metaKey) && event.key === '-') {
			event.preventDefault();
			zoomOut();
			return;
		}

		// Ctrl/Cmd + 0 でリセット
		if ((event.ctrlKey || event.metaKey) && event.key === '0') {
			event.preventDefault();
			resetViewport();
			return;
		}

		// Enterキーでボタンを実行
		if (event.key === 'Enter' || event.key === ' ') {
			const target = event.target as HTMLElement;
			if (target.classList.contains('zoom-button')) {
				event.preventDefault();
				target.click();
			}
		}
	};

	/**
	 * ズームレベル入力の変更ハンドラ
	 * @param event - 入力イベント
	 */
	const handleZoomInput = (event: Event) => {
		const input = event.target as HTMLInputElement;
		const percentage = parseInt(input.value, 10);

		if (isNaN(percentage) || percentage < minZoom * 100 || percentage > maxZoom * 100) {
			// 無効な値の場合は元に戻す
			input.value = zoomPercentage.toString();
			return;
		}

		const newZoom = percentage / 100;
		const delta = newZoom - viewport.zoom;
		canvasService.zoom(delta);
		onZoomChange?.(newZoom);
	};

	/**
	 * ホイールイベントでのズーム操作
	 * @param event - ホイールイベント
	 */
	const handleWheel = (event: WheelEvent) => {
		if (!event.ctrlKey && !event.metaKey) return;

		event.preventDefault();
		const delta = event.deltaY > 0 ? -zoomStep : zoomStep;

		// マウス位置を中心にズーム
		const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		const centerPoint = {
			x: event.clientX - rect.left,
			y: event.clientY - rect.top
		};

		if (delta > 0) {
			zoomIn(centerPoint);
		} else {
			zoomOut(centerPoint);
		}
	};

	// コンポーネントマウント時にキーボードイベントリスナーを追加
	$effect(() => {
		document.addEventListener('keydown', handleKeyDown);
		return () => {
			document.removeEventListener('keydown', handleKeyDown);
		};
	});
</script>

<div
	class="canvas-controls"
	class:compact
	class:bottom-right={position === 'bottom-right'}
	class:bottom-left={position === 'bottom-left'}
	class:top-right={position === 'top-right'}
	class:top-left={position === 'top-left'}
	onwheel={handleWheel}
	role="toolbar"
	aria-label="キャンバスコントロール"
>
	<!-- ズームアウトボタン -->
	<button
		class="zoom-button zoom-out"
		onclick={() => zoomOut()}
		disabled={!canZoomOut}
		title="ズームアウト (Ctrl + -)"
		aria-label="ズームアウト"
		tabindex="0"
	>
		<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
			<path
				d="M2 8a6 6 0 1 1 12 0A6 6 0 0 1 2 8zm6-7a7 7 0 1 0 0 14A7 7 0 0 0 8 1zM5 7.5a.5.5 0 0 0 0 1h6a.5.5 0 0 0 0-1H5z"
			/>
		</svg>
		{#if !compact}
			<span class="sr-only">ズームアウト</span>
		{/if}
	</button>

	<!-- ズームレベル表示/入力 -->
	<div class="zoom-level-container">
		{#if compact}
			<span class="zoom-level" aria-label="現在のズームレベル">
				{zoomPercentage}%
			</span>
		{:else}
			<input
				type="number"
				class="zoom-input"
				value={zoomPercentage}
				min={minZoom * 100}
				max={maxZoom * 100}
				step={zoomStep * 100}
				onchange={handleZoomInput}
				aria-label="ズームレベル（パーセント）"
				title="ズームレベルを直接入力"
			/>
			<span class="zoom-unit">%</span>
		{/if}
	</div>

	<!-- ズームインボタン -->
	<button
		class="zoom-button zoom-in"
		onclick={() => zoomIn()}
		disabled={!canZoomIn}
		title="ズームイン (Ctrl + +)"
		aria-label="ズームイン"
		tabindex="0"
	>
		<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
			<path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zM2 8a6 6 0 1 1 12 0A6 6 0 0 1 2 8z" />
			<path
				d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"
			/>
		</svg>
		{#if !compact}
			<span class="sr-only">ズームイン</span>
		{/if}
	</button>

	{#if !compact}
		<!-- 区切り線 -->
		<div class="separator" role="separator"></div>

		<!-- リセットボタン -->
		<button
			class="zoom-button reset"
			onclick={resetViewport}
			title="ビューポートをリセット (Ctrl + 0)"
			aria-label="ビューポートをリセット"
			tabindex="0"
		>
			<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
				<path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zM2 8a6 6 0 1 1 12 0A6 6 0 0 1 2 8z" />
				<path
					d="M8.5 4.5a.5.5 0 0 0-1 0v3h-3a.5.5 0 0 0 0 1h3v3a.5.5 0 0 0 1 0v-3h3a.5.5 0 0 0 0-1h-3v-3z"
				/>
				<path
					d="M6.5 1.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1H7v1.5a.5.5 0 0 1-1 0V2H5.5a.5.5 0 0 1 0-1H6.5z"
				/>
			</svg>
			<span class="sr-only">リセット</span>
		</button>
	{/if}
</div>

<style>
	.canvas-controls {
		position: absolute;
		display: flex;
		align-items: center;
		gap: 4px;
		background: white;
		border: 1px solid #ddd;
		border-radius: 8px;
		padding: 8px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		z-index: 200;
		user-select: none;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	}

	/* 位置設定 */
	.canvas-controls.bottom-right {
		bottom: 20px;
		right: 20px;
	}

	.canvas-controls.bottom-left {
		bottom: 20px;
		left: 20px;
	}

	.canvas-controls.top-right {
		top: 20px;
		right: 20px;
	}

	.canvas-controls.top-left {
		top: 20px;
		left: 20px;
	}

	/* コンパクトモード */
	.canvas-controls.compact {
		padding: 6px;
		gap: 2px;
	}

	.zoom-button {
		width: 32px;
		height: 32px;
		border: 1px solid #ddd;
		background: white;
		border-radius: 6px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 14px;
		font-weight: 600;
		color: #333;
		transition: all 0.2s ease;
		position: relative;
	}

	.compact .zoom-button {
		width: 28px;
		height: 28px;
	}

	.zoom-button:hover:not(:disabled) {
		background: #f8f9fa;
		border-color: #999;
		transform: translateY(-1px);
	}

	.zoom-button:active:not(:disabled) {
		background: #e9ecef;
		transform: translateY(0);
	}

	.zoom-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		background: #f8f9fa;
	}

	.zoom-button:focus {
		outline: 2px solid #0066cc;
		outline-offset: 2px;
	}

	.zoom-level-container {
		display: flex;
		align-items: center;
		gap: 2px;
		min-width: 50px;
		justify-content: center;
	}

	.zoom-level {
		font-size: 12px;
		color: #666;
		font-weight: 500;
		text-align: center;
		min-width: 35px;
	}

	.zoom-input {
		width: 45px;
		height: 24px;
		border: 1px solid #ddd;
		border-radius: 4px;
		text-align: center;
		font-size: 12px;
		color: #333;
		background: white;
		padding: 0 4px;
	}

	.zoom-input:focus {
		outline: 2px solid #0066cc;
		outline-offset: 1px;
		border-color: #0066cc;
	}

	.zoom-unit {
		font-size: 12px;
		color: #666;
		font-weight: 500;
	}

	.separator {
		width: 1px;
		height: 20px;
		background: #ddd;
		margin: 0 4px;
	}

	.compact .separator {
		height: 16px;
		margin: 0 2px;
	}

	/* アクセシビリティ */
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	/* SVGアイコンのスタイル */
	.zoom-button svg {
		width: 16px;
		height: 16px;
		color: inherit;
	}

	.compact .zoom-button svg {
		width: 14px;
		height: 14px;
	}

	/* ホバー効果の改善 */
	.zoom-button::before {
		content: '';
		position: absolute;
		top: -2px;
		left: -2px;
		right: -2px;
		bottom: -2px;
		border-radius: 8px;
		background: transparent;
		transition: background 0.2s ease;
		z-index: -1;
	}

	.zoom-button:hover::before {
		background: rgba(0, 102, 204, 0.1);
	}

	/* ダークモード対応（将来的な拡張） */
	@media (prefers-color-scheme: dark) {
		.canvas-controls {
			background: #2d3748;
			border-color: #4a5568;
			color: #e2e8f0;
		}

		.zoom-button {
			background: #2d3748;
			border-color: #4a5568;
			color: #e2e8f0;
		}

		.zoom-button:hover:not(:disabled) {
			background: #4a5568;
			border-color: #718096;
		}

		.zoom-button:active:not(:disabled) {
			background: #1a202c;
		}

		.zoom-input {
			background: #2d3748;
			border-color: #4a5568;
			color: #e2e8f0;
		}

		.separator {
			background: #4a5568;
		}
	}

	/* レスポンシブデザイン */
	@media (max-width: 768px) {
		.canvas-controls {
			padding: 6px;
			gap: 2px;
		}

		.zoom-button {
			width: 28px;
			height: 28px;
		}

		.zoom-input {
			width: 40px;
			height: 22px;
			font-size: 11px;
		}
	}

	/* 高コントラストモード対応 */
	@media (prefers-contrast: high) {
		.canvas-controls {
			border-width: 2px;
			border-color: #000;
		}

		.zoom-button {
			border-width: 2px;
			border-color: #000;
		}

		.zoom-button:focus {
			outline-width: 3px;
		}
	}

	/* アニメーション削減設定 */
	@media (prefers-reduced-motion: reduce) {
		.zoom-button,
		.zoom-button::before {
			transition: none;
		}
	}
</style>
