<!--
  ブロックフォームコンポーネント
  ブロックの作成・編集を行うフォーム
-->
<script lang="ts">
	import { useBlockStore } from '$lib/stores/block.store.svelte';
	import {
		BlockPathType,
		Connection,
		type BlockFormData,
		type Block,
		type ContentType,
		type ValidationResult
	} from '$lib/types';
	import {
		FormValidationService,
		FormStateService,
		type IFormValidationService,
		type IFormStateService
	} from '$lib/services/form';
	import FormErrorNotification from '$lib/components/error/FormErrorNotification.svelte';

	interface Props {
		onSave?: (block: Block) => void;
		onCancel?: () => void;
	}

	let { onSave, onCancel }: Props = $props();

	const blockStore = useBlockStore();

	// サービスインスタンス
	const validationService: IFormValidationService = new FormValidationService();
	const stateService: IFormStateService = new FormStateService();

	// フォーム状態
	let formData = $state<BlockFormData>(stateService.createInitialFormData());
	let validationResult = $state<ValidationResult>({
		valid: true,
		errors: [],
		warnings: []
	});
	let isSubmitting = $state(false);

	/**
	 * フォームフィールドを更新
	 * @param field 更新するフィールド名
	 * @param value 新しい値
	 */
	const updateFormField = <K extends keyof BlockFormData>(field: K, value: BlockFormData[K]) => {
		formData = stateService.updateFormField(formData, field, value);
		// リアルタイム検証
		validateForm();
	};

	/**
	 * コンテンツアイテムを追加
	 * @param type 追加するコンテンツタイプ
	 */
	const addContentItem = (type: ContentType) => {
		formData = stateService.addContentItem(formData, type);
		validateForm();
	};

	/**
	 * コンテンツアイテムを削除
	 * @param index 削除するアイテムのインデックス
	 */
	const removeContentItem = (index: number) => {
		formData = stateService.removeContentItem(formData, index);
		validateForm();
	};

	/**
	 * コンテンツアイテムを更新
	 * @param index 更新するアイテムのインデックス
	 * @param field 更新するフィールド名
	 * @param value 新しい値
	 */
	const updateContentItem = (index: number, field: string, value: string) => {
		formData = stateService.updateContentItem(formData, index, {
			[field]: value
		});
		validateForm();
	};

	/**
	 * フォームを検証
	 */
	const validateForm = () => {
		const existingNames = blockStore.getAllBlocks().map((block: Block) => block.name);
		const nameValidation = validationService.validateBlockNameUniqueness(
			formData.name,
			existingNames
		);
		const formValidation = validationService.validateFormData(formData);

		validationResult = {
			valid: formValidation.valid && nameValidation.length === 0,
			errors: [...formValidation.errors, ...nameValidation],
			warnings: formValidation.warnings
		};
	};

	/**
	 * フォームをリセット
	 */
	const resetForm = () => {
		formData = stateService.resetFormData(formData);
		validationResult = { valid: true, errors: [], warnings: [] };
	};

	/**
	 * ブロックリストを保存
	 */
	const handleSave = async () => {
		if (isSubmitting) return;

		isSubmitting = true;

		try {
			// 最終検証
			validateForm();

			if (!validationResult.valid) {
				return;
			}

			// フォームデータをBlockに変換
			const block = validationService.transformToBlock(formData);

			// ブロックにIDを設定
			block.id = crypto.randomUUID();

			// ブロックタイプとして登録
			blockStore.registerBlockType(block);
			// パレット表示用ブロックリストにも追加
			blockStore.addBlockList({ name: block.name, block });

			// フォームをリセット
			resetForm();

			// コールバック実行
			if (onSave) {
				onSave(block);
			}
		} catch (error) {
			console.error('ブロック保存エラー:', error);
			validationResult = {
				valid: false,
				errors: [
					{
						code: 'SAVE_ERROR',
						message: 'ブロックの保存中にエラーが発生しました'
					}
				],
				warnings: []
			};
		} finally {
			isSubmitting = false;
		}
	};

	/**
	 * キャンセル処理
	 */
	const handleCancel = () => {
		resetForm();
		if (onCancel) {
			onCancel();
		}
	};

	/**
	 * エラーフィールドのスタイルを取得
	 * @param fieldName フィールド名
	 * @returns エラーがある場合はエラースタイルクラス
	 */
	const getFieldErrorClass = (fieldName: string): string => {
		const hasError = validationResult.errors.some((error) => error.field === fieldName);
		return hasError ? 'error' : '';
	};

	/**
	 * フィールドのエラーメッセージを取得
	 * @param fieldName フィールド名
	 * @returns エラーメッセージの配列
	 */
	const getFieldErrors = (fieldName: string): string[] => {
		return validationResult.errors
			.filter((error) => error.field === fieldName)
			.map((error) => error.message);
	};
