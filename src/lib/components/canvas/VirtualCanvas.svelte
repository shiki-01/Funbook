<!--
  VirtualCanvas.svelte
  仮想スクロール機能を持つキャンバスコンポーネント
  
  @remarks
  大きなブロックコレクションのパフォーマンス最適化のため、
  ビューポートベースのブロックレンダリングを実装します。
-->

<script lang="ts">
	import type { Position } from '$lib/types';
	import { useCanvasStore } from '$lib/stores/canvas.store.svelte';
	import { useBlockStore } from '$lib/stores/block.store.svelte';
	import { VirtualScrollService } from '$lib/services/canvas/VirtualScrollService';
	import BlockComponent from '../Block.svelte';
	import { untrack } from 'svelte';
	import CanvasGrid from './CanvasGrid.svelte';
	import { useDragService } from '$lib/services';

	/**
	 * VirtualCanvas コンポーネントのプロパティ
	 */
	interface Props {
		/** キャンバスのサイズ */
		canvasSize: { width: number; height: number };
		/** コンテナのサイズ */
		containerSize: { width: number; height: number };
		/** ドラッグ開始時のコールバック */
		onDragStart?: (id: string, offset: Position) => void;
		/** 仮想スクロールを有効にするかどうか */
		enableVirtualScroll?: boolean;
		/** パフォーマンス監視を表示するかどうか */
		showPerformanceStats?: boolean;
		/** デバッグモードを有効にするかどうか */
		debugMode?: boolean;
	}

	let {
		canvasSize,
		containerSize,
		onDragStart,
		enableVirtualScroll = true,
		showPerformanceStats = false,
		debugMode = false
	}: Props = $props();

	// サービスとストア
	const canvasStore = useCanvasStore();
	const blockStore = useBlockStore();
	const dragService = useDragService();
	const virtualScrollService = new VirtualScrollService({
		margin: 200,
		defaultBlockWidth: 200,
		defaultBlockHeight: 60,
		enablePerformanceMonitoring: true
	});

	// 状態
	const viewport = $derived(() => canvasStore.getViewport());

	// ドラッグ中のブロック
	const draggingBlock = $derived(() => {
		const dragging = dragService.getDragState();
		return dragging.blockId ? blockStore.getBlock(dragging.blockId) : null;
	});

	// 可視ブロックの計算
	const visibleBlocks = $derived(() => {
		const allBlocks = blockStore.getAllBlocks();

		if (!enableVirtualScroll) {
			// 仮想スクロールが無効の場合は、ドラッグ中でないブロックをすべて返す
			return allBlocks.filter((block) => dragService.getDragState().blockId !== block.id);
		}

		// 仮想スクロールが有効の場合は、可視ブロックのみを計算
		const visibleDomainBlocks = virtualScrollService.calculateVisibleBlocks(
			allBlocks,
			viewport(),
			containerSize
		);

		// 可視なドメインブロックのIDを使って、対応するブロックを取得
		const visibleBlockIds = new Set(visibleDomainBlocks.map((b) => b.id));
		return allBlocks.filter(
			(block) => visibleBlockIds.has(block.id) && dragService.getDragState().blockId !== block.id
		);
	});

	// パフォーマンス統計の計算
	const performanceStats = $derived(() => {
		if (!enableVirtualScroll) {
			return {
				totalBlocks: 0,
				visibleBlocks: 0,
				culledBlocks: 0,
				calculationTime: 0,
				cullingEfficiency: 0
			};
		}

		const startTime = performance.now();
		const allBlocks = blockStore.getAllBlocks();

		// 仮想スクロールサービスで可視ブロックを計算（統計のため）
		virtualScrollService.calculateVisibleBlocks(allBlocks, viewport(), containerSize);

		const endTime = performance.now();
		const stats = virtualScrollService.getPerformanceStats();

		return {
			totalBlocks: stats.totalBlocks,
			visibleBlocks: stats.visibleBlocks,
			culledBlocks: stats.culledBlocks,
			calculationTime: endTime - startTime,
			cullingEfficiency: stats.cullingEfficiency
		};
	});

	// デバッグ情報の表示
	const debugInfo = $derived(() => {
		if (!debugMode) return null;

		const allBlocks = blockStore.getAllBlocks();
		const blockVisibility = virtualScrollService.calculateBlockVisibility(
			allBlocks,
			viewport(),
			containerSize
		);
		const fullyVisibleCount = blockVisibility.filter((b) => b.fullyVisible).length;
		const partiallyVisibleCount = blockVisibility.filter(
			(b) => b.partiallyVisible && !b.fullyVisible
		).length;

		return {
			viewport: viewport(),
			containerSize,
			canvasSize,
			blockVisibility: {
				total: blockVisibility.length,
				fullyVisible: fullyVisibleCount,
				partiallyVisible: partiallyVisibleCount,
				hidden: blockVisibility.length - fullyVisibleCount - partiallyVisibleCount
			},
			performanceStats: performanceStats()
		};
	});

	/**
	 * ドラッグ開始ハンドラー
	 * @param id - ブロックID
	 * @param offset - オフセット
	 */
	const handleDragStart = (id: string, offset: Position) => {
		onDragStart?.(id, offset);
	};

	// パフォーマンス統計をキャンバスストアに同期
	// untrackを使用してcanvasStoreの更新による無限ループを防ぐ
	$effect(() => {
		if (enableVirtualScroll) {
			const stats = performanceStats();
			// untrackを使用してcanvasStoreの状態変更を追跡しないようにする
			untrack(() => {
				canvasStore.updateVirtualScrollStats(stats);
			});

			if (process.env.NODE_ENV === 'development') {
				console.debug('Virtual scroll performance:', $state.snapshot(stats));
			}
		}
	});
