/**
 * Common helper utilities
 * Shared utility functions used across components and services
 */

/**
 * Generate a unique ID
 */
export function generateId(): string {
	return crypto.randomUUID();
}

/**
 * Generate a short ID (8 characters)
 */
export function generateShortId(): string {
	return Math.random().toString(36).substring(2, 10);
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
	if (obj === null || typeof obj !== 'object') {
		return obj;
	}

	if (obj instanceof Date) {
		return new Date(obj.getTime()) as unknown as T;
	}

	if (obj instanceof Array) {
		return obj.map((item) => deepClone(item)) as unknown as T;
	}

	if (typeof obj === 'object') {
		const cloned = {} as T;
		for (const key in obj) {
			if (obj.hasOwnProperty(key)) {
				cloned[key] = deepClone(obj[key]);
			}
		}
		return cloned;
	}

	return obj;
}

/**
 * Deep merge two objects
 */
export function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
	const result = { ...target };

	for (const key in source) {
		if (source.hasOwnProperty(key)) {
			const sourceValue = source[key];
			const targetValue = result[key];

			if (
				sourceValue &&
				typeof sourceValue === 'object' &&
				!Array.isArray(sourceValue) &&
				targetValue &&
				typeof targetValue === 'object' &&
				!Array.isArray(targetValue)
			) {
				result[key] = deepMerge(targetValue, sourceValue);
			} else {
				result[key] = sourceValue as T[Extract<keyof T, string>];
			}
		}
	}

	return result;
}

/**
 * Debounce function execution
 */
export function debounce<T extends (...args: any[]) => any>(
	func: T,
	wait: number
): (...args: Parameters<T>) => void {
	let timeout: ReturnType<typeof setTimeout>;

	return (...args: Parameters<T>) => {
		clearTimeout(timeout);
		timeout = setTimeout(() => func(...args), wait);
	};
}

/**
 * Throttle function execution
 */
export function throttle<T extends (...args: any[]) => any>(
	func: T,
	limit: number
): (...args: Parameters<T>) => void {
	let inThrottle: boolean;

	return (...args: Parameters<T>) => {
		if (!inThrottle) {
			func(...args);
			inThrottle = true;
			setTimeout(() => (inThrottle = false), limit);
		}
	};
}

/**
 * Format date to string
 */
export function formatDate(date: Date, format: 'short' | 'long' = 'short'): string {
	if (format === 'long') {
		return date.toLocaleString();
	}
	return date.toLocaleDateString();
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
	const sizes = ['Bytes', 'KB', 'MB', 'GB'];
	if (bytes === 0) return '0 Bytes';

	const i = Math.floor(Math.log(bytes) / Math.log(1024));
	return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Capitalize first letter
 */
export function capitalize(str: string): string {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert camelCase to kebab-case
 */
export function camelToKebab(str: string): string {
	return str
		.replace(/([a-z0-9])([A-Z])/g, '$1-$2')
		.replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
		.toLowerCase();
}

/**
 * Convert kebab-case to camelCase
 */
export function kebabToCamel(str: string): string {
	return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
}

/**
 * Check if value is empty (null, undefined, empty string, empty array, empty object)
 */
export function isEmpty(value: any): boolean {
	if (value == null) return true;
	if (typeof value === 'string') return value.trim() === '';
	if (Array.isArray(value)) return value.length === 0;
	if (typeof value === 'object') return Object.keys(value).length === 0;
	return false;
}

/**
 * Get nested property value safely
 */
export function getNestedValue(obj: any, path: string): any {
	return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Set nested property value safely
 */
export function setNestedValue(obj: any, path: string, value: any): void {
	const keys = path.split('.');
	const lastKey = keys.pop()!;
	const target = keys.reduce((current, key) => {
		if (!(key in current)) {
			current[key] = {};
		}
		return current[key];
	}, obj);
	target[lastKey] = value;
}

/**
 * Create a promise that resolves after a delay
 */
export function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
	fn: () => Promise<T>,
	maxAttempts: number = 3,
	baseDelay: number = 1000
): Promise<T> {
	let lastError: Error;

	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error as Error;

			if (attempt === maxAttempts) {
				throw lastError;
			}

			const delayMs = baseDelay * Math.pow(2, attempt - 1);
			await delay(delayMs);
		}
	}

	throw lastError!;
}

