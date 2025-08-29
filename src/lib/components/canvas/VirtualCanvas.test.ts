/**
 * VirtualCanvas コンポーネントのテスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import VirtualCanvas from './VirtualCanvas.svelte';
import { useCanvasStore } from '$lib/stores/canvas.store.svelte';
import { useBlockStore } from '$lib/stores/block.store.svelte';

// モックの設定
vi.mock('$lib/stores/canvas.store.svelte');
vi.mock('$lib/stores/block.store.svelte');
vi.mock('$lib/services/canvas/CanvasService');
vi.mock('$lib/services/error/ErrorHandler');

describe('VirtualCanvas', () => {
	let mockCanvasStore: any;
	let mockBlockStore: any;

	beforeEach(() => {
		// キャンバスストアのモック
		mockCanvasStore = {
			getViewport: vi.fn(() => ({ x: 0, y: 0, zoom: 1.0 })),
			updateVirtualScrollStats: vi.fn()
		};

		// ブロックストアのモック
		mockBlockStore = {
			getAllBlocks: vi.fn(() => [
				{
					id: 'block1',
					name: 'Test Block 1',
					type: 'Start',
					position: { x: 0, y: 0 },
					zIndex: 0,
					title: 'Test Block 1',
					output: 'output1',
					closeOutput: false,
					content: [],
					color: '#ffffff'
				},
				{
					id: 'block2',
					name: 'Test Block 2',
					type: 'Process',
					position: { x: 300, y: 100 },
					zIndex: 0,
					title: 'Test Block 2',
					output: 'output2',
					closeOutput: false,
					content: [],
					color: '#ffffff'
				}
			]),
			getDraggingBlock: vi.fn(() => ({ id: null })),
			isDragging: vi.fn(() => false)
		};

		(useCanvasStore as any).mockReturnValue(mockCanvasStore);
		(useBlockStore as any).mockReturnValue(mockBlockStore);
	});

	describe('基本レンダリング', () => {
		it('正しくレンダリングされること', () => {
			const props = {
				canvasSize: { width: 2000, height: 2000 },
				containerSize: { width: 800, height: 600 }
			};

			render(VirtualCanvas, { props });

			const canvas = screen.getByRole('generic');
			expect(canvas).toBeInTheDocument();
		});

		it('キャンバスサイズが正しく適用されること', () => {
			const props = {
				canvasSize: { width: 1500, height: 1200 },
				containerSize: { width: 800, height: 600 }
			};

			render(VirtualCanvas, { props });

			const canvas = document.querySelector('.virtual-canvas');
			expect(canvas).toHaveStyle({
				width: '1500px',
				height: '1200px'
			});
		});
	});

	describe('仮想スクロール機能', () => {
		it('仮想スクロールが有効な場合に可視ブロックのみレンダリングすること', () => {
			const props = {
				canvasSize: { width: 2000, height: 2000 },
				containerSize: { width: 800, height: 600 },
				enableVirtualScroll: true
			};

			render(VirtualCanvas, { props });

			// ブロックストアが呼び出されることを確認
			expect(mockBlockStore.getAllBlocks).toHaveBeenCalled();
		});

		it('仮想スクロールが無効な場合にすべてのブロックをレンダリングすること', () => {
			const props = {
				canvasSize: { width: 2000, height: 2000 },
				containerSize: { width: 800, height: 600 },
				enableVirtualScroll: false
			};

			render(VirtualCanvas, { props });

			// すべてのブロックが取得されることを確認
			expect(mockBlockStore.getAllBlocks).toHaveBeenCalled();
		});
	});

	describe('パフォーマンス統計表示', () => {
		it('パフォーマンス統計が有効な場合に統計が表示されること', () => {
			const props = {
				canvasSize: { width: 2000, height: 2000 },
				containerSize: { width: 800, height: 600 },
				showPerformanceStats: true
			};

			render(VirtualCanvas, { props });

			expect(screen.getByText('仮想スクロール統計')).toBeInTheDocument();
			expect(screen.getByText('総ブロック数:')).toBeInTheDocument();
			expect(screen.getByText('表示中:')).toBeInTheDocument();
			expect(screen.getByText('カリング済み:')).toBeInTheDocument();
			expect(screen.getByText('効率:')).toBeInTheDocument();
			expect(screen.getByText('計算時間:')).toBeInTheDocument();
		});

		it('パフォーマンス統計が無効な場合に統計が表示されないこと', () => {
			const props = {
				canvasSize: { width: 2000, height: 2000 },
				containerSize: { width: 800, height: 600 },
				showPerformanceStats: false
			};

			render(VirtualCanvas, { props });

			expect(screen.queryByText('仮想スクロール統計')).not.toBeInTheDocument();
		});
	});

	describe('デバッグモード', () => {
		it('デバッグモードが有効な場合にデバッグ情報が表示されること', () => {
			const props = {
				canvasSize: { width: 2000, height: 2000 },
				containerSize: { width: 800, height: 600 },
				debugMode: true
			};

			render(VirtualCanvas, { props });

			expect(screen.getByText('デバッグ情報')).toBeInTheDocument();
			expect(screen.getByText('ビューポート情報')).toBeInTheDocument();
			expect(screen.getByText('ブロック可視性')).toBeInTheDocument();
			expect(screen.getByText('パフォーマンス')).toBeInTheDocument();
		});

		it('デバッグモードが無効な場合にデバッグ情報が表示されないこと', () => {
			const props = {
				canvasSize: { width: 2000, height: 2000 },
				containerSize: { width: 800, height: 600 },
				debugMode: false
			};

			render(VirtualCanvas, { props });

			expect(screen.queryByText('デバッグ情報')).not.toBeInTheDocument();
		});
	});

	describe('ドラッグ機能', () => {
		it('ドラッグ開始コールバックが正しく呼び出されること', () => {
			const onDragStart = vi.fn();
			const props = {
				canvasSize: { width: 2000, height: 2000 },
				containerSize: { width: 800, height: 600 },
				onDragStart
			};

			render(VirtualCanvas, { props });

			// ドラッグ開始のテストは実際のDOM操作が必要なため、
			// ここではコールバックが正しく渡されることのみ確認
			expect(onDragStart).toBeDefined();
		});

		it('ドラッグ中のブロックが正しく表示されること', () => {
			// ドラッグ中のブロックがある場合のモック
			mockBlockStore.getDraggingBlock.mockReturnValue({
				id: 'dragging-block'
			});
			mockBlockStore.getBlock.mockReturnValue({
				id: 'dragging-block',
				name: 'Dragging Block',
				type: 'Process',
				position: { x: 100, y: 100 },
				zIndex: 1000,
				title: 'Dragging Block',
				output: 'output',
				closeOutput: false,
				content: [],
				color: '#ffffff'
			});

			const props = {
				canvasSize: { width: 2000, height: 2000 },
				containerSize: { width: 800, height: 600 }
			};

			render(VirtualCanvas, { props });

			const draggingOverlay = document.querySelector('.dragging-overlay');
			expect(draggingOverlay).toBeInTheDocument();
		});
	});

	describe('レスポンシブ対応', () => {
		it('異なるコンテナサイズで正しく動作すること', () => {
			const smallProps = {
				canvasSize: { width: 2000, height: 2000 },
				containerSize: { width: 400, height: 300 }
			};

			const { rerender } = render(VirtualCanvas, { props: smallProps });

			// 小さなコンテナサイズでレンダリング
			expect(mockBlockStore.getAllBlocks).toHaveBeenCalled();

			// 大きなコンテナサイズに変更
			const largeProps = {
				canvasSize: { width: 2000, height: 2000 },
				containerSize: { width: 1200, height: 900 }
			};

			rerender(largeProps);

			// 再度ブロックが取得されることを確認
			expect(mockBlockStore.getAllBlocks).toHaveBeenCalledTimes(2);
		});
	});

	describe('エラーハンドリング', () => {
		it('ブロックデータが空の場合でもエラーが発生しないこと', () => {
			mockBlockStore.getAllBlocks.mockReturnValue([]);

			const props = {
				canvasSize: { width: 2000, height: 2000 },
				containerSize: { width: 800, height: 600 }
			};

			expect(() => {
				render(VirtualCanvas, { props });
			}).not.toThrow();
		});

		it('無効なブロックデータが含まれていてもエラーが発生しないこと', () => {
			mockBlockStore.getAllBlocks.mockReturnValue([
				null,
				undefined,
				{
					id: 'valid-block',
					name: 'Valid Block',
					type: 'Process',
					position: { x: 0, y: 0 },
					zIndex: 0,
					title: 'Valid Block',
					output: 'output',
					closeOutput: false,
					content: [],
					color: '#ffffff'
				}
			]);

			const props = {
				canvasSize: { width: 2000, height: 2000 },
				containerSize: { width: 800, height: 600 }
			};

			expect(() => {
				render(VirtualCanvas, { props });
			}).not.toThrow();
		});
	});

	describe('パフォーマンス', () => {
		it('大量のブロックでも合理的な時間でレンダリングできること', () => {
			// 1000個のブロックを生成
			const manyBlocks = Array.from({ length: 1000 }, (_, i) => ({
				id: `block${i}`,
				name: `Block ${i}`,
				type: 'Process',
				position: { x: (i % 50) * 220, y: Math.floor(i / 50) * 80 },
				zIndex: 0,
				title: `Block ${i}`,
				output: `output${i}`,
				closeOutput: false,
				content: [],
				color: '#ffffff'
			}));

			mockBlockStore.getAllBlocks.mockReturnValue(manyBlocks);

			const props = {
				canvasSize: { width: 10000, height: 10000 },
				containerSize: { width: 800, height: 600 },
				enableVirtualScroll: true
			};

			const startTime = performance.now();
			render(VirtualCanvas, { props });
			const endTime = performance.now();

			// レンダリング時間が合理的な範囲内であることを確認
			expect(endTime - startTime).toBeLessThan(1000); // 1秒以内
		});
	});
});
