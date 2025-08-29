/**
 * Connection path calculations with memoization
 * Provides optimized path calculations for block connections
 */

import type { Position } from '../../types/domain';
import {
	memoizeConnectionPath,
	memoizeBezierPath,
	memoizeConnectionPointPosition
} from './memoization';

// ===== 基本的な接続パス計算 =====

/**
 * 2点間のベジェ曲線パスを生成
 * @param start - 開始位置
 * @param end - 終了位置
 * @param controlOffset - 制御点のオフセット（デフォルト: 50）
 * @returns SVGパス文字列
 */
export function createBezierPath(
	start: Position,
	end: Position,
	controlOffset: number = 50
): string {
	const dx = end.x - start.x;
	const dy = end.y - start.y;

	// 水平距離に基づいて制御点のオフセットを調整
	const adaptiveOffset = Math.min(controlOffset, Math.abs(dx) / 2);

	const cp1x = start.x + adaptiveOffset;
	const cp1y = start.y;
	const cp2x = end.x - adaptiveOffset;
	const cp2y = end.y;

	return `M ${start.x} ${start.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${end.x} ${end.y}`;
}

/**
 * 直線パスを生成
 * @param start - 開始位置
 * @param end - 終了位置
 * @returns SVGパス文字列
 */
export function createStraightPath(start: Position, end: Position): string {
	return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
}

/**
 * ステップパス（階段状）を生成
 * @param start - 開始位置
 * @param end - 終了位置
 * @param stepRatio - ステップの比率（0-1、デフォルト: 0.5）
 * @returns SVGパス文字列
 */
export function createStepPath(start: Position, end: Position, stepRatio: number = 0.5): string {
	const dx = end.x - start.x;
	const midX = start.x + dx * stepRatio;

	return `M ${start.x} ${start.y} L ${midX} ${start.y} L ${midX} ${end.y} L ${end.x} ${end.y}`;
}

/**
 * 曲線パス（角丸）を生成
 * @param start - 開始位置
 * @param end - 終了位置
 * @param radius - 角の半径（デフォルト: 10）
 * @returns SVGパス文字列
 */
export function createRoundedPath(start: Position, end: Position, radius: number = 10): string {
	const dx = end.x - start.x;
	const dy = end.y - start.y;
	const midX = start.x + dx / 2;

	if (Math.abs(dy) < radius * 2) {
		// 垂直距離が小さい場合は直線
		return createStraightPath(start, end);
	}

	const r = Math.min(radius, Math.abs(dy) / 2);

	if (dy > 0) {
		// 下向き
		return `M ${start.x} ${start.y} L ${midX - r} ${start.y} Q ${midX} ${
			start.y
		} ${midX} ${start.y + r} L ${midX} ${end.y - r} Q ${midX} ${end.y} ${
			midX + r
		} ${end.y} L ${end.x} ${end.y}`;
	} else {
		// 上向き
		return `M ${start.x} ${start.y} L ${midX - r} ${start.y} Q ${midX} ${
			start.y
		} ${midX} ${start.y - r} L ${midX} ${end.y + r} Q ${midX} ${end.y} ${
			midX + r
		} ${end.y} L ${end.x} ${end.y}`;
	}
}

/**
 * 汎用接続パス生成
 * @param start - 開始位置
 * @param end - 終了位置
 * @param options - パスオプション
 * @returns SVGパス文字列
 */
export function createConnectionPath(
	start: Position,
	end: Position,
	options: {
		curveType?: 'bezier' | 'straight' | 'step' | 'rounded';
		offset?: number;
		stepRatio?: number;
		radius?: number;
	} = {}
): string {
	const { curveType = 'bezier', offset = 50, stepRatio = 0.5, radius = 10 } = options;

	switch (curveType) {
		case 'straight':
			return createStraightPath(start, end);
		case 'step':
			return createStepPath(start, end, stepRatio);
		case 'rounded':
			return createRoundedPath(start, end, radius);
		case 'bezier':
		default:
			return createBezierPath(start, end, offset);
	}
}

// ===== 接続ポイント位置計算 =====

/**
 * ブロック要素から出力接続ポイントの位置を取得
 * @param blockElement - ブロック要素
 * @returns 接続ポイントの位置、見つからない場合はnull
 */
export function getOutputConnectionPosition(blockElement: HTMLElement): Position | null {
	const outputElement = blockElement.querySelector('[data-output-id]') as HTMLElement;
	if (!outputElement) return null;

	const rect = outputElement.getBoundingClientRect();
	const containerRect = blockElement.getBoundingClientRect();

	return {
		x: rect.left + rect.width / 2 - containerRect.left,
		y: rect.top + rect.height / 2 - containerRect.top
	};
}

