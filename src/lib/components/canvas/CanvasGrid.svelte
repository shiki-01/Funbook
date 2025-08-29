<!--
  CanvasGrid.svelte
  視覚的フィードバックのためのキャンバスグリッドコンポーネント
  
  @remarks
  このコンポーネントは、キャンバス上にグリッドを表示し、ユーザーの位置把握を支援します。
  ズームレベルに応じてグリッドサイズが動的に調整され、パフォーマンス最適化が適用されています。
-->

<script lang="ts">
	import type { Viewport } from '$lib/types/ui';

	interface Props {
		/** ビューポート状態 */
		viewport: Viewport;
		/** グリッドの基本サイズ（ピクセル） */
		gridSize?: number;
		/** グリッドの色 */
		gridColor?: string;
		/** グリッドの透明度 */
		gridOpacity?: number;
		/** 大きなグリッドの間隔（基本グリッドの何倍か） */
		majorGridInterval?: number;
		/** 大きなグリッドの色 */
		majorGridColor?: string;
		/** 大きなグリッドの透明度 */
		majorGridOpacity?: number;
		/** グリッドを表示するかどうか */
		visible?: boolean;
		/** パフォーマンス最適化を有効にするかどうか */
		optimized?: boolean;
	}

	let {
		viewport,
		gridSize = 20,
		gridColor = '#ccc',
		gridOpacity = 0.5,
		majorGridInterval = 5,
		majorGridColor = '#999',
		majorGridOpacity = 0.7,
		visible = true,
		optimized = true
	}: Props = $props();

	let gridElement = $state<HTMLElement>();
	let canvasElement = $state<HTMLCanvasElement>();
	let ctx: CanvasRenderingContext2D | null = null;
	let animationFrameId: number | null = null;

	// ズームレベルに基づく動的グリッドサイズの計算
	const adaptiveGridSize = $derived(() => {
		if (!optimized) return gridSize;

		const zoom = viewport.zoom;

		// ズームレベルに応じてグリッドサイズを調整
		if (zoom < 0.25) {
			return gridSize * 8; // 非常に小さいズームでは大きなグリッド
		} else if (zoom < 0.5) {
			return gridSize * 4; // 小さいズームでは中程度のグリッド
		} else if (zoom < 1.0) {
			return gridSize * 2; // 中程度のズームでは少し大きなグリッド
		} else if (zoom > 2.0) {
			return gridSize / 2; // 大きなズームでは小さなグリッド
		}

		return gridSize; // デフォルトサイズ
	});

	// グリッドの可視性判定
	const shouldShowGrid = $derived(() => {
		if (!visible) return false;

		// 非常に小さなズームレベルではグリッドを非表示
		if (viewport.zoom < 0.1) return false;

		// 非常に大きなズームレベルでもグリッドを非表示
		if (viewport.zoom > 5.0) return false;

		return true;
	});

	// 大きなグリッドの可視性判定
	const shouldShowMajorGrid = $derived(() => {
		if (!shouldShowGrid()) return false;

		// 中程度以上のズームレベルでのみ大きなグリッドを表示
		return viewport.zoom >= 0.5;
	});

	// CSS背景パターンの生成（軽量版）
	const backgroundPattern = $derived(() => {
		if (!shouldShowGrid()) return 'none';

		const size = adaptiveGridSize() * viewport.zoom;
		const offsetX = viewport.x % size;
		const offsetY = viewport.y % size;

		// 基本グリッド
		let pattern = `radial-gradient(circle, ${gridColor} 1px, transparent 1px)`;

		// 大きなグリッドを追加
		if (shouldShowMajorGrid()) {
			const majorSize = size * majorGridInterval;
			const majorOffsetX = viewport.x % majorSize;
			const majorOffsetY = viewport.y % majorSize;

			pattern += `, radial-gradient(circle, ${majorGridColor} 1.5px, transparent 1.5px)`;
		}

		return pattern;
	});

	const backgroundSize = $derived(() => {
		if (!shouldShowGrid()) return '0 0';

		const size = adaptiveGridSize() * viewport.zoom;
		let sizeStr = `${size}px ${size}px`;

		if (shouldShowMajorGrid()) {
			const majorSize = size * majorGridInterval;
			sizeStr += `, ${majorSize}px ${majorSize}px`;
		}

		return sizeStr;
	});

	const backgroundPosition = $derived(() => {
		if (!shouldShowGrid()) return '0 0';

		const size = adaptiveGridSize() * viewport.zoom;
		const offsetX = viewport.x % size;
		const offsetY = viewport.y % size;

		let positionStr = `${offsetX}px ${offsetY}px`;

		if (shouldShowMajorGrid()) {
			const majorSize = size * majorGridInterval;
			const majorOffsetX = viewport.x % majorSize;
			const majorOffsetY = viewport.y % majorSize;

			positionStr += `, ${majorOffsetX}px ${majorOffsetY}px`;
		}

		return positionStr;
	});

	// Canvas描画版（高性能版、必要に応じて使用）
	const drawCanvasGrid = () => {
		if (!ctx || !canvasElement || !shouldShowGrid()) return;

		const rect = canvasElement.getBoundingClientRect();
		const width = rect.width;
		const height = rect.height;

		// Canvas サイズを設定
		canvasElement.width = width * window.devicePixelRatio;
		canvasElement.height = height * window.devicePixelRatio;
		ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

		// クリア
		ctx.clearRect(0, 0, width, height);

		const size = adaptiveGridSize() * viewport.zoom;
		const startX = viewport.x % size;
		const startY = viewport.y % size;

		// 基本グリッドを描画
		ctx.fillStyle = gridColor;
		ctx.globalAlpha = gridOpacity;

		for (let x = startX; x < width; x += size) {
			for (let y = startY; y < height; y += size) {
				ctx.beginPath();
				ctx.arc(x, y, 1, 0, 2 * Math.PI);
				ctx.fill();
			}
		}

		// 大きなグリッドを描画
		if (shouldShowMajorGrid()) {
			const majorSize = size * majorGridInterval;
			const majorStartX = viewport.x % majorSize;
			const majorStartY = viewport.y % majorSize;

			ctx.fillStyle = majorGridColor;
			ctx.globalAlpha = majorGridOpacity;

			for (let x = majorStartX; x < width; x += majorSize) {
				for (let y = majorStartY; y < height; y += majorSize) {
					ctx.beginPath();
					ctx.arc(x, y, 1.5, 0, 2 * Math.PI);
					ctx.fill();
				}
			}
		}

		ctx.globalAlpha = 1.0;
	};

	// パフォーマンス最適化：requestAnimationFrameを使用した描画
	const scheduleRedraw = () => {
		if (animationFrameId) {
			cancelAnimationFrame(animationFrameId);
		}

		animationFrameId = requestAnimationFrame(() => {
			if (optimized && ctx) {
				drawCanvasGrid();
			}
		});
	};

	// ビューポート変更時の再描画
	$effect(() => {
		// ビューポートの変更を監視
		viewport.x;
		viewport.y;
		viewport.zoom;

		if (optimized && ctx) {
			scheduleRedraw();
		}
	});

	// Canvas要素の初期化エフェクト
	$effect(() => {
		if (optimized && canvasElement) {
			ctx = canvasElement.getContext('2d');
			if (ctx) {
				scheduleRedraw();
			}
		}

		// クリーンアップ
		return () => {
			if (animationFrameId) {
				cancelAnimationFrame(animationFrameId);
			}
		};
	});

	// リサイズハンドラー
	const handleResize = () => {
		if (optimized && ctx) {
			scheduleRedraw();
		}
	};

	// ウィンドウリサイズイベントの監視
	$effect(() => {
		if (optimized) {
			window.addEventListener('resize', handleResize);
			return () => window.removeEventListener('resize', handleResize);
		}
	});
