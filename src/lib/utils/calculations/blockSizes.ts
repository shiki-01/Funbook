/**
 * Block size calculations with memoization
 * Provides optimized size calculations for different block types
 */

import type { Block, Size } from '../../types/domain';
import { memoizeBlockSizeCalculation } from './memoization';
import { memoize } from '../helpers';

// ===== 基本的なブロックサイズ計算 =====

/**
 * ブロックタイプに基づく基本サイズを取得
 * @param blockType - ブロックタイプ
 * @returns 基本サイズ
 */
export function getBaseBlockSize(blockType: string): Size {
	switch (blockType) {
		case 'value':
			return { width: 150, height: 40 };
		case 'loop':
			return { width: 250, height: 80 };
		case 'condition':
			return { width: 220, height: 70 };
		case 'function':
			return { width: 180, height: 50 };
		case 'variable':
			return { width: 160, height: 45 };
		case 'output':
			return { width: 200, height: 55 };
		default:
			return { width: 200, height: 60 };
	}
}

/**
 * コンテンツに基づくサイズ調整を計算
 * @param content - ブロックコンテンツ
 * @param baseSize - 基本サイズ
 * @returns 調整されたサイズ
 */
export function calculateContentBasedSize(content: any[] = [], baseSize: Size): Size {
	if (content.length === 0) {
		return baseSize;
	}

	// コンテンツの高さ計算
	const contentHeight = content.length * 25; // 各コンテンツアイテムあたり25px
	const adjustedHeight = Math.max(baseSize.height, contentHeight + 20); // パディング20px

	// 長いテキストがある場合の幅調整
	const maxTextLength = content.reduce((max, item) => {
		const text = item.content?.title || item.title || '';
		return Math.max(max, text.length);
	}, 0);

	let adjustedWidth = baseSize.width;
	if (maxTextLength > 20) {
		adjustedWidth = Math.max(baseSize.width, maxTextLength * 8); // 文字あたり8px
	}

	return {
		width: adjustedWidth,
		height: adjustedHeight
	};
}

/**
 * ズームレベルに基づくサイズスケーリング
 * @param size - 基本サイズ
 * @param zoom - ズームレベル
 * @returns スケーリングされたサイズ
 */
export function scaleBlockSize(size: Size, zoom: number): Size {
	return {
		width: size.width * zoom,
		height: size.height * zoom
	};
}

/**
 * コンテナ幅制限の適用
 * @param size - サイズ
 * @param containerWidth - コンテナ幅
 * @param maxRatio - 最大幅比率（デフォルト: 0.8）
 * @returns 制限適用後のサイズ
 */
export function applyContainerWidthLimit(
	size: Size,
	containerWidth?: number,
	maxRatio: number = 0.8
): Size {
	if (!containerWidth || size.width <= containerWidth * maxRatio) {
		return size;
	}

	const ratio = (containerWidth * maxRatio) / size.width;
	return {
		width: size.width * ratio,
		height: size.height * ratio
	};
}

/**
 * 包括的なブロックサイズ計算
 * @param block - ブロック
 * @param context - 計算コンテキスト
 * @returns 計算されたサイズ
 */
export function calculateBlockSize(
	block: Block,
	context: { zoom: number; containerWidth?: number }
): Size {
	// 基本サイズを取得
	const baseSize = getBaseBlockSize(block.type);

	// コンテンツに基づく調整
	const contentAdjustedSize = calculateContentBasedSize(block.content || [], baseSize);

	// ズームレベルでスケーリング
	const scaledSize = scaleBlockSize(contentAdjustedSize, context.zoom);

	// コンテナ幅制限を適用
	const finalSize = applyContainerWidthLimit(scaledSize, context.containerWidth);

	return finalSize;
}

/**
 * 複数ブロックの最大サイズを計算
 * @param blocks - ブロック配列
 * @param context - 計算コンテキスト
 * @returns 最大サイズ
 */
export function calculateMaxBlockSize(
	blocks: Block[],
	context: { zoom: number; containerWidth?: number }
): Size {
	if (blocks.length === 0) {
		return { width: 0, height: 0 };
	}

	let maxWidth = 0;
	let maxHeight = 0;

	blocks.forEach((block) => {
		const size = calculateBlockSize(block, context);
		maxWidth = Math.max(maxWidth, size.width);
		maxHeight = Math.max(maxHeight, size.height);
	});

	return { width: maxWidth, height: maxHeight };
}

/**
 * ブロック間の推奨間隔を計算
 * @param blockSize - ブロックサイズ
 * @param zoom - ズームレベル
 * @returns 推奨間隔
 */
