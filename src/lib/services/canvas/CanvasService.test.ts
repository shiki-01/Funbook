/**
 * Unit tests for CanvasService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CanvasService } from './CanvasService';
import type { Position, Viewport } from '$lib/types';
import type { Block } from '$lib/types/domain';
import { createMockErrorHandler } from '$lib/test/blockTestHelpers';

// Mock the block store
const mockBlockStore = {
	getViewport: vi.fn(),
	setViewportPosition: vi.fn(),
	setViewportZoom: vi.fn(),
	getAllBlocks: vi.fn()
};

// Mock the store import
vi.mock('$lib/utils/store.svelte', () => ({
	useBlockStore: () => mockBlockStore
}));

// Mock window object for tests
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

describe('CanvasService', () => {
	let canvasService: CanvasService;
	let mockViewport: Viewport;
	let mockErrorHandler: any;

	beforeEach(() => {
		mockErrorHandler = createMockErrorHandler();
		canvasService = new CanvasService(mockErrorHandler);
		mockViewport = { x: 100, y: 50, zoom: 1.5 };

		// Reset all mocks
		vi.clearAllMocks();

		// Set default mock implementations
		mockBlockStore.getViewport.mockReturnValue(mockViewport);
		mockBlockStore.getAllBlocks.mockReturnValue([]);
	});

	describe('座標変換', () => {
		it('スクリーン座標をキャンバス座標に正しく変換する', () => {
			const screenPos: Position = { x: 200, y: 150 };
			const result = canvasService.screenToCanvas(screenPos);

			expect(result).toEqual({
				x: (200 - 100) / 1.5, // (screenX - viewportX) / zoom
				y: (150 - 50) / 1.5 // (screenY - viewportY) / zoom
			});
		});

		it('キャンバス座標をスクリーン座標に正しく変換する', () => {
			const canvasPos: Position = { x: 100, y: 80 };
			const result = canvasService.canvasToScreen(canvasPos);

			expect(result).toEqual({
				x: 100 * 1.5 + 100, // canvasX * zoom + viewportX
				y: 80 * 1.5 + 50 // canvasY * zoom + viewportY
			});
		});

		it('座標変換の往復で元の値に戻る', () => {
			const originalPos: Position = { x: 300, y: 200 };
			const canvasPos = canvasService.screenToCanvas(originalPos);
			const backToScreen = canvasService.canvasToScreen(canvasPos);

			expect(backToScreen.x).toBeCloseTo(originalPos.x, 10);
			expect(backToScreen.y).toBeCloseTo(originalPos.y, 10);
		});
	});

	describe('ビューポート管理', () => {
		it('ビューポートを正しく更新する', () => {
			const newViewport: Viewport = { x: 200, y: 100, zoom: 2.0 };
			canvasService.updateViewport(newViewport);

			expect(mockBlockStore.setViewportPosition).toHaveBeenCalledWith({ x: 200, y: 100 });
			expect(mockBlockStore.setViewportZoom).toHaveBeenCalledWith(2.0);
		});

		it('ズームレベルを最小値に制限する', () => {
			const newViewport: Viewport = { x: 0, y: 0, zoom: 0.05 };
			canvasService.updateViewport(newViewport);

			expect(mockBlockStore.setViewportZoom).toHaveBeenCalledWith(0.1);
		});

		it('ズームレベルを最大値に制限する', () => {
			const newViewport: Viewport = { x: 0, y: 0, zoom: 5.0 };
			canvasService.updateViewport(newViewport);

			expect(mockBlockStore.setViewportZoom).toHaveBeenCalledWith(3.0);
		});

		it('現在のビューポートを取得する', () => {
			const result = canvasService.getViewport();
			expect(result).toBe(mockViewport);
			expect(mockBlockStore.getViewport).toHaveBeenCalled();
		});

		it('ビューポート位置のみを設定する', () => {
			const position: Position = { x: 150, y: 75 };
			canvasService.setViewportPosition(position);

			expect(mockBlockStore.setViewportPosition).toHaveBeenCalledWith(position);
		});

		it('ビューポートズームのみを設定する', () => {
			canvasService.setViewportZoom(2.5);
			expect(mockBlockStore.setViewportZoom).toHaveBeenCalledWith(2.5);
		});

		it('ズーム設定時に範囲を制限する', () => {
			canvasService.setViewportZoom(0.05);
			expect(mockBlockStore.setViewportZoom).toHaveBeenCalledWith(0.1);

			canvasService.setViewportZoom(5.0);
			expect(mockBlockStore.setViewportZoom).toHaveBeenCalledWith(3.0);
		});
	});

	describe('表示ブロック計算', () => {
		it('ビューポート内のブロックのみを返す', () => {
			const mockBlocks: Block[] = [
				{
					id: '1',
					name: 'Block1',
					type: 'Flag' as any,
					title: 'Test Block 1',
					output: 'output1',
					content: [],
					position: { x: 0, y: 0 },
					zIndex: 0,
					visibility: true,
					connection: 'Both' as any,
					draggable: true,
					editable: true,
					deletable: true
				},
				{
					id: '2',
					name: 'Block2',
					type: 'Flag' as any,
					title: 'Test Block 2',
					output: 'output2',
					content: [],
					position: { x: 2000, y: 2000 }, // 画面外
					zIndex: 0,
					visibility: true,
					connection: 'Both' as any,
					draggable: true,
					editable: true,
					deletable: true
				},
				{
					id: '3',
					name: 'Block3',
					type: 'Flag' as any,
					title: 'Test Block 3',
					output: 'output3',
					content: [],
					position: { x: 100, y: 100 },
					zIndex: 0,
					visibility: true,
					connection: 'Both' as any,
					draggable: true,
					editable: true,
					deletable: true
				}
			];

			mockBlockStore.getAllBlocks.mockReturnValue(mockBlocks);
			mockBlockStore.getViewport.mockReturnValue({ x: 0, y: 0, zoom: 1.0 });

			const visibleBlocks = canvasService.calculateVisibleBlocks();

			// 画面内のブロックのみが返されることを確認
			expect(visibleBlocks).toHaveLength(2);
			expect(visibleBlocks.map((b) => b.id)).toContain('1');
			expect(visibleBlocks.map((b) => b.id)).toContain('3');
			expect(visibleBlocks.map((b) => b.id)).not.toContain('2');
		});

		it('ブロックがない場合は空配列を返す', () => {
			mockBlockStore.getAllBlocks.mockReturnValue([]);

			const visibleBlocks = canvasService.calculateVisibleBlocks();
			expect(visibleBlocks).toEqual([]);
		});
	});

	describe('マウスイベント処理', () => {
		it('マウスイベントからキャンバス座標を正しく取得する', () => {
			const mockEvent = {
				clientX: 300,
				clientY: 200
			} as MouseEvent;

			const mockContainer = {
				getBoundingClientRect: vi.fn().mockReturnValue({
					left: 50,
					top: 30
				})
			} as unknown as HTMLElement;

			const result = canvasService.eventToCanvas(mockEvent, mockContainer);

			// スクリーン座標からコンテナの相対座標に変換してから、キャンバス座標に変換
			const expectedScreenPos = { x: 300 - 50, y: 200 - 30 };
			const expectedCanvasPos = {
				x: (expectedScreenPos.x - mockViewport.x) / mockViewport.zoom,
				y: (expectedScreenPos.y - mockViewport.y) / mockViewport.zoom
			};

			expect(result).toEqual(expectedCanvasPos);
		});
	});

	describe('キャンバス境界計算', () => {
		it('ブロックがある場合の境界を正しく計算する', () => {
			const mockBlocks: Block[] = [
				{
					id: '1',
					name: 'Block1',
					type: 'Flag' as any,
					title: 'Test Block 1',
					output: 'output1',
					content: [],
					position: { x: 100, y: 50 },
					zIndex: 0,
					visibility: true,
					connection: 'Both' as any,
					draggable: true,
					editable: true,
					deletable: true
				},
				{
					id: '2',
					name: 'Block2',
					type: 'Flag' as any,
					title: 'Test Block 2',
					output: 'output2',
					content: [],
					position: { x: 300, y: 200 },
					zIndex: 0,
					visibility: true,
					connection: 'Both' as any,
					draggable: true,
					editable: true,
					deletable: true
				}
			];

			mockBlockStore.getAllBlocks.mockReturnValue(mockBlocks);

			const bounds = canvasService.calculateCanvasBounds(100);

			expect(bounds.minX).toBe(0); // 100 - 100 (margin)
			expect(bounds.minY).toBe(-50); // 50 - 100 (margin)
			expect(bounds.maxX).toBe(600); // 300 + 200 (block width) + 100 (margin)
			expect(bounds.maxY).toBe(360); // 200 + 60 (block height) + 100 (margin)
			expect(bounds.width).toBe(600);
			expect(bounds.height).toBe(410);
		});

		it('ブロックがない場合のデフォルト境界を返す', () => {
			mockBlockStore.getAllBlocks.mockReturnValue([]);

			const bounds = canvasService.calculateCanvasBounds(500);

			expect(bounds.minX).toBe(-500);
			expect(bounds.minY).toBe(-500);
			expect(bounds.maxX).toBe(500);
			expect(bounds.maxY).toBe(500);
			expect(bounds.width).toBe(1000);
			expect(bounds.height).toBe(1000);
		});
	});

	describe('ズーム操作', () => {
		it('中心点なしでズームする', () => {
			mockBlockStore.getViewport.mockReturnValue({ x: 100, y: 50, zoom: 1.0 });

			canvasService.zoom(0.5);

			expect(mockBlockStore.setViewportZoom).toHaveBeenCalledWith(1.5);
		});

		it('指定された中心点でズームする', () => {
			mockBlockStore.getViewport.mockReturnValue({ x: 100, y: 50, zoom: 1.0 });

			const centerPoint: Position = { x: 200, y: 150 };
			canvasService.zoom(0.5, centerPoint);

			expect(mockBlockStore.setViewportZoom).toHaveBeenCalledWith(1.5);
			expect(mockBlockStore.setViewportPosition).toHaveBeenCalled();
		});

		it('ズーム範囲を制限する', () => {
			mockBlockStore.getViewport.mockReturnValue({ x: 0, y: 0, zoom: 0.1 });

			canvasService.zoom(-0.5); // 0.1 - 0.5 = -0.4, but should be clamped to 0.1

			expect(mockBlockStore.setViewportZoom).toHaveBeenCalledWith(0.1);
		});
	});

	describe('ビューポート操作', () => {
		it('指定位置に中央揃えする', () => {
			mockBlockStore.getViewport.mockReturnValue({ x: 0, y: 0, zoom: 1.0 });

			const targetPosition: Position = { x: 100, y: 50 };
			const containerSize = { width: 800, height: 600 };

			canvasService.centerViewportOn(targetPosition, containerSize);

			const expectedPosition = {
				x: 800 / 2 - 100 * 1.0, // containerWidth / 2 - targetX * zoom
				y: 600 / 2 - 50 * 1.0 // containerHeight / 2 - targetY * zoom
			};

			expect(mockBlockStore.setViewportPosition).toHaveBeenCalledWith(expectedPosition);
		});

		it('ビューポートをリセットする', () => {
			const containerSize = { width: 800, height: 600 };

			canvasService.resetViewport(containerSize);

			expect(mockBlockStore.setViewportZoom).toHaveBeenCalledWith(1.0);
			expect(mockBlockStore.setViewportPosition).toHaveBeenCalledWith({
				x: 400, // containerWidth / 2
				y: 300 // containerHeight / 2
			});
		});

		it('コンテナサイズが指定されない場合はwindowサイズを使用する', () => {
			canvasService.resetViewport();

			expect(mockBlockStore.setViewportZoom).toHaveBeenCalledWith(1.0);
			expect(mockBlockStore.setViewportPosition).toHaveBeenCalledWith({
				x: 1920 / 2, // window.innerWidth / 2
				y: 1080 / 2 // window.innerHeight / 2
			});
		});
	});

	describe('レンダリング最適化', () => {
		it('レンダリング最適化を実行する', () => {
			const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

			// NODE_ENVをdevelopmentに設定
			const originalEnv = process.env.NODE_ENV;
			process.env.NODE_ENV = 'development';

			mockBlockStore.getAllBlocks.mockReturnValue([
				{
					id: '1',
					name: 'Block1',
					type: 'Flag' as any,
					title: 'Test Block 1',
					output: 'output1',
					content: [],
					position: { x: 0, y: 0 },
					zIndex: 0,
					visibility: true,
					connection: 'Both' as any,
					draggable: true,
					editable: true,
					deletable: true
				} as Block,
				{
					id: '2',
					name: 'Block2',
					type: 'Flag' as any,
					title: 'Test Block 2',
					output: 'output2',
					content: [],
					position: { x: 100, y: 100 },
					zIndex: 0,
					visibility: true,
					connection: 'Both' as any,
					draggable: true,
					editable: true,
					deletable: true
				} as Block
			]);

			canvasService.optimizeRendering();

			expect(consoleSpy).toHaveBeenCalled();

			// 元の環境変数を復元
			process.env.NODE_ENV = originalEnv;
			consoleSpy.mockRestore();
		});
	});
});