</script>

<!-- CSS背景版（デフォルト、軽量） -->
{#if !optimized}
	<div
		bind:this={gridElement}
		class="canvas-grid"
		class:visible={shouldShowGrid()}
		style:background-image={backgroundPattern()}
		style:background-size={backgroundSize()}
		style:background-position={backgroundPosition()}
		style:opacity={gridOpacity}
	></div>
{/if}

<!-- Canvas版（最適化有効時） -->
{#if optimized}
	<canvas
		bind:this={canvasElement}
		class="canvas-grid canvas-grid--canvas"
		class:visible={shouldShowGrid()}
	></canvas>
{/if}

<style>
	.canvas-grid {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		z-index: 0;
		opacity: 0;
		transition: opacity 0.2s ease;
	}

	.canvas-grid.visible {
		opacity: 0;
	}

	.canvas-grid--canvas {
		background: transparent;
	}

	/* パフォーマンス最適化のためのCSS */
	.canvas-grid {
		will-change: background-position, opacity;
		transform: translateZ(0); /* ハードウェアアクセラレーションを有効化 */
	}

	.canvas-grid--canvas {
		will-change: transform, opacity;
	}

	/* 高DPI画面での最適化 */
	@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
		.canvas-grid--canvas {
			image-rendering: -webkit-optimize-contrast;
			image-rendering: crisp-edges;
		}
	}

	/* アクセシビリティ：動きを減らす設定に対応 */
	@media (prefers-reduced-motion: reduce) {
		.canvas-grid {
			transition: none;
		}
	}
</style>
