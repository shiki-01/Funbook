/**
 * データ検証ユーティリティ
 * ブロック、接続、データ整合性を検証するための純粋関数
 *
 * このモジュールは、ビジネスロジックから抽出された検証ロジックを提供します。
 * すべての関数は純粋関数として実装されており、副作用がありません。
 *
 * @module ValidationUtils
 */

import type {
	Block,
	BlockType,
	ValidationRule,
	ValidationResult,
	ValidationError,
	ProjectData,
	Position,
	BlockContent
} from '../../types';
import { BlockPathType, Connection } from '../../types/core';

/**
 * ブロックの基本構造とデータを検証
 *
 * ブロックの必須フィールド、型、構造の整合性をチェックします。
 * エラーと警告の両方を返し、データ品質の問題を特定します。
 *
 * @param block - 検証するブロック
 * @returns 検証結果（valid: boolean, errors: ValidationError[], warnings: ValidationError[]）
 *
 * @example
 * ```typescript
 * const block = createMockBlock();
 * const result = validateBlock(block);
 * if (!result.valid) {
 *   console.error('Validation errors:', result.errors);
 * }
 * ```
 */
export function validateBlock(block: Block): ValidationResult {
	const errors: ValidationError[] = [];
	const warnings: ValidationError[] = [];

	// 必須フィールドの検証
	if (!block.id || typeof block.id !== 'string') {
		errors.push({
			code: 'INVALID_ID',
			message: 'ブロックには有効なIDが必要です',
			field: 'id'
		});
	}

	if (!block.name || typeof block.name !== 'string') {
		errors.push({
			code: 'INVALID_NAME',
			message: 'ブロックには有効な名前が必要です',
			field: 'name'
		});
	}

	if (!block.title || typeof block.title !== 'string') {
		errors.push({
			code: 'INVALID_TITLE',
			message: 'ブロックには有効なタイトルが必要です',
			field: 'title'
		});
	}

	// 位置の検証
	if (!isValidPosition(block.position)) {
		errors.push({
			code: 'INVALID_POSITION',
			message: 'ブロックには有効な位置が必要です',
			field: 'position'
		});
	}

	// zIndexの検証
	if (typeof block.zIndex !== 'number' || !isFinite(block.zIndex)) {
		errors.push({
			code: 'INVALID_Z_INDEX',
			message: 'ブロックには有効なzIndexが必要です',
			field: 'zIndex'
		});
	}

	// 可視性の検証
	if (typeof block.visibility !== 'boolean') {
		errors.push({
			code: 'INVALID_VISIBILITY',
			message: 'ブロックには有効な可視性設定が必要です',
			field: 'visibility'
		});
	}

	// 接続タイプの検証
	if (!Object.values(Connection).includes(block.connection)) {
		errors.push({
			code: 'INVALID_CONNECTION_TYPE',
			message: 'ブロックには有効な接続タイプが必要です',
			field: 'connection'
		});
	}

	// ブロックタイプの検証
	if (!Object.values(BlockPathType).includes(block.type)) {
		errors.push({
			code: 'INVALID_BLOCK_TYPE',
			message: 'ブロックには有効なタイプが必要です',
			field: 'type'
		});
	}

	// コンテンツの検証
	if (!Array.isArray(block.content)) {
		errors.push({
			code: 'INVALID_CONTENT',
			message: 'ブロックコンテンツは配列である必要があります',
			field: 'content'
		});
	} else {
		block.content.forEach((content, index) => {
			const contentValidation = validateBlockContent(content);
			contentValidation.errors.forEach((error) => {
				errors.push({
					...error,
					field: `content[${index}].${error.field}`,
					context: { ...error.context, contentIndex: index }
				});
			});
		});
	}

	// 動作フラグの検証
	if (typeof block.draggable !== 'boolean') {
		warnings.push({
			code: 'INVALID_DRAGGABLE_FLAG',
			message: 'draggableフラグはboolean値である必要があります',
			field: 'draggable'
		});
	}

	if (typeof block.editable !== 'boolean') {
		warnings.push({
			code: 'INVALID_EDITABLE_FLAG',
			message: 'editableフラグはboolean値である必要があります',
			field: 'editable'
		});
	}

	if (typeof block.deletable !== 'boolean') {
		warnings.push({
			code: 'INVALID_DELETABLE_FLAG',
			message: 'deletableフラグはboolean値である必要があります',
			field: 'deletable'
		});
	}

	return {
		valid: errors.length === 0,
		errors,
		warnings
	};
}

