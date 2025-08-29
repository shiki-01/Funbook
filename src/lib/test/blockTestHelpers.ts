/**
 * Test helpers for creating valid block types and test data
 */

import type { BlockType, BlockContent, Position } from '../types/domain';
import { BlockPathType, Connection } from '../types/core';
import { vi } from 'vitest';
import type { Block, IValidationService } from '$lib';

/**
 * Creates a simple text block type for testing
 * @param type - The block path type
 * @returns A valid BlockType for testing
 */
export function createTestBlockType(type: BlockPathType = BlockPathType.Move): BlockType {
	const content: BlockContent[] = [
		{
			id: crypto.randomUUID(),
			type: 'Text',
			data: {
				title: 'Test Block'
			}
		}
	];

	return {
		id: crypto.randomUUID(),
		name: `Test ${type} Block`,
		type,
		version: '1.0.0',
		title: `Test ${type} Block`,
		output: 'Test Output',
		closeOutput: 'Test Close Output',
		content,
		color: '#ffffff',
		connection: Connection.Both,
		draggable: true,
		editable: true,
		deletable: true
	};
}

// Test data factories
export const createTestBlockTypeCustom = (overrides: Partial<BlockType> = {}): BlockType => ({
	id: '',
	name: 'TestBlock',
	type: BlockPathType.Works,
	version: '1.0.0',
	title: 'Test Block',
	output: 'test output',
	content: [],
	connection: Connection.Both,
	draggable: true,
	editable: true,
	deletable: true,
	...overrides
});

/**
 * Creates a simple loop block type for testing
 * @returns A valid loop BlockType for testing
 */
export function createTestLoopBlockType(): BlockType {
	return createTestBlockType(BlockPathType.Loop);
}

/**
 * Creates a simple input-only block type for testing
 * @returns A valid input-only BlockType for testing
 */
export function createTestInputBlockType(): BlockType {
	const blockType = createTestBlockType(BlockPathType.Move);
	blockType.connection = Connection.Input;
	return blockType;
}

/**
 * Creates a simple output-only block type for testing
 * @returns A valid output-only BlockType for testing
 */
export function createTestOutputBlockType(): BlockType {
	const blockType = createTestBlockType(BlockPathType.Move);
	blockType.connection = Connection.Output;
	return blockType;
}

// Mock validation service
export const createMockValidationService = (): IValidationService => ({
	validateBlock: vi.fn().mockReturnValue({ valid: true, errors: [], warnings: [] }),
	validateConnection: vi.fn().mockReturnValue({ valid: true, errors: [], warnings: [] }),
	validateProject: vi.fn().mockReturnValue({ valid: true, errors: [], warnings: [] })
});

