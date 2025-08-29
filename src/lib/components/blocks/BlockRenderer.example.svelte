<!--
  BlockRenderer.example.svelte
  BlockRendererコンポーネントの使用例
-->
<script lang="ts">
	import { BlockRenderer } from './index';
	import { BlockPathType, Connection } from '$lib/types';
	import type { Block } from '$lib/types/domain';

	// サンプルブロックデータ
	const sampleBlocks: Block[] = [
		{
			id: 'works-block-1',
			name: 'Works Block',
			type: BlockPathType.Works,
			title: 'Process Data',
			position: { x: 50, y: 50 },
			zIndex: 1,
			visibility: true,
			connection: Connection.Both,
			draggable: true,
			editable: true,
			deletable: true,
			output: 'processed data',
			content: [
				{
					id: 'text-1',
					type: 'Text',
					data: {
						title: 'Input:'
					}
				},
				{
					id: 'value-1',
					type: 'ContentValue',
					data: {
						title: 'Value',
						value: 'sample data',
						placeholder: 'Enter data'
					}
				}
			]
		},
		{
			id: 'value-block-1',
			name: 'Value Block',
			type: BlockPathType.Value,
			title: 'User Input',
			position: { x: 300, y: 50 },
			zIndex: 1,
			visibility: true,
			connection: Connection.Output,
			draggable: true,
			editable: true,
			deletable: true,
			output: 'user input',
			content: [
				{
					id: 'value-2',
					type: 'ContentValue',
					data: {
						title: '',
						value: 'Hello World',
						placeholder: 'Type here'
					}
				}
			]
		},
		{
			id: 'loop-block-1',
			name: 'Loop Block',
			type: BlockPathType.Loop,
			title: 'Repeat Process',
			position: { x: 50, y: 200 },
			zIndex: 1,
			visibility: true,
			connection: Connection.Both,
			draggable: true,
			editable: true,
			deletable: true,
			output: 'loop result',
			content: [
				{
					id: 'text-2',
					type: 'Text',
					data: {
						title: 'Times:'
					}
				},
				{
					id: 'value-3',
					type: 'ContentValue',
					data: {
						title: 'Count',
						value: '5',
						placeholder: '1'
					}
				}
			]
		},
		{
			id: 'flag-block-1',
			name: 'Flag Block',
			type: BlockPathType.Flag,
			title: 'Output Result',
			position: { x: 300, y: 200 },
			zIndex: 1,
			visibility: true,
			connection: Connection.Input,
			draggable: true,
			editable: true,
			deletable: true,
			output: 'final result',
			content: [
				{
					id: 'text-3',
					type: 'Text',
					data: {
						title: 'Result'
					}
				}
			]
		}
	];

	// ブロックサイズの計算（簡単な例）
	const calculateBlockSize = (block: Block) => {
		const baseWidth = 150;
		const baseHeight = block.type === BlockPathType.Value ? 40 : 60;
		const contentWidth = block.content.length * 50;

		return {
			width: Math.max(baseWidth, contentWidth),
			height: baseHeight
		};
	};
</script>

<div class="example-container">
	<h2>BlockRenderer Examples</h2>

	<div class="blocks-showcase">
		{#each sampleBlocks as block}
			{@const size = calculateBlockSize(block)}
			<div class="block-example">
				<h3>{block.name} ({block.type})</h3>
				<div class="block-wrapper">
					<BlockRenderer
						{block}
						{size}
						position={block.position}
						isDragging={false}
						isFromPalette={true}
					/>
				</div>
			</div>
		{/each}
	</div>

	<div class="dragging-example">
		<h3>Dragging State Example</h3>
		<div class="block-wrapper">
			<BlockRenderer
				block={sampleBlocks[0]}
				size={calculateBlockSize(sampleBlocks[0])}
				position={{ x: 0, y: 0 }}
				isDragging={true}
				isFromPalette={true}
				customStyles={{
					filter: 'drop-shadow(0 8px 16px rgba(90, 141, 238, 0.3))',
					cursor: 'grabbing'
				}}
			/>
		</div>
	</div>

	<div class="loop-example">
		<h3>Loop Block with Children Height</h3>
		<div class="block-wrapper">
			<BlockRenderer
				block={sampleBlocks[2]}
				size={{ width: 200, height: 120 }}
				position={{ x: 0, y: 0 }}
				isFromPalette={true}
				loopChildrenHeight={80}
			/>
		</div>
	</div>
</div>

<style>
	.example-container {
		padding: 20px;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	}

	.blocks-showcase {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 20px;
		margin: 20px 0;
	}

	.block-example {
		border: 1px solid #e0e0e0;
		border-radius: 8px;
		padding: 15px;
		background: #f9f9f9;
	}

	.block-example h3 {
		margin: 0 0 10px 0;
		color: #333;
		font-size: 14px;
	}

	.block-wrapper {
		position: relative;
		min-height: 80px;
		background: white;
		border: 1px dashed #ccc;
		border-radius: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 10px;
	}

	.dragging-example,
	.loop-example {
		margin: 30px 0;
		padding: 20px;
		border: 2px solid #e0e0e0;
		border-radius: 8px;
		background: #f5f5f5;
	}

	.dragging-example h3,
	.loop-example h3 {
		margin: 0 0 15px 0;
		color: #333;
	}

	h2 {
		color: #333;
		border-bottom: 2px solid #5a8dee;
		padding-bottom: 10px;
	}
</style>
