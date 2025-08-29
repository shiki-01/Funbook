/**
 * UI-specific type definitions
 * Types related to user interface state and interactions
 */

import type { Position } from '../domain';

// Re-export form types
export * from './form';

/**
 * Viewport state for canvas navigation
 */
export interface Viewport {
	x: number;
	y: number;
	zoom: number;
}

/**
 * Canvas state management
 */
export interface CanvasState {
	viewport: Viewport;
	selection: SelectionState;
	interaction: InteractionState;
	performance: PerformanceState;
}

/**
 * Selection state for blocks
 */
export interface SelectionState {
	selectedBlockIds: Set<string>;
	lastSelectedId: string | null;
	selectionBox: SelectionBox | null;
}

/**
 * Selection box for multi-select
 */
export interface SelectionBox {
	start: Position;
	end: Position;
	active: boolean;
}

/**
 * Interaction state for user actions
 */
export interface InteractionState {
	isDragging: boolean;
	isSelecting: boolean;
	lastMousePos: Position;
	hoveredBlockId: string | null;
}

/**
 * Performance state for optimization
 */
export interface PerformanceState {
	visibleBlocks: Set<string>;
	renderCount: number;
	lastRenderTime: number;
}

/**
 * Drag state for drag and drop operations
 */
export interface DragState {
	active: boolean;
	blockId: string | null;
	startPosition: Position;
	currentPosition: Position;
	offset: Position;
	snapTarget: SnapTarget | null;
	connectionType: ConnectionType | null;
	isFromPalette: boolean;
}

/**
 * Snap target for drag operations
 */
export interface SnapTarget {
	blockId: string;
	type: 'input' | 'output' | 'loop' | 'value';
	position: Position;
	valid: boolean;
	/** value 接続時: 対象となる ContentValue の content.id */
	contentId?: string;
}

/**
 * Connection type for drag operations
 */
export type ConnectionType = 'output' | 'loop' | 'value';

/**
 * UI configuration interface
 */
export interface UIConfig {
	HEADER_HEIGHT: number;
	SIDEBAR_WIDTH: number;
	BLOCK_MIN_WIDTH: number;
	BLOCK_MIN_HEIGHT: number;
	VALUE_BLOCK_MIN_HEIGHT: number;
	BLOCK_PADDING: number;
	GRID_SIZE: number;
	ZOOM_MIN: number;
	ZOOM_MAX: number;
	ZOOM_STEP: number;
}

/**
 * Theme configuration
 */
export interface ThemeConfig {
	colors: {
		primary: string;
		secondary: string;
		background: string;
		surface: string;
		text: string;
		border: string;
	};
	spacing: {
		xs: number;
		sm: number;
		md: number;
		lg: number;
		xl: number;
	};
}

/**
 * Error display state
 */
export interface ErrorState {
	visible: boolean;
	message: string;
	type: 'info' | 'warning' | 'error';
	timeout?: number;
}

/**
 * Modal state
 */
export interface ModalState {
	open: boolean;
	type: 'block-form' | 'project-settings' | 'export' | 'import';
	data?: any;
}

/**
 * Toolbar state
 */
export interface ToolbarState {
	activeTools: Set<string>;
	availableTools: ToolDefinition[];
}

/**
 * Tool definition
 */
export interface ToolDefinition {
	id: string;
	name: string;
	icon: string;
	shortcut?: string;
	enabled: boolean;
}