export function calculateBlockSpacing(blockSize: Size, zoom: number): number {
	const baseSpacing = 20;
	const scaledSpacing = baseSpacing * zoom;

	// ブロックサイズに基づく動的調整
	const sizeBasedSpacing = Math.max(blockSize.width, blockSize.height) * 0.1;

	return Math.max(scaledSpacing, sizeBasedSpacing);
}

/**
 * グリッドに合わせたブロックサイズ調整
 * @param size - 元のサイズ
 * @param gridSize - グリッドサイズ
 * @returns グリッドに合わせたサイズ
 */
export function snapBlockSizeToGrid(size: Size, gridSize: number): Size {
	return {
		width: Math.ceil(size.width / gridSize) * gridSize,
		height: Math.ceil(size.height / gridSize) * gridSize
	};
}

// ===== 特殊ブロックタイプのサイズ計算 =====

/**
 * ループブロックの内部サイズを計算
 * @param loopBlock - ループブロック
 * @param childBlocks - 子ブロック配列
 * @param context - 計算コンテキスト
 * @returns 内部サイズ
 */
export function calculateLoopInternalSize(
	loopBlock: Block,
	childBlocks: Block[],
	context: { zoom: number; containerWidth?: number }
): Size {
	if (childBlocks.length === 0) {
		return getBaseBlockSize('loop');
	}

	// 子ブロックの配置を考慮したサイズ計算
	let totalWidth = 0;
	let maxHeight = 0;

	childBlocks.forEach((child) => {
		const childSize = calculateBlockSize(child, context);
		totalWidth += childSize.width;
		maxHeight = Math.max(maxHeight, childSize.height);
	});

	// 間隔を追加
	const spacing = calculateBlockSpacing({ width: totalWidth, height: maxHeight }, context.zoom);
	totalWidth += (childBlocks.length - 1) * spacing;

	// ループブロック自体のパディングを追加
	const padding = 40 * context.zoom;

	return {
		width: Math.max(totalWidth + padding * 2, getBaseBlockSize('loop').width * context.zoom),
		height: Math.max(maxHeight + padding * 2, getBaseBlockSize('loop').height * context.zoom)
	};
}

/**
 * 条件ブロックのサイズを計算
 * @param conditionBlock - 条件ブロック
 * @param context - 計算コンテキスト
 * @returns 計算されたサイズ
 */
export function calculateConditionBlockSize(
	conditionBlock: Block,
	context: { zoom: number; containerWidth?: number }
): Size {
	const baseSize = calculateBlockSize(conditionBlock, context);

	// 条件ブロックは分岐を表示するため追加の高さが必要
	const branchHeight = 30 * context.zoom;

	return {
		width: baseSize.width,
		height: baseSize.height + branchHeight
	};
}

// ===== メモ化された関数のエクスポート =====

/**
 * メモ化されたブロックサイズ計算
 * 頻繁に呼び出されるサイズ計算をキャッシュして性能を向上
 */
export const memoizedCalculateBlockSize = memoizeBlockSizeCalculation(calculateBlockSize);

/**
 * メモ化された最大ブロックサイズ計算
 * 複数ブロックの最大サイズ計算をキャッシュして性能を向上
 */
export const memoizedCalculateMaxBlockSize = memoize(
	calculateMaxBlockSize,
	(blocks: Block[], context: { zoom: number; containerWidth?: number }) => {
		const blockIds = blocks
			.map((b) => b.id)
			.sort()
			.join(',');
		return `maxSize-${blockIds}-${context.zoom.toFixed(3)}-${context.containerWidth || 0}`;
	}
);

/**
 * メモ化されたループ内部サイズ計算
 * 複雑なループブロックのサイズ計算をキャッシュして性能を向上
 */
export const memoizedCalculateLoopInternalSize = memoize(
	(loopBlock: Block, childBlocks: Block[], context: { zoom: number; containerWidth?: number }) =>
		calculateLoopInternalSize(loopBlock, childBlocks, context),
	(loopBlock: Block, childBlocks: Block[], context: { zoom: number; containerWidth?: number }) => {
		const childIds = childBlocks
			.map((b) => b.id)
			.sort()
			.join(',');
		return `loopSize-${loopBlock.id}-${childIds}-${context.zoom.toFixed(3)}-${context.containerWidth || 0}`;
	}
);

/**
 * メモ化された条件ブロックサイズ計算
 * 条件ブロックの特殊サイズ計算をキャッシュして性能を向上
 */
export const memoizedCalculateConditionBlockSize = memoizeBlockSizeCalculation(
	calculateConditionBlockSize
);
