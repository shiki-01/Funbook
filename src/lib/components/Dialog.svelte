<script lang="ts">
	interface Props {
		isOpen?: boolean;
		onClosed?: () => void;
		children?: any;
	}
	let { isOpen = $bindable(), onClosed, children }: Props = $props();
</script>

<div class="dialog" class:open={isOpen}>
	<div class="dialog-content">
		{@render children?.()}
		<button
			class="close-button"
			onclick={() => {
				isOpen = false;
				if (onClosed) onClosed();
			}}>×</button
		>
	</div>
</div>

<style>
	.dialog {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		opacity: 0;
		pointer-events: none;
		transition: opacity 0.3s ease-in-out;
	}

	.dialog.open {
		opacity: 1;
		pointer-events: auto;
	}

	.dialog-content {
		background-color: white;
		padding: 20px;
		border-radius: 8px;
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
		max-width: 90vw;
		max-height: 90vh;
		overflow: auto;
		position: relative;
	}

	.close-button {
		position: absolute;
		top: 10px;
		right: 10px;
		background: none;
		border: none;
		font-size: 24px;
		cursor: pointer;
		color: #999;
		width: 30px;
		height: 30px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
	}

	.close-button {
		margin-top: 20px;
		padding: 10px;
		background-color: #4a90e2;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
	}
</style>
