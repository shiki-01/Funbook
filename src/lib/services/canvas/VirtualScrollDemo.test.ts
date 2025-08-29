/**
 * Virtual Scroll Demo Test
 * Demonstrates the virtual scrolling functionality with performance metrics
 */

import { describe, it, expect } from 'vitest';
import { VirtualScrollService } from './VirtualScrollService';
import type { Block } from '$lib/types/domain';
import { BlockPathType, Connection } from '$lib/types/core';

describe('Virtual Scrolling Demo', () => {
	/**
	 * Generate test blocks for demonstration
	 */
	function generateTestBlocks(count: number): Block[] {
		return Array.from({ length: count }, (_, i) => ({
			id: `demo-block-${i}`,
			name: `Demo Block ${i}`,
			type: BlockPathType.Works,
			version: '1.0',
			position: {
				x: (i % 50) * 220,
				y: Math.floor(i / 50) * 80
			},
			size: { width: 200, height: 60 },
			zIndex: 0,
			visibility: true,
			connection: Connection.Both,
			draggable: true,
			editable: true,
			deletable: true,
			parentId: undefined,
			childId: undefined,
			valueTargetId: undefined,
			loopFirstChildId: undefined,
			loopLastChildId: undefined,
			title: `Demo Block ${i}`,
			output: `output-${i}`,
			closeOutput: '',
			content: [],
			color: '#4A90E2'
		}));
	}

	it('should demonstrate virtual scrolling with different block counts', () => {
		console.log('🚀 Virtual Scrolling Demo Started');
		console.log('=====================================');

		const service = new VirtualScrollService({
			margin: 200,
			defaultBlockWidth: 200,
			defaultBlockHeight: 60,
			enablePerformanceMonitoring: true
		});

		// Test with different block counts
		const testCases = [100, 1000, 5000, 10000];
		const viewport = { x: 0, y: 0, zoom: 1.0 };
		const containerSize = { width: 1920, height: 1080 };

		testCases.forEach((blockCount) => {
			console.log(`\n📊 Testing with ${blockCount.toLocaleString()} blocks:`);

			const blocks = generateTestBlocks(blockCount);
			const startTime = performance.now();

			const visibleBlocks = service.calculateVisibleBlocks(blocks, viewport, containerSize);

			const endTime = performance.now();
			const stats = service.getPerformanceStats();

			console.log(`  ✅ Calculation time: ${(endTime - startTime).toFixed(2)}ms`);
			console.log(`  📈 Visible blocks: ${stats.visibleBlocks} / ${stats.totalBlocks}`);
			console.log(`  🎯 Culling efficiency: ${(stats.cullingEfficiency * 100).toFixed(1)}%`);
			console.log(
				`  ⚡ Performance: ${stats.totalBlocks > 0 ? (stats.totalBlocks / (endTime - startTime)).toFixed(0) : 0} blocks/ms`
			);

			// Verify performance requirements
			expect(endTime - startTime).toBeLessThan(200); // Should be under 200ms
			expect(visibleBlocks.length).toBeLessThan(blocks.length); // Should cull some blocks
			expect(stats.cullingEfficiency).toBeGreaterThan(0); // Should have some culling efficiency
		});

		console.log('\n✨ Virtual Scrolling Demo Complete!');
	});

	it('should demonstrate viewport movement performance', () => {
		console.log('\n🔍 Testing viewport movement:');

		const service = new VirtualScrollService({
			margin: 200,
			defaultBlockWidth: 200,
			defaultBlockHeight: 60,
			enablePerformanceMonitoring: true
		});

		const blocks = generateTestBlocks(5000);
		const containerSize = { width: 1920, height: 1080 };

		const viewports = [
			{ x: 0, y: 0, zoom: 1.0, name: 'Origin' },
			{ x: -2000, y: -1000, zoom: 1.0, name: 'Far Right' },
			{ x: -5000, y: -2500, zoom: 0.5, name: 'Zoomed Out' },
			{ x: -500, y: -250, zoom: 2.0, name: 'Zoomed In' }
		];

		viewports.forEach((vp) => {
			const startTime = performance.now();
			const visibleBlocks = service.calculateVisibleBlocks(blocks, vp, containerSize);
			const endTime = performance.now();
			const stats = service.getPerformanceStats();

			console.log(
				`  📍 ${vp.name}: ${stats.visibleBlocks} visible (${(endTime - startTime).toFixed(2)}ms)`
			);

			// Verify performance
			expect(endTime - startTime).toBeLessThan(100); // Should be fast
			expect(visibleBlocks.length).toBeGreaterThanOrEqual(0);
		});
	});

	it('should demonstrate block visibility analysis', () => {
		console.log('\n🔬 Block Visibility Analysis:');

		const service = new VirtualScrollService({
			margin: 200,
			defaultBlockWidth: 200,
			defaultBlockHeight: 60,
			enablePerformanceMonitoring: true
		});

		const testBlocks = generateTestBlocks(100);
		const viewport = { x: 0, y: 0, zoom: 1.0 };
		const containerSize = { width: 1920, height: 1080 };

		const visibility = service.calculateBlockVisibility(testBlocks, viewport, containerSize);

		const fullyVisible = visibility.filter((v) => v.fullyVisible).length;
		const partiallyVisible = visibility.filter((v) => v.partiallyVisible && !v.fullyVisible).length;
		const hidden = visibility.length - fullyVisible - partiallyVisible;

		console.log(`  👁️  Fully visible: ${fullyVisible}`);
		console.log(`  👀 Partially visible: ${partiallyVisible}`);
		console.log(`  🙈 Hidden: ${hidden}`);

		// Verify visibility calculations
		expect(visibility).toHaveLength(100);
		expect(fullyVisible + partiallyVisible + hidden).toBe(100);
		expect(fullyVisible).toBeGreaterThan(0); // Should have some visible blocks
	});

	it('should benchmark virtual scrolling performance', () => {
		console.log('\n⚡ Virtual Scrolling Performance Benchmark');
		console.log('==========================================');

		const service = new VirtualScrollService({
			margin: 200,
			defaultBlockWidth: 200,
			defaultBlockHeight: 60,
			enablePerformanceMonitoring: true
		});

		const viewport = { x: 0, y: 0, zoom: 1.0 };
		const containerSize = { width: 1920, height: 1080 };

		// Benchmark with 25,000 blocks (reduced for test environment)
		const blocks = generateTestBlocks(25000);
		const iterations = 5;
		const times: number[] = [];

		console.log(
			`🏃 Running ${iterations} iterations with ${blocks.length.toLocaleString()} blocks...`
		);

		for (let i = 0; i < iterations; i++) {
			const startTime = performance.now();
			service.calculateVisibleBlocks(blocks, viewport, containerSize);
			const endTime = performance.now();
			times.push(endTime - startTime);
		}

		const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
		const minTime = Math.min(...times);
		const maxTime = Math.max(...times);
		const stats = service.getPerformanceStats();

		console.log(`\n📊 Benchmark Results:`);
		console.log(`  ⏱️  Average time: ${avgTime.toFixed(2)}ms`);
		console.log(`  🚀 Best time: ${minTime.toFixed(2)}ms`);
		console.log(`  🐌 Worst time: ${maxTime.toFixed(2)}ms`);
		console.log(`  📈 Throughput: ${(blocks.length / avgTime).toFixed(0)} blocks/ms`);
		console.log(`  🎯 Culling efficiency: ${(stats.cullingEfficiency * 100).toFixed(1)}%`);
		console.log(`  ✅ Visible blocks: ${stats.visibleBlocks} / ${stats.totalBlocks}`);

		// Verify benchmark results
		expect(avgTime).toBeLessThan(500); // Should average under 500ms
		expect(minTime).toBeLessThan(avgTime); // Min should be less than average
		expect(maxTime).toBeGreaterThanOrEqual(avgTime); // Max should be >= average
		expect(stats.cullingEfficiency).toBeGreaterThan(0.8); // Should have high culling efficiency
		expect(stats.visibleBlocks).toBeLessThan(stats.totalBlocks); // Should cull blocks
	});
});
