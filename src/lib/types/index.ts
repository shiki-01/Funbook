/**
 * Main types export file
 * Re-exports all type definitions for easy importing
 */

// Core types and enums
export * from './core';

// Domain types
export * from './domain';

// UI types
export * from './ui';

// Service interfaces
export * from './services';

// // Legacy types with backward compatibility
// export interface BlockOld {
//   id: string;
//   name: string;
//   type: BlockPathType;
//   title: string;
//   output: string;
//   closeOutput?: string;
//   content: BlockContent[];
//   connection: Connection;
//   color?: string;
//   position: Position;
//   zIndex: number;
//   parentId?: string;
//   childId?: string;
//   valueTargetId?: string | null;
//   loopFirstChildId?: string;
//   loopLastChildId?: string;
// }

// export interface BlockType {
//   id: string;
//   name: string;
//   type: BlockPathType;
//   title: string;
//   output: string;
//   closeOutput?: string;
//   content: BlockContent[];
//   connection: Connection;
//   color?: string;
// }

// export interface BlockList {
//   name: string;
//   block: Block;
// }

// export interface CanvasState {
//   viewport: Viewport;
//   isDragging: boolean;
//   lastMousePos: Position;
// }

// export interface StoreConfig {
//   HEADER_HEIGHT: number;
//   SIDEBAR_WIDTH: number;
//   BLOCK_MIN_WIDTH: number;
//   BLOCK_MIN_HEIGHT: number;
//   VALUE_BLOCK_MIN_HEIGHT: number;
//   BLOCK_PADDING: number;
// }

// export interface ProjectData {
//   version: string;
//   name: string;
//   blocks: Block[];
//   blockLists: BlockList[];
//   config: StoreConfig;
//   lastModified: string;
// }

// // Backward compatibility types (deprecated - use domain types instead)
// export interface DraggingBlock {
//   id: string | null;
//   start: Position;
//   current: Position;
//   blockStart: Position;
//   offset: Position;
//   isFromAdd: boolean;
//   isDragging: boolean;
//   snapTargetId: string | null;
//   connectionType: 'output' | 'loop' | null;
// }

// // Legacy content types (deprecated)
// export type EnumBlockContent =
//   | { type: "Text"; content: TextContent }
//   | { type: "ContentValue"; content: ContentValue }
//   | { type: "ContentSelector"; content: ContentSelector }
//   | { type: "Separator"; content: Separator };

// export interface BlockContentOld {
//   id: string;
//   content: EnumBlockContent;
// }
