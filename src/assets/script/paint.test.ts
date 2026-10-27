import { describe, expect, it } from "vitest";
import { applyMask, NO_ADJUST, PAINT_ERASE, PAINT_RESTORE } from "./mask";
import {
	brushRadius,
	rasterizeStrokes,
	type Stroke,
	stampCircle,
	stampSegment,
} from "./paint";

const count = (paint: Uint8Array, value: number) =>
	paint.filter((v) => v === value).length;

describe("brushRadius", () => {
	it("scales with the size and the image", () => {
		expect(brushRadius(100, 800, 600)).toBe(80);
		expect(brushRadius(50, 800, 600)).toBe(40);
		expect(brushRadius(1, 800, 600)).toBe(1);
		expect(brushRadius(100, 100, 100)).toBe(10);
	});

	it("clamps out-of-range sizes and never goes below 1px", () => {
		expect(brushRadius(500, 800, 600)).toBe(80);
		expect(brushRadius(-5, 10, 10)).toBe(1);
	});
});

describe("stampCircle", () => {
	it("paints a disc and nothing else", () => {
		const paint = new Uint8Array(21 * 21);
		stampCircle(paint, 21, 21, 10, 10, 5, PAINT_ERASE);
		expect(paint[10 * 21 + 10]).toBe(PAINT_ERASE);
		expect(paint[10 * 21 + 15]).toBe(PAINT_ERASE);
		expect(paint[10 * 21 + 16]).toBe(0);
		expect(paint[0]).toBe(0);
		// a disc of radius 5 covers about pi * 25 pixels
		expect(count(paint, PAINT_ERASE)).toBeGreaterThan(70);
		expect(count(paint, PAINT_ERASE)).toBeLessThan(90);
	});

	it("stays inside the image near the edges", () => {
		const paint = new Uint8Array(10 * 10);
		stampCircle(paint, 10, 10, 0, 0, 4, PAINT_RESTORE);
		stampCircle(paint, 10, 10, 9, 9, 4, PAINT_RESTORE);
		expect(paint[0]).toBe(PAINT_RESTORE);
		expect(paint[99]).toBe(PAINT_RESTORE);
	});

	it("overwrites earlier paint", () => {
		const paint = new Uint8Array(10 * 10);
		stampCircle(paint, 10, 10, 5, 5, 2, PAINT_ERASE);
		stampCircle(paint, 10, 10, 5, 5, 2, PAINT_RESTORE);
		expect(count(paint, PAINT_ERASE)).toBe(0);
	});
});

describe("stampSegment", () => {
	it("leaves no gaps in a fast stroke", () => {
		const paint = new Uint8Array(100 * 10);
		stampSegment(paint, 100, 10, 5, 5, 95, 5, 2, PAINT_ERASE);
		for (let x = 5; x <= 95; x++) {
			expect(paint[5 * 100 + x]).toBe(PAINT_ERASE);
		}
	});
});

describe("rasterizeStrokes", () => {
	const strokes: Stroke[] = [
		{ value: PAINT_ERASE, radius: 3, points: [10, 10, 30, 10] },
		{ value: PAINT_RESTORE, radius: 2, points: [50, 50] },
	];

	it("replays every stroke", () => {
		const paint = rasterizeStrokes(60, 60, strokes);
		expect(paint[10 * 60 + 20]).toBe(PAINT_ERASE);
		expect(paint[50 * 60 + 50]).toBe(PAINT_RESTORE);
		expect(paint[40 * 60 + 40]).toBe(0);
	});

	it("matches painting incrementally, and later strokes win", () => {
		const over: Stroke[] = [
			{ value: PAINT_ERASE, radius: 4, points: [20, 20] },
			{ value: PAINT_RESTORE, radius: 2, points: [20, 20] },
		];
		const paint = rasterizeStrokes(40, 40, over);
		expect(paint[20 * 40 + 20]).toBe(PAINT_RESTORE);
		expect(paint[20 * 40 + 23]).toBe(PAINT_ERASE);
	});

	it("undo is the same as replaying without the last stroke", () => {
		expect(rasterizeStrokes(60, 60, strokes.slice(0, 1))[50 * 60 + 50]).toBe(0);
		expect(rasterizeStrokes(60, 60, [])).toEqual(new Uint8Array(60 * 60));
	});

	it("scales points and radius onto a bigger layer", () => {
		const small = rasterizeStrokes(60, 60, strokes);
		const big = rasterizeStrokes(120, 120, strokes, 2);
		// the stroke centre and the restore dot land at double the coordinates
		expect(big[20 * 120 + 40]).toBe(PAINT_ERASE);
		expect(big[100 * 120 + 100]).toBe(PAINT_RESTORE);
		expect(big[80 * 120 + 80]).toBe(0);
		// roughly four times the area at twice the size
		const ratio = count(big, PAINT_ERASE) / count(small, PAINT_ERASE);
		expect(ratio).toBeGreaterThan(3);
		expect(ratio).toBeLessThan(5);
	});

	it("ignores empty strokes", () => {
		const paint = rasterizeStrokes(10, 10, [
			{ value: PAINT_ERASE, radius: 2, points: [] },
		]);
		expect(count(paint, PAINT_ERASE)).toBe(0);
	});
});

describe("touch-up layer in the mask pipeline", () => {
	const w = 20;
	const h = 20;
	const rgba = new Uint8ClampedArray(w * h * 4);
	const mask = new Uint8Array(w * h).fill(255);

	it("erases and restores exactly where painted", () => {
		const paint = new Uint8Array(w * h);
		paint[5 * w + 5] = PAINT_ERASE;
		const half = new Uint8Array(w * h);
		paint[10 * w + 10] = PAINT_RESTORE;

		const erased = applyMask(rgba, mask, w, h, NO_ADJUST, paint);
		expect(erased[4 * (5 * w + 5) + 3]).toBe(0);
		expect(erased[4 * (5 * w + 6) + 3]).toBe(255);

		const restored = applyMask(rgba, half, w, h, NO_ADJUST, paint);
		expect(restored[4 * (10 * w + 10) + 3]).toBe(255);
		expect(restored[4 * (10 * w + 11) + 3]).toBe(0);
	});

	it("is unchanged without a touch-up layer", () => {
		const plain = applyMask(rgba, mask, w, h, NO_ADJUST);
		expect(applyMask(rgba, mask, w, h, NO_ADJUST, null)).toEqual(plain);
		expect(
			applyMask(rgba, mask, w, h, NO_ADJUST, new Uint8Array(w * h)),
		).toEqual(plain);
	});

	it("feathers painted edges", () => {
		const paint = new Uint8Array(100 * 100);
		stampCircle(paint, 100, 100, 50, 50, 20, PAINT_ERASE);
		const big = new Uint8ClampedArray(100 * 100 * 4);
		const full = new Uint8Array(100 * 100).fill(255);
		const out = applyMask(
			big,
			full,
			100,
			100,
			{ ...NO_ADJUST, feather: 100 },
			paint,
		);
		const alphas = Array.from({ length: 100 * 100 }, (_, i) => out[4 * i + 3]);
		expect(alphas.some((a) => a > 0 && a < 255)).toBe(true);
		expect(out[4 * (50 * 100 + 50) + 3]).toBe(0);
	});
});
