import { describe, it, expect } from 'vitest';

describe('ScrollbarComponent Logic', () => {
	describe('スクロール比率計算', () => {
		it('正常なスクロール比率が計算される', () => {
			const visibleSize = 400;
			const contentSize = 800;
			const scrollPosition = -200;

			const maxScroll = Math.max(0, contentSize - visibleSize);
			const scrollRatio = maxScroll > 0 ? Math.abs(scrollPosition) / maxScroll : 0;

			expect(scrollRatio).toBe(0.5);
		});

		it('ゼロ除算を回避する', () => {
			const visibleSize = 400;
			const contentSize = 400;
			const scrollPosition = -100;

			const maxScroll = Math.max(0, contentSize - visibleSize);
			const scrollRatio = maxScroll > 0 ? Math.abs(scrollPosition) / maxScroll : 0;

			expect(scrollRatio).toBe(0);
		});
	});

	describe('サムサイズ計算', () => {
		it('正常なサムサイズが計算される', () => {
			const visibleSize = 400;
			const contentSize = 800;
			const minThumbSize = 20;

			const ratio = visibleSize / contentSize;
			const thumbSize = Math.max(minThumbSize, visibleSize * ratio);

			expect(thumbSize).toBe(200);
		});

		it('最小サムサイズが適用される', () => {
			const visibleSize = 100;
			const contentSize = 10000;
			const minThumbSize = 20;

			const ratio = visibleSize / contentSize;
			const thumbSize = Math.max(minThumbSize, visibleSize * ratio);

			expect(thumbSize).toBe(minThumbSize);
		});
	});
});
