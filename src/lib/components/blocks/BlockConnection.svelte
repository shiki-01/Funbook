<!--
  BlockConnection.svelte
  接続ポイントの可視化とインタラクションを担当するコンポーネント
  ブロック間の接続状態を視覚的に表現し、接続操作をサポート
-->
<script lang="ts">
	import type { Block, Position } from '$lib/types/domain';
	import { BlockPathType, Connection } from '$lib/types/core';
	import { LAYOUT_CONSTANTS } from '$lib/utils/constants';

	/**
	 * BlockConnection props interface
	 * @param block - 接続ポイントを表示するブロック
	 * @param connectionState - 接続の状態情報
	 * @param isHighlighted - 接続ポイントがハイライトされているか
	 * @param isDragTarget - ドラッグターゲットとして有効か
	 * @param onConnectionHover - 接続ポイントホバー時のコールバック
	 * @param onConnectionClick - 接続ポイントクリック時のコールバック
	 */
	interface Props {
		block: Block;
		connectionState?: ConnectionState;
		isHighlighted?: boolean;
		isDragTarget?: boolean;
		onConnectionHover?: (
			blockId: string,
			connectionType: ConnectionType,
			isEntering: boolean
		) => void;
		onConnectionClick?: (blockId: string, connectionType: ConnectionType) => void;
	}

	/**
	 * 接続状態の情報
	 */
	interface ConnectionState {
		hasInputConnection: boolean;
		hasOutputConnection: boolean;
		hasLoopConnection: boolean;
		inputConnectedTo?: string;
		outputConnectedTo?: string[];
		loopConnectedTo?: string[];
		isConnecting: boolean;
		connectionPreview?: {
			type: ConnectionType;
			targetPosition: Position;
		};
	}

	/**
	 * 接続タイプ
	 */
	type ConnectionType = 'input' | 'output' | 'loop';

	let {
		block,
		connectionState = {
			hasInputConnection: false,
			hasOutputConnection: false,
			hasLoopConnection: false,
			isConnecting: false
		},
		isHighlighted = false,
		isDragTarget = false,
		onConnectionHover,
		onConnectionClick
	}: Props = $props();

	/**
	 * 入力接続ポイントを表示するかどうか
	 */
	const showInputConnection = $derived(() => {
		return block.connection === Connection.Both || block.connection === Connection.Input;
	});

	/**
	 * 出力接続ポイントを表示するかどうか
	 */
	const showOutputConnection = $derived(() => {
		return (
			(block.connection === Connection.Both || block.connection === Connection.Output) &&
			block.type !== BlockPathType.Value
		);
	});

	/**
	 * ループ接続ポイントを表示するかどうか
	 */
	const showLoopConnection = $derived(() => {
		return block.type === BlockPathType.Loop;
	});

	/**
	 * 入力接続ポイントのスタイルクラス
	 */
	const inputConnectionClass = $derived(() => {
		const classes = ['connection-point', 'connection-input'];
		if (connectionState.hasInputConnection) classes.push('connected');
		if (isHighlighted) classes.push('highlighted');
		if (isDragTarget) classes.push('drag-target');
		if (connectionState.isConnecting) classes.push('connecting');
		return classes.join(' ');
	});

	/**
	 * 出力接続ポイントのスタイルクラス
	 */
	const outputConnectionClass = $derived(() => {
		const classes = ['connection-point', 'connection-output'];
		if (connectionState.hasOutputConnection) classes.push('connected');
		if (isHighlighted) classes.push('highlighted');
		if (isDragTarget) classes.push('drag-target');
		if (connectionState.isConnecting) classes.push('connecting');
		return classes.join(' ');
	});

	/**
	 * ループ接続ポイントのスタイルクラス
	 */
	const loopConnectionClass = $derived(() => {
		const classes = ['connection-point', 'connection-loop'];
		if (connectionState.hasLoopConnection) classes.push('connected');
		if (isHighlighted) classes.push('highlighted');
		if (isDragTarget) classes.push('drag-target');
		if (connectionState.isConnecting) classes.push('connecting');
		return classes.join(' ');
	});

	/**
	 * 接続ポイントのホバーハンドラー
	 * @param connectionType - 接続タイプ
	 * @param isEntering - マウスが入っているかどうか
	 */
	const handleConnectionHover = (connectionType: ConnectionType, isEntering: boolean) => {
		onConnectionHover?.(block.id, connectionType, isEntering);
	};

	/**
	 * 接続ポイントのクリックハンドラー
	 * @param connectionType - 接続タイプ
	 */
	const handleConnectionClick = (connectionType: ConnectionType) => {
		onConnectionClick?.(block.id, connectionType);
	};

	/**
	 * 接続プレビューラインのパスを計算
	 */
	const connectionPreviewPath = $derived(() => {
		if (!connectionState.connectionPreview) return '';

		const preview = connectionState.connectionPreview;
		const startPos = getConnectionPosition(preview.type);
		const endPos = preview.targetPosition;

		// ベジェ曲線で接続線を描画
		const controlPoint1 = {
			x: startPos.x + (endPos.x - startPos.x) * 0.5,
			y: startPos.y
		};
		const controlPoint2 = {
			x: startPos.x + (endPos.x - startPos.x) * 0.5,
			y: endPos.y
		};

		return `M ${startPos.x} ${startPos.y} C ${controlPoint1.x} ${controlPoint1.y}, ${controlPoint2.x} ${controlPoint2.y}, ${endPos.x} ${endPos.y}`;
	});

	/**
	 * 指定された接続タイプの位置を取得
	 * @param connectionType - 接続タイプ
	 * @returns 接続ポイントの位置
	 */
	const getConnectionPosition = (connectionType: ConnectionType): Position => {
		switch (connectionType) {
			case 'input':
				return { x: block.position.x + 8 + 20, y: block.position.y + 5 };
			case 'output':
				return {
					x: block.position.x + 8 + 20,
					y: block.position.y + (block.size?.height || 60) - 10
				};
			case 'loop':
				return { x: block.position.x + 16 + 20, y: block.position.y + 52 };
			default:
				return { x: 0, y: 0 };
		}
	};
