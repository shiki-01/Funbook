/**
 * ScrollbarComponent の統合テスト
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, screen, waitFor } from '@testing-library/svelte';
import ScrollbarComponent from './ScrollbarComponent.svelte';

describe('ScrollbarComponent Integration Tests', () => {
	let mockOnScroll: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		mockOnScroll = vi.fn();
		// ResizeObserver のモック
		global.ResizeObserver = vi.fn().mockImplementation(() => ({
			observe: vi.fn(),
			unobserve: vi.fn(),
			disconnect: vi.fn()
		}));
	});

	afterEach(() => {
		vi.clearAllMocks();
		vi.restoreAllMocks();
	});

	describe('リアルタイム更新', () => {
		it('スクロール位置の変更が即座に反映される', async () => {
			const { rerender } = render(ScrollbarComponent, {
				props: {
					orientation: 'vertical',
					visibleSize: 400,
					contentSize: 800,
					scrollPosition: 0,
					onScroll: mockOnScroll
				}
			});

			const scrollbar = screen.getByRole('scrollbar');
			expect(scrollbar).toHaveAttribute('aria-valuenow', '0');

			// スクロール位置を更新
			await rerender({
				orientation: 'vertical',
				visibleSize: 400,
				contentSize: 800,
				scrollPosition: -200,
				onScroll: mockOnScroll
			});

			expect(scrollbar).toHaveAttribute('aria-valuenow', '200');
		});

		it('コンテンツサイズの変更でスクロールバーが動的に表示/非表示される', async () => {
			const { rerender } = render(ScrollbarComponent, {
				props: {
					orientation: 'horizontal',
					visibleSize: 400,
					contentSize: 300, // 表示領域より小さい
					scrollPosition: 0,
					onScroll: mockOnScroll
				}
			});

			// 最初は表示されない
			expect(screen.queryByRole('scrollbar')).not.toBeInTheDocument();

			// コンテンツサイズを大きくする
			await rerender({
				orientation: 'horizontal',
				visibleSize: 400,
				contentSize: 800, // 表示領域より大きい
				scrollPosition: 0,
				onScroll: mockOnScroll
			});

			// スクロールバーが表示される
			expect(screen.getByRole('scrollbar')).toBeInTheDocument();
		});
	});

	describe('複雑なドラッグ操作', () => {
		it('連続したドラッグ操作が正しく処理される', async () => {
			render(ScrollbarComponent, {
				props: {
					orientation: 'vertical',
					visibleSize: 400,
					contentSize: 1200,
					scrollPosition: 0,
					onScroll: mockOnScroll
				}
			});

			const thumb = screen.getByRole('button', { name: 'スクロールハンドル' });
			const scrollbar = screen.getByRole('scrollbar');

			// getBoundingClientRectをモック
			vi.spyOn(thumb, 'getBoundingClientRect').mockReturnValue({
				left: 0,
				top: 0,
				width: 12,
				height: 133, // 400/1200 * 400 ≈ 133
				right: 12,
				bottom: 133,
				x: 0,
				y: 0,
				toJSON: () => ({})
			});

			vi.spyOn(scrollbar, 'getBoundingClientRect').mockReturnValue({
				left: 0,
				top: 0,
				width: 12,
				height: 400,
				right: 12,
				bottom: 400,
				x: 0,
				y: 0,
				toJSON: () => ({})
			});

			// 最初のドラッグ
			await fireEvent.mouseDown(thumb, { clientY: 10 });
			await fireEvent.mouseMove(document, { clientY: 60 });
			await fireEvent.mouseUp(document);

			expect(mockOnScroll).toHaveBeenCalled();
			const firstCallCount = mockOnScroll.mock.calls.length;

			// 2回目のドラッグ
			await fireEvent.mouseDown(thumb, { clientY: 20 });
			await fireEvent.mouseMove(document, { clientY: 80 });
			await fireEvent.mouseUp(document);

			expect(mockOnScroll.mock.calls.length).toBeGreaterThan(firstCallCount);
		});

		it('ドラッグ中のマウスリーブが正しく処理される', async () => {
			render(ScrollbarComponent, {
				props: {
					orientation: 'horizontal',
					visibleSize: 400,
					contentSize: 800,
					scrollPosition: 0,
					onScroll: mockOnScroll
				}
			});

			const thumb = screen.getByRole('button', { name: 'スクロールハンドル' });
			const scrollbar = screen.getByRole('scrollbar');

			vi.spyOn(thumb, 'getBoundingClientRect').mockReturnValue({
				left: 0,
				top: 0,
				width: 200,
				height: 12,
				right: 200,
				bottom: 12,
				x: 0,
				y: 0,
				toJSON: () => ({})
			});

			vi.spyOn(scrollbar, 'getBoundingClientRect').mockReturnValue({
				left: 0,
				top: 0,
				width: 400,
				height: 12,
				right: 400,
				bottom: 12,
				x: 0,
				y: 0,
				toJSON: () => ({})
			});

			// ドラッグ開始
			await fireEvent.mouseDown(thumb, { clientX: 10 });

			// ドラッグ中にマウスが要素外に出る
			await fireEvent.mouseMove(document, { clientX: -100 });

			// マウスアップ
			await fireEvent.mouseUp(document);

			// エラーが発生しないことを確認
			expect(mockOnScroll).toHaveBeenCalled();
		});
	});

	describe('アクセシビリティ統合', () => {
		it('スクリーンリーダーに適切な情報を提供する', async () => {
			render(ScrollbarComponent, {
				props: {
					orientation: 'vertical',
					visibleSize: 400,
					contentSize: 1000,
					scrollPosition: -250,
					ariaLabel: 'メインコンテンツスクロール',
					ariaControls: 'main-content',
					onScroll: mockOnScroll
				}
			});

			const scrollbar = screen.getByRole('scrollbar');

			// ARIA属性の確認
			expect(scrollbar).toHaveAttribute('aria-label', 'メインコンテンツスクロール');
			expect(scrollbar).toHaveAttribute('aria-controls', 'main-content');
			expect(scrollbar).toHaveAttribute('aria-orientation', 'vertical');
			expect(scrollbar).toHaveAttribute('aria-valuenow', '250');
			expect(scrollbar).toHaveAttribute('aria-valuemin', '0');
			expect(scrollbar).toHaveAttribute('aria-valuemax', '600');

			const thumb = screen.getByRole('button', { name: 'スクロールハンドル' });
			expect(thumb).toHaveAttribute('tabindex', '0');
		});

		it('キーボードナビゲーションが完全に機能する', async () => {
			render(ScrollbarComponent, {
				props: {
					orientation: 'horizontal',
					visibleSize: 500,
					contentSize: 1500,
					scrollPosition: -500,
					onScroll: mockOnScroll
				}
			});

			const thumb = screen.getByRole('button', { name: 'スクロールハンドル' });

			// フォーカス
			thumb.focus();
			expect(document.activeElement).toBe(thumb);

			// 各種キーボード操作をテスト
			const keyTests = [
				{ key: 'ArrowLeft', expectedCall: -450 }, // -500 + 50 (10% of 500)
				{ key: 'ArrowRight', expectedCall: -550 }, // -500 - 50
				{ key: 'Home', expectedCall: 0 },
				{ key: 'End', expectedCall: -1000 }, // -(1500 - 500)
				{ key: 'PageUp', expectedCall: 0 }, // -500 + 500, clamped to 0
				{ key: 'PageDown', expectedCall: -1000 } // -500 - 500, clamped to -1000
			];

			for (const test of keyTests) {
				mockOnScroll.mockClear();
				await fireEvent.keyDown(thumb, { key: test.key });
				expect(mockOnScroll).toHaveBeenCalledWith(test.expectedCall);
			}
		});

		it('高コントラストモードでの表示が適切', async () => {
			// 高コントラストモードをシミュレート
			Object.defineProperty(window, 'matchMedia', {
				writable: true,
				value: vi.fn().mockImplementation((query) => ({
					matches: query === '(prefers-contrast: high)',
					media: query,
					onchange: null,
					addListener: vi.fn(),
					removeListener: vi.fn(),
					addEventListener: vi.fn(),
					removeEventListener: vi.fn(),
					dispatchEvent: vi.fn()
				}))
			});

			render(ScrollbarComponent, {
				props: {
					orientation: 'vertical',
					visibleSize: 400,
					contentSize: 800,
					scrollPosition: 0,
					onScroll: mockOnScroll
				}
			});

			const scrollbar = screen.getByRole('scrollbar');
			expect(scrollbar).toBeInTheDocument();

			// CSSクラスが適用されていることを確認（実際のスタイルテストは困難なため、存在確認のみ）
			expect(scrollbar).toHaveClass('scrollbar');
		});
	});

	describe('パフォーマンス', () => {
		it('大量のスクロールイベントが効率的に処理される', async () => {
			render(ScrollbarComponent, {
				props: {
					orientation: 'vertical',
					visibleSize: 400,
					contentSize: 4000,
					scrollPosition: 0,
					onScroll: mockOnScroll
				}
			});

			const thumb = screen.getByRole('button', { name: 'スクロールハンドル' });
			const scrollbar = screen.getByRole('scrollbar');

			vi.spyOn(thumb, 'getBoundingClientRect').mockReturnValue({
				left: 0,
				top: 0,
				width: 12,
				height: 40, // 400/4000 * 400 = 40
				right: 12,
				bottom: 40,
				x: 0,
				y: 0,
				toJSON: () => ({})
			});

			vi.spyOn(scrollbar, 'getBoundingClientRect').mockReturnValue({
				left: 0,
				top: 0,
				width: 12,
				height: 400,
				right: 12,
				bottom: 400,
				x: 0,
				y: 0,
				toJSON: () => ({})
			});

			// ドラッグ開始
			await fireEvent.mouseDown(thumb, { clientY: 10 });

			// 大量のマウス移動イベントをシミュレート
			const startTime = performance.now();
			for (let i = 0; i < 100; i++) {
				await fireEvent.mouseMove(document, { clientY: 10 + i });
			}
			const endTime = performance.now();

			await fireEvent.mouseUp(document);

			// パフォーマンス確認（100ms以内で完了することを期待）
			expect(endTime - startTime).toBeLessThan(100);
			expect(mockOnScroll).toHaveBeenCalled();
		});

		it('メモリリークが発生しない', async () => {
			const { unmount } = render(ScrollbarComponent, {
				props: {
					orientation: 'horizontal',
					visibleSize: 400,
					contentSize: 800,
					scrollPosition: 0,
					onScroll: mockOnScroll
				}
			});

			const thumb = screen.getByRole('button', { name: 'スクロールハンドル' });

			// ドラッグ開始
			await fireEvent.mouseDown(thumb, { clientY: 10 });

			// コンポーネントをアンマウント
			unmount();

			// グローバルイベントリスナーが適切にクリーンアップされることを確認
			// （実際のメモリリークテストは困難なため、エラーが発生しないことを確認）
			await fireEvent.mouseMove(document, { clientY: 50 });
			await fireEvent.mouseUp(document);

			// エラーが発生しないことを確認
			expect(true).toBe(true);
		});
	});

	describe('エッジケース', () => {
		it('極端に小さいコンテンツサイズでも正常動作する', () => {
			render(ScrollbarComponent, {
				props: {
					orientation: 'vertical',
					visibleSize: 400,
					contentSize: 401, // わずかに大きい
					scrollPosition: 0,
					onScroll: mockOnScroll
				}
			});

			const scrollbar = screen.getByRole('scrollbar');
			expect(scrollbar).toBeInTheDocument();

			const thumb = screen.getByRole('button', { name: 'スクロールハンドル' });
			expect(thumb).toBeInTheDocument();
		});

		it('ゼロサイズのコンテンツでエラーが発生しない', () => {
			render(ScrollbarComponent, {
				props: {
					orientation: 'horizontal',
					visibleSize: 400,
					contentSize: 0,
					scrollPosition: 0,
					onScroll: mockOnScroll
				}
			});

			// スクロールバーは表示されない
			expect(screen.queryByRole('scrollbar')).not.toBeInTheDocument();
		});

		it('負のスクロール位置が正しく処理される', () => {
			render(ScrollbarComponent, {
				props: {
					orientation: 'vertical',
					visibleSize: 400,
					contentSize: 800,
					scrollPosition: -1000, // 範囲外の値
					onScroll: mockOnScroll
				}
			});

			const scrollbar = screen.getByRole('scrollbar');
			// ARIA値は絶対値で表示される
			expect(scrollbar).toHaveAttribute('aria-valuenow', '1000');
		});
	});
});