/**
 * ブロック接続の互換性を検証
 *
 * 2つのブロック間の接続が有効かどうかをチェックします。
 * 接続タイプ、自己接続、既存接続の競合を検証します。
 *
 * @param parentBlock - 親ブロック
 * @param childBlock - 子ブロック
 * @returns 検証結果（valid: boolean, errors: ValidationError[], warnings: ValidationError[]）
 *
 * @example
 * ```typescript
 * const parent = createMockBlock({ connection: Connection.Output });
 * const child = createMockBlock({ connection: Connection.Input });
 * const result = validateBlockConnection(parent, child);
 * if (result.valid) {
 *   console.log('Connection is valid');
 * }
 * ```
 */
export function validateBlockConnection(parentBlock: Block, childBlock: Block): ValidationResult {
	const errors: ValidationError[] = [];
	const warnings: ValidationError[] = [];

	// 自己接続のチェック
	if (parentBlock.id === childBlock.id) {
		errors.push({
			code: 'SELF_CONNECTION',
			message: 'ブロックは自分自身に接続できません',
			context: { parentId: parentBlock.id, childId: childBlock.id }
		});
	}

	// 親ブロックが子を持てるかチェック
	if (parentBlock.connection === Connection.Input) {
		errors.push({
			code: 'PARENT_NO_OUTPUT',
			message: '入力専用ブロックは子ブロックを持てません',
			context: { parentId: parentBlock.id }
		});
	}

	// 子ブロックが親を持てるかチェック
	if (childBlock.connection === Connection.Output) {
		errors.push({
			code: 'CHILD_NO_INPUT',
			message: '出力専用ブロックは親ブロックを持てません',
			context: { childId: childBlock.id }
		});
	}

	// 既に接続されている場合の警告
	if (childBlock.parentId && childBlock.parentId !== parentBlock.id) {
		warnings.push({
			code: 'EXISTING_CONNECTION',
			message: '子ブロックは既に他の親ブロックに接続されています',
			context: {
				childId: childBlock.id,
				existingParentId: childBlock.parentId,
				newParentId: parentBlock.id
			}
		});
	}

	return {
		valid: errors.length === 0,
		errors,
		warnings
	};
}

/**
 * ブロック接続の循環依存をチェック
 *
 * 指定された接続が循環依存を引き起こすかどうかを判定します。
 * 親ブロックから上位に向かって辿り、子ブロックIDが見つかった場合は循環依存です。
 *
 * @param parentId - 親ブロックID
 * @param childId - 子ブロックID
 * @param blockMap - ブロックのマップ（ID -> Block）
 * @returns 循環依存が発生する場合はtrue
 *
 * @example
 * ```typescript
 * const blockMap = new Map([
 *   ['A', blockA],
 *   ['B', blockB]
 * ]);
 * const hasCycle = wouldCreateCircularDependency('B', 'A', blockMap);
 * ```
 */
export function wouldCreateCircularDependency(
	parentId: string,
	childId: string,
	blockMap: Map<string, Block>
): boolean {
	if (parentId === childId) {
		return true;
	}

	const visited = new Set<string>();
	let currentId: string | undefined = parentId;

	while (currentId && !visited.has(currentId)) {
		if (currentId === childId) {
			return true;
		}
		visited.add(currentId);
		const currentBlock = blockMap.get(currentId);
		currentId = currentBlock?.parentId;
	}

	return false;
}

/**
 * ブロック接続の制約をチェック
 *
 * 基本的な接続検証に加えて、循環依存やループブロック特有の制約をチェックします。
 * より包括的な接続検証を提供します。
 *
 * @param parentBlock - 親ブロック
 * @param childBlock - 子ブロック
 * @param blockMap - ブロックのマップ
 * @returns 検証結果（valid: boolean, errors: ValidationError[], warnings: ValidationError[]）
 *
 * @example
 * ```typescript
 * const result = validateConnectionConstraints(parent, child, blockMap);
 * if (!result.valid) {
 *   result.errors.forEach(error => console.error(error.message));
 * }
 * ```
 */
