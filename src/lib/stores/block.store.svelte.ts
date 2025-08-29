/**
 * ブロックストア - ドメイン中心のブロックデータ管理
 * UI関心事なしの純粋なブロック操作を提供
 */

import type { Block, BlockType, Position, BlockList, BlockContent } from '$lib/types';
import { BlockPathType } from '$lib/types';
import { withBatchUpdates } from '$lib/utils/batch/BatchStoreMixin';
import type { BatchOperation } from '$lib/utils/batch/BatchUpdateManager';

/**
 * ブロック検証エラー
 */
export class BlockValidationError extends Error {
	constructor(
		message: string,
		public blockId?: string
	) {
		super(message);
		this.name = 'BlockValidationError';
	}
}

/**
 * ブロック関係エラー
 */
export class BlockRelationshipError extends Error {
	constructor(
		message: string,
		public parentId?: string,
		public childId?: string
	) {
		super(message);
		this.name = 'BlockRelationshipError';
	}
}

/**
 * ドメイン中心のブロックストア
 * UI状態から分離された純粋なブロックデータ管理
 */
class BaseBlockStore {
	protected blocks = $state(new Map<string, Block>());
	private blockTypes = $state(new Map<string, BlockType>());
	private blockLists = $state(new Map<string, BlockList>());
	protected outputs = $state(new Map<string, string[]>());

	// UI/レイアウト設定 Config
	private _config = $state<object>({});

	public get Config() {
		return this._config;
	}

	public set Config(v: object) {
		this._config = { ...this._config, ...v };
	}

	// パレット表示用派生: ブロックリスト（ソート&整形済）
	public paletteBlockLists = $derived(() =>
		this.getAllBlockLists().map((list) => ({ uid: list.uid, name: list.name, block: list.block }))
	);

	/** 最近接の祖先ループブロックを取得 */
	private getNearestAncestorLoop(startBlock: Block): Block | null {
		let current: Block | null = startBlock;
		while (current?.parentId) {
			const parent = this.getBlock(current.parentId);
			if (!parent) break;
			if (parent.type === BlockPathType.Loop) return parent;
			current = parent;
		}
		return null;
	}

	/** 指定ループの末尾を再計算（冪等） */
	private recomputeLoopTail(loopBlock: Block): void {
		if (loopBlock.type !== BlockPathType.Loop) return;
		const firstId = loopBlock.loopFirstChildId;
		if (!firstId) {
			if (loopBlock.loopLastChildId !== undefined) {
				this.updateBlock(loopBlock.id, { loopLastChildId: undefined });
			}
			return;
		}
		let tailId: string = firstId;
		const visited = new Set<string>();
		while (tailId && !visited.has(tailId)) {
			visited.add(tailId);
			const b = this.getBlock(tailId);
			if (!b || !b.childId) break;
			tailId = b.childId;
		}
		if (loopBlock.loopLastChildId !== tailId) {
			this.updateBlock(loopBlock.id, { loopLastChildId: tailId });
		}
	}

	/** 指定ブロックから最近接祖先ループの tail を保証 */
	protected ensureLoopTailConsistencyFrom(blockId: string): void {
		const blk = this.getBlock(blockId);
		if (!blk) return;
		const loopAncestor = this.getNearestAncestorLoop(blk);
		if (loopAncestor) this.recomputeLoopTail(loopAncestor);
	}

	/** ループ内に既に blockId が含まれているか */
	protected isBlockInLoop(loopId: string, blockId: string): boolean {
		const loopBlock = this.getBlock(loopId);
		if (!loopBlock || loopBlock.type !== BlockPathType.Loop || !loopBlock.loopFirstChildId)
			return false;
		let currentId: string | undefined = loopBlock.loopFirstChildId;
		const visited = new Set<string>();
		while (currentId && !visited.has(currentId)) {
			if (currentId === blockId) return true;
			visited.add(currentId);
			const blk = this.getBlock(currentId);
			if (!blk) break;
			currentId = blk.childId;
		}
		return false;
	}

