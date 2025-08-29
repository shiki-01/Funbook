<!--
  BlockConnection.example.svelte
  BlockConnectionコンポーネントの使用例
  接続ポイントの表示と操作のデモンストレーション
-->
<script lang="ts">
	import BlockConnection from './BlockConnection.svelte';
	import type { Block, Position } from '$lib/types/domain';
	import { BlockPathType, Connection } from '$lib/types/core';

	// サンプルブロックデータ
	const sampleBlocks: Block[] = [
		{
			id: 'example-block-1',
			name: 'Start Block',
			title: 'Start',
			type: BlockPathType.Flag,
			connection: Connection.Output,
			position: { x: 50, y: 50 },
			size: { width: 150, height: 60 },
			zIndex: 1,
			visibility: true,
			draggable: true,
			editable: true,
			deletable: true,
			output: 'start',
			content: [],
			version: '1.0.0'
		},
		{
			id: 'example-block-2',
			name: 'Process Block',
			title: 'Process Data',
			type: BlockPathType.Works,
			connection: Connection.Both,
			position: { x: 250, y: 100 },
			size: { width: 180, height: 60 },
			zIndex: 1,
			visibility: true,
			draggable: true,
			editable: true,
			deletable: true,
			output: 'process',
			content: [],
			version: '1.0.0'
		},
		{
			id: 'example-block-3',
			name: 'Loop Block',
			title: 'For Each Item',
			type: BlockPathType.Loop,
			connection: Connection.Both,
			position: { x: 480, y: 150 },
			size: { width: 200, height: 80 },
			zIndex: 1,
			visibility: true,
			draggable: true,
			editable: true,
			deletable: true,
			output: 'loop',
			content: [],
			version: '1.0.0'
		},
		{
			id: 'example-block-4',
			name: 'Value Block',
			title: 'Input Value',
			type: BlockPathType.Value,
			connection: Connection.Input,
			position: { x: 100, y: 250 },
			size: { width: 120, height: 40 },
			zIndex: 1,
			visibility: true,
			draggable: true,
			editable: true,
			deletable: true,
			output: 'value',
			content: [],
			version: '1.0.0'
		}
	];

	// 接続状態の管理
	let connectionStates = new Map([
		[
			'example-block-1',
			{
				hasInputConnection: false,
				hasOutputConnection: true,
				hasLoopConnection: false,
				outputConnectedTo: ['example-block-2'],
				isConnecting: false
			}
		],
		[
			'example-block-2',
			{
				hasInputConnection: true,
				hasOutputConnection: true,
				hasLoopConnection: false,
				inputConnectedTo: 'example-block-1',
				outputConnectedTo: ['example-block-3'],
				isConnecting: false
			}
		],
		[
			'example-block-3',
			{
				hasInputConnection: true,
				hasOutputConnection: false,
				hasLoopConnection: true,
				inputConnectedTo: 'example-block-2',
				loopConnectedTo: ['example-block-4'],
				isConnecting: false
			}
		],
		[
			'example-block-4',
			{
				hasInputConnection: true,
				hasOutputConnection: false,
				hasLoopConnection: false,
				inputConnectedTo: 'example-block-3',
				isConnecting: false
			}
		]
	]);

	// ハイライト状態の管理
	let highlightedBlocks = new Set<string>();
	let dragTargetBlocks = new Set<string>();
	let connectingBlock: string | null = null;

	// 接続プレビューの管理
	let connectionPreview: {
		blockId: string;
		type: 'input' | 'output' | 'loop';
		targetPosition: Position;
	} | null = null;

	/**
	 * 接続ポイントホバーハンドラー
	 */
	const handleConnectionHover = (
		blockId: string,
		connectionType: 'input' | 'output' | 'loop',
		isEntering: boolean
	) => {
		console.log(
			`Connection hover: ${blockId} (${connectionType}) - ${isEntering ? 'enter' : 'leave'}`
		);

		if (isEntering) {
			highlightedBlocks.add(blockId);
		} else {
			highlightedBlocks.delete(blockId);
		}

		// リアクティブ更新をトリガー
		highlightedBlocks = new Set(highlightedBlocks);
	};

	/**
	 * 接続ポイントクリックハンドラー
	 */
	const handleConnectionClick = (blockId: string, connectionType: 'input' | 'output' | 'loop') => {
		console.log(`Connection click: ${blockId} (${connectionType})`);

		if (connectingBlock === blockId) {
			// 接続モードを終了
			connectingBlock = null;
			connectionPreview = null;

			// 接続状態を更新
			const currentState = connectionStates.get(blockId);
			if (currentState) {
				connectionStates.set(blockId, {
					...currentState,
					isConnecting: false
				});
			}
		} else {
			// 接続モードを開始
			connectingBlock = blockId;

			// 接続状態を更新
			const currentState = connectionStates.get(blockId);
			if (currentState) {
				connectionStates.set(blockId, {
					...currentState,
					isConnecting: true
				});
			}

			// プレビューラインを設定（デモ用）
			connectionPreview = {
				blockId,
				type: connectionType,
				targetPosition: { x: 400, y: 300 }
			};
		}

		// リアクティブ更新をトリガー
		connectionStates = new Map(connectionStates);
	};

	/**
	 * ドラッグターゲット状態の切り替え
	 */
	const toggleDragTarget = (blockId: string) => {
		if (dragTargetBlocks.has(blockId)) {
			dragTargetBlocks.delete(blockId);
		} else {
			dragTargetBlocks.add(blockId);
		}
		dragTargetBlocks = new Set(dragTargetBlocks);
	};

	/**
	 * 接続状態のリセット
	 */
	const resetConnections = () => {
		highlightedBlocks.clear();
		dragTargetBlocks.clear();
		connectingBlock = null;
		connectionPreview = null;

		// すべての接続状態をリセット
		for (const [blockId, state] of connectionStates) {
			connectionStates.set(blockId, {
				...state,
				isConnecting: false
			});
		}

		// リアクティブ更新をトリガー
		highlightedBlocks = new Set(highlightedBlocks);
		dragTargetBlocks = new Set(dragTargetBlocks);
		connectionStates = new Map(connectionStates);
	};
