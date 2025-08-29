import { describe, it, expect } from 'vitest';
import { createMockBlock } from '../../../test/helpers';
import {
	validateBlock,
	validateBlockConnection,
	validateBlockContent,
	validateContentData,
	validateValidationRule,
	validateConnectionConstraints,
	validateLoopConnection,
	validateLoopIntegrity,
	validateLoopChain,
	wouldCreateCircularDependency,
	findOrphanedBlocks,
	countLoopChildren,
	validateContent,
	sanitizeInput,
	isValidId,
	validateDataIntegrity
} from './index';
import { BlockPathType, Connection } from '../../types';

describe('Validation utilities', () => {
	describe('validateBlock', () => {
		it('should validate a correct block', () => {
			const block = createMockBlock();
			const result = validateBlock(block);
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should return errors for invalid block', () => {
			const block = createMockBlock({
				id: '', // Invalid ID
				name: '', // Invalid name
				position: null as any // Invalid position
			});
			const result = validateBlock(block);
			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
		});

		it('should validate zIndex', () => {
			const block = createMockBlock({
				zIndex: NaN
			});
			const result = validateBlock(block);
			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.code === 'INVALID_Z_INDEX')).toBe(true);
		});

		it('should validate connection type', () => {
			const block = createMockBlock({
				connection: 'InvalidConnection' as any
			});
			const result = validateBlock(block);
			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.code === 'INVALID_CONNECTION_TYPE')).toBe(true);
		});

		it('should validate block type', () => {
			const block = createMockBlock({
				type: 'InvalidType' as any
			});
			const result = validateBlock(block);
			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.code === 'INVALID_BLOCK_TYPE')).toBe(true);
		});

		it('should validate behavior flags as warnings', () => {
			const block = createMockBlock({
				draggable: 'true' as any, // Should be boolean
				editable: 1 as any, // Should be boolean
				deletable: null as any // Should be boolean
			});
			const result = validateBlock(block);
			expect(result.warnings.length).toBe(3);
			expect(result.warnings.some((w) => w.code === 'INVALID_DRAGGABLE_FLAG')).toBe(true);
			expect(result.warnings.some((w) => w.code === 'INVALID_EDITABLE_FLAG')).toBe(true);
			expect(result.warnings.some((w) => w.code === 'INVALID_DELETABLE_FLAG')).toBe(true);
		});
	});

	describe('validateBlockConnection', () => {
		it('should validate compatible block connection', () => {
			const parentBlock = createMockBlock({
				connection: Connection.Output
			});
			const childBlock = createMockBlock({
				connection: Connection.Input
			});
			const result = validateBlockConnection(parentBlock, childBlock);
			expect(result.valid).toBe(true);
		});

		it('should reject incompatible block connection', () => {
			const parentBlock = createMockBlock({
				connection: Connection.Input // Cannot have children
			});
			const childBlock = createMockBlock({
				connection: Connection.Input
			});
			const result = validateBlockConnection(parentBlock, childBlock);
			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
		});

		it('should reject self-connection', () => {
			const block = createMockBlock();
			const result = validateBlockConnection(block, block);
			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.code === 'SELF_CONNECTION')).toBe(true);
		});

		it('should warn about existing connections', () => {
			const parentBlock = createMockBlock({
				connection: Connection.Output
			});
			const childBlock = createMockBlock({
				connection: Connection.Input,
				parentId: 'existing-parent'
			});
			const result = validateBlockConnection(parentBlock, childBlock);
			expect(result.warnings.some((w) => w.code === 'EXISTING_CONNECTION')).toBe(true);
		});
	});

	describe('wouldCreateCircularDependency', () => {
		it('should detect direct circular dependency', () => {
			const blockA = createMockBlock({ id: 'A' });
			const blockB = createMockBlock({ id: 'B', parentId: 'A' });
			const blockMap = new Map([
				['A', blockA],
				['B', blockB]
			]);

			const result = wouldCreateCircularDependency('B', 'A', blockMap);
			expect(result).toBe(true);
		});

		it('should detect indirect circular dependency', () => {
			const blockA = createMockBlock({ id: 'A' });
			const blockB = createMockBlock({ id: 'B', parentId: 'A' });
			const blockC = createMockBlock({ id: 'C', parentId: 'B' });
			const blockMap = new Map([
				['A', blockA],
				['B', blockB],
				['C', blockC]
			]);

			const result = wouldCreateCircularDependency('C', 'A', blockMap);
			expect(result).toBe(true);
		});

		it('should not detect false circular dependency', () => {
			const blockA = createMockBlock({ id: 'A' });
			const blockB = createMockBlock({ id: 'B', parentId: 'A' });
			const blockC = createMockBlock({ id: 'C' });
			const blockMap = new Map([
				['A', blockA],
				['B', blockB],
				['C', blockC]
			]);

			const result = wouldCreateCircularDependency('A', 'C', blockMap);
			expect(result).toBe(false);
		});
	});

	describe('validateConnectionConstraints', () => {
		it('should validate connection with all constraints', () => {
			const parentBlock = createMockBlock({
				connection: Connection.Output
			});
			const childBlock = createMockBlock({
				connection: Connection.Input
			});
			const blockMap = new Map([
				[parentBlock.id, parentBlock],
				[childBlock.id, childBlock]
			]);

			const result = validateConnectionConstraints(parentBlock, childBlock, blockMap);
			expect(result.valid).toBe(true);
		});

		it('should detect circular dependency in constraints', () => {
			const blockA = createMockBlock({
				id: 'A',
				connection: Connection.Output
			});
			const blockB = createMockBlock({
				id: 'B',
				connection: Connection.Both,
				parentId: 'A'
			});
			const blockMap = new Map([
				['A', blockA],
				['B', blockB]
			]);

			const result = validateConnectionConstraints(blockB, blockA, blockMap);
			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.code === 'CIRCULAR_DEPENDENCY')).toBe(true);
		});
	});

	describe('validateBlockContent', () => {
		it('should validate valid block content', () => {
			const content = {
				id: 'content-1',
				type: 'Text' as const,
				data: { title: 'Test Title' }
			};
			const result = validateBlockContent(content);
			expect(result.valid).toBe(true);
		});

		it('should reject invalid content ID', () => {
			const content = {
				id: '',
				type: 'Text' as const,
				data: { title: 'Test Title' }
			};
			const result = validateBlockContent(content);
			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.code === 'INVALID_CONTENT_ID')).toBe(true);
		});

		it('should reject invalid content type', () => {
			const content = {
				id: 'content-1',
				type: 'InvalidType' as any,
				data: { title: 'Test Title' }
			};
			const result = validateBlockContent(content);
			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.code === 'INVALID_CONTENT_TYPE')).toBe(true);
		});

		it('should validate content with validation rules', () => {
			const content = {
				id: 'content-1',
				type: 'Text' as const,
				data: { title: 'Test Title' },
				validation: [
					{ type: 'required' as const, message: 'Required' },
					{ type: 'minLength' as const, value: 5, message: 'Too short' }
				]
			};
			const result = validateBlockContent(content);
			expect(result.valid).toBe(true);
		});
	});

	describe('validateContentData', () => {
		it('should validate Text content data', () => {
			const data = { title: 'Test Title' };
			const result = validateContentData('Text', data);
			expect(result.valid).toBe(true);
		});

		it('should reject Text content without title', () => {
			const data = {};
			const result = validateContentData('Text', data);
			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.code === 'INVALID_TEXT_TITLE')).toBe(true);
		});

		it('should validate ContentValue data', () => {
			const data = { title: 'Value Title', value: 'test value' };
			const result = validateContentData('ContentValue', data);
			expect(result.valid).toBe(true);
		});

		it('should validate ContentSelector data', () => {
			const data = {
				title: 'Selector Title',
				value: 'option1',
				options: [
					{ id: 'opt1', title: 'Option 1', value: 'option1' },
					{ id: 'opt2', title: 'Option 2', value: 'option2' }
				]
			};
			const result = validateContentData('ContentSelector', data);
			expect(result.valid).toBe(true);
		});

		it('should reject ContentSelector with invalid options', () => {
			const data = {
				title: 'Selector Title',
				value: 'option1',
				options: [
					{ id: 'opt1', title: 'Option 1' } // Missing value
				]
			};
			const result = validateContentData('ContentSelector', data);
			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.code === 'INVALID_SELECTOR_OPTION')).toBe(true);
		});

		it('should validate Separator data', () => {
			const data = { type: 'Space' };
			const result = validateContentData('Separator', data);
			expect(result.valid).toBe(true);
		});

		it('should reject unknown content type', () => {
			const data = { title: 'Test' };
			const result = validateContentData('UnknownType', data);
			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.code === 'UNKNOWN_CONTENT_TYPE')).toBe(true);
		});
	});

	describe('validateValidationRule', () => {
		it('should validate required rule', () => {
			const rule = {
				type: 'required' as const,
				message: 'This field is required'
			};
			const result = validateValidationRule(rule);
			expect(result.valid).toBe(true);
		});

		it('should validate length rules', () => {
			const minRule = {
				type: 'minLength' as const,
				value: 5,
				message: 'Too short'
			};
			const maxRule = {
				type: 'maxLength' as const,
				value: 100,
				message: 'Too long'
			};

			expect(validateValidationRule(minRule).valid).toBe(true);
			expect(validateValidationRule(maxRule).valid).toBe(true);
		});

		it('should validate pattern rule', () => {
			const rule = {
				type: 'pattern' as const,
				value: '^[a-zA-Z]+$',
				message: 'Letters only'
			};
			const result = validateValidationRule(rule);
			expect(result.valid).toBe(true);
		});

		it('should reject invalid pattern', () => {
			const rule = {
				type: 'pattern' as const,
				value: '[invalid regex',
				message: 'Invalid'
			};
			const result = validateValidationRule(rule);
			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.code === 'INVALID_REGEX_PATTERN')).toBe(true);
		});

		it('should reject invalid rule type', () => {
			const rule = { type: 'invalidType' as any, message: 'Test' };
			const result = validateValidationRule(rule);
			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.code === 'INVALID_RULE_TYPE')).toBe(true);
		});
	});

	describe('validateDataIntegrity', () => {
		it('should validate blocks with correct references', () => {
			const blocks = [
				createMockBlock({ id: 'A' }),
				createMockBlock({ id: 'B', parentId: 'A' }),
				createMockBlock({ id: 'C', parentId: 'B' })
			];

			// Update parent blocks to have correct child references
			blocks[0].childId = 'B';
			blocks[1].childId = 'C';

			const result = validateDataIntegrity(blocks);
			expect(result.valid).toBe(true);
		});

		it('should detect duplicate block IDs', () => {
			const blocks = [
				createMockBlock({ id: 'A' }),
				createMockBlock({ id: 'A' }) // Duplicate ID
			];

			const result = validateDataIntegrity(blocks);
			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.code === 'DUPLICATE_BLOCK_ID')).toBe(true);
		});

		it('should detect missing parent blocks', () => {
			const blocks = [
				createMockBlock({ id: 'B', parentId: 'A' }) // Parent A doesn't exist
			];

			const result = validateDataIntegrity(blocks);
			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.code === 'MISSING_PARENT_BLOCK')).toBe(true);
		});

		it('should detect missing child blocks', () => {
			const blocks = [
				createMockBlock({ id: 'A', childId: 'B' }) // Child B doesn't exist
			];

			const result = validateDataIntegrity(blocks);
			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.code === 'MISSING_CHILD_BLOCK')).toBe(true);
		});

		it('should warn about orphaned blocks', () => {
			const blocks = [
				createMockBlock({ id: 'A', type: BlockPathType.Flag }), // Root block
				createMockBlock({ id: 'B' }), // Orphaned block
				createMockBlock({ id: 'C', parentId: 'A' }) // Connected block
			];

			blocks[0].childId = 'C';

			const result = validateDataIntegrity(blocks);
			expect(result.warnings.some((w) => w.code === 'ORPHANED_BLOCKS')).toBe(true);
		});
	});

	describe('validateLoopIntegrity', () => {
		it('should validate correct loop structure', () => {
			const loopBlock = createMockBlock({
				id: 'loop',
				type: BlockPathType.Loop,
				loopFirstChildId: 'child1',
				loopLastChildId: 'child2'
			});

			const blockMap = new Map([
				['loop', loopBlock],
				[
					'child1',
					createMockBlock({
						id: 'child1',
						parentId: 'loop',
						childId: 'child2'
					})
				],
				['child2', createMockBlock({ id: 'child2', parentId: 'loop' })]
			]);

			const result = validateLoopIntegrity(loopBlock, blockMap);
			expect(result.valid).toBe(true);
		});

		it('should reject non-loop block', () => {
			const block = createMockBlock({ type: BlockPathType.Flag });
			const blockMap = new Map();

			const result = validateLoopIntegrity(block, blockMap);
			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.code === 'NOT_LOOP_BLOCK')).toBe(true);
		});

		it('should detect missing loop children', () => {
			const loopBlock = createMockBlock({
				id: 'loop',
				type: BlockPathType.Loop,
				loopFirstChildId: 'missing-child'
			});

			const blockMap = new Map([['loop', loopBlock]]);

			const result = validateLoopIntegrity(loopBlock, blockMap);
			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.code === 'MISSING_LOOP_FIRST_CHILD')).toBe(true);
		});
	});

	describe('findOrphanedBlocks', () => {
		it('should find orphaned blocks', () => {
			const blocks = [
				createMockBlock({ id: 'A', type: BlockPathType.Flag }), // Root block
				createMockBlock({ id: 'B' }), // Orphaned
				createMockBlock({ id: 'C', parentId: 'A' }), // Connected
				createMockBlock({ id: 'D' }) // Orphaned
			];

			blocks[0].childId = 'C';

			const orphaned = findOrphanedBlocks(blocks);
			expect(orphaned).toHaveLength(2);
			expect(orphaned.map((b) => b.id)).toEqual(expect.arrayContaining(['B', 'D']));
		});

		it('should not consider start blocks as orphaned', () => {
			const blocks = [createMockBlock({ id: 'A', type: BlockPathType.Flag })];

			const orphaned = findOrphanedBlocks(blocks);
			expect(orphaned).toHaveLength(0);
		});
	});

	describe('countLoopChildren', () => {
		it('should count loop children correctly', () => {
			const loopBlock = createMockBlock({
				id: 'loop',
				type: BlockPathType.Loop,
				loopFirstChildId: 'child1',
				loopLastChildId: 'child3'
			});

			const blockMap = new Map([
				['loop', loopBlock],
				['child1', createMockBlock({ id: 'child1', childId: 'child2' })],
				['child2', createMockBlock({ id: 'child2', childId: 'child3' })],
				['child3', createMockBlock({ id: 'child3' })]
			]);

			const count = countLoopChildren(loopBlock, blockMap);
			expect(count).toBe(3);
		});

		it('should return 0 for loop with no children', () => {
			const loopBlock = createMockBlock({
				id: 'loop',
				type: BlockPathType.Loop
			});

			const blockMap = new Map([['loop', loopBlock]]);

			const count = countLoopChildren(loopBlock, blockMap);
			expect(count).toBe(0);
		});
	});

	describe('validateContent', () => {
		it('should validate required content', () => {
			const rules = [{ type: 'required' as const, message: 'Required' }];

			const validResult = validateContent('test', rules);
			expect(validResult.valid).toBe(true);

			const invalidResult = validateContent('', rules);
			expect(invalidResult.valid).toBe(false);
		});

		it('should validate minimum length', () => {
			const rules = [{ type: 'minLength' as const, value: 5, message: 'Too short' }];

			const validResult = validateContent('hello world', rules);
			expect(validResult.valid).toBe(true);

			const invalidResult = validateContent('hi', rules);
			expect(invalidResult.valid).toBe(false);
		});
	});

	describe('sanitizeInput', () => {
		it('should remove HTML tags', () => {
			const input = '<script>alert("xss")</script>Hello';
			const sanitized = sanitizeInput(input);
			expect(sanitized).toBe('scriptalert("xss")/scriptHello');
		});

		it('should trim whitespace', () => {
			const input = '  hello world  ';
			const sanitized = sanitizeInput(input);
			expect(sanitized).toBe('hello world');
		});
	});

	describe('isValidId', () => {
		it('should validate correct IDs', () => {
			expect(isValidId('valid-id-123')).toBe(true);
			expect(isValidId('valid_id_123')).toBe(true);
			expect(isValidId('validId123')).toBe(true);
		});

		it('should reject invalid IDs', () => {
			expect(isValidId('')).toBe(false);
			expect(isValidId('invalid id')).toBe(false);
			expect(isValidId('invalid@id')).toBe(false);
			expect(isValidId('a'.repeat(51))).toBe(false);
		});
	});
});
