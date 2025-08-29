/**
 * BlockForm コンポーネントのユニットテスト
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import BlockForm from './BlockForm.svelte';
import { BlockPathType, Connection } from '$lib/types/core';
import type { Block } from '$lib/types';

// モックストア
const mockBlockStore: {
	blocks: Map<string, Block>;
	restoreBlock: (block: Block) => void;
	getAllBlocks: () => Block[];
} = {
	blocks: new Map<string, Block>(),
	restoreBlock: vi.fn(),
	getAllBlocks: vi.fn(() => Array.from(mockBlockStore.blocks.values()))
};

// ストアのモック
vi.mock('$lib/utils/store.svelte', () => ({
	useBlockStore: () => mockBlockStore
}));

describe.skip('BlockForm', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockBlockStore.blocks.clear();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('初期レンダリング', () => {
		it('基本的なフォーム要素が表示される', () => {
			render(BlockForm);

			expect(screen.getByLabelText('名前 *')).toBeInTheDocument();
			expect(screen.getByLabelText('タイトル *')).toBeInTheDocument();
			expect(screen.getByLabelText('タイプ')).toBeInTheDocument();
			expect(screen.getByLabelText('色')).toBeInTheDocument();
			expect(screen.getByLabelText('接続タイプ')).toBeInTheDocument();
			expect(screen.getByLabelText('出力テンプレート')).toBeInTheDocument();
			expect(screen.getByLabelText('終了出力テンプレート（オプション）')).toBeInTheDocument();
		});

		it('初期値が正しく設定される', () => {
			render(BlockForm);

			const nameInput = screen.getByLabelText('名前 *') as HTMLInputElement;
			const titleInput = screen.getByLabelText('タイトル *') as HTMLInputElement;
			const typeSelect = screen.getByLabelText('タイプ') as HTMLSelectElement;
			const colorInput = screen.getByLabelText('色') as HTMLInputElement;
			const connectionSelect = screen.getByLabelText('接続タイプ') as HTMLSelectElement;

			expect(nameInput.value).toBe('');
			expect(titleInput.value).toBe('');
			expect(typeSelect.value).toBe(BlockPathType.Move);
			expect(colorInput.value).toBe('#3357FF');
			expect(connectionSelect.value).toBe(Connection.Both);
		});

		it('コンテンツ追加ボタンが表示される', () => {
			render(BlockForm);

			expect(screen.getByText('値入力を追加')).toBeInTheDocument();
			expect(screen.getByText('テキストを追加')).toBeInTheDocument();
			expect(screen.getByText('区切り線を追加')).toBeInTheDocument();
		});

		it('保存とキャンセルボタンが表示される', () => {
			render(BlockForm);

			expect(screen.getByText('保存')).toBeInTheDocument();
			expect(screen.getByText('キャンセル')).toBeInTheDocument();
		});
	});

	describe('フォーム入力', () => {
		it('名前フィールドの入力が反映される', async () => {
			render(BlockForm);

			const nameInput = screen.getByLabelText('名前 *') as HTMLInputElement;
			await fireEvent.input(nameInput, { target: { value: 'test-block' } });
			await tick();

			expect(nameInput.value).toBe('test-block');
		});

		it('タイトルフィールドの入力が反映される', async () => {
			render(BlockForm);

			const titleInput = screen.getByLabelText('タイトル *') as HTMLInputElement;
			await fireEvent.input(titleInput, { target: { value: 'テストブロック' } });
			await tick();

			expect(titleInput.value).toBe('テストブロック');
		});

		it('タイプ選択が反映される', async () => {
			render(BlockForm);

			const typeSelect = screen.getByLabelText('タイプ') as HTMLSelectElement;
			await fireEvent.change(typeSelect, { target: { value: BlockPathType.Flag } });
			await tick();

			expect(typeSelect.value).toBe(BlockPathType.Flag);
		});

		it('色選択が反映される', async () => {
			render(BlockForm);

			const colorInput = screen.getByLabelText('色') as HTMLInputElement;
			await fireEvent.input(colorInput, { target: { value: '#ff0000' } });
			await tick();

			expect(colorInput.value).toBe('#ff0000');
		});
	});

	describe('コンテンツアイテム管理', () => {
		it('ContentValueアイテムを追加できる', async () => {
			render(BlockForm);

			const addButton = screen.getByText('値入力を追加');
			await fireEvent.click(addButton);
			await tick();

			expect(screen.getByText('ContentValue')).toBeInTheDocument();
			expect(screen.getByLabelText('ID')).toBeInTheDocument();
			expect(screen.getByLabelText('ラベル')).toBeInTheDocument();
			expect(screen.getByLabelText('デフォルト値')).toBeInTheDocument();
			expect(screen.getByLabelText('プレースホルダー')).toBeInTheDocument();
		});

		it('Textアイテムを追加できる', async () => {
			render(BlockForm);

			const addButton = screen.getByText('テキストを追加');
			await fireEvent.click(addButton);
			await tick();

			expect(screen.getByText('Text')).toBeInTheDocument();
			expect(screen.getByLabelText('テキスト')).toBeInTheDocument();
		});

		it('Separatorアイテムを追加できる', async () => {
			render(BlockForm);

			const addButton = screen.getByText('区切り線を追加');
			await fireEvent.click(addButton);
			await tick();

			expect(screen.getByText('Separator')).toBeInTheDocument();
		});

		it('コンテンツアイテムを削除できる', async () => {
			render(BlockForm);

			// アイテムを追加
			const addButton = screen.getByText('値入力を追加');
			await fireEvent.click(addButton);
			await tick();

			expect(screen.getByText('ContentValue')).toBeInTheDocument();

			// アイテムを削除
			const deleteButton = screen.getByText('削除');
			await fireEvent.click(deleteButton);
			await tick();

			expect(screen.queryByText('ContentValue')).not.toBeInTheDocument();
		});

		it('ContentValueアイテムの入力が反映される', async () => {
			render(BlockForm);

			// ContentValueアイテムを追加
			const addButton = screen.getByText('値入力を追加');
			await fireEvent.click(addButton);
			await tick();

			// 各フィールドに入力
			const idInput = screen.getByLabelText('ID') as HTMLInputElement;
			const labelInput = screen.getByLabelText('ラベル') as HTMLInputElement;
			const valueInput = screen.getByLabelText('デフォルト値') as HTMLInputElement;
			const placeholderInput = screen.getByLabelText('プレースホルダー') as HTMLInputElement;

			await fireEvent.input(idInput, { target: { value: 'content1' } });
			await fireEvent.input(labelInput, { target: { value: 'ラベル1' } });
			await fireEvent.input(valueInput, { target: { value: 'デフォルト' } });
			await fireEvent.input(placeholderInput, { target: { value: 'プレースホルダー' } });
			await tick();

			expect(idInput.value).toBe('content1');
			expect(labelInput.value).toBe('ラベル1');
			expect(valueInput.value).toBe('デフォルト');
			expect(placeholderInput.value).toBe('プレースホルダー');
		});
	});

	describe('フォーム検証', () => {
		it('必須フィールドが空の場合エラーが表示される', async () => {
			render(BlockForm);

			const saveButton = screen.getByText('保存');
			await fireEvent.click(saveButton);
			await tick();

			expect(screen.getByText('名前は必須です')).toBeInTheDocument();
			expect(screen.getByText('タイトルは必須です')).toBeInTheDocument();
		});

		it('名前の形式が不正な場合エラーが表示される', async () => {
			render(BlockForm);

			const nameInput = screen.getByLabelText('名前 *');
			await fireEvent.input(nameInput, { target: { value: 'invalid name!' } });
			await tick();

			expect(
				screen.getByText('名前は英数字、アンダースコア、ハイフンのみ使用できます')
			).toBeInTheDocument();
		});

		it('ContentValueアイテムのIDが空の場合エラーが表示される', async () => {
			render(BlockForm);

			// ContentValueアイテムを追加
			const addButton = screen.getByText('値入力を追加');
			await fireEvent.click(addButton);
			await tick();

			// 保存を試行
			const saveButton = screen.getByText('保存');
			await fireEvent.click(saveButton);
			await tick();

			expect(screen.getByText(/コンテンツアイテム 1: IDは必須です/)).toBeInTheDocument();
		});

		it('ContentValueアイテムのIDが重複している場合エラーが表示される', async () => {
			render(BlockForm);

			// 2つのContentValueアイテムを追加
			const addButton = screen.getByText('値入力を追加');
			await fireEvent.click(addButton);
			await fireEvent.click(addButton);
			await tick();

			// 両方に同じIDを設定
			const idInputs = screen.getAllByLabelText('ID') as HTMLInputElement[];
			await fireEvent.input(idInputs[0], { target: { value: 'duplicate' } });
			await fireEvent.input(idInputs[1], { target: { value: 'duplicate' } });
			await tick();

			expect(screen.getByText(/ID "duplicate" は既に使用されています/)).toBeInTheDocument();
		});

		it('ブロック名が重複している場合エラーが表示される', async () => {
			// 既存のブロックを設定
			const existingBlock: Block = {
				id: 'existing-id',
				name: 'existing-block',
				title: 'Existing Block',
				type: BlockPathType.Move,
				color: '#3357FF',
				connection: Connection.Both,
				content: [],
				output: '',
				position: { x: 0, y: 0 },
				zIndex: 0,
				visibility: true,
				draggable: true,
				editable: true,
				deletable: true
			};
			mockBlockStore.blocks.set('existing-id', existingBlock);

			render(BlockForm);

			const nameInput = screen.getByLabelText('名前 *');
			await fireEvent.input(nameInput, { target: { value: 'existing-block' } });
			await tick();

			expect(
				screen.getByText('ブロック名 "existing-block" は既に使用されています')
			).toBeInTheDocument();
		});

		it('検証エラーがある場合保存ボタンが無効になる', async () => {
			render(BlockForm);

			const saveButton = screen.getByText('保存') as HTMLButtonElement;

			// 初期状態では有効（エラーなし）
			expect(saveButton.disabled).toBe(false);

			// 不正な名前を入力
			const nameInput = screen.getByLabelText('名前 *');
			await fireEvent.input(nameInput, { target: { value: 'invalid name!' } });
			await tick();

			// 保存ボタンが無効になる
			expect(saveButton.disabled).toBe(true);
		});
	});

	describe('フォーム送信', () => {
		it('有効なデータで保存が成功する', async () => {
			const onSave = vi.fn();
			render(BlockForm, { props: { onSave } });

			// 有効なデータを入力
			const nameInput = screen.getByLabelText('名前 *');
			const titleInput = screen.getByLabelText('タイトル *');

			await fireEvent.input(nameInput, { target: { value: 'test-block' } });
			await fireEvent.input(titleInput, { target: { value: 'テストブロック' } });
			await tick();

			// 保存ボタンをクリック
			const saveButton = screen.getByText('保存');
			await fireEvent.click(saveButton);
			await tick();

			// ストアのrestoreBlockが呼ばれる
			expect(mockBlockStore.restoreBlock).toHaveBeenCalledWith(
				expect.objectContaining({
					name: 'test-block',
					title: 'テストブロック'
				})
			);

			// onSaveコールバックが呼ばれる
			expect(onSave).toHaveBeenCalledWith(
				expect.objectContaining({
					name: 'test-block',
					title: 'テストブロック'
				})
			);
		});

		it('保存後にフォームがリセットされる', async () => {
			render(BlockForm);

			// データを入力
			const nameInput = screen.getByLabelText('名前 *') as HTMLInputElement;
			const titleInput = screen.getByLabelText('タイトル *') as HTMLInputElement;

			await fireEvent.input(nameInput, { target: { value: 'test-block' } });
			await fireEvent.input(titleInput, { target: { value: 'テストブロック' } });
			await tick();

			// 保存
			const saveButton = screen.getByText('保存');
			await fireEvent.click(saveButton);
			await tick();

			// フォームがリセットされる
			expect(nameInput.value).toBe('');
			expect(titleInput.value).toBe('');
		});

		it('保存中は保存ボタンが無効になる', async () => {
			render(BlockForm);

			// 有効なデータを入力
			const nameInput = screen.getByLabelText('名前 *');
			const titleInput = screen.getByLabelText('タイトル *');

			await fireEvent.input(nameInput, { target: { value: 'test-block' } });
			await fireEvent.input(titleInput, { target: { value: 'テストブロック' } });
			await tick();

			const saveButton = screen.getByText('保存') as HTMLButtonElement;

			// 保存前は有効
			expect(saveButton.disabled).toBe(false);

			// 保存ボタンをクリック
			await fireEvent.click(saveButton);

			// 保存中は無効（テキストも変わる）
			await waitFor(() => {
				expect(screen.getByText('保存中...')).toBeInTheDocument();
			});
		});
	});

	describe('キャンセル機能', () => {
		it('キャンセルボタンでフォームがリセットされる', async () => {
			const onCancel = vi.fn();
			render(BlockForm, { props: { onCancel } });

			// データを入力
			const nameInput = screen.getByLabelText('名前 *') as HTMLInputElement;
			await fireEvent.input(nameInput, { target: { value: 'test-block' } });
			await tick();

			expect(nameInput.value).toBe('test-block');

			// キャンセルボタンをクリック
			const cancelButton = screen.getByText('キャンセル');
			await fireEvent.click(cancelButton);
			await tick();

			// フォームがリセットされる
			expect(nameInput.value).toBe('');

			// onCancelコールバックが呼ばれる
			expect(onCancel).toHaveBeenCalled();
		});
	});

	describe('出力テンプレート検証', () => {
		it('未定義の変数がある場合警告が表示される', async () => {
			render(BlockForm);

			// 有効な基本データを入力
			const nameInput = screen.getByLabelText('名前 *');
			const titleInput = screen.getByLabelText('タイトル *');
			const outputInput = screen.getByLabelText('出力テンプレート');

			await fireEvent.input(nameInput, { target: { value: 'test-block' } });
			await fireEvent.input(titleInput, { target: { value: 'テストブロック' } });
			await fireEvent.input(outputInput, { target: { value: 'move ${undefined_var}' } });
			await tick();

			expect(
				screen.getByText(/変数 "undefined_var" に対応するコンテンツIDが見つかりません/)
			).toBeInTheDocument();
		});

		it('使用されていないコンテンツIDがある場合警告が表示される', async () => {
			render(BlockForm);

			// 有効な基本データを入力
			const nameInput = screen.getByLabelText('名前 *');
			const titleInput = screen.getByLabelText('タイトル *');

			await fireEvent.input(nameInput, { target: { value: 'test-block' } });
			await fireEvent.input(titleInput, { target: { value: 'テストブロック' } });
			await tick();

			// ContentValueアイテムを追加
			const addButton = screen.getByText('値入力を追加');
			await fireEvent.click(addButton);
			await tick();

			// IDを設定（出力テンプレートでは使用しない）
			const idInput = screen.getByLabelText('ID');
			const labelInput = screen.getByLabelText('ラベル');
			await fireEvent.input(idInput, { target: { value: 'unused_content' } });
			await fireEvent.input(labelInput, { target: { value: 'ラベル' } });
			await tick();

			expect(
				screen.getByText(/コンテンツID "unused_content" が出力テンプレートで使用されていません/)
			).toBeInTheDocument();
		});
	});
});