	/**
	 * 新しいブロックを作成
	 * @param blockType - ブロックタイプ
	 * @param position - 初期位置（オプション）
	 * @returns 作成されたブロックのID
	 */
	createBlock(blockType: BlockType, position?: Position): string {
		const id = crypto.randomUUID();

		const newBlock: Block = {
			...blockType,
			id,
			position: position || { x: 0, y: 0 },
			zIndex: 0,
			visibility: true,
			parentId: undefined,
			childId: undefined,
			valueTargetId: undefined,
			loopFirstChildId: undefined,
			loopLastChildId: undefined
		};

		this.validateBlock(newBlock);

		const newMap = new Map(this.blocks);
		newMap.set(id, newBlock);
		this.blocks = newMap;

		return id;
	}

	/**
	 * 永続化データからブロックを復元
	 * 既存IDを保持しつつマップへ格納。後続で親子/ループ整合性は import 側で再計算される想定。
	 */
	restoreBlock(block: Block): void {
		// 基本妥当性チェック
		this.validateBlock(block);
		// 既存と衝突する場合は上書き
		const newMap = new Map(this.blocks);
		newMap.set(block.id, { ...block });
		this.blocks = newMap;
	}

	/**
	 * ブロックを更新
	 * @param id - ブロックID
	 * @param updates - 更新内容
	 */
	updateBlock(id: string, updates: Partial<Block>): void {
		const existingBlock = this.getBlock(id);
		if (!existingBlock) {
			throw new BlockValidationError(`Block with id ${id} not found`, id);
		}

		const updatedBlock = { ...existingBlock, ...updates };
		this.validateBlock(updatedBlock);

		const newMap = new Map(this.blocks);
		newMap.set(id, updatedBlock);
		this.blocks = newMap;
	}

	/**
	 * ブロックを削除
	 * @param id - ブロックID
	 */
	deleteBlock(id: string): void {
		const block = this.getBlock(id);
		if (!block) {
			return; // 存在しないブロックの削除は無視
		}

		// 関係を解除してから削除
		this.disconnectAllRelationships(id);

		const newMap = new Map(this.blocks);
		newMap.delete(id);
		this.blocks = newMap;
	}

	/**
	 * ループ内の子ブロックを再帰的に処理
	 * @param loopBlock - ループブロック
	 * @param outputs - 出力配列
	 * @param indent - インデントレベル（デフォルト: 1）
	 */
	private traverseLoopChildren(loopBlock: Block, outputs: string[], indent: number = 1): void {
		const indentStr = '  '.repeat(indent);
		let currentChildId = loopBlock.loopFirstChildId;
		const replaceContentPlaceholders = (targetBlock: Block, text: string): string => {
			return (text || '').replace(/\$\{([^}]+)\}/g, (match, contentId) => {
				const content = targetBlock.content.find((c) => c.id === contentId);
				if (content) {
					if (content.type === 'ContentValue' && 'value' in content.data) {
						return (content.data as any).value ?? match;
					}
					if (content.type === 'ContentSelector' && 'value' in content.data) {
						return (content.data as any).value ?? match;
					}
				}
				return match;
			});
		};

