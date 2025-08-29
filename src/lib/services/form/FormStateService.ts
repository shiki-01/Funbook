/**
 * フォーム状態管理サービス
 * ブロックフォームの状態管理を担当
 */

import type { BlockFormData, BlockContent, ContentType } from '$lib/types';
import { BlockPathType, Connection } from '$lib/types/core';

/**
 * フォーム状態管理サービスインターフェース
 */
export interface IFormStateService {
	/**
	 * 初期フォームデータを作成
	 * @returns 初期化されたフォームデータ
	 */
	createInitialFormData(): BlockFormData;

	/**
	 * フォームデータをリセット
	 * @param formData リセットするフォームデータ
	 * @returns リセットされたフォームデータ
	 */
	resetFormData(formData: BlockFormData): BlockFormData;

	/**
	 * コンテンツアイテムを追加
	 * @param formData 現在のフォームデータ
	 * @param contentType 追加するコンテンツタイプ
	 * @returns 更新されたフォームデータ
	 */
	addContentItem(
		formData: BlockFormData,
		contentType: 'Text' | 'ContentValue' | 'ContentSelector' | 'Separator'
	): BlockFormData;

	/**
	 * コンテンツアイテムを削除
	 * @param formData 現在のフォームデータ
	 * @param index 削除するアイテムのインデックス
	 * @returns 更新されたフォームデータ
	 */
	removeContentItem(formData: BlockFormData, index: number): BlockFormData;

	/**
	 * コンテンツアイテムを更新
	 * @param formData 現在のフォームデータ
	 * @param index 更新するアイテムのインデックス
	 * @param updates 更新内容
	 * @returns 更新されたフォームデータ
	 */
	updateContentItem(
		formData: BlockFormData,
		index: number,
		updates: Partial<BlockContent>
	): BlockFormData;

	/**
	 * フォームフィールドを更新
	 * @param formData 現在のフォームデータ
	 * @param field 更新するフィールド名
	 * @param value 新しい値
	 * @returns 更新されたフォームデータ
	 */
	updateFormField<K extends keyof BlockFormData>(
		formData: BlockFormData,
		field: K,
		value: BlockFormData[K]
	): BlockFormData;

	/**
	 * フォームデータをディープコピー
	 * @param formData コピーするフォームデータ
	 * @returns コピーされたフォームデータ
	 */
	cloneFormData(formData: BlockFormData): BlockFormData;
}

/**
 * フォーム状態管理サービス実装
 */
export class FormStateService implements IFormStateService {
	/**
	 * 初期フォームデータを作成
	 * @returns 初期化されたフォームデータ
	 */
	createInitialFormData(): BlockFormData {
		return {
			name: '',
			title: '',
			type: BlockPathType.Move,
			color: '#3357FF',
			output: '',
			closeOutput: '',
			assignmentFormat: '',
			connection: Connection.Both,
			content: []
		};
	}

	/**
	 * フォームデータをリセット
	 * @param formData リセットするフォームデータ
	 * @returns リセットされたフォームデータ
	 */
	resetFormData(formData: BlockFormData): BlockFormData {
		return this.createInitialFormData();
	}

	/**
	 * コンテンツアイテムを追加
	 * @param formData 現在のフォームデータ
	 * @param type 追加するコンテンツタイプ
	 * @returns 更新されたフォームデータ
	 */
	addContentItem(formData: BlockFormData, type: ContentType): BlockFormData {
		const newFormData = this.cloneFormData(formData);

		const newItem: BlockContent = {
			id: '',
			type,
			data: {
				title: '',
				value: '',
				placeholder: ''
			}
		};

		newFormData.content.push(newItem);
		return newFormData;
	}

	/**
	 * コンテンツアイテムを削除
	 * @param formData 現在のフォームデータ
	 * @param index 削除するアイテムのインデックス
	 * @returns 更新されたフォームデータ
	 */
	removeContentItem(formData: BlockFormData, index: number): BlockFormData {
		const newFormData = this.cloneFormData(formData);

		if (index >= 0 && index < newFormData.content.length) {
			newFormData.content.splice(index, 1);
		}

		return newFormData;
	}

	/**
	 * コンテンツアイテムを更新
	 * @param formData 現在のフォームデータ
	 * @param index 更新するアイテムのインデックス
	 * @param updates 更新内容
	 * @returns 更新されたフォームデータ
	 */
	updateContentItem(
		formData: BlockFormData,
		index: number,
		updates: Partial<BlockContent>
	): BlockFormData {
		const newFormData = this.cloneFormData(formData);

		if (index >= 0 && index < newFormData.content.length) {
			newFormData.content[index] = {
				...newFormData.content[index],
				...updates
			};
		}

		return newFormData;
	}

	/**
	 * フォームフィールドを更新
	 * @param formData 現在のフォームデータ
	 * @param field 更新するフィールド名
	 * @param value 新しい値
	 * @returns 更新されたフォームデータ
	 */
	updateFormField<K extends keyof BlockFormData>(
		formData: BlockFormData,
		field: K,
		value: BlockFormData[K]
	): BlockFormData {
		const newFormData = this.cloneFormData(formData);
		newFormData[field] = value;
		return newFormData;
	}

	/**
	 * フォームデータをディープコピー
	 * @param formData コピーするフォームデータ
	 * @returns コピーされたフォームデータ
	 */
	cloneFormData(formData: BlockFormData): BlockFormData {
		return {
			...formData,
			content: formData.content.map((item) => ({ ...item }))
		};
	}
}