export function validateConnectionConstraints(
	parentBlock: Block,
	childBlock: Block,
	blockMap: Map<string, Block>
): ValidationResult {
	const errors: ValidationError[] = [];
	const warnings: ValidationError[] = [];

	// 基本的な接続検証
	const basicValidation = validateBlockConnection(parentBlock, childBlock);
	errors.push(...basicValidation.errors);
	warnings.push(...basicValidation.warnings);

	// 循環依存のチェック
	if (wouldCreateCircularDependency(parentBlock.id, childBlock.id, blockMap)) {
		errors.push({
			code: 'CIRCULAR_DEPENDENCY',
			message: '接続により循環依存が発生します',
			context: { parentId: parentBlock.id, childId: childBlock.id }
		});
	}

	// ループブロック特有の制約
	if (parentBlock.type === BlockPathType.Loop) {
		const loopValidation = validateLoopConnection(parentBlock, childBlock, blockMap);
		errors.push(...loopValidation.errors);
		warnings.push(...loopValidation.warnings);
	}

	return {
		valid: errors.length === 0,
		errors,
		warnings
	};
}

/**
 * ループブロックへの接続を検証
 * @param loopBlock - ループブロック
 * @param childBlock - 子ブロック
 * @param blockMap - ブロックのマップ
 * @returns 検証結果
 */
export function validateLoopConnection(
	loopBlock: Block,
	childBlock: Block,
	blockMap: Map<string, Block>
): ValidationResult {
	const errors: ValidationError[] = [];
	const warnings: ValidationError[] = [];

	if (loopBlock.type !== BlockPathType.Loop) {
		errors.push({
			code: 'NOT_LOOP_BLOCK',
			message: 'ループブロックではありません',
			context: { blockId: loopBlock.id }
		});
		return { valid: false, errors, warnings };
	}

	// ループ内の子ブロック数をチェック（パフォーマンス警告）
	const loopChildCount = countLoopChildren(loopBlock, blockMap);
	if (loopChildCount > 50) {
		warnings.push({
			code: 'LARGE_LOOP',
			message: 'ループ内の子ブロック数が多すぎます（パフォーマンスに影響する可能性があります）',
			context: { loopId: loopBlock.id, childCount: loopChildCount }
		});
	}

	return {
		valid: errors.length === 0,
		errors,
		warnings
	};
}

/**
 * Validate project data structure
 */
export function validateProject(project: ProjectData): ValidationResult {
	const errors: ValidationError[] = [];

	// Basic project validation
	if (!project.name || typeof project.name !== 'string') {
		errors.push({
			code: 'INVALID_PROJECT_NAME',
			message: 'Project must have a valid name',
			field: 'name'
		});
	}

	if (!project.version || typeof project.version !== 'string') {
		errors.push({
			code: 'INVALID_PROJECT_VERSION',
			message: 'Project must have a valid version',
			field: 'version'
		});
	}

	// Validate blocks
	if (!Array.isArray(project.blocks)) {
		errors.push({
			code: 'INVALID_BLOCKS_ARRAY',
			message: 'Project blocks must be an array',
			field: 'blocks'
		});
	} else {
		project.blocks.forEach((block, index) => {
			const blockValidation = validateBlock(block);
			blockValidation.errors.forEach((error) => {
				errors.push({
					...error,
					field: `blocks[${index}].${error.field}`,
					context: { ...error.context, blockIndex: index }
				});
			});
		});
	}

	// Check for duplicate block IDs
	const blockIds = new Set<string>();
	project.blocks.forEach((block, index) => {
		if (blockIds.has(block.id)) {
			errors.push({
				code: 'DUPLICATE_BLOCK_ID',
				message: `Duplicate block ID: ${block.id}`,
				field: `blocks[${index}].id`,
				context: { blockId: block.id, blockIndex: index }
			});
		}
		blockIds.add(block.id);
	});

	return {
		valid: errors.length === 0,
		errors,
		warnings: []
	};
}

/**
 * Validate content against rules
 */
