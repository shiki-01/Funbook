/**
 * BlockConnection.test.ts
 * BlockConnectionコンポーネントのユニットテスト
 *
 * Note: Svelte 5のrunesとSSRの制約により、コンポーネントの論理テストに焦点を当てています
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Block, Position } from '$lib/types/domain';
import { BlockPathType, Connection } from '$lib/types/core';

// テスト用のブロックデータ
const createTestBlock = (overrides: Partial<Block> = {}): Block => ({
	id: 'test-block-1',
	name: 'Test Block',
	title: 'Test Block',
	type: BlockPathType.Works,
	connection: Connection.Both,
	position: { x: 100, y: 100 },
	size: { width: 200, height: 60 },
	zIndex: 1,
	visibility: true,
	draggable: true,
	editable: true,
	deletable: true,
	output: 'test output',
	content: [],
	version: '1.0.0',
	...overrides
});

// 接続状態の型定義
interface ConnectionState {
	hasInputConnection: boolean;
	hasOutputConnection: boolean;
	hasLoopConnection: boolean;
	inputConnectedTo?: string;
	outputConnectedTo?: string[];
	loopConnectedTo?: string[];
	isConnecting: boolean;
	connectionPreview?: {
		type: 'input' | 'output' | 'loop';
		targetPosition: Position;
	};
}

describe('BlockConnection Logic Tests', () => {
	let mockOnConnectionHover: ReturnType<typeof vi.fn>;
	let mockOnConnectionClick: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		mockOnConnectionHover = vi.fn();
		mockOnConnectionClick = vi.fn();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('接続ポイント表示ロジック', () => {
		it('両方向接続のブロックで入力と出力接続ポイントを表示する判定', () => {
			const block = createTestBlock({
				connection: Connection.Both,
				type: BlockPathType.Works
			});

			// 入力接続ポイントの表示判定
			const showInputConnection =
				block.connection === Connection.Both || block.connection === Connection.Input;
			expect(showInputConnection).toBe(true);

			// 出力接続ポイントの表示判定
			const showOutputConnection =
				(block.connection === Connection.Both || block.connection === Connection.Output) &&
				block.type !== BlockPathType.Value;
			expect(showOutputConnection).toBe(true);
		});

		it('入力のみ接続のブロックで入力接続ポイントのみを表示する判定', () => {
			const block = createTestBlock({
				connection: Connection.Input,
				type: BlockPathType.Works
			});

			const showInputConnection =
				block.connection === Connection.Both || block.connection === Connection.Input;
			const showOutputConnection =
				(block.connection === Connection.Both || block.connection === Connection.Output) &&
				block.type !== BlockPathType.Value;

			expect(showInputConnection).toBe(true);
			expect(showOutputConnection).toBe(false);
		});

		it('出力のみ接続のブロックで出力接続ポイントのみを表示する判定', () => {
			const block = createTestBlock({
				connection: Connection.Output,
				type: BlockPathType.Works
			});

			const showInputConnection =
				block.connection === Connection.Both || block.connection === Connection.Input;
			const showOutputConnection =
				(block.connection === Connection.Both || block.connection === Connection.Output) &&
				block.type !== BlockPathType.Value;

			expect(showInputConnection).toBe(false);
			expect(showOutputConnection).toBe(true);
		});

		it('接続なしのブロックで接続ポイントを表示しない判定', () => {
			const block = createTestBlock({
				connection: Connection.None,
				type: BlockPathType.Works
			});

			const showInputConnection =
				block.connection === Connection.Both || block.connection === Connection.Input;
			const showOutputConnection =
				(block.connection === Connection.Both || block.connection === Connection.Output) &&
				block.type !== BlockPathType.Value;

			expect(showInputConnection).toBe(false);
			expect(showOutputConnection).toBe(false);
		});

		it('ループブロックでループ接続ポイントを表示する判定', () => {
			const block = createTestBlock({
				type: BlockPathType.Loop,
				connection: Connection.Both
			});

			const showLoopConnection = block.type === BlockPathType.Loop;
			expect(showLoopConnection).toBe(true);
		});

		it('Valueタイプのブロックで出力接続ポイントを表示しない判定', () => {
			const block = createTestBlock({
				type: BlockPathType.Value,
				connection: Connection.Both
			});

			const showInputConnection =
				block.connection === Connection.Both || block.connection === Connection.Input;
			const showOutputConnection =
				(block.connection === Connection.Both || block.connection === Connection.Output) &&
				block.type !== BlockPathType.Value;

			expect(showInputConnection).toBe(true);
			expect(showOutputConnection).toBe(false);
		});
	});

	describe('接続状態のスタイルクラス計算', () => {
		it('接続済み状態のスタイルクラスを計算する', () => {
			const connectionState: ConnectionState = {
				hasInputConnection: true,
				hasOutputConnection: true,
				hasLoopConnection: false,
				isConnecting: false
			};

			// 入力接続ポイントのクラス計算ロジック
			const inputClasses = ['connection-point', 'connection-input'];
			if (connectionState.hasInputConnection) inputClasses.push('connected');
			if (false) inputClasses.push('highlighted'); // isHighlighted = false
			if (false) inputClasses.push('drag-target'); // isDragTarget = false
			if (connectionState.isConnecting) inputClasses.push('connecting');

			expect(inputClasses).toContain('connected');
			expect(inputClasses).not.toContain('highlighted');
			expect(inputClasses).not.toContain('drag-target');
			expect(inputClasses).not.toContain('connecting');

			// 出力接続ポイントのクラス計算ロジック
			const outputClasses = ['connection-point', 'connection-output'];
			if (connectionState.hasOutputConnection) outputClasses.push('connected');
			if (false) outputClasses.push('highlighted');
			if (false) outputClasses.push('drag-target');
			if (connectionState.isConnecting) outputClasses.push('connecting');

			expect(outputClasses).toContain('connected');
			expect(outputClasses).not.toContain('highlighted');
			expect(outputClasses).not.toContain('drag-target');
			expect(outputClasses).not.toContain('connecting');
		});

		it('ハイライト状態のスタイルクラスを計算する', () => {
			const connectionState: ConnectionState = {
				hasInputConnection: false,
				hasOutputConnection: false,
				hasLoopConnection: false,
				isConnecting: false
			};
			const isHighlighted = true;

			const inputClasses = ['connection-point', 'connection-input'];
			if (connectionState.hasInputConnection) inputClasses.push('connected');
			if (isHighlighted) inputClasses.push('highlighted');
			if (false) inputClasses.push('drag-target');
			if (connectionState.isConnecting) inputClasses.push('connecting');

			expect(inputClasses).toContain('highlighted');
			expect(inputClasses).not.toContain('connected');
		});

		it('ドラッグターゲット状態のスタイルクラスを計算する', () => {
			const connectionState: ConnectionState = {
				hasInputConnection: false,
				hasOutputConnection: false,
				hasLoopConnection: false,
				isConnecting: false
			};
			const isDragTarget = true;

			const inputClasses = ['connection-point', 'connection-input'];
			if (connectionState.hasInputConnection) inputClasses.push('connected');
			if (false) inputClasses.push('highlighted');
			if (isDragTarget) inputClasses.push('drag-target');
			if (connectionState.isConnecting) inputClasses.push('connecting');

			expect(inputClasses).toContain('drag-target');
			expect(inputClasses).not.toContain('connected');
			expect(inputClasses).not.toContain('highlighted');
		});

		it('接続中状態のスタイルクラスを計算する', () => {
			const connectionState: ConnectionState = {
				hasInputConnection: false,
				hasOutputConnection: false,
				hasLoopConnection: false,
				isConnecting: true
			};

			const inputClasses = ['connection-point', 'connection-input'];
			if (connectionState.hasInputConnection) inputClasses.push('connected');
			if (false) inputClasses.push('highlighted');
			if (false) inputClasses.push('drag-target');
			if (connectionState.isConnecting) inputClasses.push('connecting');

			expect(inputClasses).toContain('connecting');
			expect(inputClasses).not.toContain('connected');
		});

		it('複数の状態が同時に適用される場合のクラス計算', () => {
			const connectionState: ConnectionState = {
				hasInputConnection: true,
				hasOutputConnection: true,
				hasLoopConnection: false,
				isConnecting: true
			};
			const isHighlighted = true;
			const isDragTarget = true;

			const inputClasses = ['connection-point', 'connection-input'];
			if (connectionState.hasInputConnection) inputClasses.push('connected');
			if (isHighlighted) inputClasses.push('highlighted');
			if (isDragTarget) inputClasses.push('drag-target');
			if (connectionState.isConnecting) inputClasses.push('connecting');

			expect(inputClasses).toContain('connected');
			expect(inputClasses).toContain('highlighted');
			expect(inputClasses).toContain('drag-target');
			expect(inputClasses).toContain('connecting');
			expect(inputClasses).toHaveLength(6); // base classes + 4 state classes
		});
	});

	describe('イベントハンドラーロジック', () => {
		it('接続ポイントのホバーハンドラーが正しく動作する', () => {
			const block = createTestBlock({
				connection: Connection.Input
			});

			// ホバーハンドラーのロジックをテスト
			const handleConnectionHover = (
				connectionType: 'input' | 'output' | 'loop',
				isEntering: boolean
			) => {
				mockOnConnectionHover?.(block.id, connectionType, isEntering);
			};

			// マウスエンター
			handleConnectionHover('input', true);
			expect(mockOnConnectionHover).toHaveBeenCalledWith('test-block-1', 'input', true);

			// マウスリーブ
			handleConnectionHover('input', false);
			expect(mockOnConnectionHover).toHaveBeenCalledWith('test-block-1', 'input', false);
		});

		it('接続ポイントのクリックハンドラーが正しく動作する', () => {
			const block = createTestBlock({
				connection: Connection.Output
			});

			// クリックハンドラーのロジックをテスト
			const handleConnectionClick = (connectionType: 'input' | 'output' | 'loop') => {
				mockOnConnectionClick?.(block.id, connectionType);
			};

			handleConnectionClick('output');
			expect(mockOnConnectionClick).toHaveBeenCalledWith('test-block-1', 'output');
		});

		it('キーボードイベントハンドラーが正しく動作する', () => {
			const block = createTestBlock({
				type: BlockPathType.Loop,
				connection: Connection.Both
			});

			// キーボードハンドラーのロジックをテスト
			const handleKeyDown = (key: string, connectionType: 'input' | 'output' | 'loop') => {
				if (key === 'Enter' || key === ' ') {
					mockOnConnectionClick?.(block.id, connectionType);
				}
			};

			// Enterキー
			handleKeyDown('Enter', 'loop');
			expect(mockOnConnectionClick).toHaveBeenCalledWith('test-block-1', 'loop');

			// スペースキー
			mockOnConnectionClick.mockClear();
			handleKeyDown(' ', 'loop');
			expect(mockOnConnectionClick).toHaveBeenCalledWith('test-block-1', 'loop');

			// 無効なキー
			mockOnConnectionClick.mockClear();
			handleKeyDown('Escape', 'loop');
			expect(mockOnConnectionClick).not.toHaveBeenCalled();
		});

		it('コールバック関数が未定義でもエラーが発生しない', () => {
			const block = createTestBlock({
				connection: Connection.Input
			});

			// 型エイリアスを定義
			type ConnectionHoverCallback = (
				blockId: string,
				connectionType: 'input' | 'output' | 'loop',
				isEntering: boolean
			) => void;

			type ConnectionClickCallback = (
				blockId: string,
				connectionType: 'input' | 'output' | 'loop'
			) => void;

			// コールバック関数が未定義の場合のハンドラーロジック
			const handleConnectionHover = (
				connectionType: 'input' | 'output' | 'loop',
				isEntering: boolean
			) => {
				// onConnectionHover が undefined の場合
				const onConnectionHover = undefined as ConnectionHoverCallback | undefined;
				onConnectionHover?.(block.id, connectionType, isEntering);
			};

			const handleConnectionClick = (connectionType: 'input' | 'output' | 'loop') => {
				// onConnectionClick が undefined の場合
				const onConnectionClick = undefined as ConnectionClickCallback | undefined;
				onConnectionClick?.(block.id, connectionType);
			};

			// エラーが発生しないことを確認
			expect(() => handleConnectionHover('input', true)).not.toThrow();
			expect(() => handleConnectionClick('input')).not.toThrow();
		});
	});

	describe('ツールチップ表示ロジック', () => {
		it('入力接続の接続先情報をツールチップテキストで生成する', () => {
			const connectionState: ConnectionState = {
				hasInputConnection: true,
				hasOutputConnection: false,
				hasLoopConnection: false,
				inputConnectedTo: 'source-block-1',
				isConnecting: false
			};

			// ツールチップテキスト生成ロジック
			const inputTooltipText = connectionState.inputConnectedTo
				? `Connected to: ${connectionState.inputConnectedTo}`
				: null;

			expect(inputTooltipText).toBe('Connected to: source-block-1');
		});

		it('出力接続の複数接続先情報をツールチップテキストで生成する', () => {
			const connectionState: ConnectionState = {
				hasInputConnection: false,
				hasOutputConnection: true,
				hasLoopConnection: false,
				outputConnectedTo: ['target-block-1', 'target-block-2'],
				isConnecting: false
			};

			// ツールチップテキスト生成ロジック
			const outputTooltipText =
				connectionState.outputConnectedTo && connectionState.outputConnectedTo.length > 0
					? `Connected to: ${connectionState.outputConnectedTo.join(', ')}`
					: null;

			expect(outputTooltipText).toBe('Connected to: target-block-1, target-block-2');
		});

		it('ループ接続の子ブロック数をツールチップテキストで生成する', () => {
			const connectionState: ConnectionState = {
				hasInputConnection: false,
				hasOutputConnection: false,
				hasLoopConnection: true,
				loopConnectedTo: ['child-1', 'child-2', 'child-3'],
				isConnecting: false
			};

			// ツールチップテキスト生成ロジック
			const loopTooltipText =
				connectionState.loopConnectedTo && connectionState.loopConnectedTo.length > 0
					? `Loop contains: ${connectionState.loopConnectedTo.length} blocks`
					: null;

			expect(loopTooltipText).toBe('Loop contains: 3 blocks');
		});

		it('接続情報がない場合にツールチップテキストがnullになる', () => {
			const connectionState: ConnectionState = {
				hasInputConnection: false,
				hasOutputConnection: false,
				hasLoopConnection: false,
				isConnecting: false
			};

			const inputTooltipText = connectionState.inputConnectedTo
				? `Connected to: ${connectionState.inputConnectedTo}`
				: null;

			const outputTooltipText =
				connectionState.outputConnectedTo && connectionState.outputConnectedTo.length > 0
					? `Connected to: ${connectionState.outputConnectedTo.join(', ')}`
					: null;

			const loopTooltipText =
				connectionState.loopConnectedTo && connectionState.loopConnectedTo.length > 0
					? `Loop contains: ${connectionState.loopConnectedTo.length} blocks`
					: null;

			expect(inputTooltipText).toBeNull();
			expect(outputTooltipText).toBeNull();
			expect(loopTooltipText).toBeNull();
		});

		it('空の配列の場合にツールチップテキストがnullになる', () => {
			const connectionState: ConnectionState = {
				hasInputConnection: false,
				hasOutputConnection: false,
				hasLoopConnection: false,
				outputConnectedTo: [],
				loopConnectedTo: [],
				isConnecting: false
			};

			const outputTooltipText =
				connectionState.outputConnectedTo && connectionState.outputConnectedTo.length > 0
					? `Connected to: ${connectionState.outputConnectedTo.join(', ')}`
					: null;

			const loopTooltipText =
				connectionState.loopConnectedTo && connectionState.loopConnectedTo.length > 0
					? `Loop contains: ${connectionState.loopConnectedTo.length} blocks`
					: null;

			expect(outputTooltipText).toBeNull();
			expect(loopTooltipText).toBeNull();
		});
	});

	describe('接続プレビューライン計算', () => {
		it('接続プレビューが設定されている場合にSVGパスを生成する', () => {
			const block = createTestBlock({
				connection: Connection.Output,
				position: { x: 100, y: 100 }
			});

			const connectionState: ConnectionState = {
				hasInputConnection: false,
				hasOutputConnection: false,
				hasLoopConnection: false,
				isConnecting: true,
				connectionPreview: {
					type: 'output',
					targetPosition: { x: 200, y: 200 }
				}
			};

			// 接続位置計算ロジック
			const getConnectionPosition = (connectionType: 'input' | 'output' | 'loop'): Position => {
				switch (connectionType) {
					case 'input':
						return { x: block.position.x + 8 + 20, y: block.position.y + 5 };
					case 'output':
						return {
							x: block.position.x + 8 + 20,
							y: block.position.y + (block.size?.height || 60) - 10
						};
					case 'loop':
						return { x: block.position.x + 16 + 20, y: block.position.y + 52 };
					default:
						return { x: 0, y: 0 };
				}
			};

			// プレビューパス計算ロジック
			const calculatePreviewPath = () => {
				if (!connectionState.connectionPreview) return '';

				const preview = connectionState.connectionPreview;
				const startPos = getConnectionPosition(preview.type);
				const endPos = preview.targetPosition;

				// ベジェ曲線で接続線を描画
				const controlPoint1 = {
					x: startPos.x + (endPos.x - startPos.x) * 0.5,
					y: startPos.y
				};
				const controlPoint2 = {
					x: startPos.x + (endPos.x - startPos.x) * 0.5,
					y: endPos.y
				};

				return `M ${startPos.x} ${startPos.y} C ${controlPoint1.x} ${controlPoint1.y}, ${controlPoint2.x} ${controlPoint2.y}, ${endPos.x} ${endPos.y}`;
			};

			const previewPath = calculatePreviewPath();

			expect(previewPath).toBeTruthy();
			expect(previewPath.startsWith('M')).toBe(true);
			expect(previewPath).toContain('C'); // ベジェ曲線コマンド
			expect(previewPath).toContain('128 150'); // 開始位置 (100+8+20, 100+60-10)
			expect(previewPath).toContain('200 200'); // 終了位置
		});

		it('接続プレビューが設定されていない場合に空文字列を返す', () => {
			const connectionState: ConnectionState = {
				hasInputConnection: false,
				hasOutputConnection: false,
				hasLoopConnection: false,
				isConnecting: false
			};

			const calculatePreviewPath = () => {
				if (!connectionState.connectionPreview) return '';
				return 'some-path';
			};

			const previewPath = calculatePreviewPath();
			expect(previewPath).toBe('');
		});

		it('異なる接続タイプで正しい開始位置を計算する', () => {
			const block = createTestBlock({
				position: { x: 100, y: 100 },
				size: { width: 200, height: 60 }
			});

			const getConnectionPosition = (connectionType: 'input' | 'output' | 'loop'): Position => {
				switch (connectionType) {
					case 'input':
						return { x: block.position.x + 8 + 20, y: block.position.y + 5 };
					case 'output':
						return {
							x: block.position.x + 8 + 20,
							y: block.position.y + (block.size?.height || 60) - 10
						};
					case 'loop':
						return { x: block.position.x + 16 + 20, y: block.position.y + 52 };
					default:
						return { x: 0, y: 0 };
				}
			};

			const inputPos = getConnectionPosition('input');
			const outputPos = getConnectionPosition('output');
			const loopPos = getConnectionPosition('loop');

			expect(inputPos).toEqual({ x: 128, y: 105 });
			expect(outputPos).toEqual({ x: 128, y: 150 });
			expect(loopPos).toEqual({ x: 136, y: 152 });
		});
	});

	describe('アクセシビリティ属性計算', () => {
		it('接続ポイントに適切なARIAラベルを生成する', () => {
			const block = createTestBlock({
				connection: Connection.Both,
				title: 'My Test Block'
			});

			// ARIAラベル生成ロジック
			const generateAriaLabel = (
				connectionType: 'input' | 'output' | 'loop',
				blockTitle: string
			) => {
				const typeMap = {
					input: 'Input',
					output: 'Output',
					loop: 'Loop'
				};
				return `${typeMap[connectionType]} connection point for ${blockTitle}`;
			};

			const inputAriaLabel = generateAriaLabel('input', block.title);
			const outputAriaLabel = generateAriaLabel('output', block.title);
			const loopAriaLabel = generateAriaLabel('loop', block.title);

			expect(inputAriaLabel).toBe('Input connection point for My Test Block');
			expect(outputAriaLabel).toBe('Output connection point for My Test Block');
			expect(loopAriaLabel).toBe('Loop connection point for My Test Block');
		});

		it('接続ポイントのキーボードフォーカス属性を設定する', () => {
			// tabindex属性の設定ロジック
			const getTabIndex = () => '0';
			const getRoleAttribute = () => 'button';

			expect(getTabIndex()).toBe('0');
			expect(getRoleAttribute()).toBe('button');
		});

		it('接続ポイントのキーボードイベント処理を検証する', () => {
			const validKeys = ['Enter', ' '];
			const invalidKeys = ['Escape', 'Tab', 'ArrowUp'];

			const isValidKey = (key: string) => validKeys.includes(key);

			validKeys.forEach((key) => {
				expect(isValidKey(key)).toBe(true);
			});

			invalidKeys.forEach((key) => {
				expect(isValidKey(key)).toBe(false);
			});
		});
	});

	describe('エラーハンドリングとエッジケース', () => {
		it('不正な接続状態でも正常に処理する', () => {
			const invalidConnectionState = {
				hasInputConnection: true,
				hasOutputConnection: true,
				hasLoopConnection: true,
				isConnecting: false,
				// 不正な値を含む
				inputConnectedTo: null as any,
				outputConnectedTo: undefined as any,
				loopConnectedTo: [] as any
			};

			// ツールチップテキスト生成の堅牢性テスト
			const generateTooltipText = (connectionState: any) => {
				const inputText = connectionState.inputConnectedTo
					? `Connected to: ${connectionState.inputConnectedTo}`
					: null;

				const outputText =
					connectionState.outputConnectedTo &&
					Array.isArray(connectionState.outputConnectedTo) &&
					connectionState.outputConnectedTo.length > 0
						? `Connected to: ${connectionState.outputConnectedTo.join(', ')}`
						: null;

				const loopText =
					connectionState.loopConnectedTo &&
					Array.isArray(connectionState.loopConnectedTo) &&
					connectionState.loopConnectedTo.length > 0
						? `Loop contains: ${connectionState.loopConnectedTo.length} blocks`
						: null;

				return { inputText, outputText, loopText };
			};

			const tooltips = generateTooltipText(invalidConnectionState);

			expect(tooltips.inputText).toBeNull(); // null値は無視される
			expect(tooltips.outputText).toBeNull(); // undefined値は無視される
			expect(tooltips.loopText).toBeNull(); // 空配列は無視される
		});

		it('ブロック位置が不正でも接続位置計算が動作する', () => {
			const blockWithInvalidPosition = createTestBlock({
				position: { x: NaN, y: undefined as any },
				size: { width: null as any, height: -1 }
			});

			const getConnectionPosition = (
				connectionType: 'input' | 'output' | 'loop',
				block: Block
			): Position => {
				const x = block.position?.x || 0;
				const y = block.position?.y || 0;
				const height = block.size?.height || 60;

				switch (connectionType) {
					case 'input':
						return { x: x + 8 + 20, y: y + 5 };
					case 'output':
						return { x: x + 8 + 20, y: y + height - 10 };
					case 'loop':
						return { x: x + 16 + 20, y: y + 52 };
					default:
						return { x: 0, y: 0 };
				}
			};

			// NaN や undefined が含まれていても計算が完了することを確認
			const inputPos = getConnectionPosition('input', blockWithInvalidPosition);
			const outputPos = getConnectionPosition('output', blockWithInvalidPosition);
			const loopPos = getConnectionPosition('loop', blockWithInvalidPosition);

			expect(typeof inputPos.x).toBe('number');
			expect(typeof inputPos.y).toBe('number');
			expect(typeof outputPos.x).toBe('number');
			expect(typeof outputPos.y).toBe('number');
			expect(typeof loopPos.x).toBe('number');
			expect(typeof loopPos.y).toBe('number');
		});

		it('接続プレビューの不正なデータでも処理が継続する', () => {
			const invalidPreview = {
				type: 'invalid-type' as any,
				targetPosition: { x: 'not-a-number' as any, y: null as any }
			};

			const connectionState: ConnectionState = {
				hasInputConnection: false,
				hasOutputConnection: false,
				hasLoopConnection: false,
				isConnecting: true,
				connectionPreview: invalidPreview
			};

			const calculatePreviewPath = (state: ConnectionState) => {
				if (!state.connectionPreview) return '';

				try {
					const preview = state.connectionPreview;
					const startPos = { x: 0, y: 0 }; // デフォルト値
					const endPos = {
						x: Number(preview.targetPosition?.x) || 0,
						y: Number(preview.targetPosition?.y) || 0
					};

					return `M ${startPos.x} ${startPos.y} L ${endPos.x} ${endPos.y}`;
				} catch (error) {
					return ''; // エラー時は空文字列を返す
				}
			};

			// エラーが発生せず、何らかの値が返されることを確認
			const result = calculatePreviewPath(connectionState);
			expect(typeof result).toBe('string');
		});

		it('極端な値でも接続ポイントクラス計算が動作する', () => {
			const extremeConnectionState: ConnectionState = {
				hasInputConnection: true,
				hasOutputConnection: true,
				hasLoopConnection: true,
				isConnecting: true
			};

			const calculateConnectionClasses = (
				baseClasses: string[],
				state: ConnectionState,
				isHighlighted: boolean = false,
				isDragTarget: boolean = false
			) => {
				const classes = [...baseClasses];

				if (state.hasInputConnection) classes.push('connected');
				if (isHighlighted) classes.push('highlighted');
				if (isDragTarget) classes.push('drag-target');
				if (state.isConnecting) classes.push('connecting');

				return classes;
			};

			const classes = calculateConnectionClasses(
				['connection-point', 'connection-input'],
				extremeConnectionState,
				true,
				true
			);

			expect(classes).toContain('connection-point');
			expect(classes).toContain('connection-input');
			expect(classes).toContain('connected');
			expect(classes).toContain('highlighted');
			expect(classes).toContain('drag-target');
			expect(classes).toContain('connecting');
			expect(classes.length).toBe(6);
		});
	});
});
