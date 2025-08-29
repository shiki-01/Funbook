<script lang="ts">
	import { useBlockStore } from '$lib/stores/block.store.svelte';

	const blockStore = useBlockStore();

	// blockStore.getOutput() は Map<string, string[]> を返すので描画用にフラット配列へ変換
	let output = $derived(Array.from(blockStore.getOutput().values()).flat());
</script>

<div class="output-panel">
	<h3>出力</h3>
	<div class="output-content">
		{#each output as line}
			<div class="output-line">{line}</div>
		{/each}
	</div>
</div>

<style>
	.output-panel {
		position: fixed;
		top: 60px;
		right: 0;
		width: 300px;
		height: calc(100vh - 60px);
		background: white;
		border-left: 1px solid #e0e0e0;
		display: flex;
		flex-direction: column;
	}

	.output-panel h3 {
		margin: 0;
		padding: 16px;
		background: #f5f5f5;
		border-bottom: 1px solid #e0e0e0;
		font-size: 16px;
		font-weight: 500;
	}

	.output-content {
		flex: 1;
		padding: 16px;
		overflow-y: auto;
		font-family: 'Courier New', monospace;
		font-size: 14px;
		line-height: 1.4;
	}

	.output-line {
		margin-bottom: 4px;
		white-space: pre-wrap;
	}
</style>