export function validateContent(content: any, rules: ValidationRule[]): ValidationResult {
	const errors: ValidationError[] = [];

	for (const rule of rules) {
		switch (rule.type) {
			case 'required':
				if (!content || content === '') {
					errors.push({
						code: 'REQUIRED_FIELD',
						message: rule.message || 'This field is required'
					});
				}
				break;

			case 'minLength':
				if (typeof content === 'string' && content.length < rule.value) {
					errors.push({
						code: 'MIN_LENGTH',
						message: rule.message || `Minimum length is ${rule.value}`
					});
				}
				break;

			case 'maxLength':
				if (typeof content === 'string' && content.length > rule.value) {
					errors.push({
						code: 'MAX_LENGTH',
						message: rule.message || `Maximum length is ${rule.value}`
					});
				}
				break;

			case 'pattern':
				if (typeof content === 'string' && !new RegExp(rule.value).test(content)) {
					errors.push({
						code: 'PATTERN_MISMATCH',
						message: rule.message || 'Invalid format'
					});
				}
				break;
		}
	}

	return {
		valid: errors.length === 0,
		errors,
		warnings: []
	};
}

/**
 * 位置の有効性を検証するヘルパー関数
 * @param position - 検証する位置
 * @returns 有効な場合はtrue
 */
function isValidPosition(position: any): boolean {
	return (
		position &&
		typeof position === 'object' &&
		typeof position.x === 'number' &&
		typeof position.y === 'number' &&
		!isNaN(position.x) &&
		!isNaN(position.y) &&
		isFinite(position.x) &&
		isFinite(position.y)
	);
}

/**
 * ブロックコンテンツを検証
 * @param content - 検証するコンテンツ
 * @returns 検証結果
 */
export function validateBlockContent(content: BlockContent): ValidationResult {
	const errors: ValidationError[] = [];
	const warnings: ValidationError[] = [];

	// IDの検証
	if (!content.id || typeof content.id !== 'string') {
		errors.push({
			code: 'INVALID_CONTENT_ID',
			message: 'コンテンツには有効なIDが必要です',
			field: 'id'
		});
	}

	// タイプの検証
	const validContentTypes = ['Text', 'ContentValue', 'ContentSelector', 'Separator'];
	if (!validContentTypes.includes(content.type)) {
		errors.push({
			code: 'INVALID_CONTENT_TYPE',
			message: 'コンテンツには有効なタイプが必要です',
			field: 'type'
		});
	}

	// データの検証
	if (!content.data) {
		errors.push({
			code: 'MISSING_CONTENT_DATA',
			message: 'コンテンツデータが必要です',
			field: 'data'
		});
	} else {
		const dataValidation = validateContentData(content.type, content.data);
		errors.push(...dataValidation.errors);
		warnings.push(...dataValidation.warnings);
	}

	// 検証ルールの検証
	if (content.validation) {
		if (!Array.isArray(content.validation)) {
			errors.push({
				code: 'INVALID_VALIDATION_RULES',
				message: '検証ルールは配列である必要があります',
				field: 'validation'
			});
		} else {
			content.validation.forEach((rule, index) => {
				const ruleValidation = validateValidationRule(rule);
				ruleValidation.errors.forEach((error) => {
					errors.push({
						...error,
						field: `validation[${index}].${error.field}`,
						context: { ...error.context, ruleIndex: index }
					});
				});
			});
		}
	}

	return {
		valid: errors.length === 0,
		errors,
		warnings
	};
}

/**
 * コンテンツデータを検証
 * @param contentType - コンテンツタイプ
 * @param data - データ
 * @returns 検証結果
 */
