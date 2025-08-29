<script lang="ts">
	/**
	 * カスタムスクロールバーコンポーネント
	 *
	 * @description キャンバス用のカスタムスクロールバーを提供します。
	 * 水平・垂直両方向に対応し、アクセシビリティ機能を含みます。
	 */

	import type { Position } from '$lib/types/domain';

	interface Props {
		/** スクロールバーの方向 */
		orientation: 'horizontal' | 'vertical';
		/** 表示領域のサイズ */
		visibleSize: number;
		/** コンテンツ全体のサイズ */
		contentSize: number;
		/** 現在のスクロール位置 */
		scrollPosition: number;
		/** スクロールバーの表示/非表示 */
		visible?: boolean;
		/** スクロールバーのサイズ（太さ） */
		size?: number;
		/** アクセシビリティラベル */
		ariaLabel?: string;
		/** 制御対象の要素ID */
		ariaControls?: string;
		/** スクロール位置変更時のコールバック */
		onScroll?: (position: number) => void;
	}

	let {
		orientation,
		visibleSize,
		contentSize,
		scrollPosition,
		visible = true,
		size = 12,
		ariaLabel,
		ariaControls,
		onScroll
	}: Props = $props();

	// DOM要素の参照
	let scrollbarElement = $state<HTMLElement>();
	let thumbElement = $state<HTMLElement>();

	// ドラッグ状態
	let isDragging = $state(false);
	let dragOffset = $state(0);

	// 計算されたプロパティ
	const isHorizontal = $derived(orientation === 'horizontal');
	const shouldShow = $derived(visible && contentSize > visibleSize);

	// スクロール比率（0-1）
	const scrollRatio = $derived(() => {
		const maxScroll = Math.max(0, contentSize - visibleSize);
		return maxScroll > 0 ? Math.abs(scrollPosition) / maxScroll : 0;
	});

	// サムのサイズ
	const thumbSize = $derived(() => {
		const ratio = visibleSize / contentSize;
		const minThumbSize = 20;
		return Math.max(minThumbSize, visibleSize * ratio);
	});

	// サムの位置
	const thumbPosition = $derived(() => {
		const maxThumbPos = visibleSize - thumbSize();
		return Math.max(0, Math.min(maxThumbPos, scrollRatio() * maxThumbPos));
	});

	// ARIA値
	const ariaValueNow = $derived(() => Math.round(Math.abs(scrollPosition)));
	const ariaValueMax = $derived(() => Math.round(Math.max(0, contentSize - visibleSize)));

	/**
	 * スクロールバーのマウスダウンイベントハンドラ
	 * @param event - マウスイベント
	 */
	const handleMouseDown = (event: MouseEvent) => {
		if (!thumbElement || !onScroll) return;

		event.preventDefault();
		event.stopPropagation();

		const thumbRect = thumbElement.getBoundingClientRect();
		dragOffset = isHorizontal ? event.clientX - thumbRect.left : event.clientY - thumbRect.top;

		isDragging = true;

		// フォーカスを設定
		thumbElement.focus();
	};

	/**
	 * グローバルマウス移動イベントハンドラ
	 * @param event - マウスイベント
	 */
	const handleMouseMove = (event: MouseEvent) => {
		if (!isDragging || !scrollbarElement || !onScroll) return;

		const scrollbarRect = scrollbarElement.getBoundingClientRect();
		const mousePos = isHorizontal
			? event.clientX - scrollbarRect.left - dragOffset
			: event.clientY - scrollbarRect.top - dragOffset;

		const maxThumbPos = visibleSize - thumbSize();
		const clampedThumbPos = Math.max(0, Math.min(maxThumbPos, mousePos));
		const newScrollRatio = maxThumbPos > 0 ? clampedThumbPos / maxThumbPos : 0;

		const maxScroll = contentSize - visibleSize;
		const newScrollPosition = -newScrollRatio * maxScroll;

		onScroll(newScrollPosition);
	};

	/**
	 * グローバルマウスアップイベントハンドラ
	 */
	const handleMouseUp = () => {
		isDragging = false;
		dragOffset = 0;
	};

	/**
	 * キーボードイベントハンドラ
	 * @param event - キーボードイベント
	 */
	const handleKeyDown = (event: KeyboardEvent) => {
		if (!onScroll) return;

		const step = visibleSize * 0.1; // 10%ずつスクロール
		let newPosition = scrollPosition;

		switch (event.key) {
			case 'ArrowUp':
			case 'ArrowLeft':
				event.preventDefault();
				newPosition = Math.min(0, scrollPosition + step);
				break;
			case 'ArrowDown':
			case 'ArrowRight':
				event.preventDefault();
				newPosition = Math.max(-(contentSize - visibleSize), scrollPosition - step);
				break;
			case 'Home':
				event.preventDefault();
				newPosition = 0;
				break;
			case 'End':
				event.preventDefault();
				newPosition = -(contentSize - visibleSize);
				break;
			case 'PageUp':
				event.preventDefault();
				newPosition = Math.min(0, scrollPosition + visibleSize);
				break;
			case 'PageDown':
				event.preventDefault();
				newPosition = Math.max(-(contentSize - visibleSize), scrollPosition - visibleSize);
				break;
		}

		if (newPosition !== scrollPosition) {
			onScroll(newPosition);
		}
	};

	/**
	 * スクロールバートラックのクリックハンドラ
	 * @param event - マウスイベント
	 */
	const handleTrackClick = (event: MouseEvent) => {
		if (!scrollbarElement || !onScroll || event.target === thumbElement) return;

		const scrollbarRect = scrollbarElement.getBoundingClientRect();
		const clickPos = isHorizontal
			? event.clientX - scrollbarRect.left
			: event.clientY - scrollbarRect.top;

		const thumbCenter = thumbPosition() + thumbSize() / 2;
		const step = visibleSize * 0.8; // 80%ずつスクロール

		let newPosition = scrollPosition;
		if (clickPos < thumbCenter) {
			// サムより前をクリック - 上/左にスクロール
			newPosition = Math.min(0, scrollPosition + step);
		} else {
			// サムより後をクリック - 下/右にスクロール
			newPosition = Math.max(-(contentSize - visibleSize), scrollPosition - step);
		}

		onScroll(newPosition);
	};

	// グローバルイベントリスナーの設定
	$effect(() => {
		if (isDragging) {
			document.addEventListener('mousemove', handleMouseMove);
			document.addEventListener('mouseup', handleMouseUp);

			return () => {
				document.removeEventListener('mousemove', handleMouseMove);
				document.removeEventListener('mouseup', handleMouseUp);
			};
		}
	});
