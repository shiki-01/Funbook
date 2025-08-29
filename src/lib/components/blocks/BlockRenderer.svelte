<!--
  BlockRenderer.svelte
  純粋なブロックレンダリングコンポーネント
  ビジネスロジックなしでブロックの視覚的表現のみを担当
-->
<script lang="ts">
	import type { Block, ContentSelector, ContentValue, Size, TextContent } from '$lib/types/domain';
	import { BlockPathType } from '$lib/types';
	import { generatePathString, getBlockColors } from '$lib/utils/blockShapes';

	/**
	 * BlockRenderer props interface
	 * @param block - レンダリングするブロック
	 * @param size - ブロックのサイズ
	 * @param position - ブロックの位置
	 * @param isDragging - ドラッグ中かどうか
	 * @param isFromPalette - パレットからのブロックかどうか
	 * @param loopChildrenHeight - ループブロックの子要素の高さ（ループブロック用）
	 * @param customStyles - カスタムスタイル
	 */
	interface Props {
		block: Block;
		size: Size;
		position: { x: number; y: number };
		isDragging?: boolean;
		isFromPalette?: boolean;
		loopChildrenHeight?: number;
		customStyles?: {
			filter?: string;
			cursor?: string;
			zIndex?: number;
		};
	}

	let {
		block,
		size,
		position,
		isDragging = false,
		isFromPalette = false,
		loopChildrenHeight = 0,
		customStyles = {}
	}: Props = $props();

	/**
	 * SVGパス文字列を生成
	 * @returns SVGパス文字列
	 */
	const path = $derived(() => {
		if (block.type === BlockPathType.Loop) {
			// ループブロックの場合、子要素の高さを考慮
			return generatePathString(
				block.type,
				{
					width: size.width,
					height: size.height - loopChildrenHeight - 20
				},
				loopChildrenHeight
			);
		}
		return generatePathString(block.type, size);
	});

	/**
	 * ブロックの色を取得
	 * @returns ブロックの色情報
	 */
	const colors = $derived(() => getBlockColors(block.type));

	/**
	 * SVGのサイズを計算
	 * @returns SVGのサイズ
	 */
	const svgSize = $derived(() => ({
		width: (block.type === BlockPathType.Value ? 4 : 0) + size.width,
		height: block.type === BlockPathType.Value ? 60 : size.height
	}));

	/**
	 * ブロックコンテナのスタイルを計算
	 * @returns スタイル文字列
	 */
	const containerStyle = $derived(() => {
		const baseStyle = {
			position: isDragging ? 'fixed' : isFromPalette ? 'relative' : 'absolute',
			left: isFromPalette ? '0' : `${position.x}px`,
			top: isFromPalette ? '0' : `${position.y}px`,
			width: `${size.width}px`,
			height: `${size.height}px`,
			zIndex: customStyles.zIndex ?? block.zIndex,
			cursor: customStyles.cursor ?? (isDragging ? 'grabbing' : 'grab'),
			filter:
				customStyles.filter ??
				(isDragging ? 'drop-shadow(0 4px 6px rgba(90, 141, 238, 0.5))' : 'none')
		};

		return Object.entries(baseStyle)
			.map(([key, value]) => `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value}`)
			.join('; ');
	});

	/**
	 * ブロックコンテンツの変換スタイルを計算
	 * @returns 変換スタイル文字列
	 */
	const contentTransform = $derived(() => {
		const xOffset = block.type === BlockPathType.Value ? 12 : 10;
		const yOffset =
			block.type === BlockPathType.Value ? 0 : block.type === BlockPathType.Loop ? 25 : 5;
		const yTransform = block.type === BlockPathType.Loop ? '-100% + ' : '-50% - ';

		return `translate(${xOffset}px, calc(${yTransform}${yOffset}px))`;
	});

	/**
	 * SVGパスのフィルタースタイルを計算
	 * @returns フィルタースタイル文字列
	 */
	const pathFilter = $derived(() => {
		return block.valueTargetId ? '' : `filter: drop-shadow(0 4px 0 ${colors().shadow});`;
	});
</script>

<div
	class="block-renderer"
	class:dragging={isDragging}
	class:from-palette={isFromPalette}
	style={containerStyle()}
	data-block-id={block.id}
	data-block-type={block.type}