</script>

<div class="virtual-canvas" style:width="{canvasSize.width}px" style:height="{canvasSize.height}px">
	<!-- グリッド表示 -->
	<CanvasGrid viewport={viewport()} />

	<!-- 可視ブロック -->
	{#each visibleBlocks() as block (block.id)}
		<BlockComponent {block} onDragStart={handleDragStart} />
	{/each}

	<!-- ドラッグ中のブロック -->
	{#if draggingBlock()}
		{@const block = draggingBlock()}
		{#if block}
			<div class="dragging-overlay">
				<BlockComponent {block} onDragStart={handleDragStart} />
			</div>
		{/if}
	{/if}

	<!-- パフォーマンス統計表示 -->
	{#if showPerformanceStats}
		<div class="performance-stats">
			<h4>仮想スクロール統計</h4>
			<div class="stats-grid">
				<div class="stat">
					<span class="label">総ブロック数:</span>
					<span class="value">{performanceStats().totalBlocks}</span>
				</div>
				<div class="stat">
					<span class="label">表示中:</span>
					<span class="value">{performanceStats().visibleBlocks}</span>
				</div>
				<div class="stat">
					<span class="label">カリング済み:</span>
					<span class="value">{performanceStats().culledBlocks}</span>
				</div>
				<div class="stat">
					<span class="label">効率:</span>
					<span class="value">{(performanceStats().cullingEfficiency * 100).toFixed(1)}%</span>
				</div>
				<div class="stat">
					<span class="label">計算時間:</span>
					<span class="value">{performanceStats().calculationTime.toFixed(2)}ms</span>
				</div>
			</div>
		</div>
	{/if}

	<!-- デバッグ情報表示 -->
	{#if debugMode && debugInfo()}
		<div class="debug-info">
			<h4>デバッグ情報</h4>
			<details>
				<summary>ビューポート情報</summary>
				<pre>{JSON.stringify(debugInfo()?.viewport, null, 2)}</pre>
			</details>
			<details>
				<summary>ブロック可視性</summary>
				<pre>{JSON.stringify(debugInfo()?.blockVisibility, null, 2)}</pre>
			</details>
			<details>
				<summary>パフォーマンス</summary>
				<pre>{JSON.stringify(debugInfo()?.performanceStats, null, 2)}</pre>
			</details>
		</div>
	{/if}
</div>

<style>
	.virtual-canvas {
		position: absolute;
		background-size: 20px 20px;
		background-image: radial-gradient(circle, #ccc 1px, transparent 1px);
		background-position: 0 0;
		left: 0;
		top: 0;
	}

	.dragging-overlay {
		position: absolute;
		pointer-events: none;
		z-index: 1;
	}

	.performance-stats {
		position: fixed;
		top: 10px;
		right: 10px;
		background: rgba(255, 255, 255, 0.95);
		border: 1px solid #ddd;
		border-radius: 6px;
		padding: 12px;
		font-size: 12px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		z-index: 1000;
		min-width: 200px;
	}

	.performance-stats h4 {
		margin: 0 0 8px 0;
		font-size: 14px;
		color: #333;
	}

	.stats-grid {
		display: grid;
		gap: 4px;
	}

	.stat {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.stat .label {
		color: #666;
	}

	.stat .value {
		font-weight: bold;
		color: #333;
	}

	.debug-info {
		position: fixed;
		bottom: 10px;
		right: 10px;
		background: rgba(0, 0, 0, 0.9);
		color: white;
		border-radius: 6px;
		padding: 12px;
		font-size: 11px;
		font-family: monospace;
		max-width: 400px;
		max-height: 300px;
		overflow-y: auto;
		z-index: 1000;
	}

	.debug-info h4 {
		margin: 0 0 8px 0;
		font-size: 12px;
		color: #fff;
	}

	.debug-info details {
		margin-bottom: 8px;
	}

	.debug-info summary {
		cursor: pointer;
		color: #ccc;
		margin-bottom: 4px;
	}

	.debug-info summary:hover {
		color: #fff;
	}

	.debug-info pre {
		margin: 0;
		font-size: 10px;
		line-height: 1.3;
		color: #ddd;
		white-space: pre-wrap;
		word-break: break-all;
	}
</style>
