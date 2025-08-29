<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import Board from '$lib/components/Board.svelte';
	import Output from '$lib/components/Output.svelte';
	import { useBlockStore } from '$lib/stores/block.store.svelte';
	import { useStoreCommunicationService } from '$lib/services/store/StoreCommunicationService';
	import { useDragService } from '$lib/services/drag/DragService';
	import { ErrorHandler } from '$lib/services/error/ErrorHandler';
	import '../app.css';
	import '@fontsource-variable/noto-sans-jp';
	import { BlockPathType, Connection, type BlockList, type Position } from '$lib/types';
	import { onMount } from 'svelte';

	// 新しいストアアーキテクチャの初期化
	const blockStore = useBlockStore();
	const communicationService = useStoreCommunicationService();

	// サービス層の初期化
	const errorHandler = new ErrorHandler();
	const dragService = useDragService();

	let canvasElement: HTMLElement | undefined = $state();

	const handleDragStart = (id: string, offset: Position) => {
		dragService.startDrag(id, offset);
	};

	let blockList: BlockList[] = [
		{
			name: 'Start',
			block: {
				id: '',
				name: 'Start',
				title: 'Start',
				type: BlockPathType.Flag,
				color: '#3357FF',
				output: '',
				connection: Connection.Output,
				content: [],
				position: { x: 300, y: 300 },
				zIndex: 0,
				visibility: true,
				draggable: true,
				editable: true,
				deletable: true
			}
		},
	];

	// 常設: 変数設定ブロック（value ブロック色を利用）
	const valueBlocks = blockList.filter((b) => b.block.type === BlockPathType.Value);
	const valueColor = valueBlocks[0]?.block.color || '#4DD75C';
	blockList.push({
		name: 'set_value',
		block: {
			id: '',
			name: 'set_value',
			title: 'Set Value',
			type: BlockPathType.Move, // 形状は Move にしつつ色は後で Value に上書き
			color: valueColor,
			output: '${selector_var} = ${val_input}',
			connection: Connection.Both,
			content: [
				{
					id: 'selector_var',
					type: 'ContentSelector',
					data: {
						title: 'var',
						value: '',
						placeholder: 'variable',
						options: valueBlocks.map((vb, i) => ({
							id: `var_${i}`,
							title: vb.block.title || `value${i + 1}`,
							value: vb.block.title || `value${i + 1}`
						}))
					}
				},
				{
					id: 'val_input',
					type: 'ContentValue',
					data: {
						title: 'value',
						value: '',
						placeholder: 'value'
					}
				}
			],
			position: { x: 350, y: 350 },
			zIndex: 0,
			visibility: true,
			draggable: true,
			editable: true,
			deletable: true
		}
	});

	onMount(async () => {
		try {
			// ブロックリストを新しいストアに追加
			blockList.forEach((item) => {
				blockStore.addBlockList(item);
			});

			// ストア通信サービスの初期化
			communicationService.enableSync();

			console.log('Application initialized with new store architecture');
		} catch (error) {
			console.error('Failed to initialize application:', error);
			errorHandler.showUserError('アプリケーションの初期化に失敗しました', 'error');
		}
	});
</script>

<div class="app">
	<Header />
	<div id="app-container">
		<Sidebar onDragStart={handleDragStart} />
		<Board bind:element={canvasElement} />
		<Output />
	</div>
</div>

<style>
	:global(body) {
		font-family: 'Noto Sans JP', sans-serif;
		font-optical-sizing: auto;
		font-style: normal;
		margin: 0;
		padding: 0;
		user-select: none;
	}

	.app {
		width: 100dvw;
		height: 100dvh;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	#app-container {
		width: 100dvw;
		height: calc(100dvh - 60px);
		display: grid;
		grid-template-rows: 1fr;
		grid-template-columns: 250px 1fr 300px;
		overflow: hidden;
	}
</style>
