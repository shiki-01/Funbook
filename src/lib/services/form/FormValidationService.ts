/**
 * フォーム検証サービス
 * ブロックフォームの検証ロジックを管理
 */

import type {
	Block,
	BlockContent,
	BlockFormData,
	FormFieldError,
	FormFieldWarning
} from '$lib/types';
import { BlockPathType, Connection } from '$lib/types/core';
import type { ValidationResult, ValidationError, ValidationWarning } from '$lib/types/services';

/**
 * フォーム検証サービスインターフェース
 */
export interface IFormValidationService {
	/**
	 * フォームデータを検証
	 * @param formData 検証するフォームデータ
	 * @returns 検証結果
	 */
	validateFormData(formData: BlockFormData): ValidationResult;

	/**
	 * フォームデータをBlockに変換
	 * @param formData 変換するフォームデータ
	 * @returns 変換されたBlock
	 */
	transformToBlock(formData: BlockFormData): Block;

	/**
	 * 必須フィールドを検証
	 * @param formData 検証するフォームデータ
	 * @returns 検証エラーの配列
	 */
	validateRequiredFields(formData: BlockFormData): ValidationError[];

	/**
	 * コンテンツアイテムを検証
	 * @param content 検証するコンテンツアイテム
	 * @returns 検証エラーの配列
	 */
	validateContentItems(content: BlockContent[]): ValidationError[];

	/**
	 * ブロック名の重複を検証
	 * @param name 検証するブロック名
	 * @param existingNames 既存のブロック名の配列
	 * @returns 検証エラーの配列
	 */
	validateBlockNameUniqueness(name: string, existingNames: string[]): ValidationError[];
}

/**
 * フォーム検証サービス実装
 */
export class FormValidationService implements IFormValidationService {
	/**
	 * フォームデータを検証
	 * @param formData 検証するフォームデータ
	 * @returns 検証結果
	 */
	validateFormData(formData: BlockFormData): ValidationResult {
		const errors: ValidationError[] = [];
		const warnings: ValidationWarning[] = [];

		// 必須フィールドの検証
		errors.push(...this.validateRequiredFields(formData));

		// コンテンツアイテムの検証
		errors.push(...this.validateContentItems(formData.content));

		// 出力テンプレートの検証
		const outputValidation = this.validateOutputTemplate(formData.output, formData.content);
		errors.push(...outputValidation.errors);
		warnings.push(...outputValidation.warnings);

		return {
			valid: errors.length === 0,
			errors,
			warnings
		};
	}

	/**
	 * フォームデータをBlockに変換
	 * @param formData 変換するフォームデータ
	 * @returns 変換されたBlock
	 */
	transformToBlock(formData: BlockFormData): Block {
		const block: Block = {
			// BlockMetadata
			id: '', // Will be set by the service that creates the block
			name: formData.name,
			type: formData.type,

			// Block properties
			title: formData.title,
			output: formData.output,
			closeOutput: formData.closeOutput || undefined,
			content: formData.content,
			color: formData.color,
			assignmentFormat: formData.assignmentFormat || undefined,

			// BlockLayout
			position: { x: 0, y: 0 },
			zIndex: 0,
			visibility: true,

			// BlockBehavior
			connection: formData.connection,
			draggable: true,
			editable: true,
			deletable: true,

			// BlockRelationship (empty for new blocks)
			parentId: undefined,
			childId: undefined,
			valueTargetId: undefined,
			loopFirstChildId: undefined,
			loopLastChildId: undefined
		};

		return block;
	}

	/**
	 * 必須フィールドを検証
	 * @param formData 検証するフォームデータ
	 * @returns 検証エラーの配列
	 */
	validateRequiredFields(formData: BlockFormData): ValidationError[] {
		const errors: ValidationError[] = [];

		if (!formData.name || !formData.name.trim()) {
			errors.push({
				code: 'REQUIRED_FIELD',
				message: '名前は必須です',
				field: 'name'
			});
		}

		if (!formData.title || !formData.title.trim()) {
			errors.push({
				code: 'REQUIRED_FIELD',
				message: 'タイトルは必須です',
				field: 'title'
			});
		}

		// 名前の形式検証
		if (formData.name && !/^[a-zA-Z0-9_-]+$/.test(formData.name)) {
			errors.push({
				code: 'INVALID_FORMAT',
				message: '名前は英数字、アンダースコア、ハイフンのみ使用できます',
				field: 'name'
			});
		}

		return errors;
	}

