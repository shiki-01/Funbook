/**
 * Test helper utilities
 */

import type { Block, BlockType, Position } from '$lib/types';
import { BlockPathType, Connection } from '$lib/types';
import { vi } from 'vitest';

/**
 * Create a mock block for testing
 */
export function createMockBlock(overrides: Partial<Block> = {}): Block {
	return {
		id: 'test-block-' + Math.random().toString(36).substring(2, 9),
		name: 'Test Block',
		type: BlockPathType.Works,
		title: 'Test Block Title',
		output: 'test output',
		content: [],
		connection: Connection.Both,
		position: { x: 0, y: 0 },
		zIndex: 0,
		visibility: true,
		draggable: true,
		editable: true,
		deletable: true,
		...overrides
	};
}

/**
 * Create a mock block type for testing
 */
export function createMockBlockType(overrides: Partial<BlockType> = {}): BlockType {
	return {
		id: 'test-block-type-' + Math.random().toString(36).substring(2, 9),
		name: 'Test Block Type',
		type: BlockPathType.Works,
		title: 'Test Block Type Title',
		output: 'test output',
		content: [],
		connection: Connection.Both,
		draggable: true,
		editable: true,
		deletable: true,
		...overrides
	};
}

/**
 * Create a mock position for testing
 */
export function createMockPosition(x: number = 0, y: number = 0): Position {
	return { x, y };
}

/**
 * Wait for next tick (useful for async operations in tests)
 */
export function nextTick(): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Create a mock mouse event
 */
export function createMockMouseEvent(type: string, options: Partial<MouseEvent> = {}): MouseEvent {
	return new MouseEvent(type, {
		bubbles: true,
		cancelable: true,
		clientX: 0,
		clientY: 0,
		...options
	});
}

/**
 * Create a mock HTML element with getBoundingClientRect
 */
export function createMockElement(rect: Partial<DOMRect> = {}): HTMLElement {
	const element = document.createElement('div');
	element.getBoundingClientRect = vi.fn(() => ({
		x: 0,
		y: 0,
		width: 100,
		height: 100,
		top: 0,
		right: 100,
		bottom: 100,
		left: 0,
		...rect
	})) as any;
	return element;
}