</script>

<!-- 接続ポイントコンテナ -->
<div class="block-connections" data-block-id={block.id}>
	<!-- 入力接続ポイント -->
	{#if showInputConnection()}
		<div
			class={inputConnectionClass()}
			data-input-id={block.id}
			role="button"
			tabindex="0"
			aria-label="Input connection point for {block.title}"
			onmouseenter={() => handleConnectionHover('input', true)}
			onmouseleave={() => handleConnectionHover('input', false)}
			onclick={() => handleConnectionClick('input')}
			onkeydown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					handleConnectionClick('input');
				}
			}}
		>
			<div class="connection-indicator">
				<div class="connection-dot"></div>
				{#if connectionState.hasInputConnection}
					<div class="connection-line input-line"></div>
				{/if}
			</div>

			<!-- 接続状態のツールチップ -->
			{#if connectionState.inputConnectedTo}
				<div class="connection-tooltip">
					Connected to: {connectionState.inputConnectedTo}
				</div>
			{/if}
		</div>
	{/if}

	<!-- 出力接続ポイント -->
	{#if showOutputConnection()}
		<div
			class={outputConnectionClass()}
			data-output-id={block.id}
			role="button"
			tabindex="0"
			aria-label="Output connection point for {block.title}"
			onmouseenter={() => handleConnectionHover('output', true)}
			onmouseleave={() => handleConnectionHover('output', false)}
			onclick={() => handleConnectionClick('output')}
			onkeydown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					handleConnectionClick('output');
				}
			}}
		>
			<div class="connection-indicator">
				<div class="connection-dot"></div>
				{#if connectionState.hasOutputConnection}
					<div class="connection-line output-line"></div>
				{/if}
			</div>

			<!-- 接続状態のツールチップ -->
			{#if connectionState.outputConnectedTo && connectionState.outputConnectedTo.length > 0}
				<div class="connection-tooltip">
					Connected to: {connectionState.outputConnectedTo.join(', ')}
				</div>
			{/if}
		</div>
	{/if}

	<!-- ループ接続ポイント -->
	{#if showLoopConnection()}
		<div
			class={loopConnectionClass()}
			data-loop-id={block.id}
			role="button"
			tabindex="0"
			aria-label="Loop connection point for {block.title}"
			onmouseenter={() => handleConnectionHover('loop', true)}
			onmouseleave={() => handleConnectionHover('loop', false)}
			onclick={() => handleConnectionClick('loop')}
			onkeydown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					handleConnectionClick('loop');
				}
			}}
		>
			<div class="connection-indicator">
				<div class="connection-dot loop-dot"></div>
				{#if connectionState.hasLoopConnection}
					<div class="connection-line loop-line"></div>
				{/if}
			</div>

			<!-- 接続状態のツールチップ -->
			{#if connectionState.loopConnectedTo && connectionState.loopConnectedTo.length > 0}
				<div class="connection-tooltip">
					Loop contains: {connectionState.loopConnectedTo.length} blocks
				</div>
			{/if}
		</div>
	{/if}

	<!-- 接続プレビューライン -->
	{#if connectionState.connectionPreview}
		<svg
			class="connection-preview"
			style="position: absolute; top: 0; left: 0; pointer-events: none; z-index: 1000;"
		>
			<path
				d={connectionPreviewPath()}
				stroke="#5A8DEE"
				stroke-width="2"
				fill="none"
				stroke-dasharray="5,5"
				opacity="0.8"
			/>
		</svg>
	{/if}
</div>

<style>
	.block-connections {
		position: relative;
		pointer-events: none;
	}

	.connection-point {
		position: absolute;
		width: 40px;
		height: 20px;
		z-index: 10;
		pointer-events: auto;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s ease;
	}

	.connection-point:focus {
		outline: 2px solid #5a8dee;
		outline-offset: 2px;
	}

	.connection-input {
		top: 5px;
		left: 8px;
		transform: translateY(-50%);
	}

	.connection-output {
		bottom: -10px;
		left: 8px;
		transform: translateY(-50%);
	}

	.connection-loop {
		top: 52px;
		left: 16px;
		transform: translateY(-50%);
	}

	.connection-indicator {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.connection-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.7);
		border: 2px solid rgba(255, 255, 255, 0.9);
		transition: all 0.2s ease;
		position: relative;
		z-index: 2;
	}

	.connection-dot.loop-dot {
		width: 10px;
		height: 10px;
		background: rgba(255, 215, 0, 0.7);
		border-color: rgba(255, 215, 0, 0.9);
	}

	.connection-line {
		position: absolute;
		background: rgba(90, 141, 238, 0.6);
		z-index: 1;
	}

	.input-line {
		width: 2px;
		height: 15px;
		top: -15px;
		left: 50%;
		transform: translateX(-50%);
	}

	.output-line {
		width: 2px;
		height: 15px;
		bottom: -15px;
		left: 50%;
		transform: translateX(-50%);
	}

	.loop-line {
		width: 15px;
		height: 2px;
		right: -15px;
		top: 50%;
		transform: translateY(-50%);
	}

	/* ホバー状態 */
	.connection-point:hover .connection-dot,
	.connection-point.highlighted .connection-dot {
		background: rgba(90, 141, 238, 0.9);
		border-color: #5a8dee;
		transform: scale(1.2);
	}

	.connection-point:hover .connection-line,
	.connection-point.highlighted .connection-line {
		background: #5a8dee;
		opacity: 1;
	}

	/* 接続済み状態 */
	.connection-point.connected .connection-dot {
		background: #4caf50;
		border-color: #45a049;
	}

	.connection-point.connected .connection-line {
		background: #4caf50;
		opacity: 1;
	}

	/* ドラッグターゲット状態 */
	.connection-point.drag-target {
		animation: pulse 1s infinite;
	}

	.connection-point.drag-target .connection-dot {
		background: #ff9800;
		border-color: #f57c00;
		transform: scale(1.3);
	}

	/* 接続中状態 */
	.connection-point.connecting .connection-dot {
		background: #2196f3;
		border-color: #1976d2;
		animation: connecting-pulse 0.8s infinite;
	}

	/* ツールチップ */
	.connection-tooltip {
		position: absolute;
		bottom: 100%;
		left: 50%;
		transform: translateX(-50%);
		background: rgba(0, 0, 0, 0.8);
		color: white;
		padding: 4px 8px;
		border-radius: 4px;
		font-size: 12px;
		white-space: nowrap;
		opacity: 0;
		pointer-events: none;
		transition: opacity 0.2s ease;
		z-index: 1000;
	}

	.connection-point:hover .connection-tooltip {
		opacity: 1;
	}

	.connection-tooltip::after {
		content: '';
		position: absolute;
		top: 100%;
		left: 50%;
		transform: translateX(-50%);
		border: 4px solid transparent;
		border-top-color: rgba(0, 0, 0, 0.8);
	}

	/* 接続プレビュー */
	.connection-preview {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		pointer-events: none;
		z-index: 1000;
	}

	/* アニメーション */
	@keyframes pulse {
		0% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.1);
		}
		100% {
			transform: scale(1);
		}
	}

	@keyframes connecting-pulse {
		0% {
			opacity: 1;
			transform: scale(1);
		}
		50% {
			opacity: 0.7;
			transform: scale(1.2);
		}
		100% {
			opacity: 1;
			transform: scale(1);
		}
	}

	/* レスポンシブ対応 */
	@media (max-width: 768px) {
		.connection-point {
			width: 44px;
			height: 24px;
		}

		.connection-dot {
			width: 10px;
			height: 10px;
		}

		.connection-tooltip {
			font-size: 11px;
			padding: 3px 6px;
		}
	}

	/* アクセシビリティ */
	@media (prefers-reduced-motion: reduce) {
		.connection-point,
		.connection-dot,
		.connection-line {
			transition: none;
		}

		.connection-point.drag-target,
		.connection-point.connecting .connection-dot {
			animation: none;
		}
	}

	/* ハイコントラストモード */
	@media (prefers-contrast: high) {
		.connection-dot {
			border-width: 3px;
		}

		.connection-line {
			opacity: 1;
		}

		.connection-tooltip {
			background: black;
			border: 1px solid white;
		}
	}
</style>