	/**
	 * コンテンツアイテムを検証
	 * @param content 検証するコンテンツアイテム
	 * @returns 検証エラーの配列
	 */
	validateContentItems(content: BlockContent[]): ValidationError[] {
		const errors: ValidationError[] = [];
		const usedIds = new Set<string>();

		content.forEach((item, index) => {
			// ContentValueタイプの場合、IDとタイトルが必須
			if (item.type === 'ContentValue') {
				if (!item.id || !item.id.trim()) {
					errors.push({
						code: 'REQUIRED_FIELD',
						message: `コンテンツアイテム ${index + 1}: IDは必須です`,
						field: `content[${index}].id`
					});
				} else {
					// ID重複チェック
					if (usedIds.has(item.id)) {
						errors.push({
							code: 'DUPLICATE_ID',
							message: `コンテンツアイテム ${index + 1}: ID "${item.id}" は既に使用されています`,
							field: `content[${index}].id`
						});
					} else {
						usedIds.add(item.id);
					}

					// ID形式チェック
					if (!/^[a-zA-Z0-9_]+$/.test(item.id)) {
						errors.push({
							code: 'INVALID_FORMAT',
							message: `コンテンツアイテム ${
								index + 1
							}: IDは英数字とアンダースコアのみ使用できます`,
							field: `content[${index}].id`
						});
					}
				}

				// ContentValueのdataの検証
				if (item.data && 'title' in item.data) {
					if (!item.data.title || !item.data.title.trim()) {
						errors.push({
							code: 'REQUIRED_FIELD',
							message: `コンテンツアイテム ${index + 1}: タイトルは必須です`,
							field: `content[${index}].data.title`
						});
					}
				}
			}

			// Textタイプの場合、タイトルが必須
			if (item.type === 'Text') {
				if (item.data && 'title' in item.data) {
					if (!item.data.title || !item.data.title.trim()) {
						errors.push({
							code: 'REQUIRED_FIELD',
							message: `コンテンツアイテム ${index + 1}: テキストは必須です`,
							field: `content[${index}].data.title`
						});
					}
				}
			}
		});

		return errors;
	}

	/**
	 * ブロック名の重複を検証
	 * @param name 検証するブロック名
	 * @param existingNames 既存のブロック名の配列
	 * @returns 検証エラーの配列
	 */
	validateBlockNameUniqueness(name: string, existingNames: string[]): ValidationError[] {
		const errors: ValidationError[] = [];

		if (existingNames.includes(name)) {
			errors.push({
				code: 'DUPLICATE_NAME',
				message: `ブロック名 "${name}" は既に使用されています`,
				field: 'name'
			});
		}

		return errors;
	}

	/**
	 * 出力テンプレートを検証
	 * @param output 出力テンプレート
	 * @param content コンテンツアイテム
	 * @returns 検証結果
	 */
	private validateOutputTemplate(
		output: string,
		content: BlockContent[]
	): { errors: ValidationError[]; warnings: ValidationWarning[] } {
		const errors: ValidationError[] = [];
		const warnings: ValidationWarning[] = [];

		// テンプレート変数の抽出
		const templateVariables = output.match(/\$\{([^}]+)\}/g) || [];
		const contentIds = content
			.filter((item) => item.type === 'ContentValue' && item.id)
			.map((item) => item.id);

		// 未定義の変数をチェック（出力テンプレートがある場合のみ）
		if (output && output.trim()) {
			templateVariables.forEach((variable) => {
				const variableName = variable.replace(/\$\{|\}/g, '');
				if (!contentIds.includes(variableName)) {
					warnings.push({
						code: 'UNDEFINED_VARIABLE',
						message: `出力テンプレートの変数 "${variableName}" に対応するコンテンツIDが見つかりません`,
						field: 'output',
						context: { variable: variableName }
					});
				}
			});
		}

		// 使用されていないコンテンツIDをチェック（ContentValueアイテムがある場合のみ）
		if (contentIds.length > 0) {
			contentIds.forEach((contentId) => {
				if (!output.includes(`\${${contentId}}`)) {
					warnings.push({
						code: 'UNUSED_CONTENT',
						message: `コンテンツID "${contentId}" が出力テンプレートで使用されていません`,
						field: 'output',
						context: { contentId }
					});
				}
			});
		}

		return { errors, warnings };
	}
}
