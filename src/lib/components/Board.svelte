<script lang="ts">
	import VirtualCanvas from './canvas/VirtualCanvas.svelte';
	import { BoardService } from '$lib/services/board/BoardService';
	import type { Position } from '$lib/types';
	import { onMount } from 'svelte';

	interface Props {
		element?: HTMLElement;
	}

	let { element = $bindable() }: Props = $props();

	// サービス層を使用
	const boardService = new BoardService();

	// キャンバス関連の要素
	let canvasContainer: HTMLElement | null = $state(null);
	let canvas: HTMLElement;
	let horizontalScrollbar: HTMLElement;
	let verticalScrollbar: HTMLElement;
	let horizontalThumb: HTMLElement;
	let verticalThumb: HTMLElement;
	let maxScrollY = $derived(() => {
		if (!canvasContainer || !viewport) return 0;
		const containerRect = canvasContainer.getBoundingClientRect();
		const visibleHeight = containerRect.height;
		const canvasHeight = canvasSize().height * viewport().zoom;
		return Math.max(0, canvasHeight - visibleHeight);
	});

	// 定数
	const MARGIN = 500; // ブロック周りのマージン
	const MIN_ZOOM = 0.1;
	const MAX_ZOOM = 3;
	const ZOOM_SPEED = 0.1;

	// ビューポートとキャンバスの状態
	const viewport = $derived(() => boardService.getViewport());
	const interactionState = $derived(() => boardService.getInteractionState());

	// キャンバスの境界を計算
	const canvasBounds = $derived(() => boardService.calculateCanvasBounds(MARGIN));

	// キャンバスのサイズを計算
	const canvasSize = $derived(() => ({
		width: canvasBounds().width,
		height: canvasBounds().height
	}));

	// ドラッグ状態
	const dragState = $derived(() => boardService.getDragState());

	const handleDragStart = (id: string, offset: Position) => {
		boardService.startDrag(id, offset);
	};

	// キャンバスドラッグ処理
	const handleCanvasMouseDown = (event: MouseEvent) => {
		if (event.button !== 0) return; // 左クリックのみ

		// ブロック要素やその子要素がクリックされた場合はキャンバスドラッグを無効にする
		const target = event.target as HTMLElement;
		if (target.closest('[data-block-id]')) return;

		// スクロールバーがクリックされた場合も無効にする
		if (target.closest('.scrollbar')) return;

		// キャンバス以外の要素がクリックされた場合も無効にする
		if (target !== canvas && !canvas.contains(target)) return;

		event.preventDefault();
		boardService.setCanvasDragging(true, {
			x: event.clientX,
			y: event.clientY
		});
	};

	const handleCanvasMouseMove = (event: MouseEvent) => {
		if (interactionState().isDragging && canvasContainer) {
			const deltaX = event.clientX - interactionState().lastMousePos.x;
			const deltaY = event.clientY - interactionState().lastMousePos.y;

			const rect = canvasContainer.getBoundingClientRect();

			const bounds = canvasBounds();
			boardService.setViewportPosition({
				x: Math.min(0, Math.max(-bounds.width + rect.width, viewport().x + deltaX)),
				y: Math.min(0, Math.max(-bounds.height + rect.height, viewport().y + deltaY))
			});

			boardService.setCanvasDragging(true, {
				x: event.clientX,
				y: event.clientY
			});
			updateScrollbars();
		}
	};

	const handleCanvasMouseUp = () => {
		boardService.setCanvasDragging(false);
	};

	// ズーム処理
	const handleWheel = (event: WheelEvent) => {
		if (!event.ctrlKey) return;
		if (!canvasContainer) return;

		boardService.handleWheel(event, canvasContainer);
		updateScrollbars();
	};

	// スクロールバー更新
	const updateScrollbars = () => {
		if (!canvasContainer || !horizontalThumb || !verticalThumb) return;

		const containerRect = canvasContainer.getBoundingClientRect();
		const visibleWidth = containerRect.width;
		const visibleHeight = containerRect.height;
		const canvasWidth = canvasSize().width * viewport().zoom;
		const canvasHeight = canvasSize().height * viewport().zoom;

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

	// スクロールバードラッグ処理
	let scrollbarDragging = $state<{
		type: 'horizontal' | 'vertical' | null;
		offset: number;
	}>({
		type: null,
		offset: 0
	});

	const handleScrollbarMouseDown = (event: MouseEvent, type: 'horizontal' | 'vertical') => {
		event.preventDefault();
		const thumb = type === 'horizontal' ? horizontalThumb : verticalThumb;
		const rect = thumb.getBoundingClientRect();
		const offset = type === 'horizontal' ? event.clientX - rect.left : event.clientY - rect.top;

		scrollbarDragging = { type, offset };
	};

	const handleScrollbarMouseMove = (event: MouseEvent) => {
		if (!scrollbarDragging.type || !canvasContainer) return;

		const containerRect = canvasContainer.getBoundingClientRect();
		const visibleWidth = containerRect.width;
		const visibleHeight = containerRect.height;
		const canvasWidth = canvasSize().width * viewport().zoom;
		const canvasHeight = canvasSize().height * viewport().zoom;

		if (scrollbarDragging.type === 'horizontal') {
			const scrollbarRect = horizontalScrollbar.getBoundingClientRect();
			const mouseX = event.clientX - scrollbarRect.left - scrollbarDragging.offset;
			const thumbWidth = parseFloat(horizontalThumb.style.width);
			const maxThumbPos = visibleWidth - thumbWidth;
			const thumbPos = Math.max(0, Math.min(maxThumbPos, mouseX));
			const scrollRatio = thumbPos / maxThumbPos;

			boardService.setViewportPosition({
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

			boardService.setViewportPosition({
				x: viewport().x,
				y: -scrollRatio * (canvasHeight - visibleHeight)
			});
		}

		updateScrollbars();
	};

	const handleScrollbarMouseUp = () => {
		scrollbarDragging = { type: null, offset: 0 };
	};

	const handleMouseMove = (event: MouseEvent) => {
		if (!element) return;
		boardService.handleMouseMove(event, element);
	};

	const handleMouseUp = (event: MouseEvent) => {
		if (!element) return;

		// サイドバーでのドロップ処理
		const dragState = boardService.getDragState();
		if (dragState.active && dragState.blockId) {
			const sidebarElement = document.querySelector('#sidebar');
			if (sidebarElement) {
				const sidebarRect = sidebarElement.getBoundingClientRect();
				if (
					event.clientX < sidebarRect.right &&
					event.clientY < sidebarRect.bottom &&
					event.clientX > sidebarRect.left &&
					event.clientY > sidebarRect.top
				) {
					// サイドバーにドロップした場合はブロックを削除
					boardService.removeBlockWithChildren(dragState.blockId);
					boardService.clearDrag();
					return;
				}
			}
		}

		boardService.handleMouseUp(event, element);
	};

	// グローバルマウスイベントの設定
	$effect(() => {
		const handleGlobalMouseMove = (event: MouseEvent) => {
			const dragState = boardService.getDragState();
			const interactionState = boardService.getInteractionState();

			// ブロックドラッグ中はキャンバスドラッグを無効化
			if (dragState.active && dragState.blockId) {
				handleMouseMove(event);
			} else if (interactionState.isDragging) {
				handleCanvasMouseMove(event);
			}

			handleScrollbarMouseMove(event);
		};
		const handleGlobalMouseUp = (event: MouseEvent) => {
			handleMouseUp(event);
			handleCanvasMouseUp();
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

	onMount(() => boardService.setViewportPosition({ x: 0, y: 0 }));
</script>

<div id="canvas-wrapper" bind:this={element} role="main" tabindex="-1">
	<div
		id="canvas-container"
		bind:this={canvasContainer}
		onmousedown={handleCanvasMouseDown}
		onwheel={handleWheel}
		role="button"
		tabindex="-1"
		aria-label="キャンバス"
	>
		<div
			id="canvas"
			bind:this={canvas}
			style:width="{canvasSize().width}px"
			style:height="{canvasSize().height}px"
			style:transform="translate({viewport().x}px, {viewport().y}px) scale({viewport().zoom})"
			style:transform-origin="0 0"
		>
			<!-- 仮想スクロール対応キャンバス -->
			<VirtualCanvas
				canvasSize={canvasSize()}
				containerSize={{
					width: canvasContainer?.getBoundingClientRect().width || 1920,
					height: canvasContainer?.getBoundingClientRect().height || 1080
				}}
				onDragStart={handleDragStart}
				enableVirtualScroll={true}
				showPerformanceStats={false}
				debugMode={false}
			/>
		</div>
	</div>

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
			aria-orientation="vertical"
			aria-label="垂直スクロール"
			aria-valuenow={Math.round(Math.abs(viewport().y))}
			aria-valuemin={0}
			aria-valuemax={Math.round(maxScrollY())}
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

	<!-- ズームコントロール -->
	<div class="zoom-controls">
		<button
			onclick={() => {
				const newZoom = Math.max(MIN_ZOOM, viewport().zoom - ZOOM_SPEED);
				boardService.setViewportZoom(newZoom);
				updateScrollbars();
			}}
			title="ズームアウト"
		>
			-
		</button>
		<span class="zoom-level">{Math.round(viewport().zoom * 100)}%</span>
		<button
			onclick={() => {
				const newZoom = Math.min(MAX_ZOOM, viewport().zoom + ZOOM_SPEED);
				boardService.setViewportZoom(newZoom);
				updateScrollbars();
			}}
			title="ズームイン"
		>
			+
		</button>
	</div>
</div>

<style>
	#canvas-wrapper {
		width: 100%;
		height: 100%;
		position: relative;
		background: #f5f5f5;
		overflow: hidden;
	}

	#canvas-container {
		width: 100%;
		height: 100%;
		position: relative;
		cursor: grab;
	}

	#canvas-container:active {
		cursor: grabbing;
	}

	/* ブロック要素のポインターイベントを有効にする */
	#canvas :global([data-block-id]) {
		pointer-events: auto;
		z-index: 10;
	}

	/* ドラッグ中のブロックは最前面に */
	#canvas :global([data-block-id].dragging) {
		z-index: 1000;
	}

	#canvas {
		position: absolute;
		left: 0;
		top: 0;
	}

	/* .dragging-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 1000;
  } */

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
</style>
