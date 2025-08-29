/**
 * Vitest global types declaration
 * This file ensures that Vitest globals are properly typed in TypeScript
 */

import 'vitest/globals';

declare global {
	// Ensure vi is available globally when using globals: true in Vitest config
	const vi: typeof import('vitest').vi;
	const describe: typeof import('vitest').describe;
	const it: typeof import('vitest').it;
	const test: typeof import('vitest').test;
	const expect: typeof import('vitest').expect;
	const beforeEach: typeof import('vitest').beforeEach;
	const afterEach: typeof import('vitest').afterEach;
	const beforeAll: typeof import('vitest').beforeAll;
	const afterAll: typeof import('vitest').afterAll;
}
