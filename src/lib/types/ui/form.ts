/**
 * Form-specific type definitions
 * Types for form data that will be converted to domain types
 */

import type { BlockPathType, Connection } from '../core';
import type { BlockContent } from '../domain';

/**
 * Form data for creating/editing blocks
 * This represents the form state before conversion to Block
 */
export interface BlockFormData {
	// Basic block information
	name: string;
	title: string;
	type: BlockPathType;
	color: string;

	// Output configuration
	output: string;
	closeOutput: string;
	assignmentFormat?: string; // Value ブロック用: 代入行テンプレート (${name}, ${value})

	// Behavior configuration
	connection: Connection;

	// Content items (will be converted to BlockContent[])
	content: BlockContent[];
}

/**
 * Form validation state
 */
export interface FormValidationState {
	isValid: boolean;
	errors: FormFieldError[];
	warnings: FormFieldWarning[];
	touched: Set<string>;
}

/**
 * Form field error
 */
export interface FormFieldError {
	field: string;
	code: string;
	message: string;
	context?: Record<string, any>;
}

/**
 * Form field warning
 */
export interface FormFieldWarning {
	field: string;
	code: string;
	message: string;
	context?: Record<string, any>;
}

/**
 * Form submission result
 */
export interface FormSubmissionResult {
	success: boolean;
	data?: any;
	errors?: FormFieldError[];
}
