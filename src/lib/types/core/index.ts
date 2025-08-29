/**
 * Core type definitions and enums
 * Fundamental types used across the application
 */

/**
 * Block path type enumeration
 */
export enum BlockPathType {
	Flag = 'Flag',
	Works = 'Works',
	Move = 'Move',
	Composition = 'Composition',
	Loop = 'Loop',
	Value = 'Value'
}

/**
 * Connection type enumeration
 */
export enum Connection {
	Input = 'Input',
	Output = 'Output',
	Both = 'Both',
	None = 'None'
}

/**
 * Separator type enumeration
 */
export enum Separator {
	None = 'None',
	Space = 'Space',
	Newline = 'Newline'
}

/**
 * Event types for the application
 */
export type AppEvent =
	| 'block:created'
	| 'block:updated'
	| 'block:deleted'
	| 'block:connected'
	| 'block:disconnected'
	| 'canvas:viewport-changed'
	| 'canvas:zoom-changed'
	| 'drag:started'
	| 'drag:ended'
	| 'project:saved'
	| 'project:loaded';

/**
 * Event payload interface
 */
export interface EventPayload {
	type: AppEvent;
	data: any;
	timestamp: Date;
	source?: string;
}

/**
 * Base entity interface
 */
export interface BaseEntity {
	id: string;
	createdAt?: Date;
	updatedAt?: Date;
}

/**
 * Result type for operations that can fail
 */
export type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };

/**
 * Optional type helper
 */
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Deep partial type helper
 */
export type DeepPartial<T> = {
	[P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Readonly deep type helper
 */
export type ReadonlyDeep<T> = {
	readonly [P in keyof T]: T[P] extends object ? ReadonlyDeep<T[P]> : T[P];
};
