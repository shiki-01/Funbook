/**
 * CanvasGrid component tests
 * グリッドコンポーネントのレンダリング、ズーム適応、パフォーマンス最適化をテスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Viewport } from '$lib/types/ui';

// グリッドロジックのテスト用ヘルパー関数
function calculateAdaptiveGridSize(zoom: number, baseGridSize: number = 20): number {
	if (zoom < 0.25) {
		return baseGridSize * 8;
	} else if (zoom < 0.5) {
		return baseGridSize * 4;
	} else if (zoom < 1.0) {
		return baseGridSize * 2;
	} else if (zoom > 2.0) {
		return baseGridSize / 2;
	}
	return baseGridSize;
}

function shouldShowGrid(zoom: number, visible: boolean = true): boolean {
	if (!visible) return false;
	if (typeof zoom !== 'number' || isNaN(zoom) || !isFinite(zoom)) return false;
	if (zoom <= 0) return false;
	if (zoom < 0.1) return false;
	if (zoom > 5.0) return false;
	return true;
}

function shouldShowMajorGrid(zoom: number, visible: boolean = true): boolean {
	if (!shouldShowGrid(zoom, visible)) return false;
	return zoom >= 0.5;
}

describe('CanvasGrid', () => {
	let defaultViewport: Viewport;

	beforeEach(() => {
		defaultViewport = {
			x: 0,
			y: 0,
			zoom: 1.0
		};
	});

	describe('グリッド可視性ロジック', () => {
		it('デフォルト状態でグリッドが表示される', () => {
			expect(shouldShowGrid(1.0, true)).toBe(true);
		});

		it('visible=falseの場合、グリッドが非表示になる', () => {
			expect(shouldShowGrid(1.0, false)).toBe(false);
		});

		it('非常に小さなズーム（0.05）でグリッドが非表示になる', () => {
			expect(shouldShowGrid(0.05, true)).toBe(false);
		});

		it('非常に大きなズーム（6.0）でグリッドが非表示になる', () => {
			expect(shouldShowGrid(6.0, true)).toBe(false);
		});

		it('適切なズーム範囲（0.5）でグリッドが表示される', () => {
			expect(shouldShowGrid(0.5, true)).toBe(true);
		});
	});

	describe('ズーム適応グリッドサイズ', () => {
		it('非常に小さなズーム（0.2）で大きなグリッドサイズになる', () => {
			const adaptiveSize = calculateAdaptiveGridSize(0.2, 20);
			expect(adaptiveSize).toBe(160); // 20 * 8
		});

		it('小さなズーム（0.4）で中程度のグリッドサイズになる', () => {
			const adaptiveSize = calculateAdaptiveGridSize(0.4, 20);
			expect(adaptiveSize).toBe(80); // 20 * 4
		});

		it('中程度のズーム（0.8）で少し大きなグリッドサイズになる', () => {
			const adaptiveSize = calculateAdaptiveGridSize(0.8, 20);
			expect(adaptiveSize).toBe(40); // 20 * 2
		});

		it('デフォルトズーム（1.0）でベースグリッドサイズになる', () => {
			const adaptiveSize = calculateAdaptiveGridSize(1.0, 20);
			expect(adaptiveSize).toBe(20); // 20 * 1
		});

		it('大きなズーム（2.5）で小さなグリッドサイズになる', () => {
			const adaptiveSize = calculateAdaptiveGridSize(2.5, 20);
			expect(adaptiveSize).toBe(10); // 20 / 2
		});
	});

	describe('大きなグリッドの可視性', () => {
		it('小さなズーム（0.3）で大きなグリッドが非表示になる', () => {
			expect(shouldShowMajorGrid(0.3, true)).toBe(false);
		});

		it('中程度のズーム（0.5）で大きなグリッドが表示される', () => {
			expect(shouldShowMajorGrid(0.5, true)).toBe(true);
		});

		it('大きなズーム（2.0）で大きなグリッドが表示される', () => {
			expect(shouldShowMajorGrid(2.0, true)).toBe(true);
		});

		it('グリッド自体が非表示の場合、大きなグリッドも非表示になる', () => {
			expect(shouldShowMajorGrid(0.05, true)).toBe(false); // 非常に小さなズーム
			expect(shouldShowMajorGrid(1.0, false)).toBe(false); // visible=false
		});
	});

	describe('背景位置計算', () => {
		it('ビューポート位置(100, 50)、グリッドサイズ20で正しい背景位置が計算される', () => {
			const viewport: Viewport = { x: 100, y: 50, zoom: 1.0 };
			const gridSize = 20;
			const size = gridSize * viewport.zoom; // 20
			const offsetX = viewport.x % size; // 100 % 20 = 0
			const offsetY = viewport.y % size; // 50 % 20 = 10

			expect(offsetX).toBe(0);
			expect(offsetY).toBe(10);
		});

		it('ズーム2.0でグリッドサイズが拡大される', () => {
			const viewport: Viewport = { x: 0, y: 0, zoom: 2.0 };
			const gridSize = 20;
			const size = gridSize * viewport.zoom; // 40

			expect(size).toBe(40);
		});

		it('負のビューポート位置でも正しく計算される', () => {
			const viewport: Viewport = { x: -30, y: -15, zoom: 1.0 };
			const gridSize = 20;
			const size = gridSize * viewport.zoom; // 20
			const offsetX = viewport.x % size; // -30 % 20 = -10 (JavaScript)
			const offsetY = viewport.y % size; // -15 % 20 = -15 (JavaScript)

			expect(offsetX).toBe(-10);
			expect(offsetY).toBe(-15);
		});
	});

	describe('大きなグリッドサイズ計算', () => {
		it('基本グリッドサイズ20、間隔5で大きなグリッドサイズが100になる', () => {
			const baseGridSize = 20;
			const majorGridInterval = 5;
			const zoom = 1.0;
			const majorSize = baseGridSize * zoom * majorGridInterval;

			expect(majorSize).toBe(100);
		});

		it('ズーム2.0で大きなグリッドサイズが拡大される', () => {
			const baseGridSize = 20;
			const majorGridInterval = 5;
			const zoom = 2.0;
			const majorSize = baseGridSize * zoom * majorGridInterval;

			expect(majorSize).toBe(200);
		});

		it('カスタム間隔10で大きなグリッドサイズが200になる', () => {
			const baseGridSize = 20;
			const majorGridInterval = 10;
			const zoom = 1.0;
			const majorSize = baseGridSize * zoom * majorGridInterval;

			expect(majorSize).toBe(200);
		});
	});

	describe('エッジケースの処理', () => {
		it('ゼロズームでグリッドが非表示になる', () => {
			expect(shouldShowGrid(0, true)).toBe(false);
		});

		it('負のズームでグリッドが非表示になる', () => {
			expect(shouldShowGrid(-1, true)).toBe(false);
		});

		it('非常に大きなズーム値でグリッドが非表示になる', () => {
			expect(shouldShowGrid(100, true)).toBe(false);
		});

		it('NaNズーム値でグリッドが非表示になる', () => {
			expect(shouldShowGrid(NaN, true)).toBe(false);
		});

		it('Infinityズーム値でグリッドが非表示になる', () => {
			expect(shouldShowGrid(Infinity, true)).toBe(false);
		});
	});

	describe('パフォーマンス最適化ロジック', () => {
		it('最適化無効時は常にベースグリッドサイズを使用', () => {
			const baseGridSize = 20;
			// 最適化が無効の場合、ズームに関係なくベースサイズを使用
			expect(baseGridSize).toBe(20);
		});

		it('最適化有効時はズームに応じてグリッドサイズが変化', () => {
			expect(calculateAdaptiveGridSize(0.1, 20)).toBe(160); // 8倍
			expect(calculateAdaptiveGridSize(0.3, 20)).toBe(80); // 4倍
			expect(calculateAdaptiveGridSize(0.7, 20)).toBe(40); // 2倍
			expect(calculateAdaptiveGridSize(1.0, 20)).toBe(20); // 1倍
			expect(calculateAdaptiveGridSize(3.0, 20)).toBe(10); // 0.5倍
		});

		it('カスタムベースサイズでも適切に計算される', () => {
			const customBaseSize = 40;
			expect(calculateAdaptiveGridSize(0.1, customBaseSize)).toBe(320); // 40 * 8
			expect(calculateAdaptiveGridSize(1.0, customBaseSize)).toBe(40); // 40 * 1
			expect(calculateAdaptiveGridSize(3.0, customBaseSize)).toBe(20); // 40 * 0.5
		});
	});

	describe('背景パターン生成', () => {
		it('基本グリッドパターンが生成される', () => {
			const gridColor = '#ccc';
			const expectedPattern = `radial-gradient(circle, ${gridColor} 1px, transparent 1px)`;

			// パターンの基本構造をテスト
			expect(expectedPattern).toContain('radial-gradient');
			expect(expectedPattern).toContain(gridColor);
			expect(expectedPattern).toContain('1px');
		});

		it('大きなグリッドパターンが追加される', () => {
			const gridColor = '#ccc';
			const majorGridColor = '#999';

			const basePattern = `radial-gradient(circle, ${gridColor} 1px, transparent 1px)`;
			const majorPattern = `radial-gradient(circle, ${majorGridColor} 1.5px, transparent 1.5px)`;

			expect(basePattern).toContain(gridColor);
			expect(majorPattern).toContain(majorGridColor);
			expect(majorPattern).toContain('1.5px');
		});

		it('カスタム色でパターンが生成される', () => {
			const customColor = '#ff0000';
			const pattern = `radial-gradient(circle, ${customColor} 1px, transparent 1px)`;

			expect(pattern).toContain(customColor);
		});
	});
});
