export function assertNonNullable<T>(val: T): asserts val is NonNullable<T> {
	if (val == null) {
		throw new Error('Expected non-null value');
	}
}