</script>

{#if shouldShow}
	<div
		bind:this={scrollbarElement}
		class="scrollbar"
		class:horizontal={isHorizontal}
		class:vertical={!isHorizontal}
		style:width={isHorizontal ? `${visibleSize}px` : `${size}px`}
		style:height={isHorizontal ? `${size}px` : `${visibleSize}px`}
		onclick={handleTrackClick}
		onkeydown={handleKeyDown}
		role="scrollbar"
		tabindex="0"
		aria-orientation={orientation}
		aria-label={ariaLabel || `${orientation === 'horizontal' ? '水平' : '垂直'}スクロール`}
		aria-controls={ariaControls}
		aria-valuenow={ariaValueNow()}
		aria-valuemin={0}
		aria-valuemax={ariaValueMax()}
	>
		<div
			bind:this={thumbElement}
			class="scrollbar-thumb"
			class:dragging={isDragging}
			style:width={isHorizontal ? `${thumbSize()}px` : '100%'}
			style:height={isHorizontal ? '100%' : `${thumbSize()}px`}
			style:left={isHorizontal ? `${thumbPosition()}px` : '0'}
			style:top={isHorizontal ? '0' : `${thumbPosition()}px`}
			onmousedown={handleMouseDown}
			onkeydown={handleKeyDown}
			tabindex="0"
			role="button"
			aria-label="スクロールハンドル"
		></div>
	</div>
{/if}

<style>
	.scrollbar {
		position: absolute;
		background: rgba(0, 0, 0, 0.1);
		border-radius: 6px;
		z-index: 100;
		cursor: pointer;
		transition: background-color 0.2s ease;
	}

	.scrollbar:hover {
		background: rgba(0, 0, 0, 0.15);
	}

	.scrollbar.horizontal {
		bottom: 0;
		left: 0;
	}

	.scrollbar.vertical {
		top: 0;
		right: 0;
	}

	.scrollbar-thumb {
		position: absolute;
		background: rgba(0, 0, 0, 0.4);
		border-radius: 6px;
		cursor: grab;
		transition: background-color 0.2s ease;
		min-width: 20px;
		min-height: 20px;
	}

	.scrollbar-thumb:hover {
		background: rgba(0, 0, 0, 0.6);
	}

	.scrollbar-thumb:active,
	.scrollbar-thumb.dragging {
		background: rgba(0, 0, 0, 0.8);
		cursor: grabbing;
	}

	.scrollbar-thumb:focus {
		outline: 2px solid #0066cc;
		outline-offset: 1px;
	}

	/* ハイコントラストモード対応 */
	@media (prefers-contrast: high) {
		.scrollbar {
			background: rgba(0, 0, 0, 0.3);
			border: 1px solid #000;
		}

		.scrollbar-thumb {
			background: rgba(0, 0, 0, 0.8);
			border: 1px solid #000;
		}

		.scrollbar-thumb:hover {
			background: #000;
		}
	}

	/* 縮小モーション設定を尊重 */
	@media (prefers-reduced-motion: reduce) {
		.scrollbar,
		.scrollbar-thumb {
			transition: none;
		}
	}

	/* フォーカス表示の改善 */
	@media (prefers-reduced-motion: no-preference) {
		.scrollbar-thumb:focus {
			transition: outline 0.2s ease;
		}
	}
</style>