export function validateContentData(contentType: string, data: any): ValidationResult {
	const errors: ValidationError[] = [];
	const warnings: ValidationError[] = [];

	switch (contentType) {
		case 'Text':
			if (!data.title || typeof data.title !== 'string') {
				errors.push({
					code: 'INVALID_TEXT_TITLE',
					message: 'テキストコンテンツにはタイトルが必要です',
					field: 'title'
				});
			}
			break;

		case 'ContentValue':
			if (!data.title || typeof data.title !== 'string') {
				errors.push({
					code: 'INVALID_VALUE_TITLE',
					message: '値コンテンツにはタイトルが必要です',
					field: 'title'
				});
			}
			if (typeof data.value !== 'string') {
				errors.push({
					code: 'INVALID_VALUE_DATA',
					message: '値コンテンツには文字列の値が必要です',
					field: 'value'
				});
			}
			break;

		case 'ContentSelector':
			if (!data.title || typeof data.title !== 'string') {
				errors.push({
					code: 'INVALID_SELECTOR_TITLE',
					message: 'セレクターコンテンツにはタイトルが必要です',
					field: 'title'
				});
			}
			if (!Array.isArray(data.options)) {
				errors.push({
					code: 'INVALID_SELECTOR_OPTIONS',
					message: 'セレクターコンテンツにはオプション配列が必要です',
					field: 'options'
				});
			} else {
				data.options.forEach((option: any, index: number) => {
					if (!option.id || !option.title || !option.value) {
						errors.push({
							code: 'INVALID_SELECTOR_OPTION',
							message: `セレクターオプション[${index}]には id, title, value が必要です`,
							field: `options[${index}]`
						});
					}
				});
			}
			break;

		case 'Separator':
			const validSeparatorTypes = ['None', 'Space', 'Newline'];
			if (!validSeparatorTypes.includes(data.type)) {
				errors.push({
					code: 'INVALID_SEPARATOR_TYPE',
					message: 'セパレーターには有効なタイプが必要です',
					field: 'type'
				});
			}
			break;

		default:
			errors.push({
				code: 'UNKNOWN_CONTENT_TYPE',
				message: `未知のコンテンツタイプ: ${contentType}`,
				field: 'type'
			});
	}

	return {
		valid: errors.length === 0,
		errors,
		warnings
	};
}

/**
 * 検証ルールを検証
 * @param rule - 検証ルール
 * @returns 検証結果
 */
export function validateValidationRule(rule: ValidationRule): ValidationResult {
	const errors: ValidationError[] = [];
	const warnings: ValidationError[] = [];

	const validRuleTypes = ['required', 'minLength', 'maxLength', 'pattern'];
	if (!validRuleTypes.includes(rule.type)) {
		errors.push({
			code: 'INVALID_RULE_TYPE',
			message: '無効な検証ルールタイプです',
			field: 'type'
		});
	}

	if (!rule.message || typeof rule.message !== 'string') {
		errors.push({
			code: 'INVALID_RULE_MESSAGE',
			message: '検証ルールにはメッセージが必要です',
			field: 'message'
		});
	}

	// タイプ固有の検証
	switch (rule.type) {
		case 'minLength':
		case 'maxLength':
			if (typeof rule.value !== 'number' || rule.value < 0) {
				errors.push({
					code: 'INVALID_LENGTH_VALUE',
					message: '長さ制限には正の数値が必要です',
					field: 'value'
				});
			}
			break;

		case 'pattern':
			if (typeof rule.value !== 'string') {
				errors.push({
					code: 'INVALID_PATTERN_VALUE',
					message: 'パターンには文字列が必要です',
					field: 'value'
				});
			} else {
				try {
					new RegExp(rule.value);
				} catch {
					errors.push({
						code: 'INVALID_REGEX_PATTERN',
						message: '無効な正規表現パターンです',
						field: 'value'
					});
				}
			}
			break;
	}

	return {
		valid: errors.length === 0,
		errors,
		warnings
	};
}

/**
 * データ整合性を検証
 *
 * ブロック配列全体の整合性をチェックします。
 * 重複ID、参照整合性、孤立ブロック、ループ構造の整合性を検証します。
 *
 * @param blocks - 検証するブロックの配列
 * @returns 検証結果（valid: boolean, errors: ValidationError[], warnings: ValidationError[]）
 *
 * @example
 * ```typescript
 * const blocks = [blockA, blockB, blockC];
 * const result = validateDataIntegrity(blocks);
 * if (result.warnings.length > 0) {
 *   console.warn('Data integrity warnings:', result.warnings);
 * }
 */
