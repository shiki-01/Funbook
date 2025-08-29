<!--
  CanvasContainer.svelte
  ビューポート管理とスクロール機能を提供するキャンバスコンテナコンポーネント
  
  @remarks
  Board.svelteから抽出されたビューポートとスクロールロジックを含みます。
  このコンポーネントは純粋にビューポート管理に焦点を当て、
  ブロックレンダリングやドラッグ操作は他のコンポーネントに委譲します。
-->

<script lang="ts">
	import type { Position } from '$lib/types';
	import { useCanvasStore } from '$lib/stores/canvas.store.svelte';

	/**
	 * CanvasContainer コンポーネントのプロパティ
	 */
	interface Props {
		/** キャンバスのサイズ */
		canvasSize: { width: number; height: number };
		/** 子コンテンツ */
		children?: import('svelte').Snippet;
		/** キャンバスドラッグが有効かどうか */
		enableCanvasDrag?: boolean;
		/** ズーム操作が有効かどうか */
		enableZoom?: boolean;
		/** スクロールバーを表示するかどうか */
		showScrollbars?: boolean;
		/** ズームコントロールを表示するかどうか */
		showZoomControls?: boolean;
		/** キャンバスドラッグ開始時のコールバック */
		onCanvasDragStart?: (event: MouseEvent) => void;
		/** キャンバスドラッグ中のコールバック */
		onCanvasDrag?: (event: MouseEvent, delta: Position) => void;
		/** キャンバスドラッグ終了時のコールバック */
		onCanvasDragEnd?: (event: MouseEvent) => void;
		/** ズーム変更時のコールバック */
		onZoomChange?: (zoom: number, centerPoint?: Position) => void;
	}

	let {
		canvasSize,
		children,
		enableCanvasDrag = true,
		enableZoom = true,
		showScrollbars = true,
		showZoomControls = true,
		onCanvasDragStart,
		onCanvasDrag,
		onCanvasDragEnd,
		onZoomChange
	}: Props = $props();

	// サービスとストア
	const canvasStore = useCanvasStore();

	// DOM要素の参照
	let canvasContainer: HTMLElement;
	let canvas: HTMLElement;
	let horizontalScrollbar: HTMLElement | null = $state(null);
	let verticalScrollbar: HTMLElement | null = $state(null);
	let horizontalThumb: HTMLElement | null = $state(null);
	let verticalThumb: HTMLElement | null = $state(null);

	// 定数
	const MIN_ZOOM = 0.1;
	const MAX_ZOOM = 3.0;
	const ZOOM_SPEED = 0.1;

	// 状態
	const viewport = $derived(() => canvasStore.getViewport());
	const canvasState = $derived(() => canvasStore.getCanvasState());

	// スクロールバードラッグ状態
	let scrollbarDragging = $state<{
		type: 'horizontal' | 'vertical' | null;
		offset: number;
	}>({
		type: null,
		offset: 0
	});

	// 最大スクロール値の計算
	const maxScrollY = $derived(() => {
		if (!canvasContainer || !viewport) return 0;
		const containerRect = canvasContainer.getBoundingClientRect();
		const visibleHeight = containerRect.height;
		const canvasHeight = canvasSize.height * viewport().zoom;
		return Math.max(0, canvasHeight - visibleHeight);
	});

	const maxScrollX = $derived(() => {
		if (!canvasContainer || !viewport) return 0;
		const containerRect = canvasContainer.getBoundingClientRect();
		const visibleWidth = containerRect.width;
		const canvasWidth = canvasSize.width * viewport().zoom;
		return Math.max(0, canvasWidth - visibleWidth);
	});

	/**
	 * キャンバスドラッグ開始処理
	 * @param event - マウスイベント
	 */
	const handleCanvasMouseDown = (event: MouseEvent) => {
		if (!enableCanvasDrag || event.button !== 0) return; // 左クリックのみ

		// ブロック要素やその子要素がクリックされた場合はキャンバスドラッグを無効にする
		const target = event.target as HTMLElement;
		if (target.closest('[data-block-id]')) return;

		// スクロールバーがクリックされた場合も無効にする
		if (target.closest('.scrollbar')) return;

		// キャンバス以外の要素がクリックされた場合も無効にする
		if (target !== canvas && !canvas.contains(target)) return;

		event.preventDefault();
		canvasStore.setCanvasDragging(true, { x: event.clientX, y: event.clientY });

		// コールバック実行
		onCanvasDragStart?.(event);
	};

	/**
	 * キャンバスドラッグ中の処理
	 * @param event - マウスイベント
	 */
	const handleCanvasMouseMove = (event: MouseEvent) => {
		if (!canvasState().interaction.isDragging) return;

		const deltaX = event.clientX - canvasState().interaction.lastMousePos.x;
		const deltaY = event.clientY - canvasState().interaction.lastMousePos.y;

		const newPosition = {
			x: Math.min(0, Math.max(-maxScrollX(), viewport().x + deltaX)),
			y: Math.min(0, Math.max(-maxScrollY(), viewport().y + deltaY))
		};

		canvasStore.setViewportPosition(newPosition);
		canvasStore.setCanvasDragging(true, {
			x: event.clientX,
			y: event.clientY
		});

		updateScrollbars();

		// コールバック実行
		onCanvasDrag?.(event, { x: deltaX, y: deltaY });
	};

	/**
	 * キャンバスドラッグ終了処理
	 * @param event - マウスイベント
	 */
	const handleCanvasMouseUp = (event: MouseEvent) => {
		if (canvasState().interaction.isDragging) {
			canvasStore.setCanvasDragging(false);
			onCanvasDragEnd?.(event);
		}
	};

	/**
	 * ホイールイベント処理（ズーム）
	 * @param event - ホイールイベント
	 */
	const handleWheel = (event: WheelEvent) => {
		if (!enableZoom || !event.ctrlKey) return;

		event.preventDefault();
		const delta = event.deltaY > 0 ? -ZOOM_SPEED : ZOOM_SPEED;
		const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, viewport().zoom + delta));

		// マウス位置を中心にズーム
		const rect = canvasContainer.getBoundingClientRect();
		const mouseX = event.clientX - rect.left;
		const mouseY = event.clientY - rect.top;

		const oldZoom = viewport().zoom;
		const zoomRatio = newZoom / oldZoom;

		const newPosition = {
			x: viewport().x - (mouseX - viewport().x) * (zoomRatio - 1),
			y: viewport().y - (mouseY - viewport().y) * (zoomRatio - 1)
		};

		canvasStore.setViewportPosition(newPosition);
		canvasStore.setViewportZoom(newZoom);
		updateScrollbars();

		// コールバック実行
		onZoomChange?.(newZoom, { x: mouseX, y: mouseY });
	};

	/**
	 * スクロールバーの表示状態と位置を更新
	 */
	const updateScrollbars = () => {
		if (
			!showScrollbars ||
			!canvasContainer ||
			!horizontalThumb ||
			!verticalThumb ||
			!horizontalScrollbar ||
			!verticalScrollbar
		)
			return;

		const containerRect = canvasContainer.getBoundingClientRect();
		const visibleWidth = containerRect.width;
		const visibleHeight = containerRect.height;
		const canvasWidth = canvasSize.width * viewport().zoom;
		const canvasHeight = canvasSize.height * viewport().zoom;

		// 水平スクロールバー
		const horizontalRatio = visibleWidth / canvasWidth;
		const horizontalThumbWidth = Math.max(20, visibleWidth * horizontalRatio);
		const horizontalScrollPos = -viewport().x / (canvasWidth - visibleWidth);
		const horizontalThumbPos = Math.max(
			0,
			Math.min(
				visibleWidth - horizontalThumbWidth,
				horizontalScrollPos * (visibleWidth - horizontalThumbWidth)
			)
		);

		horizontalThumb.style.width = `${horizontalThumbWidth}px`;
		horizontalThumb.style.left = `${horizontalThumbPos}px`;
		horizontalScrollbar.style.display = horizontalRatio >= 1 ? 'none' : 'block';

		// 垂直スクロールバー
		const verticalRatio = visibleHeight / canvasHeight;
		const verticalThumbHeight = Math.max(20, visibleHeight * verticalRatio);
		const verticalScrollPos = -viewport().y / (canvasHeight - visibleHeight);
		const verticalThumbPos = Math.max(
			0,
			Math.min(
				visibleHeight - verticalThumbHeight,
				verticalScrollPos * (visibleHeight - verticalThumbHeight)
			)
		);

		verticalThumb.style.height = `${verticalThumbHeight}px`;
		verticalThumb.style.top = `${verticalThumbPos}px`;
		verticalScrollbar.style.display = verticalRatio >= 1 ? 'none' : 'block';
	};

	/**
	 * スクロールバードラッグ開始処理
	 * @param event - マウスイベント
	 * @param type - スクロールバーの種類
	 */
	const handleScrollbarMouseDown = (event: MouseEvent, type: 'horizontal' | 'vertical') => {
		event.preventDefault();
		const thumb = type === 'horizontal' ? horizontalThumb : verticalThumb;
		if (!thumb) return;
		const rect = thumb.getBoundingClientRect();
		const offset = type === 'horizontal' ? event.clientX - rect.left : event.clientY - rect.top;

		scrollbarDragging = { type, offset };
	};

	/**
	 * スクロールバードラッグ中の処理
	 * @param event - マウスイベント
	 */
	const handleScrollbarMouseMove = (event: MouseEvent) => {
		if (!scrollbarDragging.type || !canvasContainer) return;
		if (!horizontalScrollbar) return;
		if (!verticalScrollbar) return;
		if (!horizontalThumb) return;
		if (!verticalThumb) return;

		const containerRect = canvasContainer.getBoundingClientRect();
		const visibleWidth = containerRect.width;
		const visibleHeight = containerRect.height;
		const canvasWidth = canvasSize.width * viewport().zoom;
		const canvasHeight = canvasSize.height * viewport().zoom;

		if (scrollbarDragging.type === 'horizontal') {
			const scrollbarRect = horizontalScrollbar.getBoundingClientRect();
			const mouseX = event.clientX - scrollbarRect.left - scrollbarDragging.offset;
			const thumbWidth = parseFloat(horizontalThumb.style.width);
			const maxThumbPos = visibleWidth - thumbWidth;
			const thumbPos = Math.max(0, Math.min(maxThumbPos, mouseX));
			const scrollRatio = thumbPos / maxThumbPos;

			canvasStore.setViewportPosition({
				x: -scrollRatio * (canvasWidth - visibleWidth),
				y: viewport().y
			});
		} else {
			const scrollbarRect = verticalScrollbar.getBoundingClientRect();
			const mouseY = event.clientY - scrollbarRect.top - scrollbarDragging.offset;
			const thumbHeight = parseFloat(verticalThumb.style.height);
			const maxThumbPos = visibleHeight - thumbHeight;
			const thumbPos = Math.max(0, Math.min(maxThumbPos, mouseY));
			const scrollRatio = thumbPos / maxThumbPos;

			canvasStore.setViewportPosition({
				x: viewport().x,
				y: -scrollRatio * (canvasHeight - visibleHeight)
			});
		}

		updateScrollbars();
	};

	/**
	 * スクロールバードラッグ終了処理
	 */
	const handleScrollbarMouseUp = () => {
		scrollbarDragging = { type: null, offset: 0 };
	};

	/**
	 * ズームイン
	 */
	const zoomIn = () => {
		const newZoom = Math.min(MAX_ZOOM, viewport().zoom + ZOOM_SPEED);
		canvasStore.setViewportZoom(newZoom);
		updateScrollbars();
		onZoomChange?.(newZoom);
	};

	/**
	 * ズームアウト
	 */
	const zoomOut = () => {
		const newZoom = Math.max(MIN_ZOOM, viewport().zoom - ZOOM_SPEED);
		canvasStore.setViewportZoom(newZoom);
		updateScrollbars();
		onZoomChange?.(newZoom);
	};

	/**
	 * ズームリセット
	 */
	const resetZoom = () => {
		canvasStore.setViewportZoom(1);
		// キャンバスの中心を画面の中心に配置
		if (canvasContainer) {
			const containerRect = canvasContainer.getBoundingClientRect();
			canvasStore.setViewportPosition({
				x: containerRect.width / 2,
				y: containerRect.height / 2
			});
		}
		updateScrollbars();
		onZoomChange?.(1);
	};

	// グローバルマウスイベントの設定
	$effect(() => {
		const handleGlobalMouseMove = (event: MouseEvent) => {
			handleCanvasMouseMove(event);
			handleScrollbarMouseMove(event);
		};

		const handleGlobalMouseUp = (event: MouseEvent) => {
			handleCanvasMouseUp(event);
			handleScrollbarMouseUp();
		};

		document.addEventListener('mousemove', handleGlobalMouseMove);
		document.addEventListener('mouseup', handleGlobalMouseUp);

		return () => {
			document.removeEventListener('mousemove', handleGlobalMouseMove);
			document.removeEventListener('mouseup', handleGlobalMouseUp);
		};
	});

	// スクロールバー更新のエフェクト
	$effect(() => {
		viewport().x; // 依存関係
		viewport().y;
		viewport().zoom;
		updateScrollbars();
	});

	// リサイズイベントの処理
	$effect(() => {
		const handleResize = () => updateScrollbars();
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	});

	// 初期化エフェクト
	$effect(() => {
		// 初回のみ実行
		if (canvasContainer) {
			canvasStore.setViewportPosition({ x: 0, y: 0 });
		}
	});
