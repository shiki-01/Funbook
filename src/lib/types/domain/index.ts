/**
 * Domain-specific type definitions
 * Core business logic types separated from UI concerns
 */

import { BlockPathType, Connection, Separator } from '../core';
import type { UIConfig } from '../ui';

/**
 * Core domain position interface
 */
export interface Position {
	x: number;
	y: number;
}

/**
 * Core domain size interface
 */
export interface Size {
	width: number;
	height: number;
}

/**
 * Block metadata - core identification and classification
 */
export interface BlockMetadata {
	id: string;
	name: string;
	type: BlockPathType;
	version?: string;
}

/**
 * Block content data - what the block contains
 */
export interface BlockContent {
	id: string;
	type: ContentType;
	data: ContentData;
	validation?: ValidationRule[];
}

/**
 * Block layout information - positioning and visual arrangement
 */
export interface BlockLayout {
	position: Position;
	size?: Size;
	zIndex: number;
	visibility: boolean;
}

/**
 * Block behavior configuration - interaction capabilities
 */
export interface BlockBehavior {
	connection: Connection;
	draggable: boolean;
	editable: boolean;
	deletable: boolean;
}

/**
 * Block relationships - connections to other blocks
 */
export interface BlockRelationship {
	parentId?: string;
	childId?: string;
	valueTargetId?: string | null;
	loopFirstChildId?: string;
	loopLastChildId?: string;
}

/**
 * Complete block definition combining all aspects
 */
export interface Block extends BlockMetadata, BlockLayout, BlockBehavior, BlockRelationship {
	title: string;
	output: string;
	closeOutput?: string;
	content: BlockContent[];
	color?: string;
	assignmentFormat?: string; // Value ブロック用: 例 "${name} = ${value}" （set_value から利用）
}

/**
 * Block type template for creating new blocks
 */
export interface BlockType extends BlockMetadata, BlockBehavior {
	title: string;
	output: string;
	closeOutput?: string;
	content: BlockContent[];
	color?: string;
	assignmentFormat?: string;
}

/**
 * Content type enumeration
 */
export type ContentType = 'Text' | 'ContentValue' | 'ContentSelector' | 'Separator';

/**
 * Content data union type
 */
export type ContentData = TextContent | ContentValue | ContentSelector | SeparatorContent;

/**
 * Text content interface
 */
export interface TextContent {
	title: string;
}

/**
 * Value content interface
 */
export interface ContentValue {
	title: string;
	value: string;
	placeholder?: string;
	variables?: string | null;
}

/**
 * Selector content interface
 */
export interface ContentSelector {
	title: string;
	value: string;
	options: SelectorOption[];
	placeholder?: string;
}

/**
 * Separator content interface
 */
export interface SeparatorContent {
	type: Separator;
}

/**
 * Selector option interface
 */
export interface SelectorOption {
	id: string;
	title: string;
	value: string;
}

/**
 * Validation rule interface
 */
export interface ValidationRule {
	type: 'required' | 'minLength' | 'maxLength' | 'pattern';
	value?: any;
	message: string;
}

/**
 * Block list interface for organizing blocks
 */
export interface BlockList {
	uid?: string; // 一意識別子（競合回避用）
	name: string;
	block: Block;
	description?: string;
}

/**
 * Project data interface
 */
export interface ProjectData {
	version: string;
	name: string;
	description?: string;
	blocks: Block[];
	blockLists: BlockList[];
	metadata: ProjectMetadata;
	config: object; // プロジェクト保存時のUI/レイアウト設定
	lastModified: string;
}

/**
 * Project metadata interface
 */
export interface ProjectMetadata {
	createdAt: string;
	lastModified: string;
	author?: string;
	tags?: string[];
}

/**
 * Block template (palette) export format
 * - プロジェクト全体ではなくブロックリストのみを共有する用途
 */
export interface BlockTemplateData {
	version: string;
	name: string; // テンプレート名
	blockLists: BlockList[]; // ブロックタイプ定義（palette）
	lastModified: string;
	metadata?: ProjectMetadata | null; // 拡張余地（作者など）
}