export function validateDataIntegrity(blocks: Block[]): ValidationResult {
	const errors: ValidationError[] = [];
	const warnings: ValidationError[] = [];

	const blockMap = new Map<string, Block>();
	const blockIds = new Set<string>();

	// ブロックマップを構築し、重複IDをチェック
	blocks.forEach((block, index) => {
		if (blockIds.has(block.id)) {
			errors.push({
				code: 'DUPLICATE_BLOCK_ID',
				message: `重複するブロックID: ${block.id}`,
				field: `blocks[${index}].id`,
				context: { blockId: block.id, blockIndex: index }
			});
		} else {
			blockIds.add(block.id);
			blockMap.set(block.id, block);
		}
	});

	// 参照整合性をチェック
	blocks.forEach((block, index) => {
		// 親ブロックの存在チェック
		if (block.parentId && !blockMap.has(block.parentId)) {
			errors.push({
				code: 'MISSING_PARENT_BLOCK',
				message: `親ブロックが見つかりません: ${block.parentId}`,
				field: `blocks[${index}].parentId`,
				context: { blockId: block.id, parentId: block.parentId }
			});
		}

		// 子ブロックの存在チェック
		if (block.childId && !blockMap.has(block.childId)) {
			errors.push({
				code: 'MISSING_CHILD_BLOCK',
				message: `子ブロックが見つかりません: ${block.childId}`,
				field: `blocks[${index}].childId`,
				context: { blockId: block.id, childId: block.childId }
			});
		}

		// 値ターゲットブロックの存在チェック
		if (block.valueTargetId && !blockMap.has(block.valueTargetId)) {
			errors.push({
				code: 'MISSING_VALUE_TARGET_BLOCK',
				message: `値ターゲットブロックが見つかりません: ${block.valueTargetId}`,
				field: `blocks[${index}].valueTargetId`,
				context: { blockId: block.id, valueTargetId: block.valueTargetId }
			});
		}

		// ループブロックの整合性チェック
		if (block.type === BlockPathType.Loop) {
			const loopIntegrityValidation = validateLoopIntegrity(block, blockMap);
			loopIntegrityValidation.errors.forEach((error) => {
				errors.push({
					...error,
					context: { ...error.context, blockIndex: index }
				});
			});
			warnings.push(...loopIntegrityValidation.warnings);
		}
	});

	// 孤立ブロックの検出
	const orphanedBlocks = findOrphanedBlocks(blocks);
	if (orphanedBlocks.length > 0) {
		warnings.push({
			code: 'ORPHANED_BLOCKS',
			message: `孤立したブロックが見つかりました: ${orphanedBlocks.length}個`,
			context: { orphanedBlockIds: orphanedBlocks.map((b) => b.id) }
		});
	}

	return {
		valid: errors.length === 0,
		errors,
		warnings
	};
}

/**
 * ループブロックの整合性を検証
 * @param loopBlock - ループブロック
 * @param blockMap - ブロックマップ
 * @returns 検証結果
 */
export function validateLoopIntegrity(
	loopBlock: Block,
	blockMap: Map<string, Block>
): ValidationResult {
	const errors: ValidationError[] = [];
	const warnings: ValidationError[] = [];

	if (loopBlock.type !== BlockPathType.Loop) {
		errors.push({
			code: 'NOT_LOOP_BLOCK',
			message: 'ループブロックではありません',
			context: { blockId: loopBlock.id }
		});
		return { valid: false, errors, warnings };
	}

	// ループの最初の子ブロックの存在チェック
	if (loopBlock.loopFirstChildId && !blockMap.has(loopBlock.loopFirstChildId)) {
		errors.push({
			code: 'MISSING_LOOP_FIRST_CHILD',
			message: `ループの最初の子ブロックが見つかりません: ${loopBlock.loopFirstChildId}`,
			context: { loopId: loopBlock.id, firstChildId: loopBlock.loopFirstChildId }
		});
	}

	// ループの最後の子ブロックの存在チェック
	if (loopBlock.loopLastChildId && !blockMap.has(loopBlock.loopLastChildId)) {
		errors.push({
			code: 'MISSING_LOOP_LAST_CHILD',
			message: `ループの最後の子ブロックが見つかりません: ${loopBlock.loopLastChildId}`,
			context: { loopId: loopBlock.id, lastChildId: loopBlock.loopLastChildId }
		});
	}

	// ループチェーンの整合性チェック
	if (loopBlock.loopFirstChildId && loopBlock.loopLastChildId) {
		const chainValidation = validateLoopChain(
			loopBlock.loopFirstChildId,
			loopBlock.loopLastChildId,
			blockMap
		);
		errors.push(...chainValidation.errors);
		warnings.push(...chainValidation.warnings);
	}

	return {
		valid: errors.length === 0,
		errors,
		warnings
	};
}

