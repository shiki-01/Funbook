/**
 * Service interface definitions
 * Contracts for business logic services
 */

import type { Block, BlockType, Position, ProjectData } from '../domain';
import type { Viewport, DragState, SnapTarget } from '../ui';

/**
 * Block service interface for block operations
 */
export interface IBlockService {
	createBlock(type: BlockType, position: Position): Block | null;
	updateBlock(id: string, updates: Partial<Block>): void;
	deleteBlock(id: string): void;
	connectBlocks(parentId: string, childId: string, isLoop: boolean): boolean;
	disconnectBlock(id: string): void;
	validateBlockConnection(parentId: string, childId: string): boolean;
	getBlock(id: string): Block | null;
	getAllBlocks(): Block[];
	removeBlockWithChildren(id: string): void;
}

/**
 * Canvas service interface for viewport and coordinate operations
 */
export interface ICanvasService {
	screenToCanvas(screenPos: Position): Position;
	canvasToScreen(canvasPos: Position): Position;
	updateViewport(viewport: Viewport): void;
	calculateVisibleBlocks(): Block[];
	optimizeRendering(): void;
	getViewport(): Viewport;
	setViewportPosition(position: Position): void;
	setViewportZoom(zoom: number): void;
	eventToCanvas(event: MouseEvent, containerElement: HTMLElement): Position;
	zoom(delta: number, centerPoint?: Position): void;
	resetViewport(containerSize?: { width: number; height: number }): void;
	centerViewportOn(
		targetPosition: Position,
		containerSize?: { width: number; height: number }
	): void;
	calculateCanvasBounds(margin?: number): {
		minX: number;
		minY: number;
		maxX: number;
		maxY: number;
		width: number;
		height: number;
	};
}

/**
 * Drag service interface for drag and drop operations
 */
export interface IDragService {
	startDrag(blockId: string, offset: Position): boolean;
	updateDragPosition(position: Position): void;
	endDrag(targetId?: string): boolean;
	findDropTarget(position: Position): SnapTarget | null;
	validateDrop(draggedId: string, targetId: string): boolean;
	getDragState(): DragState;
	clearDrag(): void;
	setSnapTarget(target: SnapTarget | null): void;
}

/**
 * Project service interface for project management
 */
export interface IProjectService {
	createProject(name: string): ProjectData;
	saveProject(data: ProjectData): Promise<void>;
	loadProject(data: ProjectData): void;
	exportProject(): ProjectData;
	importProject(data: ProjectData): void;
	validateProject(data: ProjectData): boolean;
}

/**
 * Validation service interface
 */
export interface IValidationService {
	validateBlock(block: Block): ValidationResult;
	validateConnection(parentId: string, childId: string): ValidationResult;
	validateProject(project: ProjectData): ValidationResult;
}

/**
 * Validation result interface
 */
export interface ValidationResult {
	valid: boolean;
	errors: ValidationError[];
	warnings: ValidationWarning[];
}

/**
 * Validation error interface
 */
export interface ValidationError {
	code: string;
	message: string;
	field?: string;
	context?: Record<string, any>;
}

/**
 * Validation warning interface
 */
export interface ValidationWarning {
	code: string;
	message: string;
	field?: string;
	context?: Record<string, any>;
}

/**
 * Error handler service interface
 */
export interface IErrorHandler {
	handleError(error: AppError): void;
	reportError(error: Error, context: ErrorContext): void;
	showUserError(message: string, type: ErrorType): void;
	clearErrors(): void;
}

/**
 * Application error class
 */
export class AppError extends Error {
	constructor(
		message: string,
		public code: string,
		public severity: 'low' | 'medium' | 'high',
		public context?: Record<string, any>
	) {
		super(message);
		this.name = 'AppError';
	}
}

/**
 * Error context interface
 */
export interface ErrorContext {
	component?: string;
	action?: string;
	blockId?: string;
	userId?: string;
	timestamp: Date;
	additionalData?: Record<string, any>;
}

/**
 * Error type enumeration
 */
export type ErrorType = 'info' | 'warning' | 'error' | 'critical';

/**
 * Service container interface for dependency injection
 */
export interface IServiceContainer {
	blockService: IBlockService;
	canvasService: ICanvasService;
	dragService: IDragService;
	projectService: IProjectService;
	validationService: IValidationService;
	errorHandler: IErrorHandler;
}