/**
 * ブロック要素から入力接続ポイントの位置を取得
 * @param blockElement - ブロック要素
 * @returns 接続ポイントの位置、見つからない場合はnull
 */
export function getInputConnectionPosition(blockElement: HTMLElement): Position | null {
	const inputElement = blockElement.querySelector('[data-input-id]') as HTMLElement;
	if (!inputElement) return null;

	const rect = inputElement.getBoundingClientRect();
	const containerRect = blockElement.getBoundingClientRect();

	return {
		x: rect.left + rect.width / 2 - containerRect.left,
		y: rect.top + rect.height / 2 - containerRect.top
	};
}

/**
 * 汎用接続ポイント位置取得
 * @param blockElement - ブロック要素
 * @param connectionType - 接続タイプ
 * @returns 接続ポイントの位置、見つからない場合はnull
 */
export function getConnectionPosition(
	blockElement: HTMLElement,
	connectionType: 'input' | 'output'
): Position | null {
	return connectionType === 'input'
		? getInputConnectionPosition(blockElement)
		: getOutputConnectionPosition(blockElement);
}

// ===== メモ化された関数のエクスポート =====

/**
 * メモ化されたベジェ曲線パス生成
 * 頻繁に呼び出される接続パス計算をキャッシュして性能を向上
 */
export const memoizedCreateBezierPath = memoizeBezierPath(createBezierPath);

/**
 * メモ化された接続パス生成
 * 汎用接続パス計算をキャッシュして性能を向上
 */
export const memoizedCreateConnectionPath = memoizeConnectionPath(createConnectionPath);

/**
 * メモ化された接続ポイント位置取得
 * DOM要素からの位置計算をキャッシュして性能を向上
 */
export const memoizedGetConnectionPosition = memoizeConnectionPointPosition(getConnectionPosition);

// ===== パフォーマンス監視用ユーティリティ =====

/**
 * 接続パス計算のパフォーマンス統計
 */
export interface ConnectionPathPerformanceStats {
	totalCalculations: number;
	cacheHits: number;
	cacheMisses: number;
	averageCalculationTime: number;
	cacheHitRatio: number;
}

/**
 * パフォーマンス統計を収集するメモ化ラッパー
 * @param fn - 元の関数
 * @param name - 関数名（統計用）
 * @returns パフォーマンス統計付きメモ化関数
 */
export function createPerformanceTrackedMemoization<T extends (...args: any[]) => any>(
	fn: T,
	name: string
): T & {
	getStats: () => ConnectionPathPerformanceStats;
	clearStats: () => void;
} {
	let totalCalculations = 0;
	let cacheHits = 0;
	let cacheMisses = 0;
	let totalCalculationTime = 0;

	const cache = new Map<string, any>();

	const memoizedFn = ((...args: any[]) => {
		const key = JSON.stringify(args);
		const startTime = performance.now();

		totalCalculations++;

		if (cache.has(key)) {
			cacheHits++;
			const endTime = performance.now();
			totalCalculationTime += endTime - startTime;
			return cache.get(key);
		}

		cacheMisses++;
		const result = fn(...args);
		cache.set(key, result);

		const endTime = performance.now();
		totalCalculationTime += endTime - startTime;

		return result;
	}) as T;

	(memoizedFn as any).getStats = (): ConnectionPathPerformanceStats => ({
		totalCalculations,
		cacheHits,
		cacheMisses,
		averageCalculationTime: totalCalculations > 0 ? totalCalculationTime / totalCalculations : 0,
		cacheHitRatio: totalCalculations > 0 ? cacheHits / totalCalculations : 0
	});

	(memoizedFn as any).clearStats = () => {
		totalCalculations = 0;
		cacheHits = 0;
		cacheMisses = 0;
		totalCalculationTime = 0;
		cache.clear();
	};

	return memoizedFn as T & {
		getStats: () => ConnectionPathPerformanceStats;
		clearStats: () => void;
	};
}

/**
 * パフォーマンス追跡付きメモ化されたベジェ曲線パス生成
 */
export const performanceTrackedBezierPath = createPerformanceTrackedMemoization(
	createBezierPath,
	'createBezierPath'
);

/**
 * パフォーマンス追跡付きメモ化された接続パス生成
 */
export const performanceTrackedConnectionPath = createPerformanceTrackedMemoization(
	createConnectionPath,
	'createConnectionPath'
);
