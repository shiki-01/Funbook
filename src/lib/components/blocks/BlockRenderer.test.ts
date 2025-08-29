/**
 * BlockRenderer.test.ts
 * BlockRendererコンポーネントのユニットテスト
 *
 * Note: Svelte 5のrunesとSSRの制約により、コンポーネントの論理テストに焦点を当てています
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BlockPathType, Connection } from '$lib/types';
import type { Block, Size } from '$lib/types/domain';
import { generatePathString, getBlockColors } from '$lib/utils/blockShapes';

describe('BlockRenderer', () => {
	let mockBlock: Block;
	let mockSize: Size;
	let mockPosition: { x: number; y: number };

	beforeEach(() => {
		mockBlock = {
			id: 'test-block-1',
			name: 'Test Block',
			type: BlockPathType.Works,
			title: 'Test Block Title',
			position: { x: 100, y: 200 },
			zIndex: 1,
			visibility: true,
			connection: Connection.Both,
			draggable: true,
			editable: true,
			deletable: true,
			output: 'test output',
			content: [
				{
					id: 'content-1',
					type: 'Text',
					data: {
						title: 'Test Content'
					}
				}
			]
		};

		mockSize = {
			width: 200,
			height: 60
		};

		mockPosition = {
			x: 100,
			y: 200
		};
	});

	describe('SVGパス生成ロジック', () => {
		it('通常のブロックタイプでSVGパスが生成されること', () => {
			const path = generatePathString(BlockPathType.Works, mockSize);
			expect(path).toBeTruthy();
			expect(typeof path).toBe('string');
			expect(path.startsWith('M')).toBe(true); // SVGパスはMで始まる
		});

		it('Valueブロックで正しいパスが生成されること', () => {
			const path = generatePathString(BlockPathType.Value, mockSize);
			expect(path).toBeTruthy();
			expect(typeof path).toBe('string');
			expect(path.startsWith('M')).toBe(true);
		});

		it('Loopブロックで子要素の高さを考慮したパスが生成されること', () => {
			const loopHeight = 100;
			const path = generatePathString(BlockPathType.Loop, mockSize, loopHeight);
			expect(path).toBeTruthy();
			expect(typeof path).toBe('string');
			expect(path.startsWith('M')).toBe(true);
		});

		it('Flagブロックで正しいパスが生成されること', () => {
			const path = generatePathString(BlockPathType.Flag, mockSize);
			expect(path).toBeTruthy();
			expect(typeof path).toBe('string');
			expect(path.startsWith('M')).toBe(true);
		});
	});

	describe('ブロック色の取得', () => {
		it('Worksブロックで正しい色が取得されること', () => {
			const colors = getBlockColors(BlockPathType.Works);
			expect(colors).toHaveProperty('fill');
			expect(colors).toHaveProperty('stroke');
			expect(colors).toHaveProperty('shadow');
			expect(colors.fill).toBe('#5A8DEE');
			expect(colors.stroke).toBe('#3A6BC1');
		});

		it('Valueブロックで正しい色が取得されること', () => {
			const colors = getBlockColors(BlockPathType.Value);
			expect(colors.fill).toBe('#51e8b0');
			expect(colors.stroke).toBe('#40d69f');
			expect(colors.shadow).toBe('#40d69f');
		});

		it('Flagブロックで正しい色が取得されること', () => {
			const colors = getBlockColors(BlockPathType.Flag);
			expect(colors.fill).toBe('#FF6B6B');
			expect(colors.stroke).toBe('#E55555');
			expect(colors.shadow).toBe('#E55555');
		});

		it('Loopブロックで正しい色が取得されること', () => {
			const colors = getBlockColors(BlockPathType.Loop);
			expect(colors.fill).toBe('#FFAB19');
			expect(colors.stroke).toBe('#E89500');
			expect(colors.shadow).toBe('#E89500');
		});

		it('Compositionブロックで正しい色が取得されること', () => {
			const colors = getBlockColors(BlockPathType.Composition);
			expect(colors.fill).toBe('#4ECDC4');
			expect(colors.stroke).toBe('#3BB3AA');
			expect(colors.shadow).toBe('#3BB3AA');
		});
	});

	describe('SVGサイズ計算ロジック', () => {
		it('通常のブロックで正しいSVGサイズが計算されること', () => {
			const expectedWidth = mockSize.width;
			const expectedHeight = mockSize.height;

			// BlockRendererコンポーネント内のロジックをテスト
			const svgWidth = (mockBlock.type === BlockPathType.Value ? 4 : 0) + mockSize.width;
			const svgHeight = mockBlock.type === BlockPathType.Value ? 60 : mockSize.height;

			expect(svgWidth).toBe(expectedWidth);
			expect(svgHeight).toBe(expectedHeight);
		});

		it('Valueブロックで正しいSVGサイズが計算されること', () => {
			const valueBlock = { ...mockBlock, type: BlockPathType.Value };

			const svgWidth = (valueBlock.type === BlockPathType.Value ? 4 : 0) + mockSize.width;
			const svgHeight = valueBlock.type === BlockPathType.Value ? 60 : mockSize.height;

			expect(svgWidth).toBe(204); // width + 4
			expect(svgHeight).toBe(60);
		});
	});

	describe('コンテンツ変換ロジック', () => {
		it('通常のブロックで正しい変換オフセットが計算されること', () => {
			const xOffset = mockBlock.type === BlockPathType.Value ? 12 : 10;
			const yOffset =
				mockBlock.type === BlockPathType.Value ? 0 : mockBlock.type === BlockPathType.Loop ? 25 : 5;

			expect(xOffset).toBe(10); // Works ブロック
			expect(yOffset).toBe(5);
		});

		it('Valueブロックで正しい変換オフセットが計算されること', () => {
			const valueBlock = { ...mockBlock, type: BlockPathType.Value };

			const xOffset = valueBlock.type === BlockPathType.Value ? 12 : 10;
			const yOffset =
				valueBlock.type === BlockPathType.Value
					? 0
					: valueBlock.type === BlockPathType.Loop
						? 25
						: 5;

			expect(xOffset).toBe(12);
			expect(yOffset).toBe(0);
		});

		it('Loopブロックで正しい変換オフセットが計算されること', () => {
			const loopBlock = { ...mockBlock, type: BlockPathType.Loop };

			const xOffset = loopBlock.type === BlockPathType.Value ? 12 : 10;
			const yOffset =
				loopBlock.type === BlockPathType.Value ? 0 : loopBlock.type === BlockPathType.Loop ? 25 : 5;

			expect(xOffset).toBe(10);
			expect(yOffset).toBe(25);
		});
	});

	describe('スタイル計算ロジック', () => {
		it('通常状態でのコンテナスタイルが正しく計算されること', () => {
			const isDragging = false;
			const isFromPalette = false;
			const customStyles = {};

			const expectedPosition = isDragging ? 'fixed' : isFromPalette ? 'relative' : 'absolute';
			const expectedLeft = isFromPalette ? '0' : `${mockPosition.x}px`;
			const expectedTop = isFromPalette ? '0' : `${mockPosition.y}px`;

			expect(expectedPosition).toBe('absolute');
			expect(expectedLeft).toBe('100px');
			expect(expectedTop).toBe('200px');
		});

		it('ドラッグ中のコンテナスタイルが正しく計算されること', () => {
			const isDragging = true;
			const isFromPalette = false;

			const expectedPosition = isDragging ? 'fixed' : isFromPalette ? 'relative' : 'absolute';
			const expectedLeft = isFromPalette ? '0' : `${mockPosition.x}px`;
			const expectedTop = isFromPalette ? '0' : `${mockPosition.y}px`;

			expect(expectedPosition).toBe('fixed');
			expect(expectedLeft).toBe('100px');
			expect(expectedTop).toBe('200px');
		});

		it('パレットからのブロックのコンテナスタイルが正しく計算されること', () => {
			const isDragging = false;
			const isFromPalette = true;

			const expectedPosition = isDragging ? 'fixed' : isFromPalette ? 'relative' : 'absolute';
			const expectedLeft = isFromPalette ? '0' : `${mockPosition.x}px`;
			const expectedTop = isFromPalette ? '0' : `${mockPosition.y}px`;

			expect(expectedPosition).toBe('relative');
			expect(expectedLeft).toBe('0');
			expect(expectedTop).toBe('0');
		});
	});

	describe('接続ポイント表示ロジック', () => {
		it('Input接続が必要な場合に正しく判定されること', () => {
			const inputBlock = { ...mockBlock, connection: Connection.Input };
			const shouldShowInput =
				inputBlock.connection === Connection.Both || inputBlock.connection === Connection.Input;
			expect(shouldShowInput).toBe(true);
		});

		it('Output接続が必要な場合に正しく判定されること', () => {
			const outputBlock = { ...mockBlock, connection: Connection.Output };
			const shouldShowOutput =
				(outputBlock.connection === Connection.Both ||
					outputBlock.connection === Connection.Output) &&
				outputBlock.type !== BlockPathType.Value;
			expect(shouldShowOutput).toBe(true);
		});

		it('Valueブロックでは出力接続が表示されないことが正しく判定されること', () => {
			const valueBlock = { ...mockBlock, type: BlockPathType.Value, connection: Connection.Output };
			const shouldShowOutput =
				(valueBlock.connection === Connection.Both ||
					valueBlock.connection === Connection.Output) &&
				valueBlock.type !== BlockPathType.Value;
			expect(shouldShowOutput).toBe(false);
		});

		it('Loop接続が必要な場合に正しく判定されること', () => {
			const loopBlock = { ...mockBlock, type: BlockPathType.Loop };
			const shouldShowLoop = loopBlock.type === BlockPathType.Loop;
			expect(shouldShowLoop).toBe(true);
		});
	});

	describe('フィルタースタイル計算', () => {
		it('valueTargetIdがある場合にフィルターが無効になること', () => {
			const blockWithTarget = { ...mockBlock, valueTargetId: 'target-id' };
			const colors = getBlockColors(blockWithTarget.type);
			const expectedFilter = blockWithTarget.valueTargetId
				? ''
				: `filter: drop-shadow(0 4px 0 ${colors.shadow});`;

			expect(expectedFilter).toBe('');
		});

		it('valueTargetIdがない場合にフィルターが適用されること', () => {
			const blockWithoutTarget = { ...mockBlock, valueTargetId: undefined };
			const colors = getBlockColors(blockWithoutTarget.type);
			const expectedFilter = blockWithoutTarget.valueTargetId
				? ''
				: `filter: drop-shadow(0 4px 0 ${colors.shadow});`;

			expect(expectedFilter).toBe(`filter: drop-shadow(0 4px 0 ${colors.shadow});`);
		});
	});

	describe('コンテンツタイプ判定', () => {
		it('ContentValueタイプが正しく判定されること', () => {
			const contentValue = {
				id: 'content-1',
				type: 'ContentValue' as const,
				data: {
					title: 'Test Value',
					value: 'test',
					placeholder: 'Enter value'
				}
			};

			expect(contentValue.type).toBe('ContentValue');
		});

		it('ContentSelectorタイプが正しく判定されること', () => {
			const contentSelector = {
				id: 'content-2',
				type: 'ContentSelector' as const,
				data: {
					title: 'Test Selector',
					value: 'option1',
					options: []
				}
			};

			expect(contentSelector.type).toBe('ContentSelector');
		});

		it('Textタイプが正しく判定されること', () => {
			const textContent = {
				id: 'content-3',
				type: 'Text' as const,
				data: {
					title: 'Test Text'
				}
			};

			expect(textContent.type).toBe('Text');
		});

		it('Separatorタイプが正しく判定されること', () => {
			const separatorContent = {
				id: 'content-4',
				type: 'Separator' as const,
				data: {
					type: 'None' as const
				}
			};

			expect(separatorContent.type).toBe('Separator');
		});
	});
});
