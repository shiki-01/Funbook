<script lang="ts">
	import type { BlockPathType } from '$lib/types';
	import { getBlockColors } from '$lib/utils';
	import { onMount, onDestroy } from 'svelte';

	export interface DropdownOption {
		id: string; // 内部ID（任意）
		title: string; // 表示ラベル
		value: string; // 実際の値
		disabled?: boolean;
	}

	interface Props {
		colors: { fill: string; stroke: string; shadow: string };
		value: string;
		options: DropdownOption[];
		placeholder?: string;
		ariaLabel?: string;
		// 呼び出し元で変更を反映
		onChange?: (value: string) => void;
	}

	let {
		colors,
		value,
		options,
		placeholder = '',
		ariaLabel = 'selector',
		onChange
	}: Props = $props();

	let open = $state(false);
	let rootEl: HTMLDivElement | null = null;
	let activeIndex = $state(-1); // キーボード操作用

	const close = () => {
		open = false;
		activeIndex = -1;
	};
	const toggle = () => (open = !open);

	const selectValue = (v: string) => {
		if (v === value) {
			close();
			return;
		}
		value = v;
		onChange && onChange(v);
		close();
	};

	const handleOutside = (e: MouseEvent) => {
		if (!rootEl) return;
		if (!rootEl.contains(e.target as Node)) close();
	};

	const moveActive = (dir: 1 | -1) => {
		if (!open) open = true;
		const enabled = options.filter((o) => !o.disabled);
		if (!enabled.length) return;
		if (activeIndex === -1) {
			activeIndex = enabled.findIndex((o) => o.value === value);
			if (activeIndex === -1) activeIndex = 0;
			return;
		}
		activeIndex = (activeIndex + dir + enabled.length) % enabled.length;
	};

	const commitActive = () => {
		const enabled = options.filter((o) => !o.disabled);
		if (activeIndex >= 0 && activeIndex < enabled.length) selectValue(enabled[activeIndex].value);
	};

	const onKey = (e: KeyboardEvent) => {
		switch (e.key) {
			case 'Enter':
			case ' ': // Space
				if (!open) {
					open = true;
				} else {
					commitActive();
				}
				e.preventDefault();
				break;
			case 'Escape':
				close();
				break;
			case 'ArrowDown':
				moveActive(1);
				e.preventDefault();
				break;
			case 'ArrowUp':
				moveActive(-1);
				e.preventDefault();
				break;
			case 'Tab':
				close();
				break;
		}
	};

	onMount(() => {
		window.addEventListener('mousedown', handleOutside);
		return () => window.removeEventListener('mousedown', handleOutside);
	});

	onDestroy(() => close());
</script>

<!-- ベース構造（クラスのみ。詳細スタイルは利用側で上書き） -->
<div
	class="dropdown"
	style="--stroke: {colors.stroke}"
	bind:this={rootEl}
	data-open={open}
	role="presentation"
	onmousedown={(e) => e.stopPropagation()}
>
	<button
		class="dropdown-trigger"
		style="border-color: {colors.stroke}; background-color: {colors.fill}"
		type="button"
		aria-haspopup="listbox"
		aria-expanded={open}
		aria-label={ariaLabel}
		onclick={toggle}
		onkeydown={onKey}
	>
		<span class="dropdown-trigger-label">
			{#if value === '' && placeholder}
				{placeholder}
			{:else}
				{options.find((o) => o.value === value)?.title || value || placeholder}
			{/if}
		</span>
		<span class="dropdown-trigger-icon" aria-hidden="true">▾</span>
	</button>

	{#if open}
		<div class="dropdown-portal">
			<ul
				class="dropdown-menu"
				style="border-color: {colors.stroke}; background-color: {colors.fill}"
				role="listbox"
				tabindex="-1"
				aria-label={ariaLabel}
				onkeydown={onKey}
			>
				{#if placeholder}
					<li
						class="dropdown-option dropdown-option--placeholder"
						role="option"
						aria-selected={value === ''}
						data-selected={value === ''}
						onmousedown={(e) => {
							e.preventDefault();
							selectValue('');
						}}
						tabindex="-1"
					>
						{placeholder}
					</li>
				{/if}
				{#each options as opt, i}
					<li
						class="dropdown-option {opt.disabled ? 'is-disabled' : ''} {value === opt.value
							? 'is-selected'
							: ''} {i === activeIndex ? 'is-active' : ''}"
						role="option"
						aria-selected={value === opt.value}
						data-value={opt.value}
						data-active={i === activeIndex}
						data-selected={value === opt.value}
						aria-disabled={opt.disabled || undefined}
						tabindex="-1"
						onmouseenter={() => {
							if (!opt.disabled) activeIndex = i;
						}}
						onmousedown={(e) => {
							e.preventDefault();
							if (!opt.disabled) selectValue(opt.value);
						}}
					>
						{opt.title}
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>

<style>
	.dropdown {
		position: relative;
		display: inline-flex;
		pointer-events: auto;
	}
	.dropdown-trigger {
		all: unset;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 2px 8px;
		min-height: 25px;
		border: 2px solid;
		border-radius: 8px;
		font-size: 12px;
		color: #ffffff;
	}
	.dropdown-trigger:focus-visible {
		outline: 2px solid #4da3ff;
		outline-offset: 2px;
	}
	.dropdown-trigger-label {
		font-size: 14px;
		line-height: 1;
	}
	.dropdown-trigger-icon {
		font-size: 14px;
		line-height: 1;
	}
	.dropdown-portal {
		position: absolute;
		z-index: 1000;
		left: 0;
		top: 100%;
		width: max-content;
		min-width: 100%;
	}
	.dropdown-menu {
		list-style: none;
		margin: 4px 0 0;
		padding: 4px;
		border: 2px solid;
		border-radius: 6px;
		max-height: 220px;
		overflow-y: auto;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
	}
	.dropdown-option {
		padding: 4px 8px;
		font-size: 12px;
		cursor: pointer;
		border-radius: 4px;
		user-select: none;
	}
	.dropdown-option.is-active {
		background: var(--stroke);
	}
	.dropdown-option.is-selected {
		font-weight: 600;
	}
	.dropdown-option.is-disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	/* プレースホルダー用クラス */
	.dropdown-option--placeholder {
		font-style: italic;
	}
</style>
