<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { Block, Position } from '$lib/types';
	import { BlockPathType } from '$lib/types';
	import { generatePathString, getBlockColors } from '$lib/utils/blockShapes';
	import { calculateOffset } from '$lib/utils/dragUtils';
	import { LAYOUT_CONSTANTS } from '$lib/utils/constants';
	import { BlockService } from '$lib/services/block/BlockService';
	import { useDragService } from '$lib/services/drag/DragService';
	import { CanvasService } from '$lib/services/canvas/CanvasService';
	import { ErrorHandler } from '$lib/services/error/ErrorHandler';
	import { useBlockStore } from '$lib/stores/block.store.svelte';
	import { useCanvasStore } from '$lib/stores/canvas.store.svelte';
	import { BlockError } from '$lib/errors/AppError';
	import { ERROR_CODES } from '$lib/errors/errorCodes';
	import Dropdown from './ui/Dropdown.svelte';

	interface Props {
		block: Block;
		isFromPalette?: boolean;
		onDragStart?: (id: string, offset: Position) => void;
	}

	let { block, isFromPalette = false, onDragStart }: Props = $props();

	// サービス層の初期化
	const blockStore = useBlockStore();
	const canvasStore = useCanvasStore();
	const errorHandler = new ErrorHandler();
	const canvasService = new CanvasService(errorHandler);
	const blockService = new BlockService(blockStore, errorHandler);
	const dragService = useDragService();

	let contentRef: HTMLDivElement | undefined = $state();

	// ブロック内の入力/セレクターの内容を取得
	const getInputValues = $derived(() => {
		return block.content
			.filter((content) => content.type === 'ContentValue' || content.type === 'ContentSelector')
			.map((content) => {
				if (content.type === 'ContentValue') {
					const cv: any = content.data;
					return cv.value || cv.placeholder || '';
				}
				if (content.type === 'ContentSelector') {
					const cs: any = content.data;
					return cs.value || cs.placeholder || '';
				}
				return '';
			});
	});

	// 動的にブロックサイズを計算（サービス層を使用）
	const blockSize = $derived(() => {
		try {
			const currentContentRef = contentRef;
			if (!currentContentRef) {
				return {
					width: LAYOUT_CONSTANTS.BLOCK_MIN_WIDTH,
					height: LAYOUT_CONSTANTS.BLOCK_MIN_HEIGHT
				};
			}

			const contentWidth = currentContentRef.scrollWidth || 0;
			const textMeasureWidth = getInputValues().reduce(
				(maxWidth, value) => Math.max(maxWidth, value.length * 8 + 20),
				0
			);

			// value blockの幅を計算（サービス経由でブロック取得）
			const valueBlockWidth = block.content
				.filter((content) => content.type === 'ContentValue')
				.reduce((totalWidth, content) => {
					if (content.type === 'ContentValue' && 'variables' in content.data) {
						const contentValue = content.data;
						if (contentValue.variables) {
							const referencedBlock = blockService.getBlock(contentValue.variables);
							if (!referencedBlock) return totalWidth;
							const variablesLength = referencedBlock.title.length;
							const estimatedWidth = variablesLength * 8 + 100;
							return totalWidth + estimatedWidth;
						}
					}
					return totalWidth;
				}, 0);

			const calculatedWidth = Math.max(
				block.type === BlockPathType.Flag ? LAYOUT_CONSTANTS.BLOCK_MIN_WIDTH : 0,
				contentWidth + LAYOUT_CONSTANTS.BLOCK_PADDING,
				textMeasureWidth + LAYOUT_CONSTANTS.BLOCK_PADDING,
				valueBlockWidth + LAYOUT_CONSTANTS.BLOCK_PADDING
			);

			// 高さの計算
			let calculatedHeight: number = LAYOUT_CONSTANTS.BLOCK_MIN_HEIGHT;

			if (block.type === BlockPathType.Value) {
				calculatedHeight = LAYOUT_CONSTANTS.VALUE_BLOCK_MIN_HEIGHT;
			} else if (block.type === BlockPathType.Loop) {
				// ループブロックの場合、ネストしたループを考慮した高さを計算
				const baseHeight = LAYOUT_CONSTANTS.BLOCK_MIN_HEIGHT;
				const childrenHeight = calculateLoopChildrenHeight(block.id);
				const padding = 20; // 上下のパディング
				calculatedHeight = baseHeight + childrenHeight + padding;
			}

			return {
				width: calculatedWidth,
				height: calculatedHeight
			};
		} catch (error) {
			// エラーが発生した場合はデフォルトサイズを返す
			errorHandler.handleError(
				new BlockError(
					`ブロックサイズ計算エラー: ${error instanceof Error ? error.message : String(error)}`,
					ERROR_CODES.BLOCK.CALCULATION_FAILED,
					'low',
					block.id
				),
				{
					component: 'Block',
					action: 'calculateBlockSize',
					additionalData: { blockId: block.id }
				}
			);
			return {
				width: LAYOUT_CONSTANTS.BLOCK_MIN_WIDTH,
				height: LAYOUT_CONSTANTS.BLOCK_MIN_HEIGHT
			};
		}
	});

	const valueColors = getBlockColors(BlockPathType.Value);
	const colors = $derived(() => {
		if (block.name === 'set_value') {
			return { ...valueColors };
		}
		return getBlockColors(block.type);
	});

	const isDragging = $derived(() => {
		const dragState = dragService.getDragState();
		return dragState.active && dragState.blockId === block.id;
	});

	// ドラッグ中チェーンに属するか判定（drag root から childId / loop 内部を辿る）
	function isInDraggingChain(): boolean {
		const dragState = dragService.getDragState();
		if (!dragState.active || !dragState.blockId) return false;
		const rootId = dragState.blockId;
		if (block.id === rootId) return true;
		const visited = new Set<string>();
		const stack: string[] = [rootId];
		while (stack.length) {
			const id = stack.pop()!;
			if (visited.has(id)) continue;
			visited.add(id);
			const b = blockService.getBlock(id);
			if (!b) continue;
			// 通常子
			if (b.childId) {
				if (b.childId === block.id) return true;
				stack.push(b.childId);
			}
			// ループ内部
			if (b.type === BlockPathType.Loop && b.loopFirstChildId) {
				let innerId: string | undefined = b.loopFirstChildId;
				while (innerId) {
					if (innerId === block.id) return true;
					const child = blockService.getBlock(innerId);
					if (!child) break;
					if (child.content.find((v) => 'variables' in v.data && v.data.variables === block.id)) {
						return true;
					}
					if (child.childId) stack.push(child.childId);
					if (child.type === BlockPathType.Loop && child.loopFirstChildId) stack.push(child.id);
					if (innerId === b.loopLastChildId) break;
					innerId = child.childId || undefined;
				}
			}
			if (b.content.find((v) => 'variables' in v.data && v.data.variables === block.id)) {
				return true;
			}
		}
		return false;
	}

	const effectiveZIndex = $derived(() => {
		// チェーンに属していれば一括で DRAGGING_Z_INDEX を描画時加算
		return isInDraggingChain() ? block.zIndex + LAYOUT_CONSTANTS.DRAGGING_Z_INDEX : block.zIndex;
	});
	const path = $derived(() => {
		if (block.type === BlockPathType.Loop) {
			// ネストしたループを考慮した高さを計算 (palette でも内部は作成時の id ベース)
			const childrenHeight = calculateLoopChildrenHeight(block.id);
			return generatePathString(
				block.type,
				{
					width: blockSize().width,
					height: blockSize().height - childrenHeight - 20
				},
				childrenHeight
			);
		}
		if (block.type === BlockPathType.Value) {
			return generatePathString(block.type, {
				width: blockSize().width,
				height: blockSize().height - 6
			});
		}
		return generatePathString(block.type, {
			width: blockSize().width,
			height: blockSize().height
		});
	});

	// ループ内の子ブロックの高さを再帰的に計算（サービス層を使用）
	const calculateLoopChildrenHeight = (loopBlockId: string): number => {
		try {
			const loopBlock = isFromPalette
				? blockStore.getBlockList(loopBlockId)?.block
				: blockService.getBlock(loopBlockId);
			if (!loopBlock || loopBlock.type !== BlockPathType.Loop || !loopBlock.loopFirstChildId) {
				return LAYOUT_CONSTANTS.BLOCK_VERTICAL_SPACING;
			}

			let totalHeight = 0;
			let currentChildId = loopBlock.loopFirstChildId;

			while (currentChildId) {
				const childBlock = blockService.getBlock(currentChildId);
				if (!childBlock) break;

				if (childBlock.type === BlockPathType.Loop) {
					// ネストしたループの場合：そのループの高さ + 内部の子ブロックの高さ + 閉じ囲い分
					const nestedLoopChildrenHeight = calculateLoopChildrenHeight(childBlock.id);
					const loopClosingHeight = 20; // ループの閉じ囲い分の高さ
					totalHeight +=
						LAYOUT_CONSTANTS.BLOCK_VERTICAL_SPACING + nestedLoopChildrenHeight + loopClosingHeight;
				} else {
					// 通常のブロックの場合
					totalHeight += LAYOUT_CONSTANTS.BLOCK_VERTICAL_SPACING;
				}

				// 最後の子に到達した場合は終了
				if (currentChildId === loopBlock.loopLastChildId) {
					break;
				}

				if (!childBlock.childId) {
					break;
				}

				currentChildId = childBlock.childId;
			}

			return totalHeight;
		} catch (error) {
			// エラーが発生した場合は0を返す
			errorHandler.handleError(
				new BlockError(
					`ループ子ブロック高さ計算エラー: ${error instanceof Error ? error.message : String(error)}`,
					ERROR_CODES.BLOCK.CALCULATION_FAILED,
					'low',
					loopBlockId
				),
				{
					component: 'Block',
					action: 'calculateLoopChildrenHeight',
					additionalData: { loopBlockId }
				}
			);
			return 0;
		}
	};

	const pointer = $derived(() => {
		const dragState = dragService.getDragState();
		if (dragState.active && dragState.blockId === block.id) {
			// ドラッグ中：現在位置からオフセットを引く
			if (dragState.currentPosition.x !== 0 || dragState.currentPosition.y !== 0) {
				return {
					x: dragState.currentPosition.x - dragState.offset.x,
					y: dragState.currentPosition.y - dragState.offset.y
				};
			}
		}
		// 通常の表示位置（非ドラッグ時）
		return { x: block.position.x, y: block.position.y };
	});

	const handleMouseDown = (event: MouseEvent) => {
		event.preventDefault();
		event.stopPropagation();

		try {
			if (isFromPalette) {
				// パレットからの新しいブロック作成: クリック位置直下にブロックを生成し即ドラッグ状態へ
				// 1. ビューポート取得
				const viewport = canvasService.getViewport();
				// 2. クリック時のスクリーン座標をキャンバス座標へ変換
				const canvasPointer = canvasService.screenToCanvas({ x: event.clientX, y: event.clientY });
				// 3. 要素内オフセット（rawOffset）を算出しズーム除算
				const rawOffset = calculateOffset(event, event.currentTarget as HTMLElement);
				const offset = { x: rawOffset.x / viewport.zoom, y: rawOffset.y / viewport.zoom };
				// 4. ブロックの永続位置 = ポインタキャンバス座標 - オフセット
				const initialPosition = {
					x: canvasPointer.x - offset.x,
					y: canvasPointer.y - offset.y
				};

				// BlockTypeを作成してサービス経由でブロックを作成（初期位置はポインタ基準）
				const blockType = {
					id: block.id,
					name: block.name,
					title: block.title,
					type: block.type,
					color: block.color,
					output: block.output,
					closeOutput: block.closeOutput,
					connection: block.connection,
					content: block.content,
					draggable: true,
					editable: true,
					deletable: true
				};

				const newBlock = blockService.createBlock(blockType, initialPosition);

				if (newBlock && onDragStart) {
					onDragStart(newBlock.id, offset);
				}
			} else {
				// 既存ブロックのドラッグ開始 - ズームを考慮したオフセット計算
				const viewport = canvasService.getViewport();
				const rawOffset = calculateOffset(event, event.currentTarget as HTMLElement);
				const offset = {
					x: rawOffset.x / viewport.zoom,
					y: rawOffset.y / viewport.zoom
				};

				// サービス経由でドラッグを開始
				const success = dragService.startDrag(block.id, offset);
				if (!success) {
					errorHandler.showUserError('ドラッグ操作を開始できませんでした', 'warning');
				}
			}
		} catch (error) {
			errorHandler.handleError(
				new BlockError(
					`マウスダウンイベント処理エラー: ${error instanceof Error ? error.message : String(error)}`,
					ERROR_CODES.BLOCK.INTERACTION_FAILED,
					'medium',
					block.id
				),
				{
					component: 'Block',
					action: 'handleMouseDown',
					additionalData: { blockId: block.id, isFromPalette }
				}
			);
		}
	};

	const handleInputChange = (contentId: string, value: string) => {
		try {
			const updatedContent = block.content.map((content) => {
				if (content.id === contentId && content.type === 'ContentValue') {
					const contentData = content.data as any; // 型の問題を一時的に回避
					return {
						...content,
						data: {
							...contentData,
							value
						}
					};
				}
				return content;
			});

			// サービス経由でブロックを更新
			blockService.updateBlock(block.id, {
				content: updatedContent
			});
		} catch (error) {
			errorHandler.handleError(
				new BlockError(
					`入力値変更エラー: ${error instanceof Error ? error.message : String(error)}`,
					ERROR_CODES.BLOCK.UPDATE_FAILED,
					'medium',
					block.id
				),
				{
					component: 'Block',
					action: 'handleInputChange',
					additionalData: { blockId: block.id, contentId, value }
				}
			);
		}
	};

	// ContentSelector 用の値変更ハンドラ
	const handleSelectorChange = (contentId: string, value: string) => {
		try {
			const updatedContent = block.content.map((content) => {
				if (content.id === contentId && content.type === 'ContentSelector') {
					return {
						...content,
						data: { ...(content.data as any), value }
					};
				}
				return content;
			});

			blockService.updateBlock(block.id, { content: updatedContent });
		} catch (error) {
			errorHandler.handleError(
				new BlockError(
					`セレクター値変更エラー: ${error instanceof Error ? error.message : String(error)}`,
					ERROR_CODES.BLOCK.UPDATE_FAILED,
					'medium',
					block.id
				),
				{
					component: 'Block',
					action: 'handleSelectorChange',
					additionalData: { blockId: block.id, contentId, value }
				}
			);
		}
	};

	const handleInputMouseDown = (event: MouseEvent) => {
		event.stopPropagation();
	};

	const handleSetOutput = () => {
		try {
			// TODO: プロジェクトサービスが実装されたら、そちらを使用する
			// 現在は直接ストアを使用（一時的）
			const store = useBlockStore();
			store.setOutput(block.id);
		} catch (error) {
			errorHandler.handleError(
				new BlockError(
					`出力設定エラー: ${error instanceof Error ? error.message : String(error)}`,
					ERROR_CODES.BLOCK.UPDATE_FAILED,
					'medium',
					block.id
				),
				{
					component: 'Block',
					action: 'handleSetOutput',
					additionalData: { blockId: block.id }
				}
			);
		}
	};
