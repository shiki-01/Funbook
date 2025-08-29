import { describe, it, expect, vi } from 'vitest';
import {
	generateId,
	deepClone,
	deepMerge,
	debounce,
	throttle,
	capitalize,
	camelToKebab,
	kebabToCamel,
	isEmpty,
	getNestedValue,
	setNestedValue,
	measurePerformance,
	batchOperations,
	rafThrottle,
	clampValue,
	lerpValue,
	mapRange,
	hashCode,
	memoize,
	weakMemoize,
	safeJsonParse,
	safeJsonStringify,
	createTimestampId,
	formatNumber,
	truncateText,
	nextTick,
	isBrowser,
	isNode,
	createEventEmitter
} from './index';

describe('Helper utilities', () => {
	describe('generateId', () => {
		it('should generate unique IDs', () => {
			const id1 = generateId();
			const id2 = generateId();
			expect(id1).not.toBe(id2);
			expect(typeof id1).toBe('string');
			expect(id1.length).toBeGreaterThan(0);
		});
	});

	describe('deepClone', () => {
		it('should deep clone objects', () => {
			const original = {
				a: 1,
				b: {
					c: 2,
					d: [3, 4, { e: 5 }]
				}
			};
			const cloned = deepClone(original);

			expect(cloned).toEqual(original);
			expect(cloned).not.toBe(original);
			expect(cloned.b).not.toBe(original.b);
			expect(cloned.b.d).not.toBe(original.b.d);
		});

		it('should handle primitive values', () => {
			expect(deepClone(42)).toBe(42);
			expect(deepClone('hello')).toBe('hello');
			expect(deepClone(null)).toBe(null);
		});
	});

	describe('deepMerge', () => {
		it('should deep merge objects', () => {
			const target = {
				a: 1,
				b: {
					c: 2,
					d: 3
				}
			};
			const source: Partial<typeof target> = {
				b: {
					c: 2, // Include required property
					d: 4,
					e: 5
				} as any,
				f: 6
			} as any;
			const merged = deepMerge(target, source);

			expect(merged).toEqual({
				a: 1,
				b: {
					c: 2,
					d: 4,
					e: 5
				},
				f: 6
			});
		});
	});

	describe('debounce', () => {
		it('should debounce function calls', async () => {
			const fn = vi.fn();
			const debouncedFn = debounce(fn, 100);

			debouncedFn();
			debouncedFn();
			debouncedFn();

			expect(fn).not.toHaveBeenCalled();

			await new Promise((resolve) => setTimeout(resolve, 150));
			expect(fn).toHaveBeenCalledTimes(1);
		});
	});

	describe('throttle', () => {
		it('should throttle function calls', async () => {
			const fn = vi.fn();
			const throttledFn = throttle(fn, 100);

			throttledFn();
			throttledFn();
			throttledFn();

			expect(fn).toHaveBeenCalledTimes(1);

			await new Promise((resolve) => setTimeout(resolve, 150));
			throttledFn();
			expect(fn).toHaveBeenCalledTimes(2);
		});
	});

	describe('capitalize', () => {
		it('should capitalize first letter', () => {
			expect(capitalize('hello')).toBe('Hello');
			expect(capitalize('HELLO')).toBe('HELLO');
			expect(capitalize('')).toBe('');
		});
	});

	describe('camelToKebab', () => {
		it('should convert camelCase to kebab-case', () => {
			expect(camelToKebab('camelCase')).toBe('camel-case');
			expect(camelToKebab('XMLHttpRequest')).toBe('xml-http-request');
			expect(camelToKebab('simple')).toBe('simple');
		});
	});

	describe('kebabToCamel', () => {
		it('should convert kebab-case to camelCase', () => {
			expect(kebabToCamel('kebab-case')).toBe('kebabCase');
			expect(kebabToCamel('xml-http-request')).toBe('xmlHttpRequest');
			expect(kebabToCamel('simple')).toBe('simple');
		});
	});

	describe('isEmpty', () => {
		it('should check if values are empty', () => {
			expect(isEmpty(null)).toBe(true);
			expect(isEmpty(undefined)).toBe(true);
			expect(isEmpty('')).toBe(true);
			expect(isEmpty('   ')).toBe(true);
			expect(isEmpty([])).toBe(true);
			expect(isEmpty({})).toBe(true);

			expect(isEmpty('hello')).toBe(false);
			expect(isEmpty([1, 2, 3])).toBe(false);
			expect(isEmpty({ a: 1 })).toBe(false);
			expect(isEmpty(0)).toBe(false);
		});
	});

	describe('getNestedValue', () => {
		it('should get nested property values', () => {
			const obj = {
				a: {
					b: {
						c: 'value'
					}
				}
			};

			expect(getNestedValue(obj, 'a.b.c')).toBe('value');
			expect(getNestedValue(obj, 'a.b')).toEqual({ c: 'value' });
			expect(getNestedValue(obj, 'a.b.d')).toBeUndefined();
		});
	});

	describe('setNestedValue', () => {
		it('should set nested property values', () => {
			const obj = {};
			setNestedValue(obj, 'a.b.c', 'value');

			expect(obj).toEqual({
				a: {
					b: {
						c: 'value'
					}
				}
			});
		});
	});

	describe('measurePerformance', () => {
		it('should measure execution time', async () => {
			const endMeasurement = measurePerformance('test');
			await new Promise((resolve) => setTimeout(resolve, 10));
			const duration = endMeasurement();

			expect(duration).toBeGreaterThan(0);
			expect(typeof duration).toBe('number');
		});
	});

	describe('batchOperations', () => {
		it('should execute operations in batch', async () => {
			const operations = [() => Promise.resolve(1), () => Promise.resolve(2), () => 3];

			const results = await batchOperations(operations);
			expect(results).toEqual([1, 2, 3]);
		});
	});

	describe('rafThrottle', () => {
		it('should throttle function calls using RAF', () => {
			const fn = vi.fn();
			const throttledFn = rafThrottle(fn);

			throttledFn();
			throttledFn();
			throttledFn();

			// Should only be called once per RAF cycle
			expect(fn).not.toHaveBeenCalled();
		});
	});

	describe('clampValue', () => {
		it('should clamp values between min and max', () => {
			expect(clampValue(5, 0, 10)).toBe(5);
			expect(clampValue(-5, 0, 10)).toBe(0);
			expect(clampValue(15, 0, 10)).toBe(10);
		});
	});

	describe('lerpValue', () => {
		it('should interpolate between values', () => {
			expect(lerpValue(0, 10, 0.5)).toBe(5);
			expect(lerpValue(0, 10, 0)).toBe(0);
			expect(lerpValue(0, 10, 1)).toBe(10);
			expect(lerpValue(0, 10, 1.5)).toBe(10); // Should clamp
		});
	});

	describe('mapRange', () => {
		it('should map values between ranges', () => {
			expect(mapRange(5, 0, 10, 0, 100)).toBe(50);
			expect(mapRange(0, 0, 10, 0, 100)).toBe(0);
			expect(mapRange(10, 0, 10, 0, 100)).toBe(100);
		});
	});

	describe('hashCode', () => {
		it('should generate consistent hash codes', () => {
			const str = 'test string';
			const hash1 = hashCode(str);
			const hash2 = hashCode(str);

			expect(hash1).toBe(hash2);
			expect(typeof hash1).toBe('number');
		});

		it('should generate different hashes for different strings', () => {
			const hash1 = hashCode('string1');
			const hash2 = hashCode('string2');

			expect(hash1).not.toBe(hash2);
		});
	});

	describe('memoize', () => {
		it('should cache function results', () => {
			const fn = vi.fn((x: number) => x * 2);
			const memoizedFn = memoize(fn);

			expect(memoizedFn(5)).toBe(10);
			expect(memoizedFn(5)).toBe(10);
			expect(fn).toHaveBeenCalledTimes(1);
		});

		it('should use custom key function', () => {
			const fn = vi.fn((obj: { id: number }) => obj.id * 2);
			const memoizedFn = memoize(fn, (obj) => obj.id.toString());

			expect(memoizedFn({ id: 5 })).toBe(10);
			expect(memoizedFn({ id: 5 })).toBe(10);
			expect(fn).toHaveBeenCalledTimes(1);
		});
	});

	describe('weakMemoize', () => {
		it('should cache results using WeakMap', () => {
			const fn = vi.fn((obj: object) => 'result');
			const memoizedFn = weakMemoize(fn);
			const key = {};

			expect(memoizedFn(key)).toBe('result');
			expect(memoizedFn(key)).toBe('result');
			expect(fn).toHaveBeenCalledTimes(1);
		});
	});

	describe('safeJsonParse', () => {
		it('should parse valid JSON', () => {
			const result = safeJsonParse('{"key": "value"}', {});
			expect(result).toEqual({ key: 'value' });
		});

		it('should return fallback for invalid JSON', () => {
			const fallback = { default: true };
			const result = safeJsonParse('invalid json', fallback);
			expect(result).toBe(fallback);
		});
	});

	describe('safeJsonStringify', () => {
		it('should stringify valid objects', () => {
			const result = safeJsonStringify({ key: 'value' });
			expect(result).toBe('{"key":"value"}');
		});

		it('should return empty string for circular references', () => {
			const obj: any = { key: 'value' };
			obj.circular = obj;
			const result = safeJsonStringify(obj);
			expect(result).toBe('');
		});
	});

	describe('createTimestampId', () => {
		it('should create unique timestamp-based IDs', () => {
			const id1 = createTimestampId();
			const id2 = createTimestampId();

			expect(id1).not.toBe(id2);
			expect(typeof id1).toBe('string');
		});

		it('should include prefix when provided', () => {
			const id = createTimestampId('test');
			expect(id).toMatch(/^test_\d+_[a-z0-9]+$/);
		});
	});

	describe('formatNumber', () => {
		it('should format numbers with thousand separators', () => {
			const result = formatNumber(1234567);
			expect(result).toMatch(/1[,.]234[,.]567/);
		});
	});

	describe('truncateText', () => {
		it('should truncate long text', () => {
			const result = truncateText('This is a long text', 10);
			expect(result).toBe('This is...');
		});

		it('should not truncate short text', () => {
			const result = truncateText('Short', 10);
			expect(result).toBe('Short');
		});

		it('should use custom ellipsis', () => {
			const result = truncateText('This is a long text', 10, '---');
			expect(result).toBe('This is---');
		});
	});

	describe('nextTick', () => {
		it('should resolve on next tick', async () => {
			let resolved = false;
			nextTick().then(() => {
				resolved = true;
			});

			expect(resolved).toBe(false);
			await nextTick();
			expect(resolved).toBe(true);
		});
	});

	describe('isBrowser', () => {
		it('should detect browser environment', () => {
			const result = isBrowser();
			expect(typeof result).toBe('boolean');
		});
	});

	describe('isNode', () => {
		it('should detect Node.js environment', () => {
			const result = isNode();
			expect(typeof result).toBe('boolean');
		});
	});

	describe('createEventEmitter', () => {
		it('should create functional event emitter', () => {
			const emitter = createEventEmitter<{
				test: [string, number];
				other: [boolean];
			}>();

			const listener = vi.fn();
			emitter.on('test', listener);
			emitter.emit('test', 'hello', 42);

			expect(listener).toHaveBeenCalledWith('hello', 42);
		});

		it('should support once listeners', () => {
			const emitter = createEventEmitter<{ test: [string] }>();
			const listener = vi.fn();

			emitter.once('test', listener);
			emitter.emit('test', 'first');
			emitter.emit('test', 'second');

			expect(listener).toHaveBeenCalledTimes(1);
			expect(listener).toHaveBeenCalledWith('first');
		});

		it('should support removing listeners', () => {
			const emitter = createEventEmitter<{ test: [string] }>();
			const listener = vi.fn();

			emitter.on('test', listener);
			emitter.emit('test', 'first');
			emitter.off('test', listener);
			emitter.emit('test', 'second');

			expect(listener).toHaveBeenCalledTimes(1);
		});
	});
});