		while (currentChildId) {
			const childBlock = this.getBlock(currentChildId);
			if (!childBlock) break;

			const processedOutput = replaceContentPlaceholders(childBlock, childBlock.output || '');

			if (childBlock.type === BlockPathType.Loop && childBlock.loopFirstChildId) {
				outputs.push(`${indentStr}${processedOutput}`);
				this.traverseLoopChildren(childBlock, outputs, indent + 1);
				const closeOutputRaw = childBlock.closeOutput || '}';
				const closeOutput = replaceContentPlaceholders(childBlock, closeOutputRaw);
				const closeLines = closeOutput.split('\n');
				closeLines.forEach((line) => outputs.push(`${indentStr}${line}`));
			} else {
				outputs.push(`${indentStr}${processedOutput}`);
			}

			currentChildId = childBlock.childId;
		}
	}

	/**
	 * 指定されたスタートブロックからのすべての子ブロックの出力を取得
	 * @param id - 確認するブロックのID
	 * @returns 出力の配列 {@link string[]}
	 */
	setOutput(id: string): string[] {
		const block = this.getBlock(id);
		if (!block) return [];

		const outputs: string[] = [];
		// 変数値マップ ("varName" => "value")
		const variableValues = new Map<string, string>();

		// set_value ブロックで代入を記録しつつ行を生成
		const processAssignmentBlock = (b: Block): string | null => {
			if (b.name !== 'set_value') return null;
			const selector = b.content.find((c) => c.id === 'selector_var');
			const valueInput = b.content.find((c) => c.id === 'val_input');
			const varName =
				selector && selector.type === 'ContentSelector' && 'value' in selector.data
					? selector.data.value
					: '';
			const varValue =
				valueInput && valueInput.type === 'ContentValue' && 'value' in valueInput.data
					? valueInput.data.value
					: '';
			if (varName) variableValues.set(varName, varValue);
			// 対応する Value ブロックの assignmentFormat 探索
			const valueTemplateBlock = Array.from(this.blocks.values()).find(
				(v) => v.type === BlockPathType.Value && v.assignmentFormat
			);
			const template = valueTemplateBlock?.assignmentFormat || '${name} = ${value}';
			return template.replace('${name}', varName || '').replace('${value}', varValue || '');
		};

		const valueToVarName = (val: string | undefined): string | undefined => {
			if (!val) return undefined;
			for (const [k, v] of variableValues.entries()) {
				if (v === val) return k;
			}
			return undefined;
		};

		const replaceContentPlaceholders = (targetBlock: Block, text: string): string => {
			return (text || '').replace(/\$\{([^}]+)\}/g, (match, contentId) => {
				const content = targetBlock.content.find((c) => c.id === contentId);
				if (!content) return match;
				if (content.type === 'ContentValue') {
					const data: any = content.data;
					// variables に ID があれば参照元ブロックの title (= 変数名) に置換
					if (data?.variables) {
						const refBlock = this.getBlock(data.variables);
						if (refBlock) return refBlock.title || match;
					}
					const raw = data?.value ?? '';
					return valueToVarName(raw) || raw || match;
				}
				if (content.type === 'ContentSelector') {
					const raw = (content.data as any)?.value ?? '';
					return valueToVarName(raw) || raw || match;
				}
				return match;
			});
		};

		const traverse = (currentId: string) => {
			const currentBlock = this.getBlock(currentId);
			if (!currentBlock) return;

			// 代入ブロックの場合は行生成（後続も続行）
			const assignLine = processAssignmentBlock(currentBlock);

			const processedOutput = replaceContentPlaceholders(currentBlock, currentBlock.output || '');
			// プレーンテキスト中の "${varName}" 以外に後続で使われる可能性のある裸の変数名を置換
			const replacedWithVariables = processedOutput; // 参照は値に展開せず元の変数名を保持

			if (assignLine) {
				outputs.push(assignLine);
				// set_value ブロック自身の output はスキップ
				if (currentBlock.childId) traverse(currentBlock.childId);
				return;
			}

			if (currentBlock.type === BlockPathType.Loop && currentBlock.loopFirstChildId) {
				outputs.push(replacedWithVariables);
				this.traverseLoopChildren(currentBlock, outputs, 1);
				const closeOutputRaw = currentBlock.closeOutput || '';
				const closeOutput = replaceContentPlaceholders(currentBlock, closeOutputRaw);
				const closeLines = closeOutput.split('\n');
				closeLines.forEach((line) => outputs.push(line));
			} else {
				outputs.push(replacedWithVariables);
			}

			if (currentBlock.childId) traverse(currentBlock.childId);
		};

		traverse(id);
		const newMap = new Map(this.outputs);
		newMap.set(id, outputs);
		this.outputs = newMap;
		return outputs;
	}

	/**
	 * すべての出力を取得
	 * @returns ブロックIDをキー、出力配列を値とするマップ
	 */
	getOutput(): Map<string, string[]> {
		return this.outputs;
	}

	/**
	 * ブロックを取得
	 * @param id - ブロックID
	 * @returns ブロック、存在しない場合はnull
	 */
	getBlock(id: string): Block | null {
		return this.blocks.get(id) || null;
	}

	/**
	 * すべてのブロックを取得
	 * @returns すべてのブロックの配列
	 */
	getAllBlocks(): Block[] {
		return Array.from(this.blocks.values());
	}

	/**
	 * ブロック数を取得
	 * @returns ブロック数
	 */
	getBlockCount(): number {
		return this.blocks.size;
	}

	/**
	 * ブロックが存在するかチェック
	 * @param id - ブロックID
	 * @returns 存在する場合はtrue
	 */
	hasBlock(id: string): boolean {
		return this.blocks.has(id);
	}

	/**
	 * ブロックの接続を解除
	 * @param parentId - 親ブロックID
	 * @param childId - 子ブロックID
	 */
	disconnectBlocks(parentId: string, childId: string): void {
		const parentBlock = this.getBlock(parentId);
		const childBlock = this.getBlock(childId);

		if (!parentBlock || !childBlock) {
			return; // 存在しないブロックの切断は無視
		}

		if (
			parentBlock.type === BlockPathType.Loop &&
			this.isChildInLoop(parentBlock, childId) // ループ内部子のみ専用ロジック
		) {
			this.disconnectFromLoop(parentId, childId);
		} else {
			// 通常（外側チェーン含む）切断
			if (parentBlock.childId === childId) {
				this.updateBlock(parentId, { childId: undefined });
			}
			if (childBlock.parentId === parentId) {
				this.updateBlock(childId, { parentId: undefined });
			}
		}
	}

	/**
	 * 指定した childId が loopBlock 内部 (loopFirstChildId 連鎖) に含まれるか
	 */
	private isChildInLoop(loopBlock: Block, childId: string): boolean {
		if (loopBlock.type !== BlockPathType.Loop || !loopBlock.loopFirstChildId) return false;
		let currentId: string | undefined = loopBlock.loopFirstChildId;
		const visited = new Set<string>();
		while (currentId && !visited.has(currentId)) {
			if (currentId === childId) return true;
			visited.add(currentId);
			const current = this.getBlock(currentId);
			if (!current) break;
			currentId = current.childId || undefined;
		}
		return false;
	}

	/**
	 * ブロック接続の妥当性をチェック
	 * @param parentId - 親ブロックID
	 * @param childId - 子ブロックID
	 * @returns 接続可能な場合はtrue
	 */
	validateBlockConnection(parentId: string, childId: string): boolean {
		if (parentId === childId) {
			throw new BlockRelationshipError('Cannot connect block to itself', parentId, childId);
		}

		// 循環参照チェック
		if (this.wouldCreateCycle(parentId, childId)) {
			throw new BlockRelationshipError('Connection would create a cycle', parentId, childId);
		}

		return true;
	}

	/**
	 * ループブロックへの接続
	 * @param loopId - ループブロックID
	 * @param childId - 子ブロックID
	 */
	protected connectToLoop(loopId: string, childId: string): void {
		const loopBlock = this.getBlock(loopId);
		if (!loopBlock || loopBlock.type !== BlockPathType.Loop) {
			throw new BlockRelationshipError(`Block ${loopId} is not a loop block`, loopId, childId);
		}

		// ループが空の場合: childId を先頭として既存のチェーンをそのまま採用
		if (!loopBlock.loopFirstChildId) {
			const head = this.getBlock(childId);
			if (!head) return;
			// ヘッドを旧親から外す
			if (head.parentId && head.parentId !== loopId) {
				const oldParent = this.getBlock(head.parentId);
				if (oldParent && oldParent.childId === head.id)
					this.updateBlock(oldParent.id, { childId: undefined });
			}
			// ヘッドだけ親を loop に設定
			if (head.parentId !== loopId) this.updateBlock(head.id, { parentId: loopId });
			// チェーンを辿って末尾取得 & 内部親子整合 (必要なら修正)
			let current = this.getBlock(head.childId || '');
			let prev = head;
			const visited = new Set<string>([head.id]);
			while (current && !visited.has(current.id)) {
				visited.add(current.id);
				if (current.parentId !== prev.id) {
					this.updateBlock(current.id, { parentId: prev.id });
				}
				prev = current;
				current = current.childId ? this.getBlock(current.childId) : null;
			}
			this.updateBlock(loopId, { loopFirstChildId: head.id, loopLastChildId: prev.id });
		} else {
			// 既存末尾後に連結
			const tailId = loopBlock.loopLastChildId || loopBlock.loopFirstChildId;
			const tail = tailId ? this.getBlock(tailId) : null;
			const head = this.getBlock(childId);
			if (!tail || !head) return;
			// 旧親から head を外す
			if (head.parentId && head.parentId !== tail.id) {
				const oldParent = this.getBlock(head.parentId);
				if (oldParent && oldParent.childId === head.id)
					this.updateBlock(oldParent.id, { childId: undefined });
			}
			// tail -> head を接続
			if (tail.childId !== head.id) this.updateBlock(tail.id, { childId: head.id });
			if (head.parentId !== tail.id) this.updateBlock(head.id, { parentId: tail.id });
			// チェーン末尾探索 & 内部親整合
			let current = this.getBlock(head.childId || '');
			let prev = head;
			const visited = new Set<string>([head.id]);
			while (current && !visited.has(current.id)) {
				visited.add(current.id);
				if (current.parentId !== prev.id) this.updateBlock(current.id, { parentId: prev.id });
				prev = current;
				current = current.childId ? this.getBlock(current.childId) : null;
			}
			this.updateBlock(loopId, { loopLastChildId: prev.id });
		}
	}

	/**
	 * ループブロックからの切断
	 * @param loopId - ループブロックID
	 * @param childId - 子ブロックID
	 */
	private disconnectFromLoop(loopId: string, childId: string): void {
		const loopBlock = this.getBlock(loopId);
		const childBlock = this.getBlock(childId);
		if (!loopBlock || !childBlock) return;

		if (loopBlock.loopFirstChildId === childId) {
			// 先頭ブロックを含むチェーンを外す: チェーンは childId から連なる全て
			let current = childBlock;
			const visited = new Set<string>();
			while (current && !visited.has(current.id)) {
				visited.add(current.id);
				// 先頭のみ親ループを切る
				if (current.id === childId && current.parentId === loopId) {
					this.updateBlock(current.id, { parentId: undefined });
				}
				// 次へ
				const next = current.childId ? this.getBlock(current.childId) : null;
				if (!next) break;
				current = next;
			}
			// ループ新先頭: 元チェーン末尾の childId
			const chainTail = current; // last visited
			const newFirstId = chainTail?.childId;
			if (newFirstId) {
				const newFirst = this.getBlock(newFirstId);
				if (newFirst) {
					// 旧親 (chainTail) から切り離し、ループ直下に昇格
					if (newFirst.parentId === chainTail?.id)
						this.updateBlock(newFirst.id, { parentId: loopId });
					this.updateBlock(loopId, { loopFirstChildId: newFirst.id });
					// 末尾再計算
					this.recomputeLoopTail(loopBlock);
					return;
				}
			}
			// 全部外れた
			this.updateBlock(loopId, { loopFirstChildId: undefined, loopLastChildId: undefined });
		} else {
			// 中間 / 末尾単体外し（チェーンは維持）
			const prevChild = this.findPreviousChildInLoop(loopId, childId);
			if (prevChild) this.updateBlock(prevChild.id, { childId: childBlock.childId });
			if (loopBlock.loopLastChildId === childId)
				this.updateBlock(loopId, { loopLastChildId: prevChild?.id });
			// 外したブロックの親を元チェーン起点に変化: 親を残すなら parentId をそのまま（prevChild）に、ループからは既に除外
			if (childBlock.parentId === loopId) this.updateBlock(childId, { parentId: prevChild?.id });
		}
	}

	/**
	 * ループ内の前の子ブロックを見つける
	 * @param loopId - ループブロックID
	 * @param targetChildId - 対象の子ブロックID
	 * @returns 前の子ブロック、見つからない場合はnull
	 */
	private findPreviousChildInLoop(loopId: string, targetChildId: string): Block | null {
		const loopBlock = this.getBlock(loopId);
		if (!loopBlock?.loopFirstChildId) return null;

		let currentId = loopBlock.loopFirstChildId;
		let prevBlock: Block | null = null;

		while (currentId && currentId !== targetChildId) {
			prevBlock = this.getBlock(currentId);
			if (!prevBlock) break;

			if (typeof prevBlock.childId === 'undefined') {
				console.error(`子の ID を取得できませんでした: ${prevBlock}`);
				break;
			}

			currentId = prevBlock.childId;
		}

		return currentId === targetChildId ? prevBlock : null;
	}

	/**
	 * すべての関係を解除
	 * @param blockId - ブロックID
	 */
	private disconnectAllRelationships(blockId: string): void {
		const block = this.getBlock(blockId);
		if (!block) return;

		// 親との関係を解除
		if (block.parentId) {
			this.disconnectBlocks(block.parentId, blockId);
		}

		// 子との関係を解除
		if (block.childId) {
			this.disconnectBlocks(blockId, block.childId);
		}

		// Value block関係を解除
		if (block.valueTargetId) {
			this.disconnectValueBlock(blockId);
		}

		// このブロックをvalueTargetとしているブロックを解除
		this.getAllBlocks().forEach((b) => {
			if (b.valueTargetId === blockId) {
				this.updateBlock(b.id, { valueTargetId: undefined });
			}
		});
	}

	/**
	 * Value blockの接続を解除
	 * @param valueBlockId - Value blockのID
	 */
	private disconnectValueBlock(valueBlockId: string): void {
		const valueBlock = this.getBlock(valueBlockId);
		if (!valueBlock?.valueTargetId) return;

		const targetBlock = this.getBlock(valueBlock.valueTargetId);
		if (targetBlock) {
			// 対象ブロックのコンテンツからvariables参照を削除
			const updatedContent = targetBlock.content.map((content: BlockContent) => {
				if (
					content.type === 'ContentValue' &&
					'variables' in content.data &&
					content.data.variables === valueBlockId
				) {
					return {
						...content,
						data: {
							...content.data,
							variables: null
						}
					};
				}
				return content;
			});

			this.updateBlock(valueBlock.valueTargetId, { content: updatedContent });
		}

		this.updateBlock(valueBlockId, { valueTargetId: undefined });
	}

	/**
	 * 循環参照をチェック
	 * @param parentId - 親ブロックID
	 * @param childId - 子ブロックID
	 * @returns 循環参照が発生する場合はtrue
	 */
	private wouldCreateCycle(parentId: string, childId: string): boolean {
		const visited = new Set<string>();
		let currentId: string | undefined = parentId;

		while (currentId && !visited.has(currentId)) {
			if (currentId === childId) {
				return true;
			}
			visited.add(currentId);
			const currentBlock = this.getBlock(currentId);
			currentId = currentBlock?.parentId;
		}

		return false;
	}

	/**
	 * ブロックの妥当性をチェック
	 * @param block - チェックするブロック
	 */
	protected validateBlock(block: Block): void {
		if (!block.id) {
			throw new BlockValidationError('Block must have an id');
		}
		if (!block.name) {
			throw new BlockValidationError('Block must have a name', block.id);
		}
		if (!block.title) {
			throw new BlockValidationError('Block must have a title', block.id);
		}
		if (!block.position) {
			throw new BlockValidationError('Block must have a position', block.id);
		}
		if (typeof block.zIndex !== 'number') {
			throw new BlockValidationError('Block must have a valid zIndex', block.id);
		}
	}

	/**
	 * ブロックタイプを登録
	 * @param blockType - ブロックタイプ
	 */
	registerBlockType(blockType: BlockType): void {
		const newMap = new Map(this.blockTypes);
		newMap.set(blockType.id, blockType);
		this.blockTypes = newMap;
	}

	/**
	 * ブロックタイプを取得
	 * @param id - ブロックタイプID
	 * @returns ブロックタイプ、存在しない場合はnull
	 */
	getBlockType(id: string): BlockType | null {
		return this.blockTypes.get(id) || null;
	}

	/**
	 * すべてのブロックタイプを取得
	 * @returns すべてのブロックタイプの配列
	 */
	getAllBlockTypes(): BlockType[] {
		return Array.from(this.blockTypes.values());
	}

	/**
	 * ブロックリストを追加
	 * @param blockList - ブロックリスト
	 */
	addBlockList(blockList: BlockList): void {
		this.migrateBlockListsIfNeeded();
		// 同名既存エントリを削除（最新を優先）
		for (const [k, v] of this.blockLists) {
			if (v.name === blockList.name) {
				const tmp = new Map(this.blockLists);
				tmp.delete(k);
				this.blockLists = tmp;
				break;
			}
		}
		const uid = blockList.uid || crypto.randomUUID();
		const normalized: BlockList = { ...blockList, uid };
		const newMap = new Map(this.blockLists);
		newMap.set(uid, normalized);
		this.blockLists = newMap;
	}

	/**
	 * ブロックリストを削除
	 * @param name - ブロックリスト名
	 */
	removeBlockList(uid: string): void {
		const newMap = new Map(this.blockLists);
		newMap.delete(uid);
		this.blockLists = newMap;
	}

	/**
	 * ブロックリストを取得
	 * @param name - ブロックリスト名
	 * @returns ブロックリスト、存在しない場合はnull
	 */
	getBlockList(uid: string): BlockList | null {
		return this.blockLists.get(uid) || null;
	}

	/**
	 * すべてのブロックリストを取得
	 * @returns すべてのブロックリストの配列
	 */
	getAllBlockLists(): BlockList[] {
		this.migrateBlockListsIfNeeded();
		const order: Record<string, number> = {
			[BlockPathType.Move]: 0,
			[BlockPathType.Flag]: 1,
			[BlockPathType.Loop]: 2,
			[BlockPathType.Value]: 3
		};
		return Array.from(this.blockLists.values()).sort((a, b) => {
			const aTypeForSort = a.block.name === 'set_value' ? BlockPathType.Value : a.block.type;
			const bTypeForSort = b.block.name === 'set_value' ? BlockPathType.Value : b.block.type;
			const ai = order[aTypeForSort] ?? 999;
			const bi = order[bTypeForSort] ?? 999;
			if (ai !== bi) return ai - bi;
			if (aTypeForSort === BlockPathType.Value && bTypeForSort === BlockPathType.Value) {
				const aSetter = a.block.name === 'set_value';
				const bSetter = b.block.name === 'set_value';
				if (aSetter !== bSetter) return aSetter ? 1 : -1; // set_value を Value グループ末尾へ
			}
			return (a.block.title || a.name).localeCompare(b.block.title || b.name);
		});
	}

	/** 旧 name キー形式 -> uid キー形式への移行と重複除去 */
	private migrateBlockListsIfNeeded(): void {
		let needsMigration = false;
		for (const [key, list] of this.blockLists) {
			if (!list.uid || key === list.name) {
				needsMigration = true;
				break;
			}
		}
		if (!needsMigration) return;
		const byName = new Map<string, BlockList>();
		for (const [, list] of this.blockLists) {
			// 後勝ち（後で追加されたものを残す）
			byName.set(list.name, { ...list, uid: list.uid || crypto.randomUUID() });
		}
		const newMap = new Map<string, BlockList>();
		for (const [, list] of byName) {
			newMap.set(list.uid!, list);
		}
		this.blockLists = newMap;
	}

	/**
	 * すべてのブロックをクリア
	 */
	clearAllBlocks(): void {
		this.blocks = new Map<string, Block>();
	}

	/**
	 * すべてのブロックリストをクリア
	 */
	clearAllBlockLists(): void {
		this.blockLists = new Map<string, BlockList>();
	}

	/**
	 * すべてのブロックタイプをクリア
	 */
	clearAllBlockTypes(): void {
		this.blockTypes = new Map<string, BlockType>();
	}

	/**
	 * ストア全体をクリア
	 */
	clear(): void {
		this.clearAllBlocks();
		this.clearAllBlockLists();
		this.clearAllBlockTypes();
	}
}