/**
 * Create a cancellable promise
 */
export function makeCancellable<T>(promise: Promise<T>): {
	promise: Promise<T>;
	cancel: () => void;
} {
	let cancelled = false;

	const wrappedPromise = new Promise<T>((resolve, reject) => {
		promise
			.then((value) => {
				if (!cancelled) {
					resolve(value);
				}
			})
			.catch((error) => {
				if (!cancelled) {
					reject(error);
				}
			});
	});

	return {
		promise: wrappedPromise,
		cancel: () => {
			cancelled = true;
		}
	};
}

/**
 * Performance measurement utility
 * @param label - Label for the measurement
 * @returns Function to end measurement and return duration
 */
export function measurePerformance(label: string): () => number {
	const startTime = performance.now();

	return (): number => {
		const endTime = performance.now();
		const duration = endTime - startTime;

		if (typeof window !== 'undefined' && window.console) {
			console.debug(`Performance [${label}]: ${duration.toFixed(2)}ms`);
		}

		return duration;
	};
}

/**
 * Batch operations to reduce re-renders
 * @param operations - Array of operations to batch
 * @returns Promise that resolves when all operations complete
 */
export async function batchOperations<T>(operations: (() => T | Promise<T>)[]): Promise<T[]> {
	const results: T[] = [];

	for (const operation of operations) {
		const result = await operation();
		results.push(result);
	}

	return results;
}

/**
 * Create a RAF-based throttled function for smooth animations
 * @param func - Function to throttle
 * @returns Throttled function
 */
export function rafThrottle<T extends (...args: any[]) => any>(
	func: T
): (...args: Parameters<T>) => void {
	let rafId: number | null = null;
	let lastArgs: Parameters<T>;

	return (...args: Parameters<T>) => {
		lastArgs = args;

		if (rafId === null) {
			rafId = requestAnimationFrame(() => {
				func(...lastArgs);
				rafId = null;
			});
		}
	};
}

/**
 * Map a value from one range to another
 * @param value - Value to map
 * @param inMin - Input range minimum
 * @param inMax - Input range maximum
 * @param outMin - Output range minimum
 * @param outMax - Output range maximum
 * @returns Mapped value
 */