</script>

<div
	id="canvas-container"
	bind:this={canvasContainer}
	onmousedown={handleCanvasMouseDown}
	onwheel={handleWheel}
	role="button"
	tabindex="-1"
	aria-label="キャンバス"
	class="canvas-container"
	class:dragging={canvasState().interaction.isDragging}
>
	<div
		id="canvas"
		bind:this={canvas}
		style:width="{canvasSize.width}px"
		style:height="{canvasSize.height}px"
		style:transform="translate({viewport().x}px, {viewport().y}px) scale({viewport().zoom})"
		style:transform-origin="0 0"
		class="canvas"
	>
		{#if children}
			{@render children()}
		{/if}
	</div>

	{#if showScrollbars}
		<!-- カスタム水平スクロールバー -->
		<div id="horizontal-scrollbar" bind:this={horizontalScrollbar} class="scrollbar horizontal">
			<div
				id="horizontal-thumb"
				bind:this={horizontalThumb}
				class="scrollbar-thumb"
				onmousedown={(e) => handleScrollbarMouseDown(e, 'horizontal')}
				role="scrollbar"
				tabindex="0"
				aria-controls="canvas"
				aria-orientation="horizontal"
				aria-label="水平スクロール"
				aria-valuenow={Math.round(Math.abs(viewport().x))}
				aria-valuemin={0}
				aria-valuemax={Math.round(maxScrollX())}
			></div>
		</div>

		<!-- カスタム垂直スクロールバー -->
		<div id="vertical-scrollbar" bind:this={verticalScrollbar} class="scrollbar vertical">
			<div
				id="vertical-thumb"
				bind:this={verticalThumb}
				class="scrollbar-thumb"
				onmousedown={(e) => handleScrollbarMouseDown(e, 'vertical')}
				role="scrollbar"
				tabindex="0"
				aria-controls="canvas"
				aria-orientation="vertical"
				aria-label="垂直スクロール"
				aria-valuenow={Math.round(Math.abs(viewport().y))}
				aria-valuemin={0}
				aria-valuemax={Math.round(maxScrollY())}
			></div>
		</div>
	{/if}

	{#if showZoomControls}
		<!-- ズームコントロール -->
		<div class="zoom-controls">
			<button onclick={zoomOut} title="ズームアウト" aria-label="ズームアウト"> - </button>
			<span class="zoom-level">{Math.round(viewport().zoom * 100)}%</span>
			<button onclick={zoomIn} title="ズームイン" aria-label="ズームイン"> + </button>
			<button onclick={resetZoom} title="リセット" aria-label="ズームリセット"> ⌂ </button>
		</div>
	{/if}
</div>

<style>
	.canvas-container {
		width: 100%;
		height: 100%;
		position: relative;
		overflow: hidden;
		background: #f5f5f5;
		cursor: grab;
	}

	.canvas-container.dragging {
		cursor: grabbing;
	}

	.canvas {
		position: absolute;
		background-size: 20px 20px;
		background-image: radial-gradient(circle, #ccc 1px, transparent 1px);
		background-position: 0 0;
		left: 0;
		top: 0;
	}

	/* カスタムスクロールバー */
	.scrollbar {
		position: absolute;
		background: rgba(0, 0, 0, 0.1);
		border-radius: 6px;
		z-index: 100;
	}

	.scrollbar.horizontal {
		bottom: 0;
		left: 0;
		right: 12px; /* 垂直スクロールバーのスペース */
		height: 12px;
	}

	.scrollbar.vertical {
		top: 0;
		right: 0;
		bottom: 12px; /* 水平スクロールバーのスペース */
		width: 12px;
	}

	.scrollbar-thumb {
		position: absolute;
		background: rgba(0, 0, 0, 0.4);
		border-radius: 6px;
		cursor: pointer;
		transition: background-color 0.2s ease;
	}

	.scrollbar-thumb:hover {
		background: rgba(0, 0, 0, 0.6);
	}

	.scrollbar-thumb:active {
		background: rgba(0, 0, 0, 0.8);
	}

	/* ズームコントロール */
	.zoom-controls {
		position: absolute;
		bottom: 20px;
		right: 20px;
		display: flex;
		align-items: center;
		gap: 5px;
		background: white;
		border: 1px solid #ddd;
		border-radius: 6px;
		padding: 8px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		z-index: 200;
	}

	.zoom-controls button {
		width: 28px;
		height: 28px;
		border: 1px solid #ddd;
		background: white;
		border-radius: 4px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 14px;
		font-weight: bold;
		transition: all 0.2s ease;
	}

	.zoom-controls button:hover {
		background: #f0f0f0;
		border-color: #999;
	}

	.zoom-controls button:active {
		background: #e0e0e0;
	}

	.zoom-level {
		font-size: 12px;
		color: #666;
		min-width: 40px;
		text-align: center;
	}

	/* キーボードフォーカスのアクセシビリティ */
	.canvas-container:focus {
		outline: 2px solid #0066cc;
		outline-offset: -2px;
	}

	.scrollbar-thumb:focus {
		outline: 2px solid #0066cc;
		outline-offset: 1px;
	}
</style>