</script>

<div
	class="block-container"
	class:dragging={isDragging}
	class:from-palette={isFromPalette}
	style:position={isDragging() ? 'fixed' : isFromPalette ? 'relative' : 'absolute'}
	style:left={isFromPalette ? '0' : isDragging() ? `${pointer().x}px` : `${block.position.x}px`}
	style:top={isFromPalette ? '0' : isDragging() ? `${pointer().y - 0}px` : `${block.position.y}px`}
	style:width="{blockSize().width}px"
	style:height="{blockSize().height}px"
	style:z-index={effectiveZIndex()}
	style:cursor={isDragging() ? 'grabbing' : 'grab'}
	style:filter={isDragging() ? 'drop-shadow(0 4px 6px rgba(90, 141, 238, 0.5))' : 'none'}
	onmousedown={handleMouseDown}
	role="button"
	tabindex="0"
	data-block-id={block.id}
	data-value-id={block.type === BlockPathType.Value ? block.id : null}
>
	<div
		style:transform="translate({block.type === BlockPathType.Value ? 12 : 10}px, calc({block.type ===
		BlockPathType.Loop
			? '-100% + '
			: '-50% - '}
		{block.type === BlockPathType.Value ? 3 : block.type === BlockPathType.Loop ? 25 : 5}px));"
		class="block-content"
		bind:this={contentRef}
	>
		<span class="block-title">{block.title}</span>
		{#each block.content as blockContent}
			{#if blockContent.type === 'ContentValue'}
				{@const content = blockContent.data as any}
				<div class="content-value">
					<span>{content.title || ''}</span>
					{#if content.variables}
						<input type="text" class="no-outline" />
					{:else}
						<input
							type="text"
							class="block-input"
							data-content-id={blockContent.id}
							value={content.value || ''}
							placeholder={content.placeholder || ''}
							onmousedown={handleInputMouseDown}
							oninput={(e) => handleInputChange(blockContent.id, e.currentTarget.value)}
							style="border-color: {colors().stroke}"
						/>
					{/if}
				</div>
			{:else if blockContent.type === 'ContentSelector'}
				{@const content = blockContent.data as any}
				<div class="content-selector" role="group">
					{#if content.title}
						<span>{content.title}</span>
					{/if}
					<Dropdown
						colors={colors()}
						value={content.value}
						placeholder={content.placeholder}
						options={content.options}
						onChange={(v: string) => handleSelectorChange(blockContent.id, v)}
						ariaLabel={content.title || 'selector'}
					/>
				</div>
			{:else if blockContent.type === 'Text'}
				{@const content = blockContent.data as any}
				<p>{content.title || ''}</p>
			{:else if blockContent.type === 'Separator'}
				<hr />
			{/if}
		{/each}
		{#if block.type === BlockPathType.Flag}
			<button
				class="content-value"
				onclick={() => handleSetOutput()}
				onmousedown={(e) => e.stopPropagation()}
				title="Set as output"
				aria-label="Set as output"
				style="display: flex; align-items: center; justify-content: center; pointer-events: auto"
			>
				<Icon icon="material-symbols:flag-2-rounded" width="24" height="24" />
			</button>
		{/if}
	</div>

	<svg
		width="{(block.type === BlockPathType.Value ? 4 : 0) + blockSize().width}px"
		height="{block.type === BlockPathType.Value ? 36 : blockSize().height}px"
		style="position: absolute; top: 0; left: 0; pointer-events: none; z-index: -1;"
	>
		<path
			d={path()}
			fill={colors().fill}
			stroke={colors().stroke}
			stroke-width="2.5"
			style={block.valueTargetId ? `` : `filter: drop-shadow(0 4px 0 ${colors().shadow});`}
		/>
	</svg>

	{#if block.connection === 'Both' || block.connection === 'Input'}
		<span class="connection-input" data-input-id={block.id}></span>
	{/if}
	{#if (block.connection === 'Both' || block.connection === 'Output') && block.type !== BlockPathType.Value}
		<span class="connection-output" data-output-id={block.id}></span>
	{/if}
	{#if block.type === BlockPathType.Loop}
		<span class="connection-loop" data-loop-id={block.id}></span>
	{/if}
</div>

<style>
	.block-container {
		width: auto;
		user-select: none;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		cursor: grab;
	}

	.block-container.from-palette {
		margin: 10px 0;
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

	.content-value {
		height: 28px;
		display: flex;
		flex-direction: row;
		gap: 5px;
		align-items: center;
	}

	.content-value span {
		color: #fff;
		display: flex;
		align-items: center;
		justify-content: center;
		white-space: nowrap;
	}

	.content-value input {
		height: 25px;
		padding: 2px 6px;
		border-radius: 9999px;
		border: none;
		background: transparent;
		outline: none;
		overflow: visible;
		white-space: nowrap;
		box-sizing: border-box;
		field-sizing: content;
		transition: all 0.2s ease;
		pointer-events: auto;
	}

	.content-value input:not(.no-outline) {
		border: 2px solid;
		background: rgba(255, 255, 255, 0.9);
		color: #333;
		font-size: 12px;
	}

	.content-value input:focus {
		outline: none;
		background: white;
	}

	.content-selector {
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 4px;
		height: 28px;
		pointer-events: auto;
	}

	.content-selector span {
		color: #fff;
		white-space: nowrap;
	}

	.block-content p {
		pointer-events: none;
		margin: 0;
	}

	.block-content hr {
		width: 100%;
		border: none;
		border-top: 1px solid #ccc;
		margin: 5px 0;
	}

	.content-value {
		background: none;
		border: none;
		color: #fff;
		cursor: pointer;
		padding: 0;
		font-size: 16px;
	}

	.connection-input,
	.connection-output,
	.connection-loop {
		position: absolute;
		width: 40px;
		height: 20px;
		z-index: 1;
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