/**
 * ループチェーンの整合性を検証
 * @param firstChildId - 最初の子ブロックID
 * @param lastChildId - 最後の子ブロックID
 * @param blockMap - ブロックマップ
 * @returns 検証結果
 */
export function validateLoopChain(
	firstChildId: string,
	lastChildId: string,
	blockMap: Map<string, Block>
): ValidationResult {
	const errors: ValidationError[] = [];
	const warnings: ValidationError[] = [];

	const visited = new Set<string>();
	let currentId: string | undefined = firstChildId;
	let chainLength = 0;

	while (currentId) {
		if (visited.has(currentId)) {
			errors.push({
				code: 'LOOP_CHAIN_CYCLE',
				message: 'ループチェーン内で循環が検出されました',
				context: { cycleBlockId: currentId }
			});
			break;
		}

		visited.add(currentId);
		chainLength++;

		if (chainLength > 1000) {
			warnings.push({
				code: 'LONG_LOOP_CHAIN',
				message: 'ループチェーンが非常に長いです（パフォーマンスに影響する可能性があります）',
				context: { chainLength }
			});
			break;
		}

		const currentBlock = blockMap.get(currentId);
		if (!currentBlock) {
			errors.push({
				code: 'MISSING_CHAIN_BLOCK',
				message: `チェーン内のブロックが見つかりません: ${currentId}`,
				context: { blockId: currentId }
			});
			break;
		}

		if (currentId === lastChildId) {
			break;
		}

		currentId = currentBlock.childId;
	}

	return {
		valid: errors.length === 0,
		errors,
		warnings
	};
}

/**
 * 孤立したブロックを検出
 * @param blocks - ブロックの配列
 * @returns 孤立したブロックの配列
 */
export function findOrphanedBlocks(blocks: Block[]): Block[] {
	const blockMap = new Map<string, Block>();
	const hasParent = new Set<string>();

	// ブロックマップを構築
	blocks.forEach((block) => {
		blockMap.set(block.id, block);
	});

	// 親を持つブロックを特定
	blocks.forEach((block) => {
		if (block.childId) {
			hasParent.add(block.childId);
		}
		if (block.loopFirstChildId) {
			hasParent.add(block.loopFirstChildId);
		}
	});

	// 孤立したブロックを検出（親を持たず、ルートブロックでもない）
	return blocks.filter(
		(block) =>
			!hasParent.has(block.id) && block.parentId === undefined && block.type !== BlockPathType.Flag // スタートブロックは常にルート
	);
}

/**
 * ループ内の子ブロック数をカウント
 * @param loopBlock - ループブロック
 * @param blockMap - ブロックマップ
 * @returns 子ブロック数
 */
export function countLoopChildren(loopBlock: Block, blockMap: Map<string, Block>): number {
	if (!loopBlock.loopFirstChildId) {
		return 0;
	}

	let count = 0;
	let currentId: string | undefined = loopBlock.loopFirstChildId;
	const visited = new Set<string>();

	while (currentId && !visited.has(currentId)) {
		visited.add(currentId);
		count++;

		const currentBlock = blockMap.get(currentId);
		if (!currentBlock) {
			break;
		}

		if (currentId === loopBlock.loopLastChildId) {
			break;
		}

		currentId = currentBlock.childId;
	}

	return count;
}

/**
 * Sanitize user input
 */
export function sanitizeInput(input: string): string {
	return input
		.trim()
		.replace(/[<>]/g, '') // Remove potential HTML tags
		.substring(0, 1000); // Limit length
}

/**
 * Validate ID format
 */
export function isValidId(id: string): boolean {
	return /^[a-zA-Z0-9-_]+$/.test(id) && id.length > 0 && id.length <= 50;
}