export function mapRange(
	value: number,
	inMin: number,
	inMax: number,
	outMin: number,
	outMax: number
): number {
	return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

/**
 * Clamp a number between min and max values
 * @param value - Value to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Clamped value
 */
export function clampValue(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

/**
 * Linear interpolation between two values
 * @param start - Start value
 * @param end - End value
 * @param t - Interpolation factor (0-1)
 * @returns Interpolated value
 */
export function lerpValue(start: number, end: number, t: number): number {
	return start + (end - start) * clampValue(t, 0, 1);
}

/**
 * Generate a hash code from a string
 * @param str - String to hash
 * @returns Hash code
 */
export function hashCode(str: string): number {
	let hash = 0;
	if (str.length === 0) return hash;

	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash; // Convert to 32-bit integer
	}

	return hash;
}

/**
 * Create a memoized version of a function
 * @param fn - Function to memoize
 * @param keyFn - Optional key generation function
 * @returns Memoized function
 */
export function memoize<TArgs extends any[], TReturn>(
	fn: (...args: TArgs) => TReturn,
	keyFn?: (...args: TArgs) => string
): (...args: TArgs) => TReturn {
	const cache = new Map<string, TReturn>();

	return (...args: TArgs): TReturn => {
		const key = keyFn ? keyFn(...args) : JSON.stringify(args);

		if (cache.has(key)) {
			return cache.get(key)!;
		}

		const result = fn(...args);
		cache.set(key, result);
		return result;
	};
}

/**
 * Create a weak memoized version of a function (for object keys)
 * @param fn - Function to memoize
 * @returns Memoized function with WeakMap cache
 */
export function weakMemoize<TKey extends object, TReturn>(
	fn: (key: TKey) => TReturn
): (key: TKey) => TReturn {
	const cache = new WeakMap<TKey, TReturn>();

	return (key: TKey): TReturn => {
		if (cache.has(key)) {
			return cache.get(key)!;
		}

		const result = fn(key);
		cache.set(key, result);
		return result;
	};
}

/**
 * Safe JSON parsing with fallback
 * @param jsonString - JSON string to parse
 * @param fallback - Fallback value if parsing fails
 * @returns Parsed object or fallback
 */
export function safeJsonParse<T>(jsonString: string, fallback: T): T {
	try {
		return JSON.parse(jsonString) as T;
	} catch {
		return fallback;
	}
}

/**
 * Safe JSON stringification
 * @param obj - Object to stringify
 * @param space - Indentation space
 * @returns JSON string or empty string if failed
 */
export function safeJsonStringify(obj: any, space?: number): string {
	try {
		return JSON.stringify(obj, null, space);
	} catch {
		return '';
	}
}

/**
 * Create a unique timestamp-based ID
 * @param prefix - Optional prefix
 * @returns Timestamp-based ID
 */
export function createTimestampId(prefix: string = ''): string {
	const timestamp = Date.now();
	const random = Math.random().toString(36).substring(2, 8);
	return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
}

/**
 * Format a number with thousand separators
 * @param num - Number to format
 * @param locale - Locale for formatting
 * @returns Formatted number string
 */
export function formatNumber(num: number, locale: string = 'en-US'): string {
	return new Intl.NumberFormat(locale).format(num);
}

/**
 * Truncate text with ellipsis
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @param ellipsis - Ellipsis string
 * @returns Truncated text
 */
export function truncateText(text: string, maxLength: number, ellipsis: string = '...'): string {
	if (text.length <= maxLength) return text;
	return text.substring(0, maxLength - ellipsis.length) + ellipsis;
}

/**
 * Create a promise that resolves on next tick
 * @returns Promise that resolves on next tick
 */
export function nextTick(): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Check if code is running in browser environment
 * @returns True if in browser
 */
export function isBrowser(): boolean {
	return typeof window !== 'undefined' && typeof document !== 'undefined';
}

/**
 * Check if code is running in Node.js environment
 * @returns True if in Node.js
 */
export function isNode(): boolean {
	return typeof process !== 'undefined' && process.versions?.node !== undefined;
}

/**
 * Create a simple event emitter
 * @returns Event emitter instance
 */
export function createEventEmitter<T extends Record<string, any[]>>(): {
	on<K extends keyof T>(event: K, listener: (...args: T[K]) => void): void;
	off<K extends keyof T>(event: K, listener: (...args: T[K]) => void): void;
	emit<K extends keyof T>(event: K, ...args: T[K]): void;
	once<K extends keyof T>(event: K, listener: (...args: T[K]) => void): void;
} {
	const listeners = new Map<keyof T, Set<(...args: any[]) => void>>();

	return {
		on<K extends keyof T>(event: K, listener: (...args: T[K]) => void): void {
			if (!listeners.has(event)) {
				listeners.set(event, new Set());
			}
			listeners.get(event)!.add(listener);
		},

		off<K extends keyof T>(event: K, listener: (...args: T[K]) => void): void {
			const eventListeners = listeners.get(event);
			if (eventListeners) {
				eventListeners.delete(listener);
			}
		},

		emit<K extends keyof T>(event: K, ...args: T[K]): void {
			const eventListeners = listeners.get(event);
			if (eventListeners) {
				eventListeners.forEach((listener) => listener(...args));
			}
		},

		once<K extends keyof T>(event: K, listener: (...args: T[K]) => void): void {
			const onceListener = (...args: T[K]) => {
				listener(...args);
				this.off(event, onceListener);
			};
			this.on(event, onceListener);
		}
	};
}
