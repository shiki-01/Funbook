<script lang="ts">
	import Block from './Block.svelte';
	import { useBlockStore } from '$lib/stores/block.store.svelte';
	import type { Position } from '$lib/types';

	interface Props {
		onDragStart?: (id: string, offset: Position) => void;
	}

	let { onDragStart }: Props = $props();

	const blockStore = useBlockStore();
	const blockLists = blockStore.paletteBlockLists;
</script>

<div id="sidebar">
	<ul>
		{#each blockLists() as blockList (blockList.uid)}
			<li>
				<!-- key を uid にして DOM 再利用によるパス/スタイル崩れ防止 -->
				<Block block={blockList.block} isFromPalette={true} {onDragStart} />
			</li>
		{/each}
	</ul>
</div>

<style>
	#sidebar {
		width: 100%;
		height: 100%;
		background-color: #ecf1ff;
		padding: 20px;
		box-sizing: border-box;
		overflow-x: hidden;
		overflow-y: auto;
	}

	ul {
		list-style-type: none;
		padding: 0;
		margin: 0;
	}

	li {
		margin-bottom: 10px;
	}
</style>
