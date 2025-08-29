/**
 * FormValidationService のユニットテスト
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FormValidationService } from './FormValidationService';
import { BlockPathType, Connection, Separator } from '$lib/types/core';
import type { BlockFormData, ContentType } from '$lib/types';

describe('FormValidationService', () => {
	let service: FormValidationService;
	let validFormData: BlockFormData;

	beforeEach(() => {
		service = new FormValidationService();
		validFormData = {
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

	describe('validateFormData', () => {
		it('有効なフォームデータで検証が成功する', () => {
			const result = service.validateFormData(validFormData);

			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('必須フィールドが空の場合エラーが返される', () => {
			const invalidData = {
				...validFormData,
				name: '',
				title: ''
			};

			const result = service.validateFormData(invalidData);

			expect(result.valid).toBe(false);
			expect(result.errors).toHaveLength(2);
			expect(result.errors[0].code).toBe('REQUIRED_FIELD');
			expect(result.errors[0].field).toBe('name');
			expect(result.errors[1].code).toBe('REQUIRED_FIELD');
			expect(result.errors[1].field).toBe('title');
		});

		it('名前の形式が不正な場合エラーが返される', () => {
			const invalidData = {
				...validFormData,
				name: 'invalid name!'
			};

			const result = service.validateFormData(invalidData);

			expect(result.valid).toBe(false);
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].code).toBe('INVALID_FORMAT');
			expect(result.errors[0].field).toBe('name');
		});

		it('コンテンツアイテムの検証エラーが含まれる', () => {
			const invalidData = {
				...validFormData,
				contentItems: [
					{
						id: '',
						type: 'ContentValue',
						data: {
							title: '',
							value: '',
							placeholder: ''
						}
					}
				]
			};

			const result = service.validateFormData(invalidData);

			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
			expect(result.errors.some((e) => e.field === 'contentItems[0].id')).toBe(true);
			expect(result.errors.some((e) => e.field === 'contentItems[0].title')).toBe(true);
		});

		it('出力テンプレートの警告が含まれる', () => {
			const dataWithWarnings = {
				...validFormData,
				output: 'move ${undefined_var}',
				contentItems: [
					{
						id: 'unused_content',
						type: 'ContentValue',
						data: {
							title: 'コンテンツ',
							value: '',
							placeholder: ''
						}
					}
				]
			};

			const result = service.validateFormData(dataWithWarnings);

			expect(result.valid).toBe(true); // 警告があっても有効
			expect(result.warnings).toHaveLength(2);
			expect(result.warnings[0].code).toBe('UNDEFINED_VARIABLE');
			expect(result.warnings[1].code).toBe('UNUSED_CONTENT');
		});
	});

	describe('transformToBlock', () => {
		it('フォームデータが正しくBlockに変換される', () => {
			const block = service.transformToBlock(validFormData);

			expect(block.name).toBe('test-block');
			expect(block.title).toBe('テストブロック');
			expect(block.type).toBe(BlockPathType.Move);
			expect(block.color).toBe('#3357FF');
			expect(block.output).toBe('move ${content1}');
			expect(block.connection).toBe(Connection.Both);
			expect(block.position).toEqual({ x: 0, y: 0 });
			expect(block.zIndex).toBe(0);
		});

		it('ContentValueアイテムが正しく変換される', () => {
			const block = service.transformToBlock(validFormData);

			expect(block.content).toHaveLength(1);
			expect(block.content[0]).toEqual({
				id: 'content1',
				type: 'ContentValue',
				data: {
					title: 'コンテンツ1',
					value: 'デフォルト値',
					placeholder: 'プレースホルダー'
				}
			});
		});

		it('Textアイテムが正しく変換される', () => {
			const formDataWithText = {
				...validFormData,
				contentItems: [
					{
						id: '',
						type: 'Text',
						data: {
							title: 'テキストコンテンツ',
							value: '',
							placeholder: ''
						}
					}
				]
			};

			const block = service.transformToBlock(formDataWithText);

			expect(block.content[0]).toEqual({
				id: '',
				type: 'Text',
				data: {
					title: 'テキストコンテンツ'
				}
			});
		});

		it('Separatorアイテムが正しく変換される', () => {
			const formDataWithSeparator = {
				...validFormData,
				contentItems: [
					{
						id: '',
						type: 'Separator',
						data: {
							type: Separator.None
						}
					}
				]
			};

			const block = service.transformToBlock(formDataWithSeparator);

			expect(block.content[0]).toEqual({
				id: '',
				type: 'Separator',
				data: {
					type: Separator.None
				}
			});
		});

		it('不明なタイプはTextとして変換される', () => {
			const formDataWithUnknown = {
				...validFormData,
				contentItems: [
					{
						id: '',
						type: 'Unknown',
						data: {
							title: 'テキストコンテンツ',
							value: '',
							placeholder: ''
						}
					}
				]
			};

			const block = service.transformToBlock(formDataWithUnknown);

			expect(block.content[0]).toEqual({
				id: '',
				type: 'Text',
				data: {
					title: 'テキストコンテンツ'
				}
			});
		});

		it('closeOutputが空の場合undefinedに変換される', () => {
			const formDataWithEmptyCloseOutput = {
				...validFormData,
				closeOutput: ''
			};

			const block = service.transformToBlock(formDataWithEmptyCloseOutput);

			expect(block.closeOutput).toBeUndefined();
		});

		it('closeOutputが設定されている場合そのまま変換される', () => {
			const formDataWithCloseOutput = {
				...validFormData,
				closeOutput: '}'
			};

			const block = service.transformToBlock(formDataWithCloseOutput);

			expect(block.closeOutput).toBe('}');
		});
	});

	describe('validateRequiredFields', () => {
		it('有効なフィールドでエラーが返されない', () => {
			const errors = service.validateRequiredFields(validFormData);

			expect(errors).toHaveLength(0);
		});

		it('名前が空の場合エラーが返される', () => {
			const invalidData = { ...validFormData, name: '' };
			const errors = service.validateRequiredFields(invalidData);

			expect(errors).toHaveLength(1);
			expect(errors[0].code).toBe('REQUIRED_FIELD');
			expect(errors[0].field).toBe('name');
			expect(errors[0].message).toBe('名前は必須です');
		});

		it('名前が空白のみの場合エラーが返される', () => {
			const invalidData = { ...validFormData, name: '   ' };
			const errors = service.validateRequiredFields(invalidData);

			expect(errors.length).toBeGreaterThanOrEqual(1);
			expect(errors.some((e) => e.field === 'name' && e.code === 'REQUIRED_FIELD')).toBe(true);
		});

		it('タイトルが空の場合エラーが返される', () => {
			const invalidData = { ...validFormData, title: '' };
			const errors = service.validateRequiredFields(invalidData);

			expect(errors).toHaveLength(1);
			expect(errors[0].code).toBe('REQUIRED_FIELD');
			expect(errors[0].field).toBe('title');
			expect(errors[0].message).toBe('タイトルは必須です');
		});

		it('名前の形式が不正な場合エラーが返される', () => {
			const testCases = [
				'invalid name!',
				'invalid@name',
				'invalid name',
				'invalid#name',
				'invalid%name'
			];

			testCases.forEach((invalidName) => {
				const invalidData = { ...validFormData, name: invalidName };
				const errors = service.validateRequiredFields(invalidData);

				expect(errors.some((e) => e.code === 'INVALID_FORMAT')).toBe(true);
			});
		});

		it('有効な名前形式でエラーが返されない', () => {
			const validNames = ['valid-name', 'valid_name', 'validName123', 'VALID_NAME', 'valid123'];

			validNames.forEach((validName) => {
				const validData = { ...validFormData, name: validName };
				const errors = service.validateRequiredFields(validData);

				expect(errors.filter((e) => e.field === 'name')).toHaveLength(0);
			});
		});
	});

	describe('validateContentItems', () => {
		it('有効なコンテンツアイテムでエラーが返されない', () => {
			const errors = service.validateContentItems(validFormData.content);

			expect(errors).toHaveLength(0);
		});

		it('ContentValueアイテムのIDが空の場合エラーが返される', () => {
			const invalidItems = [
				{
					id: '',
					type: 'ContentValue' as ContentType,
					data: {
						title: 'タイトル',
						value: '',
						placeholder: ''
					}
				}
			];

			const errors = service.validateContentItems(invalidItems);

			expect(errors).toHaveLength(1);
			expect(errors[0].code).toBe('REQUIRED_FIELD');
			expect(errors[0].field).toBe('contentItems[0].id');
		});

		it('ContentValueアイテムのタイトルが空の場合エラーが返される', () => {
			const invalidItems = [
				{
					id: 'content1',
					type: 'ContentValue' as ContentType,
					data: {
						title: '',
						value: '',
						placeholder: ''
					}
				}
			];

			const errors = service.validateContentItems(invalidItems);

			expect(errors).toHaveLength(1);
			expect(errors[0].code).toBe('REQUIRED_FIELD');
			expect(errors[0].field).toBe('contentItems[0].title');
		});

		it('IDが重複している場合エラーが返される', () => {
			const invalidItems = [
				{
					id: 'duplicate',
					type: 'ContentValue' as ContentType,
					data: {
						title: 'タイトル1',
						value: '',
						placeholder: ''
					}
				},
				{
					id: 'duplicate',
					type: 'ContentValue' as ContentType,
					data: {
						title: 'タイトル2',
						value: '',
						placeholder: ''
					}
				}
			];

			const errors = service.validateContentItems(invalidItems);

			expect(errors.some((e) => e.code === 'DUPLICATE_ID')).toBe(true);
			expect(errors.find((e) => e.code === 'DUPLICATE_ID')?.field).toBe('contentItems[1].id');
		});

		it('IDの形式が不正な場合エラーが返される', () => {
			const invalidItems = [
				{
					id: 'invalid-id!',
					type: 'ContentValue' as ContentType,
					data: {
						title: 'タイトル',
						value: '',
						placeholder: ''
					}
				}
			];

			const errors = service.validateContentItems(invalidItems);

			expect(errors.some((e) => e.code === 'INVALID_FORMAT')).toBe(true);
		});

		it('Textアイテムのタイトルが空の場合エラーが返される', () => {
			const invalidItems = [
				{
					id: '',
					type: 'Text' as ContentType,
					data: {
						title: '',
						value: '',
						placeholder: ''
					}
				}
			];

			const errors = service.validateContentItems(invalidItems);

			expect(errors).toHaveLength(1);
			expect(errors[0].code).toBe('REQUIRED_FIELD');
			expect(errors[0].field).toBe('contentItems[0].title');
		});

		it('Separatorアイテムでエラーが返されない', () => {
			const separatorItems = [
				{
					id: '',
					type: 'Separator' as ContentType,
					data: {
						title: '',
						value: '',
						placeholder: ''
					}
				}
			];

			const errors = service.validateContentItems(separatorItems);

			expect(errors).toHaveLength(0);
		});

		it('複数のアイテムで複数のエラーが返される', () => {
			const invalidItems = [
				{
					id: '',
					type: 'ContentValue' as ContentType,
					data: {
						title: '',
						value: '',
						placeholder: ''
					}
				},
				{
					id: 'invalid-id!',
					type: 'ContentValue' as ContentType,
					data: {
						title: 'タイトル',
						value: '',
						placeholder: ''
					}
				},
				{
					id: '',
					type: 'Text' as ContentType,
					data: {
						title: '',
						value: '',
						placeholder: ''
					}
				}
			];

			const errors = service.validateContentItems(invalidItems);

			expect(errors.length).toBeGreaterThan(3);
			expect(errors.some((e) => e.field === 'contentItems[0].id')).toBe(true);
			expect(errors.some((e) => e.field === 'contentItems[0].title')).toBe(true);
			expect(errors.some((e) => e.field === 'contentItems[1].id')).toBe(true);
			expect(errors.some((e) => e.field === 'contentItems[2].title')).toBe(true);
		});
	});

	describe('validateBlockNameUniqueness', () => {
		it('重複しない名前でエラーが返されない', () => {
			const existingNames = ['block1', 'block2', 'block3'];
			const errors = service.validateBlockNameUniqueness('new-block', existingNames);

			expect(errors).toHaveLength(0);
		});

		it('重複する名前でエラーが返される', () => {
			const existingNames = ['block1', 'block2', 'block3'];
			const errors = service.validateBlockNameUniqueness('block2', existingNames);

			expect(errors).toHaveLength(1);
			expect(errors[0].code).toBe('DUPLICATE_NAME');
			expect(errors[0].field).toBe('name');
			expect(errors[0].message).toBe('ブロック名 "block2" は既に使用されています');
		});

		it('空の既存名リストでエラーが返されない', () => {
			const errors = service.validateBlockNameUniqueness('any-name', []);

			expect(errors).toHaveLength(0);
		});
	});

	describe('出力テンプレート検証（プライベートメソッド）', () => {
		it('未定義の変数がある場合警告が返される', () => {
			const formDataWithUndefinedVar = {
				...validFormData,
				output: 'move ${undefined_var}',
				contentItems: []
			};

			const result = service.validateFormData(formDataWithUndefinedVar);

			expect(result.warnings).toHaveLength(1);
			expect(result.warnings[0].code).toBe('UNDEFINED_VARIABLE');
			expect(result.warnings[0].field).toBe('output');
			expect(result.warnings[0].context?.variable).toBe('undefined_var');
		});

		it('使用されていないコンテンツIDがある場合警告が返される', () => {
			const formDataWithUnusedContent = {
				...validFormData,
				output: '',
				contentItems: [
					{
						id: 'unused_content',
						type: 'ContentValue',
						data: {
							title: 'コンテンツ',
							value: '',
							placeholder: ''
						}
					}
				]
			};

			const result = service.validateFormData(formDataWithUnusedContent);

			expect(result.warnings).toHaveLength(1);
			expect(result.warnings[0].code).toBe('UNUSED_CONTENT');
			expect(result.warnings[0].field).toBe('output');
			expect(result.warnings[0].context?.contentId).toBe('unused_content');
		});

		it('出力テンプレートが空の場合警告が返されない', () => {
			const formDataWithEmptyOutput = {
				...validFormData,
				output: '',
				contentItems: []
			};

			const result = service.validateFormData(formDataWithEmptyOutput);

			expect(result.warnings).toHaveLength(0);
		});

		it('複数の変数と複数のコンテンツIDで複数の警告が返される', () => {
			const formDataWithMultipleIssues = {
				...validFormData,
				output: 'move ${content1} ${undefined_var}',
				contentItems: [
					{
						id: 'content1',
						type: 'ContentValue',
						data: {
							title: 'コンテンツ1',
							value: '',
							placeholder: ''
						}
					},
					{
						id: 'unused_content',
						type: 'ContentValue',
						data: {
							title: 'コンテンツ2',
							value: '',
							placeholder: ''
						}
					}
				]
			};

			const result = service.validateFormData(formDataWithMultipleIssues);

			expect(result.warnings).toHaveLength(2);
			expect(result.warnings.some((w) => w.code === 'UNDEFINED_VARIABLE')).toBe(true);
			expect(result.warnings.some((w) => w.code === 'UNUSED_CONTENT')).toBe(true);
		});
	});
});