// Mock block store
export const createMockBlockStore = () => {
	const blocks = new Map<string, Block>();

	return {
		createBlock: vi.fn().mockImplementation((blockType: BlockType, position: Position) => {
			const id = 'mock-block-id-' + Math.random().toString(36).substr(2, 9);
			const block: Block = {
				...blockType,
				id,
				position: position || { x: 0, y: 0 },
				zIndex: 0,
				parentId: undefined,
				childId: undefined,
				valueTargetId: undefined,
				loopFirstChildId: undefined,
				loopLastChildId: undefined,
				// Deep copy content array
				content: blockType.content ? JSON.parse(JSON.stringify(blockType.content)) : [],
				visibility: false
			};
			blocks.set(id, block);
			return id;
		}),
		updateBlock: vi.fn().mockImplementation((id: string, updates: Partial<Block>) => {
			const existing = blocks.get(id);
			if (existing) {
				const updated = { ...existing, ...updates };
				blocks.set(id, updated);
			}
		}),
		deleteBlock: vi.fn().mockImplementation((id: string) => {
			const block = blocks.get(id);
			if (block) {
				// If this is a loop block, disconnect all children in the loop
				if (block.type === BlockPathType.Loop && block.loopFirstChildId) {
					let currentId = block.loopFirstChildId;
					while (currentId) {
						const currentBlock = blocks.get(currentId);
						if (!currentBlock) break;

						const nextId = currentBlock.childId;
						currentBlock.parentId = undefined;

						if (currentId === block.loopLastChildId) break;

						if (typeof nextId === 'undefined') {
							console.error(`子の ID を取得できませんでした: ${currentBlock}`);
							break;
						}

						currentId = nextId;
					}
				}

				// Disconnect from parent
				if (block.parentId) {
					const parent = blocks.get(block.parentId);
					if (parent) {
						if (parent.type === BlockPathType.Loop) {
							if (parent.loopFirstChildId === id) {
								parent.loopFirstChildId = block.childId;
							}
							if (parent.loopLastChildId === id) {
								// Find previous child
								for (const [, b] of blocks) {
									if (b.childId === id && b.parentId === parent.id) {
										b.childId = block.childId;
										parent.loopLastChildId = b.id;
										break;
									}
								}
							}
						} else {
							parent.childId = block.childId;
						}
					}
				}

				// Disconnect from child
				if (block.childId) {
					const child = blocks.get(block.childId);
					if (child) {
						child.parentId = block.parentId;
					}
				}

				blocks.delete(id);
			}
		}),
		getBlock: vi.fn().mockImplementation((id: string) => {
			return blocks.get(id) || null;
		}),
		getAllBlocks: vi.fn().mockImplementation(() => {
			return Array.from(blocks.values());
		}),
		connectBlocks: vi.fn().mockImplementation((parentId: string, childId: string) => {
			const parent = blocks.get(parentId);
			const child = blocks.get(childId);
			if (parent && child) {
				// Handle loop blocks
				if (parent.type === BlockPathType.Loop) {
					if (!parent.loopFirstChildId) {
						parent.loopFirstChildId = childId;
						parent.loopLastChildId = childId;
					} else {
						// Find the last child in the loop and connect to it
						const lastChild = blocks.get(parent.loopLastChildId!);
						if (lastChild) {
							lastChild.childId = childId;
						}
						parent.loopLastChildId = childId;
					}
					child.parentId = parentId;
				} else {
					parent.childId = childId;
					child.parentId = parentId;
				}
				child.zIndex = parent.zIndex + 1;
			}
		}),
		disconnectBlocks: vi.fn().mockImplementation((parentId: string, childId: string) => {
			const parent = blocks.get(parentId);
			const child = blocks.get(childId);

			// Always clear child's parentId if child exists
			if (child) {
				child.parentId = undefined;
			}

			if (parent && child) {
				if (parent.type === BlockPathType.Loop) {
					// Handle loop disconnection logic
					if (parent.loopFirstChildId === childId) {
						parent.loopFirstChildId = child.childId;
						if (!child.childId) {
							parent.loopLastChildId = undefined;
						}
					} else if (parent.loopLastChildId === childId) {
						// Find the previous child
						for (const [, block] of blocks) {
							if (block.childId === childId && block.parentId === parentId) {
								block.childId = undefined;
								parent.loopLastChildId = block.id;
								break;
							}
						}
					} else {
						// Middle child - connect previous to next
						for (const [, block] of blocks) {
							if (block.childId === childId && block.parentId === parentId) {
								block.childId = child.childId;
								break;
							}
						}
					}
				} else {
					parent.childId = undefined;
				}
				child.childId = undefined;
			}
		}),
		validateBlockConnection: vi.fn().mockImplementation((parentId: string, childId: string) => {
			// Simple validation logic for testing
			if (parentId === childId) return false; // Self connection

			const parent = blocks.get(parentId);
			const child = blocks.get(childId);

			if (!parent || !child) return false; // Non-existent blocks

			// Check connection types
			if (parent.connection === Connection.None || child.connection === Connection.None) {
				return false;
			}

			if (parent.connection === Connection.Input && child.connection === Connection.Output) {
				return false;
			}

			// Check for circular references (simplified)
			let current = child;
			while (current && current.childId) {
				if (current.childId === parentId) return false;
				const getCurrent = blocks.get(current.childId);
				if (getCurrent) {
					current = getCurrent;
				} else {
					return false;
				}
			}

			return true;
		})
	};
};

// Mock error handler
export const createMockErrorHandler = () => ({
	handleError: vi.fn(),
	reportError: vi.fn().mockReturnValue('mock-report-id'),
	showUserError: vi.fn(),
	getErrorReports: vi.fn().mockReturnValue([]),
	clearErrorReports: vi.fn(),
	resolveError: vi.fn()
});