</script>

<div class="block-form">
	<!-- エラー通知 -->
	{#if !validationResult.valid}
		<FormErrorNotification errors={validationResult.errors} warnings={validationResult.warnings} />
	{/if}

	<div class="form-section">
		<h3>基本情報</h3>
		<div class="form-group">
			<label for="name">名前 *</label>
			<input
				id="name"
				type="text"
				value={formData.name}
				oninput={(e) => updateFormField('name', (e.target as HTMLInputElement).value)}
				placeholder="ブロックの内部名称"
				class={getFieldErrorClass('name')}
				required
			/>
			{#each getFieldErrors('name') as error}
				<div class="field-error">{error}</div>
			{/each}
		</div>

		<div class="form-group">
			<label for="title">タイトル *</label>
			<input
				id="title"
				type="text"
				value={formData.title}
				oninput={(e) => updateFormField('title', (e.target as HTMLInputElement).value)}
				placeholder="ブロックに表示されるタイトル"
				class={getFieldErrorClass('title')}
				required
			/>
			{#each getFieldErrors('title') as error}
				<div class="field-error">{error}</div>
			{/each}
		</div>

		<div class="form-group">
			<label for="type">タイプ</label>
			<select
				id="type"
				value={formData.type}
				onchange={(e) =>
					updateFormField('type', (e.target as HTMLSelectElement).value as BlockPathType)}
			>
				<option value={BlockPathType.Flag}>Flag</option>
				<option value={BlockPathType.Move}>Move</option>
				<option value={BlockPathType.Works}>Works</option>
				<option value={BlockPathType.Composition}>Composition</option>
				<option value={BlockPathType.Loop}>Loop</option>
				<option value={BlockPathType.Value}>Value</option>
			</select>
		</div>

		<div class="form-group">
			<label for="color">色</label>
			<input
				id="color"
				type="color"
				value={formData.color}
				oninput={(e) => updateFormField('color', (e.target as HTMLInputElement).value)}
			/>
		</div>

		<div class="form-group">
			<label for="connection">接続タイプ</label>
			<select
				id="connection"
				value={formData.connection}
				onchange={(e) =>
					updateFormField('connection', (e.target as HTMLSelectElement).value as Connection)}
			>
				<option value={Connection.Input}>Input</option>
				<option value={Connection.Output}>Output</option>
				<option value={Connection.Both}>Both</option>
				<option value={Connection.None}>None</option>
			</select>
		</div>

		<div class="form-group">
			<label for="output">出力テンプレート</label>
			<input
				id="output"
				type="text"
				value={formData.output}
				oninput={(e) => updateFormField('output', (e.target as HTMLInputElement).value)}
				placeholder="例: move {'${'}content1{'}'}"
				class={getFieldErrorClass('output')}
			/>
			<small>{'${'}contentId{'}'} でコンテンツの値を参照できます</small>
			{#each getFieldErrors('output') as error}
				<div class="field-error">{error}</div>
			{/each}
		</div>

		{#if formData.type === BlockPathType.Value}
			<div class="form-group">
				<label for="assignmentFormat">代入テンプレート (Value)</label>
				<input
					id="assignmentFormat"
					type="text"
					value={formData.assignmentFormat}
					oninput={(e) => updateFormField('assignmentFormat', (e.target as HTMLInputElement).value)}
					placeholder="例: ${'${'}name{'}'} = ${'${'}value{'}'}"
				/>
				<small
					>${'${'}name{'}'}, ${'${'}value{'}'} が使用できます。set_value で使用される行の書式。</small
				>
			</div>
		{/if}

		<div class="form-group">
			<label for="closeOutput">終了出力テンプレート（オプション）</label>
			<input
				id="closeOutput"
				type="text"
				value={formData.closeOutput}
				oninput={(e) => updateFormField('closeOutput', (e.target as HTMLInputElement).value)}
				placeholder="例: } (ループブロック等で使用)"
			/>
			<small>ループやブロック構造の終了時に出力される内容</small>
		</div>
	</div>

	<div class="form-section">
		<h3>コンテンツ</h3>
		<div class="content-actions">
			<button type="button" onclick={() => addContentItem('ContentValue')}> 値入力を追加 </button>
			<button type="button" onclick={() => addContentItem('Text')}> テキストを追加 </button>
			<button type="button" onclick={() => addContentItem('ContentSelector')}>
				セレクターを追加
			</button>
			<button type="button" onclick={() => addContentItem('Separator')}> 区切り線を追加 </button>
		</div>

		{#each formData.content as item, index}
			<div class="content-item">
				<div class="content-header">
					<span class="content-type">{item.type}</span>
					<button type="button" onclick={() => removeContentItem(index)}> 削除 </button>
				</div>

				{#if item.type === 'ContentValue'}
					<!-- Value 入力 -->
					<div class="form-group">
						<label for="id-{index}">ID</label>
						<input
							id="id-{index}"
							type="text"
							value={item.id}
							oninput={(e) => updateContentItem(index, 'id', (e.target as HTMLInputElement).value)}
							placeholder="一意のID"
							class={getFieldErrorClass(`contentItems[${index}].id`)}
						/>
						{#each getFieldErrors(`contentItems[${index}].id`) as error}
							<div class="field-error">{error}</div>
						{/each}
					</div>
					<div class="form-group">
						{#if 'title' in item.data}
							<label for="label-{index}">ラベル</label>
							<input
								id="label-{index}"
								type="text"
								value={item.data.title}
								oninput={(e) =>
									updateContentItem(index, 'title', (e.target as HTMLInputElement).value)}
								placeholder="入力フィールドのラベル"
								class={getFieldErrorClass(`contentItems[${index}].title`)}
							/>
						{/if}
						{#each getFieldErrors(`contentItems[${index}].title`) as error}
							<div class="field-error">{error}</div>
						{/each}
					</div>
					<div class="form-group">
						{#if 'value' in item.data}
							<label for="value-{index}">デフォルト値</label>
							<input
								id="value-{index}"
								type="text"
								value={item.data.value}
								oninput={(e) =>
									updateContentItem(index, 'value', (e.target as HTMLInputElement).value)}
								placeholder="初期値"
							/>
						{/if}
					</div>
					<div class="form-group">
						{#if 'placeholder' in item.data}
							<label for="placeholder-{index}">プレースホルダー</label>
							<input
								id="placeholder-{index}"
								type="text"
								value={item.data.placeholder}
								oninput={(e) =>
									updateContentItem(index, 'placeholder', (e.target as HTMLInputElement).value)}
								placeholder="入力例を表示"
							/>
						{/if}
					</div>
				{:else if item.type === 'Text'}
					<!-- 静的テキスト -->
					<div class="form-group">
						{#if 'title' in item.data}
							<label for="text-{index}">テキスト</label>
							<input
								id="text-{index}"
								type="text"
								value={item.data.title}
								oninput={(e) =>
									updateContentItem(index, 'title', (e.target as HTMLInputElement).value)}
								placeholder="表示するテキスト"
								class={getFieldErrorClass(`contentItems[${index}].title`)}
							/>
						{/if}
						{#each getFieldErrors(`contentItems[${index}].title`) as error}
							<div class="field-error">{error}</div>
						{/each}
					</div>
				{:else if item.type === 'ContentSelector'}
					<!-- セレクタ入力 -->
					<div class="form-group">
						<label for="id-{index}">ID</label>
						<input
							id="id-{index}"
							type="text"
							value={item.id}
							oninput={(e) => updateContentItem(index, 'id', (e.target as HTMLInputElement).value)}
							placeholder="一意のID"
						/>
					</div>
					<div class="form-group">
						<label for="label-{index}">ラベル</label>
						<input
							id="label-{index}"
							type="text"
							value={(item.data as any).title}
							oninput={(e) =>
								updateContentItem(index, 'title', (e.target as HTMLInputElement).value)}
							placeholder="セレクターのラベル"
						/>
					</div>
					<div class="form-group">
						<label for="options-{index}">オプション (カンマ区切り value:title)</label>
						<input
							id="options-{index}"
							type="text"
							value={(item as any).optionsInput || ''}
							oninput={(e) => {
								const raw = (e.target as HTMLInputElement).value;
								const options = raw
									.split(',')
									.map((p) => p.trim())
									.filter(Boolean)
									.map((pair) => {
										const [v, t] = pair.split(':');
										return {
											id: v?.trim() || '',
											value: v?.trim() || '',
											title: t?.trim() || v?.trim() || ''
										};
									});
								updateContentItem(index, 'data', {
									...(item.data as any),
									title: (item.data as any).title,
									value: options[0]?.value || '',
									options
								});
								(item as any).optionsInput = raw;
							}}
							placeholder="例: opt1:Option1,opt2:Option2"
						/>
					</div>
				{/if}
			</div>
		{/each}
	</div>

	<div class="form-actions">
		<button type="button" class="cancel-btn" onclick={handleCancel}> キャンセル </button>
		<button
			type="button"
			class="save-btn"
			onclick={handleSave}
			disabled={!validationResult.valid || isSubmitting}
		>
			{isSubmitting ? '保存中...' : '保存'}
		</button>
	</div>
</div>

<style>
	.block-form {
		width: 600px;
		max-width: 600px;
		max-height: 80vh;
		overflow-y: auto;
	}

	.form-section {
		margin-bottom: 24px;
		padding-bottom: 16px;
		border-bottom: 1px solid #e0e0e0;
	}

	.form-section:last-of-type {
		border-bottom: none;
	}

	.form-section h3 {
		margin: 0 0 16px 0;
		color: #333;
		font-size: 18px;
	}

	.form-group {
		margin-bottom: 16px;
	}

	.form-group label {
		display: block;
		margin-bottom: 4px;
		font-weight: 500;
		color: #555;
	}

	.form-group input,
	.form-group select {
		width: 100%;
		padding: 8px 12px;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-size: 14px;
		box-sizing: border-box;
	}

	.form-group input:focus,
	.form-group select:focus {
		outline: none;
		border-color: #4a90e2;
		box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.2);
	}

	.form-group small {
		display: block;
		margin-top: 4px;
		color: #666;
		font-size: 12px;
	}

	.content-actions {
		display: flex;
		gap: 8px;
		margin-bottom: 16px;
		flex-wrap: wrap;
	}

	.content-actions button {
		padding: 6px 12px;
		background: #f5f5f5;
		border: 1px solid #ddd;
		border-radius: 4px;
		cursor: pointer;
		font-size: 12px;
	}

	.content-actions button:hover {
		background: #e9e9e9;
	}

	.content-item {
		background: #f9f9f9;
		border: 1px solid #e0e0e0;
		border-radius: 4px;
		padding: 16px;
		margin-bottom: 12px;
	}

	.content-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 12px;
	}

	.content-type {
		font-weight: 500;
		color: #4a90e2;
		font-size: 14px;
	}

	.content-header button {
		padding: 4px 8px;
		background: #ff6b6b;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 12px;
	}

	.content-header button:hover {
		background: #ff5252;
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
		gap: 12px;
		padding-top: 16px;
	}

	.form-actions button {
		padding: 10px 20px;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 14px;
		font-weight: 500;
	}

	.cancel-btn {
		background: #f5f5f5;
		color: #333;
	}

	.cancel-btn:hover {
		background: #e9e9e9;
	}

	.save-btn {
		background: #4a90e2;
		color: white;
	}

	.save-btn:hover:not(:disabled) {
		background: #357abd;
	}

	.save-btn:disabled {
		background: #ccc;
		cursor: not-allowed;
	}

	.form-group input.error {
		border-color: #ff6b6b;
		box-shadow: 0 0 0 2px rgba(255, 107, 107, 0.2);
	}

	.field-error {
		color: #ff6b6b;
		font-size: 12px;
		margin-top: 4px;
		display: block;
	}
</style>