>
	<!-- SVG背景 -->
	<svg width="{svgSize().width}px" height="{svgSize().height}px" class="block-svg">
		<path
			d={path()}
			fill={colors().fill}
			stroke={colors().stroke}
			stroke-width="2.5"
			style={pathFilter()}
		/>
	</svg>

	<!-- ブロックコンテンツ -->
	<div class="block-content" style:transform={contentTransform()}>
		<span class="block-title">{block.title}</span>

		{#each block.content as blockContent}
			{#if blockContent.type === 'ContentValue'}
				{@const content = blockContent.data as ContentValue}
				<div class="content-value">
					<span>{content.title}</span>
					{#if content.variables}
						<div class="variable-placeholder" data-variables={content.variables}>
							<!-- 変数プレースホルダー -->
						</div>
					{:else}
						<div class="value-placeholder" data-value={content.value || content.placeholder}>
							{content.value || content.placeholder || ''}
						</div>
					{/if}
				</div>
			{:else if blockContent.type === 'ContentSelector'}
				{@const content = blockContent.data as ContentSelector}
				<div class="content-selector">
					<span>{content.title}</span>
				</div>
			{:else if blockContent.type === 'Text'}
				{@const content = blockContent.data as TextContent}
				<div class="content-text">
					<span>{content.title}</span>
				</div>
			{:else if blockContent.type === 'Separator'}
				<div class="content-separator">
					<hr />
				</div>
			{/if}
		{/each}

		<!-- フラグブロック用のアイコンプレースホルダー -->
		{#if block.type === BlockPathType.Flag}
			<div class="flag-icon-placeholder">
				<div class="flag-icon">🏁</div>
			</div>
		{/if}
	</div>

	<!-- 接続ポイント -->
	{#if block.connection === 'Both' || block.connection === 'Input'}
		<div class="connection-input" data-input-id={block.id}></div>
	{/if}
	{#if (block.connection === 'Both' || block.connection === 'Output') && block.type !== BlockPathType.Value}
		<div class="connection-output" data-output-id={block.id}></div>
	{/if}
	{#if block.type === BlockPathType.Loop}
		<div class="connection-loop" data-loop-id={block.id}></div>
	{/if}
</div>

<style>
	.block-renderer {
		width: auto;
		user-select: none;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		cursor: grab;
	}

	.block-renderer.from-palette {
		margin: 10px 0;
	}

	.block-renderer.dragging {
		cursor: grabbing;
	}

	.block-svg {
		position: absolute;
		top: 0;
		left: 0;
		pointer-events: none;
		z-index: -1;
	}

	.block-content {
		position: absolute;
		top: 50%;
		left: 0;
		width: max-content;
		height: 100%;
		display: flex;
		flex-direction: row;
		flex-wrap: nowrap;
		align-items: center;
		justify-content: flex-start;
		color: #fff;
		font-weight: 500;
		gap: 8px;
		pointer-events: none;
	}

	.block-title {
		color: #fff;
		white-space: nowrap;
		font-weight: 500;
	}

	.content-value,
	.content-selector,
	.content-text {
		height: 28px;
		display: flex;
		flex-direction: row;
		gap: 5px;
		align-items: center;
	}

	.content-value span,
	.content-selector span,
	.content-text span {
		color: #fff;
		display: flex;
		align-items: center;
		justify-content: center;
		white-space: nowrap;
	}

	.value-placeholder,
	.variable-placeholder {
		height: 25px;
		padding: 2px 6px;
		border-radius: 9999px;
		border: 2px solid;
		background: rgba(255, 255, 255, 0.9);
		color: #333;
		font-size: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 40px;
		white-space: nowrap;
	}

	.variable-placeholder {
		background: transparent;
		border: 2px solid rgba(255, 255, 255, 0.5);
		color: rgba(255, 255, 255, 0.7);
	}

	.content-separator hr {
		width: 100%;
		border: none;
		border-top: 1px solid #ccc;
		margin: 5px 0;
	}

	.flag-icon-placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
	}

	.flag-icon {
		font-size: 16px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.connection-input,
	.connection-output,
	.connection-loop {
		position: absolute;
		width: 40px;
		height: 20px;
		z-index: 1;
		pointer-events: none;
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
</style>
