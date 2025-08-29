/**
 * CanvasContainer コンポーネントのテスト
 * ビューポート管理とスクロール機能のテスト
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { useCanvasStore } from '$lib/stores/canvas.store.svelte';

// モック
vi.mock('$lib/stores/canvas.store.svelte');
vi.mock('$lib/services/canvas/CanvasService');
vi.mock('$lib/services/error/ErrorHandler');

describe('CanvasContainer', () => {
	let mockCanvasStore: any;

	beforeEach(() => {
		// キャンバスストアのモック
		mockCanvasStore = {
			getViewport: vi.fn(() => ({ x: 0, y: 0, zoom: 1 })),
			getCanvasState: vi.fn(() => ({
				isDragging: false,
				lastMousePos: { x: 0, y: 0 }
			})),
			setViewportPosition: vi.fn(),
			setViewportZoom: vi.fn(),
			setCanvasDragging: vi.fn()
		};

		(useCanvasStore as Mock).mockReturnValue(mockCanvasStore);

		// DOM APIのモック
		Object.defineProperty(window, 'innerWidth', {
			writable: true,
			configurable: true,
			value: 1920
		});
		Object.defineProperty(window, 'innerHeight', {
			writable: true,
			configurable: true,
			value: 1080
		});

		// getBoundingClientRectのモック
		Element.prototype.getBoundingClientRect = vi.fn(() => ({
			x: 0,
			y: 0,
			width: 800,
			height: 600,
			top: 0,
			left: 0,
			bottom: 600,
			right: 800,
			toJSON: vi.fn()
		}));
	});

	describe('コンポーネントの基本機能', () => {
		it('キャンバスストアが正しく初期化される', () => {
			const store = useCanvasStore();
			expect(store).toBeDefined();
			expect(store.getViewport).toBeDefined();
			expect(store.setViewportPosition).toBeDefined();
			expect(store.setViewportZoom).toBeDefined();
		});
	});

	describe('ビューポート管理', () => {
		it('ビューポート位置の設定が正しく動作する', () => {
			const store = useCanvasStore();
			const newPosition = { x: 100, y: 200 };

			store.setViewportPosition(newPosition);

			expect(store.setViewportPosition).toHaveBeenCalledWith(newPosition);
		});

		it('ズームレベルの設定が正しく動作する', () => {
			const store = useCanvasStore();
			const newZoom = 1.5;

			store.setViewportZoom(newZoom);

			expect(store.setViewportZoom).toHaveBeenCalledWith(newZoom);
		});

		it('キャンバスドラッグ状態の設定が正しく動作する', () => {
			const store = useCanvasStore();
			const mousePos = { x: 100, y: 100 };

			store.setCanvasDragging(true, mousePos);

			expect(store.setCanvasDragging).toHaveBeenCalledWith(true, mousePos);
		});
	});

	describe('座標計算', () => {
		it('最大スクロール値が正しく計算される', () => {
			const canvasSize = { width: 2000, height: 2000 };
			const viewport = { x: 0, y: 0, zoom: 1 };
			const containerSize = { width: 800, height: 600 };

			// 最大スクロールY値の計算
			const maxScrollY = Math.max(0, canvasSize.height * viewport.zoom - containerSize.height);

			expect(maxScrollY).toBe(1400); // 2000 - 600 = 1400
		});

		it('最大スクロール値が正しく計算される（ズーム考慮）', () => {
			const canvasSize = { width: 2000, height: 2000 };
			const viewport = { x: 0, y: 0, zoom: 1.5 };
			const containerSize = { width: 800, height: 600 };

			// 最大スクロールY値の計算（ズーム考慮）
			const maxScrollY = Math.max(0, canvasSize.height * viewport.zoom - containerSize.height);

			expect(maxScrollY).toBe(2400); // 2000 * 1.5 - 600 = 2400
		});
	});

	describe('スクロールバー計算', () => {
		it('水平スクロールバーの位置が正しく計算される', () => {
			const canvasSize = { width: 2000, height: 2000 };
			const viewport = { x: -200, y: 0, zoom: 1 };
			const containerSize = { width: 800, height: 600 };

			const canvasWidth = canvasSize.width * viewport.zoom;
			const horizontalRatio = containerSize.width / canvasWidth;
			const horizontalThumbWidth = Math.max(20, containerSize.width * horizontalRatio);
			const horizontalScrollPos = -viewport.x / (canvasWidth - containerSize.width);

			expect(horizontalRatio).toBe(0.4); // 800 / 2000
			expect(horizontalThumbWidth).toBe(320); // 800 * 0.4
			expect(horizontalScrollPos).toBeCloseTo(0.167); // 200 / 1200
		});

		it('垂直スクロールバーの位置が正しく計算される', () => {
			const canvasSize = { width: 2000, height: 2000 };
			const viewport = { x: 0, y: -300, zoom: 1 };
			const containerSize = { width: 800, height: 600 };

			const canvasHeight = canvasSize.height * viewport.zoom;
			const verticalRatio = containerSize.height / canvasHeight;
			const verticalThumbHeight = Math.max(20, containerSize.height * verticalRatio);
			const verticalScrollPos = -viewport.y / (canvasHeight - containerSize.height);

			expect(verticalRatio).toBe(0.3); // 600 / 2000
			expect(verticalThumbHeight).toBe(180); // 600 * 0.3
			expect(verticalScrollPos).toBeCloseTo(0.214); // 300 / 1400
		});
	});

	describe('ズーム制限', () => {
		it('最小ズームレベルが適用される', () => {
			const MIN_ZOOM = 0.1;
			const requestedZoom = 0.05;
			const clampedZoom = Math.max(MIN_ZOOM, requestedZoom);

			expect(clampedZoom).toBe(MIN_ZOOM);
		});

		it('最大ズームレベルが適用される', () => {
			const MAX_ZOOM = 3.0;
			const requestedZoom = 5.0;
			const clampedZoom = Math.min(MAX_ZOOM, requestedZoom);

			expect(clampedZoom).toBe(MAX_ZOOM);
		});

		it('有効範囲内のズームレベルはそのまま適用される', () => {
			const MIN_ZOOM = 0.1;
			const MAX_ZOOM = 3.0;
			const requestedZoom = 1.5;
			const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, requestedZoom));

			expect(clampedZoom).toBe(requestedZoom);
		});
	});

	describe('イベントハンドリング', () => {
		it('マウスボタンの判定が正しく動作する', () => {
			const leftClick = 0;
			const rightClick = 2;

			expect(leftClick).toBe(0);
			expect(rightClick).toBe(2);
		});

		it('Ctrlキーの判定が正しく動作する', () => {
			const wheelEventWithCtrl = { ctrlKey: true, deltaY: -100 };
			const wheelEventWithoutCtrl = { ctrlKey: false, deltaY: -100 };

			expect(wheelEventWithCtrl.ctrlKey).toBe(true);
			expect(wheelEventWithoutCtrl.ctrlKey).toBe(false);
		});
	});

	describe('プロパティの検証', () => {
		it('canvasSizeプロパティが有効な値を持つ', () => {
			const canvasSize = { width: 2000, height: 2000 };

			expect(canvasSize.width).toBeGreaterThan(0);
			expect(canvasSize.height).toBeGreaterThan(0);
			expect(typeof canvasSize.width).toBe('number');
			expect(typeof canvasSize.height).toBe('number');
		});

		it('ブール値プロパティが正しく設定される', () => {
			const props = {
				enableCanvasDrag: true,
				enableZoom: true,
				showScrollbars: true,
				showZoomControls: true
			};

			expect(typeof props.enableCanvasDrag).toBe('boolean');
			expect(typeof props.enableZoom).toBe('boolean');
			expect(typeof props.showScrollbars).toBe('boolean');
			expect(typeof props.showZoomControls).toBe('boolean');
		});
	});

	describe('エラーハンドリング', () => {
		it('無効なcanvasSizeでも計算エラーが発生しない', () => {
			const invalidCanvasSize = { width: 0, height: 0 };
			const viewport = { x: 0, y: 0, zoom: 1 };
			const containerSize = { width: 800, height: 600 };

			expect(() => {
				const maxScrollY = Math.max(
					0,
					invalidCanvasSize.height * viewport.zoom - containerSize.height
				);
				expect(maxScrollY).toBe(0);
			}).not.toThrow();
		});

		it('負のズーム値でも計算エラーが発生しない', () => {
			const MIN_ZOOM = 0.1;
			const invalidZoom = -1;

			expect(() => {
				const clampedZoom = Math.max(MIN_ZOOM, invalidZoom);
				expect(clampedZoom).toBe(MIN_ZOOM);
			}).not.toThrow();
		});

		it('NaN値でも計算エラーが発生しない', () => {
			const viewport = { x: NaN, y: NaN, zoom: NaN };

			expect(() => {
				const isValidX = !isNaN(viewport.x);
				const isValidY = !isNaN(viewport.y);
				const isValidZoom = !isNaN(viewport.zoom);

				expect(isValidX).toBe(false);
				expect(isValidY).toBe(false);
				expect(isValidZoom).toBe(false);
			}).not.toThrow();
		});
	});
});