</script>

<div class="example-container">
	<div class="example-header">
		<h2>BlockConnection Component Example</h2>
		<p>
			接続ポイントをクリックして接続モードを切り替えたり、ホバーしてハイライト効果を確認できます。
		</p>

		<div class="controls">
			<button onclick={() => resetConnections()}> Reset All Connections </button>

			<div class="status">
				{#if connectingBlock}
					<span class="connecting">Connecting: {connectingBlock}</span>
				{:else}
					<span class="idle">Ready</span>
				{/if}
			</div>
		</div>
	</div>

	<div class="canvas-area">
		{#each sampleBlocks as block (block.id)}
			{@const connectionState = connectionStates.get(block.id)}
			{@const isHighlighted = highlightedBlocks.has(block.id)}
			{@const isDragTarget = dragTargetBlocks.has(block.id)}
			{@const hasPreview = connectionPreview?.blockId === block.id}

			<div class="block-wrapper" style:left="{block.position.x}px" style:top="{block.position.y}px">
				<!-- ブロックの背景表示（簡易版） -->
				<div
					class="block-background"
					class:highlighted={isHighlighted}
					class:drag-target={isDragTarget}
					class:connecting={connectionState?.isConnecting}
					style:width="{block.size?.width || 150}px"
					style:height="{block.size?.height || 60}px"
				>
					<span class="block-title">{block.title}</span>
					<span class="block-type">{block.type}</span>
				</div>

				<!-- BlockConnectionコンポーネント -->
				<BlockConnection
					{block}
					connectionState={connectionState
						? {
								...connectionState,
								connectionPreview:
									hasPreview && connectionPreview
										? {
												type: connectionPreview.type,
												targetPosition: connectionPreview.targetPosition
											}
										: undefined
							}
						: undefined}
					{isHighlighted}
					{isDragTarget}
					onConnectionHover={handleConnectionHover}
					onConnectionClick={handleConnectionClick}
				/>

				<!-- ドラッグターゲット切り替えボタン -->
				<button
					class="drag-target-toggle"
					onclick={() => toggleDragTarget(block.id)}
					title="Toggle drag target state"
				>
					{isDragTarget ? '🎯' : '⭕'}
				</button>
			</div>
		{/each}
	</div>

	<div class="example-info">
		<h3>Features Demonstrated:</h3>
		<ul>
			<li>
				<strong>Connection Points:</strong> Input, Output, and Loop connection points based on block
				type
			</li>
			<li>
				<strong>Visual States:</strong> Connected, highlighted, drag target, and connecting states
			</li>
			<li>
				<strong>Tooltips:</strong> Hover over connected points to see connection information
			</li>
			<li>
				<strong>Interaction:</strong> Click connection points to toggle connecting mode
			</li>
			<li>
				<strong>Preview Lines:</strong> SVG preview lines when in connecting mode
			</li>
			<li>
				<strong>Accessibility:</strong> Keyboard navigation and ARIA labels
			</li>
		</ul>

		<h3>Connection States:</h3>
		<div class="connection-info">
			{#each sampleBlocks as block}
				{@const state = connectionStates.get(block.id)}
				<div class="block-info">
					<strong>{block.title}:</strong>
					{#if state?.inputConnectedTo}
						<span class="connection">Input ← {state.inputConnectedTo}</span>
					{/if}
					{#if state?.outputConnectedTo && state.outputConnectedTo.length > 0}
						<span class="connection">Output → {state.outputConnectedTo.join(', ')}</span>
					{/if}
					{#if state?.loopConnectedTo && state.loopConnectedTo.length > 0}
						<span class="connection">Loop ⟲ {state.loopConnectedTo.length} blocks</span>
					{/if}
				</div>
			{/each}
		</div>
	</div>
</div>

<style>
	.example-container {
		padding: 20px;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	}

	.example-header {
		margin-bottom: 30px;
	}

	.example-header h2 {
		color: #333;
		margin-bottom: 10px;
	}

	.example-header p {
		color: #666;
		margin-bottom: 20px;
	}

	.controls {
		display: flex;
		align-items: center;
		gap: 20px;
		margin-bottom: 20px;
	}

	.controls button {
		padding: 8px 16px;
		background: #5a8dee;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 14px;
	}

	.controls button:hover {
		background: #4a7bd8;
	}

	.status .connecting {
		color: #ff6b6b;
		font-weight: bold;
	}

	.status .idle {
		color: #4caf50;
	}

	.canvas-area {
		position: relative;
		width: 800px;
		height: 400px;
		background: #f8f9fa;
		border: 2px solid #e9ecef;
		border-radius: 8px;
		margin-bottom: 30px;
		overflow: hidden;
	}

	.block-wrapper {
		position: absolute;
	}

	.block-background {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background: #fff;
		border: 2px solid #ddd;
		border-radius: 8px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		transition: all 0.2s ease;
		padding: 8px;
	}

	.block-background.highlighted {
		border-color: #5a8dee;
		box-shadow: 0 0 0 2px rgba(90, 141, 238, 0.3);
	}

	.block-background.drag-target {
		border-color: #ff9800;
		background: rgba(255, 152, 0, 0.1);
	}

	.block-background.connecting {
		border-color: #2196f3;
		background: rgba(33, 150, 243, 0.1);
	}

	.block-title {
		font-weight: bold;
		font-size: 14px;
		color: #333;
	}

	.block-type {
		font-size: 12px;
		color: #666;
		margin-top: 4px;
	}

	.drag-target-toggle {
		position: absolute;
		top: -10px;
		right: -10px;
		width: 24px;
		height: 24px;
		border: none;
		border-radius: 50%;
		background: #fff;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
		cursor: pointer;
		font-size: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.drag-target-toggle:hover {
		transform: scale(1.1);
	}

	.example-info {
		background: #f8f9fa;
		padding: 20px;
		border-radius: 8px;
		border: 1px solid #e9ecef;
	}

	.example-info h3 {
		color: #333;
		margin-bottom: 15px;
	}

	.example-info ul {
		margin-bottom: 20px;
	}

	.example-info li {
		margin-bottom: 8px;
		color: #555;
	}

	.connection-info {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 10px;
	}

	.block-info {
		padding: 10px;
		background: white;
		border-radius: 4px;
		border: 1px solid #ddd;
	}

	.connection {
		display: block;
		font-size: 12px;
		color: #666;
		margin-top: 4px;
	}
</style>