// バッチ更新機能を追加したブロックストア
const BatchEnabledBlockStore = withBatchUpdates(BaseBlockStore);

export class BlockStore extends BatchEnabledBlockStore {
	/**
	 * 複数のブロックをバッチで更新（バッチ機能付き版）
	 * @param updates - 更新内容の配列
	 */
	updateBlocksBatch(updates: Array<{ id: string; updates: Partial<Block> }>): void {
		const operations: BatchOperation[] = updates.map(({ id, updates: blockUpdates }) => {
			const existingBlock = this.getBlock(id);
			if (!existingBlock) {
				throw new BlockValidationError(`Block with id ${id} not found`, id);
			}

			const updatedBlock = { ...existingBlock, ...blockUpdates };
			const originalBlock = { ...existingBlock };

			return this.createBatchOperation(
				`update-block-${id}`,
				'block',
				() => {
					this.validateBlock(updatedBlock);
					const newMap = new Map(this.blocks);
					newMap.set(id, updatedBlock);
					this.blocks = newMap;
				},
				() => {
					const rollbackMap = new Map(this.blocks);
					rollbackMap.set(id, originalBlock);
					this.blocks = rollbackMap;
				},
				5
			);
		});

		this.executeBatchOperations(operations);
	}

	/**
	 * 2つのブロックを接続（バッチ機能付き版）
	 * @param parentId - 親ブロックID
	 * @param childId - 子ブロックID
	 */
	connectBlocks(parentId: string, childId: string, isLoop: boolean = false): void {
		const parentBlock = this.getBlock(parentId);
		const childBlock = this.getBlock(childId);

		if (!parentBlock || !childBlock) {
			throw new BlockRelationshipError(
				`Cannot connect blocks: parent ${parentId} or child ${childId} not found`,
				parentId,
				childId
			);
		}

		// 既に同一ループ内にある/親がループで既に接続済みなら何もしない
		if (
			parentBlock.type === BlockPathType.Loop &&
			(childBlock.parentId === parentId || this.isBlockInLoop(parentId, childId))
		) {
			return;
		}

		// 接続の妥当性をチェック
		this.validateBlockConnection(parentId, childId);

		// バッチ更新で接続処理を実行
		this.batchUpdate(() => {
			// 既存の接続を解除
			if (childBlock.parentId) {
				this.disconnectBlocks(childBlock.parentId, childId);
			}

			// ループブロックの場合は特別な処理
			if (isLoop) {
				this.connectToLoop(parentId, childId);
			} else {
				// 通常の接続
				this.updateBlock(parentId, { childId });
				this.updateBlock(childId, { parentId });
				// 祖先ループ tail 再計算
				this.ensureLoopTailConsistencyFrom(parentId);
			}
		});
	}
}

export type BlockStoreType = InstanceType<typeof BlockStore>;

// シングルトンインスタンス
let blockStore: BlockStore | null = null;

/**
 * ブロックストアのインスタンスを取得
 * @returns ブロックストアインスタンス
 */
export const useBlockStore = (): BlockStore => {
	if (!blockStore) {
		blockStore = new BlockStore();
	}
	return blockStore;
};
