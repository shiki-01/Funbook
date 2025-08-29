/**
 * キャンバスストアのユニットテスト
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CanvasStore, CanvasStateError } from './canvas.store.svelte';
import type { Viewport } from '$lib/types/ui';
import type { Position } from '$lib/types';

describe('CanvasStore', () => {
	let canvasStore: CanvasStore;

	beforeEach(() => {
		canvasStore = new CanvasStore();
	});

	describe('ビューポート操作', () => {
		it('初期ビューポートが正しく設定されている', () => {
			const viewport = canvasStore.getViewport();
			expect(viewport).toEqual({
				x: 0,
				y: 0,
				zoom: 1.0
			});
		});

		it('ビューポートを設定できる', () => {
			const newViewport: Viewport = { x: 100, y: 200, zoom: 1.5 };
			canvasStore.setViewport(newViewport);

			const viewport = canvasStore.getViewport();
			expect(viewport).toEqual(newViewport);
		});

		it('ビューポート位置を設定できる', () => {
			const position: Position = { x: 150, y: 250 };
			canvasStore.setViewportPosition(position);

			const viewport = canvasStore.getViewport();
			expect(viewport.x).toBe(150);
			expect(viewport.y).toBe(250);
			expect(viewport.zoom).toBe(1.0); // ズームは変更されない
		});

		it('ビューポートズームを設定できる', () => {
			canvasStore.setViewportZoom(2.0);

			const viewport = canvasStore.getViewport();
			expect(viewport.zoom).toBe(2.0);
			expect(viewport.x).toBe(0); // 位置は変更されない
			expect(viewport.y).toBe(0);
		});

		it('無効なズーム値でエラーが発生する', () => {
			expect(() => canvasStore.setViewportZoom(0)).toThrow(CanvasStateError);
			expect(() => canvasStore.setViewportZoom(-1)).toThrow(CanvasStateError);
		});

		it('ビューポートを相対的に移動できる', () => {
			canvasStore.setViewportPosition({ x: 100, y: 200 });
			canvasStore.moveViewport(50, -30);

			const viewport = canvasStore.getViewport();
			expect(viewport.x).toBe(150);
			expect(viewport.y).toBe(170);
		});

		it('ビューポートをリセットできる', () => {
			canvasStore.setViewport({ x: 100, y: 200, zoom: 2.0 });
			canvasStore.resetViewport();

			const viewport = canvasStore.getViewport();
			expect(viewport).toEqual({ x: 0, y: 0, zoom: 1.0 });
		});

		it('無効なビューポートでエラーが発生する', () => {
			expect(() => canvasStore.setViewport({ x: NaN, y: 0, zoom: 1 })).toThrow(CanvasStateError);
			expect(() => canvasStore.setViewport({ x: 0, y: Infinity, zoom: 1 })).toThrow(
				CanvasStateError
			);
			expect(() => canvasStore.setViewport({ x: 0, y: 0, zoom: 0 })).toThrow(CanvasStateError);
		});
	});

	describe('選択状態操作', () => {
		it('初期選択状態が正しく設定されている', () => {
			const selectedIds = canvasStore.getSelectedBlockIds();
			expect(selectedIds).toEqual([]);
			expect(canvasStore.isBlockSelected('test-id')).toBe(false);
		});

		it('単一ブロックを選択できる', () => {
			canvasStore.selectBlock('block-1');

			expect(canvasStore.isBlockSelected('block-1')).toBe(true);
			expect(canvasStore.getSelectedBlockIds()).toEqual(['block-1']);
		});

		it('複数選択モードでブロックを追加できる', () => {
			canvasStore.selectBlock('block-1');
			canvasStore.selectBlock('block-2', true);

			const selectedIds = canvasStore.getSelectedBlockIds();
			expect(selectedIds).toContain('block-1');
			expect(selectedIds).toContain('block-2');
			expect(selectedIds.length).toBe(2);
		});

		it('複数選択モードで既に選択されたブロックを解除できる', () => {
			canvasStore.selectBlock('block-1');
			canvasStore.selectBlock('block-2', true);
			canvasStore.selectBlock('block-1', true); // 解除

			const selectedIds = canvasStore.getSelectedBlockIds();
			expect(selectedIds).toEqual(['block-2']);
		});

		it('複数のブロックを一度に選択できる', () => {
			canvasStore.selectBlocks(['block-1', 'block-2', 'block-3']);

			const selectedIds = canvasStore.getSelectedBlockIds();
			expect(selectedIds).toEqual(['block-1', 'block-2', 'block-3']);
		});

		it('選択を解除できる', () => {
			canvasStore.selectBlocks(['block-1', 'block-2']);
			canvasStore.clearSelection();

			expect(canvasStore.getSelectedBlockIds()).toEqual([]);
			expect(canvasStore.isBlockSelected('block-1')).toBe(false);
		});

		it('選択ボックスを開始できる', () => {
			const startPos: Position = { x: 10, y: 20 };
			canvasStore.startSelectionBox(startPos);

			const interactionState = canvasStore.getInteractionState();
			expect(interactionState.isSelecting).toBe(true);
		});

		it('選択ボックスを更新できる', () => {
			const startPos: Position = { x: 10, y: 20 };
			const endPos: Position = { x: 50, y: 60 };

			canvasStore.startSelectionBox(startPos);
			canvasStore.updateSelectionBox(endPos);

			// 選択ボックスの状態は内部的に管理されているため、
			// エラーが発生しないことを確認
			expect(() => canvasStore.updateSelectionBox(endPos)).not.toThrow();
		});

		it('選択ボックスが開始されていない状態で更新するとエラーが発生する', () => {
			const endPos: Position = { x: 50, y: 60 };
			expect(() => canvasStore.updateSelectionBox(endPos)).toThrow(CanvasStateError);
		});

		it('選択ボックスを終了できる', () => {
			const startPos: Position = { x: 10, y: 20 };
			canvasStore.startSelectionBox(startPos);
			canvasStore.endSelectionBox();

			const interactionState = canvasStore.getInteractionState();
			expect(interactionState.isSelecting).toBe(false);
		});
	});

	describe('インタラクション状態操作', () => {
		it('初期インタラクション状態が正しく設定されている', () => {
			const interactionState = canvasStore.getInteractionState();
			expect(interactionState).toEqual({
				isDragging: false,
				isSelecting: false,
				lastMousePos: { x: 0, y: 0 },
				hoveredBlockId: null
			});
		});

		it('ドラッグ状態を設定できる', () => {
			canvasStore.setDragging(true);

			const interactionState = canvasStore.getInteractionState();
			expect(interactionState.isDragging).toBe(true);
		});

		it('最後のマウス位置を設定できる', () => {
			const mousePos: Position = { x: 100, y: 200 };
			canvasStore.setLastMousePosition(mousePos);

			const interactionState = canvasStore.getInteractionState();
			expect(interactionState.lastMousePos).toEqual(mousePos);
		});

		it('ホバー中のブロックIDを設定できる', () => {
			canvasStore.setHoveredBlock('hovered-block');

			const interactionState = canvasStore.getInteractionState();
			expect(interactionState.hoveredBlockId).toBe('hovered-block');
		});

		it('ホバー中のブロックIDをnullに設定できる', () => {
			canvasStore.setHoveredBlock('hovered-block');
			canvasStore.setHoveredBlock(null);

			const interactionState = canvasStore.getInteractionState();
			expect(interactionState.hoveredBlockId).toBe(null);
		});

		it('インタラクション状態をリセットできる', () => {
			canvasStore.setDragging(true);
			canvasStore.setLastMousePosition({ x: 100, y: 200 });
			canvasStore.setHoveredBlock('test-block');

			canvasStore.resetInteractionState();

			const interactionState = canvasStore.getInteractionState();
			expect(interactionState).toEqual({
				isDragging: false,
				isSelecting: false,
				lastMousePos: { x: 0, y: 0 },
				hoveredBlockId: null
			});
		});
	});

	describe('パフォーマンス状態操作', () => {
		it('初期パフォーマンス状態が正しく設定されている', () => {
			const performanceState = canvasStore.getPerformanceState();
			expect(performanceState).toEqual({
				visibleBlocks: new Set(),
				renderCount: 0,
				lastRenderTime: 0
			});
		});

		it('表示中のブロックを設定できる', () => {
			const blockIds = ['block-1', 'block-2', 'block-3'];
			canvasStore.setVisibleBlocks(blockIds);

			const performanceState = canvasStore.getPerformanceState();
			expect(Array.from(performanceState.visibleBlocks)).toEqual(blockIds);
		});

		it('レンダリング統計を更新できる', () => {
			canvasStore.updateRenderStats(16.7); // 60fps
			canvasStore.updateRenderStats(33.3); // 30fps

			const performanceState = canvasStore.getPerformanceState();
			expect(performanceState.renderCount).toBe(2);
			expect(performanceState.lastRenderTime).toBe(33.3);
		});

		it('パフォーマンス統計をリセットできる', () => {
			canvasStore.setVisibleBlocks(['block-1', 'block-2']);
			canvasStore.updateRenderStats(16.7);

			canvasStore.resetPerformanceStats();

			const performanceState = canvasStore.getPerformanceState();
			expect(performanceState).toEqual({
				visibleBlocks: new Set(),
				renderCount: 0,
				lastRenderTime: 0
			});
		});
	});

	describe('統合状態操作', () => {
		it('完全なキャンバス状態を取得できる', () => {
			// 各状態を設定
			canvasStore.setViewport({ x: 100, y: 200, zoom: 1.5 });
			canvasStore.selectBlocks(['block-1', 'block-2']);
			canvasStore.setDragging(true);
			canvasStore.setVisibleBlocks(['block-1', 'block-2', 'block-3']);

			const canvasState = canvasStore.getCanvasState();

			expect(canvasState.viewport).toEqual({ x: 100, y: 200, zoom: 1.5 });
			expect(Array.from(canvasState.selection.selectedBlockIds)).toEqual(['block-1', 'block-2']);
			expect(canvasState.interaction.isDragging).toBe(true);
			expect(Array.from(canvasState.performance.visibleBlocks)).toEqual([
				'block-1',
				'block-2',
				'block-3'
			]);
		});

		it('キャンバス状態をリセットできる', () => {
			// 各状態を設定
			canvasStore.setViewport({ x: 100, y: 200, zoom: 1.5 });
			canvasStore.selectBlocks(['block-1', 'block-2']);
			canvasStore.setDragging(true);
			canvasStore.setVisibleBlocks(['block-1', 'block-2']);

			canvasStore.resetCanvasState();

			const canvasState = canvasStore.getCanvasState();
			expect(canvasState.viewport).toEqual({ x: 0, y: 0, zoom: 1.0 });
			expect(canvasState.selection.selectedBlockIds.size).toBe(0);
			expect(canvasState.interaction.isDragging).toBe(false);
			expect(canvasState.performance.visibleBlocks.size).toBe(0);
		});
	});

	describe('バッチ更新', () => {
		it('バッチ更新を実行できる', () => {
			canvasStore.batchUpdate(() => {
				canvasStore.setViewportPosition({ x: 100, y: 200 });
				canvasStore.selectBlock('block-1');
				canvasStore.setDragging(true);
			});

			const canvasState = canvasStore.getCanvasState();
			expect(canvasState.viewport.x).toBe(100);
			expect(canvasState.viewport.y).toBe(200);
			expect(canvasState.selection.selectedBlockIds.has('block-1')).toBe(true);
			expect(canvasState.interaction.isDragging).toBe(true);
		});

		it('複数の選択操作をバッチで実行できる', () => {
			const operations = [
				() => canvasStore.selectBlock('block-1'),
				() => canvasStore.selectBlock('block-2', true),
				() => canvasStore.selectBlock('block-3', true)
			];

			canvasStore.batchSelectOperations(operations);

			const selectedIds = canvasStore.getSelectedBlockIds();
			expect(selectedIds).toContain('block-1');
			expect(selectedIds).toContain('block-2');
			expect(selectedIds).toContain('block-3');
		});
	});

	describe('エラーハンドリング', () => {
		it('CanvasStateErrorが適切にスローされる', () => {
			expect(() => canvasStore.setViewportZoom(-1)).toThrow(CanvasStateError);
			expect(() => canvasStore.updateSelectionBox({ x: 0, y: 0 })).toThrow(CanvasStateError);
		});

		it('エラーにコンテキスト情報が含まれる', () => {
			try {
				canvasStore.setViewportZoom(-1);
			} catch (error) {
				expect(error).toBeInstanceOf(CanvasStateError);
				expect((error as CanvasStateError).context).toBeDefined();
			}
		});
	});

	describe('状態の不変性', () => {
		it('ビューポートの取得で元の状態が変更されない', () => {
			const originalViewport = canvasStore.getViewport();
			originalViewport.x = 999;

			const currentViewport = canvasStore.getViewport();
			expect(currentViewport.x).toBe(0);
		});

		it('選択状態の取得で元の状態が変更されない', () => {
			canvasStore.selectBlocks(['block-1', 'block-2']);
			const canvasState = canvasStore.getCanvasState();
			canvasState.selection.selectedBlockIds.add('block-3');

			const currentSelectedIds = canvasStore.getSelectedBlockIds();
			expect(currentSelectedIds).not.toContain('block-3');
		});

		it('パフォーマンス状態の取得で元の状態が変更されない', () => {
			canvasStore.setVisibleBlocks(['block-1', 'block-2']);
			const performanceState = canvasStore.getPerformanceState();
			performanceState.visibleBlocks.add('block-3');

			const currentPerformanceState = canvasStore.getPerformanceState();
			expect(currentPerformanceState.visibleBlocks.has('block-3')).toBe(false);
		});
	});
});
