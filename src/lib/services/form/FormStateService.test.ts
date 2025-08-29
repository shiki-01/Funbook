/**
 * FormStateService のユニットテスト
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FormStateService, type IFormStateService } from './FormStateService';
import {
	BlockPathType,
	Connection,
	type BlockContent,
	type BlockFormData,
	type ContentType
} from '$lib/types';

describe('FormStateService', () => {
	let service: IFormStateService;
	let sampleFormData: BlockFormData;

	beforeEach(() => {
		service = new FormStateService();
		sampleFormData = {
			name: 'test-block',
			title: 'テストブロック',
			type: BlockPathType.Move,
			color: '#3357FF',
			output: 'move ${content1}',
			closeOutput: '',
			connection: Connection.Both,
			content: [
				{
					id: 'content1',
					type: 'ContentValue',
					data: {
						title: 'コンテンツ1',
						value: 'デフォルト値',
						placeholder: 'プレースホルダー'
					}
				}
			]
		};
	});

	describe('createInitialFormData', () => {
		it('初期フォームデータが正しく作成される', () => {
			const initialData = service.createInitialFormData();

			expect(initialData).toEqual({
				name: '',
				title: '',
				type: BlockPathType.Move,
				color: '#3357FF',
				output: '',
				closeOutput: '',
				connection: Connection.Both,
				content: []
			});
		});

		it('毎回新しいオブジェクトが作成される', () => {
			const data1 = service.createInitialFormData();
			const data2 = service.createInitialFormData();

			expect(data1).not.toBe(data2);
			expect(data1.content).not.toBe(data2.content);
		});
	});

	describe('resetFormData', () => {
		it('フォームデータが初期状態にリセットされる', () => {
			const resetData = service.resetFormData(sampleFormData);

			expect(resetData).toEqual({
				name: '',
				title: '',
				type: BlockPathType.Move,
				color: '#3357FF',
				output: '',
				closeOutput: '',
				connection: Connection.Both,
				content: []
			});
		});

		it('元のフォームデータが変更されない', () => {
			const originalData = { ...sampleFormData };
			service.resetFormData(sampleFormData);

			expect(sampleFormData).toEqual(originalData);
		});
	});

	describe('addContentItem', () => {
		it('ContentValueアイテムが正しく追加される', () => {
			const updatedData = service.addContentItem(sampleFormData, 'ContentValue');

			expect(updatedData.content).toHaveLength(2);
			expect(updatedData.content[1]).toEqual({
				id: '',
				type: 'ContentValue',
				title: '',
				value: '',
				placeholder: ''
			});
		});

		it('Textアイテムが正しく追加される', () => {
			const updatedData = service.addContentItem(sampleFormData, 'Text');

			expect(updatedData.content).toHaveLength(2);
			expect(updatedData.content[1]).toEqual({
				id: '',
				type: 'Text',
				title: '',
				value: '',
				placeholder: ''
			});
		});

		it('Separatorアイテムが正しく追加される', () => {
			const updatedData = service.addContentItem(sampleFormData, 'Separator');

			expect(updatedData.content).toHaveLength(2);
			expect(updatedData.content[1]).toEqual({
				id: '',
				type: 'Separator',
				title: '',
				value: '',
				placeholder: ''
			});
		});

		it('元のフォームデータが変更されない', () => {
			const originalData = service.cloneFormData(sampleFormData);
			service.addContentItem(sampleFormData, 'ContentValue');

			expect(sampleFormData).toEqual(originalData);
		});

		it('新しいオブジェクトが返される', () => {
			const updatedData = service.addContentItem(sampleFormData, 'ContentValue');

			expect(updatedData).not.toBe(sampleFormData);
			expect(updatedData.content).not.toBe(sampleFormData.content);
		});

		it('空のコンテンツアイテム配列に追加できる', () => {
			const emptyFormData = service.createInitialFormData();
			const updatedData = service.addContentItem(emptyFormData, 'ContentValue');

			expect(updatedData.content).toHaveLength(1);
			expect(updatedData.content[0].type).toBe('ContentValue');
		});
	});

	describe('removeContentItem', () => {
		it('指定されたインデックスのアイテムが削除される', () => {
			const formDataWithMultipleItems = {
				...sampleFormData,
				content: [
					{
						id: 'content1',
						type: 'ContentValue' as ContentType,
						data: {
							title: 'コンテンツ1',
							value: '',
							placeholder: ''
						}
					},
					{
						id: 'content2',
						type: 'Text' as ContentType,
						data: {
							title: 'コンテンツ2',
							value: '',
							placeholder: ''
						}
					},
					{
						id: 'content3',
						type: 'Separator' as ContentType,
						data: {
							title: 'コンテンツ3',
							value: '',
							placeholder: ''
						}
					}
				]
			};

			const updatedData = service.removeContentItem(formDataWithMultipleItems, 1);

			expect(updatedData.content).toHaveLength(2);
			expect(updatedData.content[0].id).toBe('content1');
			expect(updatedData.content[1].id).toBe('content3');
		});

		it('最初のアイテムが削除される', () => {
			const formDataWithMultipleItems = {
				...sampleFormData,
				content: [
					{
						id: 'content1',
						type: 'ContentValue' as ContentType,
						data: {
							title: 'コンテンツ1',
							value: '',
							placeholder: ''
						}
					},
					{
						id: 'content2',
						type: 'Text' as ContentType,
						data: {
							title: 'コンテンツ2',
							value: '',
							placeholder: ''
						}
					}
				]
			};

			const updatedData = service.removeContentItem(formDataWithMultipleItems, 0);

			expect(updatedData.content).toHaveLength(1);
			expect(updatedData.content[0].id).toBe('content2');
		});

		it('最後のアイテムが削除される', () => {
			const formDataWithMultipleItems = {
				...sampleFormData,
				content: [
					{
						id: 'content1',
						type: 'ContentValue' as ContentType,
						data: {
							title: 'コンテンツ1',
							value: '',
							placeholder: ''
						}
					},
					{
						id: 'content2',
						type: 'Text' as ContentType,
						data: {
							title: 'コンテンツ2',
							value: '',
							placeholder: ''
						}
					}
				]
			};

			const updatedData = service.removeContentItem(formDataWithMultipleItems, 1);

			expect(updatedData.content).toHaveLength(1);
			expect(updatedData.content[0].id).toBe('content1');
		});

		it('無効なインデックスでは何も削除されない', () => {
			const updatedData1 = service.removeContentItem(sampleFormData, -1);
			const updatedData2 = service.removeContentItem(sampleFormData, 10);

			expect(updatedData1.content).toHaveLength(1);
			expect(updatedData2.content).toHaveLength(1);
		});

		it('元のフォームデータが変更されない', () => {
			const originalData = service.cloneFormData(sampleFormData);
			service.removeContentItem(sampleFormData, 0);

			expect(sampleFormData).toEqual(originalData);
		});

		it('新しいオブジェクトが返される', () => {
			const updatedData = service.removeContentItem(sampleFormData, 0);

			expect(updatedData).not.toBe(sampleFormData);
			expect(updatedData.content).not.toBe(sampleFormData.content);
		});

		it('空の配列から削除しても安全', () => {
			const emptyFormData = service.createInitialFormData();
			const updatedData = service.removeContentItem(emptyFormData, 0);

			expect(updatedData.content).toHaveLength(0);
		});
	});

	describe('updateContentItem', () => {
		it('指定されたインデックスのアイテムが更新される', () => {
			const updates = {
				id: 'updated-id',
				type: 'Text' as ContentType,
				data: {
					title: '更新されたタイトル',
					value: '更新された値'
				}
			};

			const updatedData = service.updateContentItem(sampleFormData, 0, updates);

			expect(updatedData.content[0]).toEqual({
				id: 'updated-id',
				type: 'ContentValue',
				data: {
					title: '更新されたタイトル',
					value: '更新された値',
					placeholder: 'プレースホルダー'
				}
			});
		});

		it('部分的な更新が正しく適用される', () => {
			const updates = { data: { title: '新しいタイトル' } };

			const updatedData = service.updateContentItem(sampleFormData, 0, updates);

			expect(updatedData.content[0]).toEqual({
				id: 'content1',
				type: 'ContentValue',
				title: '新しいタイトル',
				value: 'デフォルト値',
				placeholder: 'プレースホルダー'
			});
		});

		it('無効なインデックスでは何も更新されない', () => {
			const updates = { data: { title: '新しいタイトル' } };
			const updatedData1 = service.updateContentItem(sampleFormData, -1, updates);
			const updatedData2 = service.updateContentItem(sampleFormData, 10, updates);

			expect(updatedData1.content[0]).toEqual(sampleFormData.content[0]);
			expect(updatedData2.content[0]).toEqual(sampleFormData.content[0]);
		});

		it('元のフォームデータが変更されない', () => {
			const originalData = service.cloneFormData(sampleFormData);
			service.updateContentItem(sampleFormData, 0, {
				data: { title: '新しいタイトル' }
			});

			expect(sampleFormData).toEqual(originalData);
		});

		it('新しいオブジェクトが返される', () => {
			const updatedData = service.updateContentItem(sampleFormData, 0, {
				data: { title: '新しいタイトル' }
			});

			expect(updatedData).not.toBe(sampleFormData);
			expect(updatedData.content).not.toBe(sampleFormData.content);
			expect(updatedData.content[0]).not.toBe(sampleFormData.content[0]);
		});

		it('複数のアイテムがある場合、指定されたアイテムのみ更新される', () => {
			const formDataWithMultipleItems = {
				...sampleFormData,
				content: [
					{
						id: 'content1',
						type: 'ContentValue' as ContentType,
						data: {
							title: 'コンテンツ1',
							value: '',
							placeholder: ''
						}
					},
					{
						id: 'content2',
						type: 'Text' as ContentType,
						data: {
							title: 'コンテンツ2',
							value: '',
							placeholder: ''
						}
					}
				]
			};

			const updatedData = service.updateContentItem(formDataWithMultipleItems, 1, {
				data: { title: '更新されたコンテンツ2' }
			});

			if ('title' in updatedData.content[0].data) {
				expect(updatedData.content[0].data.title).toBe('コンテンツ1');
			}
			if ('title' in updatedData.content[1].data) {
				expect(updatedData.content[1].data.title).toBe('更新されたコンテンツ2');
			}
		});
	});

	describe('updateFormField', () => {
		it('名前フィールドが更新される', () => {
			const updatedData = service.updateFormField(sampleFormData, 'name', 'new-name');

			expect(updatedData.name).toBe('new-name');
			expect(updatedData.title).toBe(sampleFormData.title); // 他のフィールドは変更されない
		});

		it('タイトルフィールドが更新される', () => {
			const updatedData = service.updateFormField(sampleFormData, 'title', '新しいタイトル');

			expect(updatedData.title).toBe('新しいタイトル');
			expect(updatedData.name).toBe(sampleFormData.name);
		});

		it('タイプフィールドが更新される', () => {
			const updatedData = service.updateFormField(sampleFormData, 'type', BlockPathType.Flag);

			expect(updatedData.type).toBe(BlockPathType.Flag);
			expect(updatedData.name).toBe(sampleFormData.name);
		});

		it('色フィールドが更新される', () => {
			const updatedData = service.updateFormField(sampleFormData, 'color', '#ff0000');

			expect(updatedData.color).toBe('#ff0000');
			expect(updatedData.name).toBe(sampleFormData.name);
		});

		it('出力フィールドが更新される', () => {
			const updatedData = service.updateFormField(sampleFormData, 'output', 'new output');

			expect(updatedData.output).toBe('new output');
			expect(updatedData.name).toBe(sampleFormData.name);
		});

		it('終了出力フィールドが更新される', () => {
			const updatedData = service.updateFormField(sampleFormData, 'closeOutput', '}');

			expect(updatedData.closeOutput).toBe('}');
			expect(updatedData.name).toBe(sampleFormData.name);
		});

		it('接続フィールドが更新される', () => {
			const updatedData = service.updateFormField(sampleFormData, 'connection', Connection.Input);

			expect(updatedData.connection).toBe(Connection.Input);
			expect(updatedData.name).toBe(sampleFormData.name);
		});

		it('コンテンツアイテム配列が更新される', () => {
			const newcontent: BlockContent[] = [
				{
					id: 'new-content',
					type: 'Text',
					data: {
						title: '新しいコンテンツ',
						value: '',
						placeholder: ''
					}
				}
			];

			const updatedData = service.updateFormField(sampleFormData, 'content', newcontent);

			expect(updatedData.content).toEqual(newcontent);
			expect(updatedData.name).toBe(sampleFormData.name);
		});

		it('元のフォームデータが変更されない', () => {
			const originalData = service.cloneFormData(sampleFormData);
			service.updateFormField(sampleFormData, 'name', 'new-name');

			expect(sampleFormData).toEqual(originalData);
		});

		it('新しいオブジェクトが返される', () => {
			const updatedData = service.updateFormField(sampleFormData, 'name', 'new-name');

			expect(updatedData).not.toBe(sampleFormData);
			expect(updatedData.content).not.toBe(sampleFormData.content);
		});
	});

	describe('cloneFormData', () => {
		it('フォームデータが正しくクローンされる', () => {
			const clonedData = service.cloneFormData(sampleFormData);

			expect(clonedData).toEqual(sampleFormData);
			expect(clonedData).not.toBe(sampleFormData);
		});

		it('コンテンツアイテム配列が深くクローンされる', () => {
			const clonedData = service.cloneFormData(sampleFormData);

			expect(clonedData.content).not.toBe(sampleFormData.content);
			expect(clonedData.content[0]).not.toBe(sampleFormData.content[0]);
			expect(clonedData.content[0]).toEqual(sampleFormData.content[0]);
		});

		it('クローンされたデータの変更が元のデータに影響しない', () => {
			const clonedData = service.cloneFormData(sampleFormData);
			const originalData = service.cloneFormData(sampleFormData);

			clonedData.name = 'changed-name';
			if ('title' in clonedData.content[0].data) {
				clonedData.content[0].data.title = '変更されたタイトル';
			} else {
				throw new Error(`プロパティ title が見つかりませんでした: ${clonedData}`);
			}

			expect(sampleFormData).toEqual(originalData);
		});

		it('空のコンテンツアイテム配列が正しくクローンされる', () => {
			const emptyFormData = service.createInitialFormData();
			const clonedData = service.cloneFormData(emptyFormData);

			expect(clonedData.content).toEqual([]);
			expect(clonedData.content).not.toBe(emptyFormData.content);
		});

		it('複数のコンテンツアイテムが正しくクローンされる', () => {
			const formDataWithMultipleItems = {
				...sampleFormData,
				content: [
					{
						id: 'content1',
						type: 'ContentValue' as ContentType,
						data: {
							title: 'コンテンツ1',
							value: '',
							placeholder: ''
						}
					},
					{
						id: 'content2',
						type: 'Text' as ContentType,
						data: {
							title: 'コンテンツ2',
							value: '',
							placeholder: ''
						}
					},
					{
						id: 'content3',
						type: 'Separator' as ContentType,
						data: {
							title: 'コンテンツ3',
							value: '',
							placeholder: ''
						}
					}
				]
			};

			const clonedData = service.cloneFormData(formDataWithMultipleItems);

			expect(clonedData.content).toHaveLength(3);
			clonedData.content.forEach((item, index) => {
				expect(item).not.toBe(formDataWithMultipleItems.content[index]);
				expect(item).toEqual(formDataWithMultipleItems.content[index]);
			});
		});
	});

	describe('イミュータビリティ', () => {
		it('すべてのメソッドが元のデータを変更しない', () => {
			const originalData = service.cloneFormData(sampleFormData);

			// すべてのメソッドを実行
			service.addContentItem(sampleFormData, 'Text');
			service.removeContentItem(sampleFormData, 0);
			service.updateContentItem(sampleFormData, 0, {
				data: { title: '新しいタイトル' }
			});
			service.updateFormField(sampleFormData, 'name', 'new-name');
			service.resetFormData(sampleFormData);

			// 元のデータが変更されていないことを確認
			expect(sampleFormData).toEqual(originalData);
		});

		it('ネストされたオブジェクトの変更が元のデータに影響しない', () => {
			const updatedData = service.updateContentItem(sampleFormData, 0, {
				data: { title: '新しいタイトル' }
			});
			let originalTitle: string;

			if ('title' in sampleFormData.content[0].data) {
				originalTitle = sampleFormData.content[0].data.title;
			} else {
				throw new Error(`プロパティ title が見つかりませんでした: ${sampleFormData}`);
			}

			if ('value' in updatedData.content[0].data) {
				// 更新されたデータのコンテンツアイテムを変更
				updatedData.content[0].data.value = '変更された値';
			} else {
				throw new Error(`プロパティ value が見つかりませんでした: ${updatedData}`);
			}

			// 元のデータが影響を受けていないことを確認
			expect(sampleFormData.content[0].data.title).toBe(originalTitle);
			if ('value' in sampleFormData.content[0].data) {
				expect(sampleFormData.content[0].data.value).toBe('デフォルト値');
			} else {
				throw new Error(`プロパティ value が見つかりませんでした: ${sampleFormData}`);
			}
		});
	});
});
