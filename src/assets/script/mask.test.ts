import { describe, expect, it } from "vitest";
import {
	alphaBounds,
	applyMask,
	boxBlur,
	buildAlphaLut,
	cleanMask,
	composeAlpha,
	composeAlphaOnly,
	downscaleMask,
	edgeRadius,
	feather,
	featherRadius,
	isDefaultAdjust,
	morphMask,
	NO_ADJUST,
	previewSize,
} from "./mask";

/** A width x height mask with a solid rectangle (x0..x1, y0..y1, exclusive). */
function blob(
	width: number,
	height: number,
	[x0, y0, x1, y1]: [number, number, number, number],
	mask = new Uint8Array(width * height),
) {
	for (let y = y0; y < y1; y++) {
		for (let x = x0; x < x1; x++) mask[y * width + x] = 255;
	}
	return mask;
}

const count = (mask: Uint8Array, value = 255) =>
	mask.filter((v) => v === value).length;

describe("buildAlphaLut", () => {
	it("is the identity at cutoff 0", () => {
		const lut = buildAlphaLut(0);
		for (let i = 0; i < 256; i++) {
			expect(lut[i]).toBe(i);
		}
	});

	it("removes more as the cutoff goes up", () => {
		const base = buildAlphaLut(0);
		const strict = buildAlphaLut(50);
		expect(strict[64]).toBeLessThan(base[64]);
		expect(strict[255]).toBe(255);
		expect(buildAlphaLut(100)[20]).toBe(0);
	});

	it("keeps more as the cutoff goes down", () => {
		const base = buildAlphaLut(0);
		const loose = buildAlphaLut(-50);
		expect(loose[128]).toBeGreaterThan(base[128]);
		expect(loose[0]).toBe(0);
		expect(buildAlphaLut(-100)[240]).toBe(255);
	});

	it("clamps out-of-range values", () => {
		expect(buildAlphaLut(150)).toEqual(buildAlphaLut(100));
		expect(buildAlphaLut(-500)).toEqual(buildAlphaLut(-100));
	});
});

describe("edgeRadius", () => {
	it("is 0 when the edge is untouched", () => {
		expect(edgeRadius(0, 800, 600)).toBe(0);
	});

	it("scales with the slider and the image, whichever way it goes", () => {
		expect(edgeRadius(50, 800, 600)).toBe(4);
		expect(edgeRadius(100, 800, 600)).toBe(8);
		expect(edgeRadius(-100, 800, 600)).toBe(8);
		expect(edgeRadius(100, 4000, 3000)).toBe(40);
		expect(edgeRadius(100, 100, 100)).toBe(2);
	});

	it("clamps out-of-range values", () => {
		expect(edgeRadius(500, 800, 600)).toBe(8);
	});
});

function naiveMorph(
	mask: Uint8Array,
	width: number,
	height: number,
	radius: number,
	mode: "erode" | "dilate",
) {
	const out = new Uint8Array(mask.length);
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			let value = mode === "erode" ? 255 : 0;
			for (let dy = -radius; dy <= radius; dy++) {
				for (let dx = -radius; dx <= radius; dx++) {
					const yy = y + dy;
					const xx = x + dx;
					if (yy < 0 || yy >= height || xx < 0 || xx >= width) continue;
					const v = mask[yy * width + xx];
					value = mode === "erode" ? Math.min(value, v) : Math.max(value, v);
				}
			}
			out[y * width + x] = value;
		}
	}
	return out;
}

describe("morphMask", () => {
	const width = 13;
	const height = 9;
	let seed = 1;
	const mask = Uint8Array.from({ length: width * height }, () => {
		seed = (seed * 1103515245 + 12345) % 2147483648;
		return seed % 256;
	});

	it("returns the input at radius 0", () => {
		expect(morphMask(mask, width, height, 0, "erode")).toBe(mask);
	});

	it.each([1, 2, 3, 5, 20])("matches a naive filter at radius %i", (radius) => {
		for (const mode of ["erode", "dilate"] as const) {
			expect(morphMask(mask, width, height, radius, mode)).toEqual(
				naiveMorph(mask, width, height, radius, mode),
			);
		}
	});

	it("shrinks and grows a block", () => {
		const block = new Uint8Array(7 * 7);
		for (let y = 2; y < 5; y++) {
			for (let x = 2; x < 5; x++) block[y * 7 + x] = 255;
		}
		const count = (m: Uint8Array) => m.filter((v) => v === 255).length;
		expect(count(morphMask(block, 7, 7, 1, "erode"))).toBe(1);
		expect(count(morphMask(block, 7, 7, 1, "dilate"))).toBe(25);
	});
});

describe("applyMask", () => {
	const rgba = new Uint8ClampedArray([10, 20, 30, 255, 40, 50, 60, 255]);
	const mask = new Uint8Array([0, 200]);

	it("writes the mask into the alpha channel only", () => {
		const out = applyMask(rgba, mask, 2, 1, NO_ADJUST);
		expect(Array.from(out)).toEqual([10, 20, 30, 0, 40, 50, 60, 200]);
	});

	it("does not mutate the input", () => {
		applyMask(rgba, mask, 2, 1, { ...NO_ADJUST, cutoff: 50, edge: 50 });
		expect(Array.from(rgba)).toEqual([10, 20, 30, 255, 40, 50, 60, 255]);
	});

	it("applies the cutoff", () => {
		const out = applyMask(rgba, mask, 2, 1, { ...NO_ADJUST, cutoff: 100 });
		expect(out[7]).toBeLessThan(200);
	});

	it("shrinks and grows the edge", () => {
		const w = 20;
		const h = 20;
		const px = new Uint8ClampedArray(w * h * 4);
		const half = new Uint8Array(w * h);
		for (let y = 0; y < h; y++) {
			for (let x = 10; x < w; x++) half[y * w + x] = 255;
		}
		const opaque = (a: Uint8ClampedArray) =>
			a.filter((_, i) => i % 4 === 3 && a[i] === 255).length;
		const base = opaque(applyMask(px, half, w, h, NO_ADJUST));
		const shrunk = applyMask(px, half, w, h, { ...NO_ADJUST, edge: 100 });
		const grown = applyMask(px, half, w, h, { ...NO_ADJUST, edge: -100 });
		expect(opaque(shrunk)).toBeLessThan(base);
		expect(opaque(grown)).toBeGreaterThan(base);
	});
});

describe("featherRadius", () => {
	it("is 0 when feather is off and scales with the image", () => {
		expect(featherRadius(0, 800, 600)).toBe(0);
		expect(featherRadius(100, 800, 600)).toBe(4);
		expect(featherRadius(50, 800, 600)).toBe(2);
		expect(featherRadius(100, 100, 100)).toBe(1);
		expect(featherRadius(500, 800, 600)).toBe(4);
	});
});

function naiveBlur(
	mask: Uint8Array,
	width: number,
	height: number,
	radius: number,
) {
	const horizontal = new Float64Array(mask.length);
	const out = new Uint8Array(mask.length);
	const win = 2 * radius + 1;
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			let sum = 0;
			for (let k = -radius; k <= radius; k++) {
				sum += mask[y * width + Math.min(Math.max(x + k, 0), width - 1)];
			}
			horizontal[y * width + x] = Math.round(sum / win);
		}
	}
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			let sum = 0;
			for (let k = -radius; k <= radius; k++) {
				sum += horizontal[Math.min(Math.max(y + k, 0), height - 1) * width + x];
			}
			out[y * width + x] = Math.round(sum / win);
		}
	}
	return out;
}

describe("boxBlur and feather", () => {
	const width = 13;
	const height = 9;
	let seed = 7;
	const mask = Uint8Array.from({ length: width * height }, () => {
		seed = (seed * 1103515245 + 12345) % 2147483648;
		return seed % 256;
	});

	it("return the input at radius 0", () => {
		expect(boxBlur(mask, width, height, 0)).toBe(mask);
		expect(feather(mask, width, height, 0)).toBe(mask);
	});

	it.each([1, 2, 4, 20])("boxBlur matches a naive blur at radius %i", (r) => {
		expect(boxBlur(mask, width, height, r)).toEqual(
			naiveBlur(mask, width, height, r),
		);
	});

	it("feather softens a hard edge but keeps a flat area flat", () => {
		const half = blob(20, 20, [10, 0, 20, 20]);
		const soft = feather(half, 20, 20, 2);
		expect(count(soft, 0)).toBeLessThan(count(half, 0));
		expect(soft[10 * 20 + 2]).toBe(0);
		expect(soft[10 * 20 + 18]).toBe(255);
		const partial = soft.filter((v) => v > 0 && v < 255).length;
		expect(partial).toBeGreaterThan(0);
		const flat = new Uint8Array(100).fill(180);
		expect(feather(flat, 10, 10, 3)).toEqual(flat);
	});
});

describe("cleanMask", () => {
	const off = { cleanup: false, largestOnly: false };

	it("changes nothing when both options are off", () => {
		const mask = blob(40, 40, [5, 5, 9, 9], blob(40, 40, [20, 20, 35, 35]));
		expect(cleanMask(mask, 40, 40, off)).toEqual(mask);
	});

	it("removes a speck but keeps a big blob", () => {
		// specks are under 0.1% of the image, which is a single pixel at 40x40
		const mask = blob(40, 40, [3, 3, 4, 4], blob(40, 40, [15, 15, 35, 35]));
		const out = cleanMask(mask, 40, 40, { cleanup: true, largestOnly: false });
		expect(out[3 * 40 + 3]).toBe(0);
		expect(out[20 * 40 + 20]).toBe(255);
		expect(count(out)).toBe(400);
	});

	it("fills a small hole but not one touching the border", () => {
		const solid = blob(40, 40, [0, 0, 40, 40]);
		solid[20 * 40 + 20] = 0;
		solid[0] = 0;
		const out = cleanMask(solid, 40, 40, { cleanup: true, largestOnly: false });
		expect(out[20 * 40 + 20]).toBe(255);
		expect(out[0]).toBe(0);
	});

	it("keeps big holes", () => {
		const solid = blob(40, 40, [0, 0, 40, 40]);
		for (let y = 10; y < 30; y++) {
			for (let x = 10; x < 30; x++) solid[y * 40 + x] = 0;
		}
		const out = cleanMask(solid, 40, 40, { cleanup: true, largestOnly: false });
		expect(out[20 * 40 + 20]).toBe(0);
	});

	it("keeps only the largest blob with largestOnly", () => {
		const mask = blob(40, 40, [2, 2, 12, 12], blob(40, 40, [20, 20, 38, 38]));
		const out = cleanMask(mask, 40, 40, { cleanup: false, largestOnly: true });
		expect(out[5 * 40 + 5]).toBe(0);
		expect(out[25 * 40 + 25]).toBe(255);
	});

	it("leaves soft edge pixels of kept blobs alone", () => {
		const mask = blob(40, 40, [10, 10, 30, 30]);
		mask[10 * 40 + 9] = 100;
		const out = cleanMask(mask, 40, 40, { cleanup: true, largestOnly: true });
		expect(out[10 * 40 + 9]).toBe(100);
	});

	it("works on images bigger than the analysis grid", () => {
		const width = 1100;
		const height = 800;
		const mask = blob(
			width,
			height,
			[10, 10, 14, 14],
			blob(width, height, [300, 200, 900, 700]),
		);
		const out = cleanMask(mask, width, height, {
			cleanup: true,
			largestOnly: false,
		});
		expect(out[11 * width + 11]).toBe(0);
		expect(out[400 * width + 500]).toBe(255);
	});
});

describe("applyMask pipeline", () => {
	it("is not default once anything changes", () => {
		expect(isDefaultAdjust(NO_ADJUST)).toBe(true);
		expect(isDefaultAdjust({ ...NO_ADJUST, feather: 1 })).toBe(false);
		expect(isDefaultAdjust({ ...NO_ADJUST, cleanup: true })).toBe(false);
		expect(isDefaultAdjust({ ...NO_ADJUST, largestOnly: true })).toBe(false);
	});

	it("feathers the alpha without touching colour", () => {
		const w = 100;
		const h = 100;
		const px = new Uint8ClampedArray(w * h * 4).fill(77);
		const half = blob(w, h, [50, 0, 100, 100]);
		const out = applyMask(px, half, w, h, { ...NO_ADJUST, feather: 100 });
		const alphas = Array.from({ length: w * h }, (_, i) => out[4 * i + 3]);
		expect(alphas.some((a) => a > 0 && a < 255)).toBe(true);
		expect(out[0]).toBe(77);
	});

	it("removes specks through the full pipeline", () => {
		const w = 100;
		const h = 100;
		const px = new Uint8ClampedArray(w * h * 4);
		const mask = blob(w, h, [2, 2, 4, 4], blob(w, h, [30, 30, 90, 90]));
		const out = applyMask(px, mask, w, h, { ...NO_ADJUST, cleanup: true });
		expect(out[4 * (3 * w + 3) + 3]).toBe(0);
		expect(out[4 * (60 * w + 60) + 3]).toBe(255);
	});
});

describe("alphaBounds", () => {
	const w = 20;
	const h = 10;
	const rgba = new Uint8ClampedArray(w * h * 4);
	const paint = (x0: number, y0: number, x1: number, y1: number, a = 255) => {
		for (let y = y0; y < y1; y++) {
			for (let x = x0; x < x1; x++) rgba[4 * (y * w + x) + 3] = a;
		}
	};

	it("falls back to the whole image when nothing is visible", () => {
		expect(alphaBounds(rgba, w, h)).toEqual({
			x: 0,
			y: 0,
			width: w,
			height: h,
		});
	});

	it("boxes the visible pixels", () => {
		paint(5, 2, 9, 6);
		expect(alphaBounds(rgba, w, h)).toEqual({
			x: 5,
			y: 2,
			width: 4,
			height: 4,
		});
	});

	it("ignores nearly transparent pixels", () => {
		paint(0, 0, 3, 3, 8);
		expect(alphaBounds(rgba, w, h).x).toBe(5);
	});

	it("pads by a share of the longer side and stays inside the image", () => {
		expect(alphaBounds(rgba, w, h, 0.5)).toEqual({
			x: 3,
			y: 0,
			width: 8,
			height: 8,
		});
		expect(alphaBounds(rgba, w, h, 10)).toEqual({
			x: 0,
			y: 0,
			width: w,
			height: h,
		});
	});
});

describe("previewSize", () => {
	it("leaves small images alone", () => {
		expect(previewSize(800, 600, 1280)).toEqual({ width: 800, height: 600 });
		expect(previewSize(1280, 720, 1280)).toEqual({ width: 1280, height: 720 });
	});

	it("shrinks the longer side to the limit and keeps the shape", () => {
		expect(previewSize(4000, 3000, 1280)).toEqual({ width: 1280, height: 960 });
		expect(previewSize(3000, 4000, 1280)).toEqual({ width: 960, height: 1280 });
	});

	it("never goes below one pixel", () => {
		expect(previewSize(10000, 1, 100)).toEqual({ width: 100, height: 1 });
	});
});

describe("downscaleMask", () => {
	it("returns the input at the same size", () => {
		const mask = Uint8Array.from([1, 2, 3, 4]);
		expect(downscaleMask(mask, 2, 2, 2, 2)).toBe(mask);
	});

	it("keeps a flat mask flat", () => {
		const flat = new Uint8Array(40 * 30).fill(200);
		const out = downscaleMask(flat, 40, 30, 10, 8);
		expect(out.length).toBe(80);
		expect(out.every((v) => v === 200)).toBe(true);
	});

	it("keeps the layout of a half-and-half mask", () => {
		// the edge sits between two of the sample points, so one is blended
		const half = blob(40, 40, [18, 0, 40, 40]);
		const out = downscaleMask(half, 40, 40, 10, 10);
		expect(out[5 * 10 + 1]).toBe(0);
		expect(out[5 * 10 + 8]).toBe(255);
		expect(out.some((v) => v > 0 && v < 255)).toBe(true);
	});

	it("keeps a gradient in order", () => {
		const ramp = Uint8Array.from({ length: 64 * 4 }, (_, i) => (i % 64) * 4);
		const out = downscaleMask(ramp, 64, 4, 16, 1);
		for (let x = 1; x < 16; x++)
			expect(out[x]).toBeGreaterThanOrEqual(out[x - 1]);
		expect(out[0]).toBeLessThan(20);
		expect(out[15]).toBeGreaterThan(230);
	});
});

describe("composeAlphaOnly", () => {
	it("matches the alpha channel of composeAlpha", () => {
		const w = 30;
		const h = 20;
		const base = blob(w, h, [5, 5, 25, 15]);
		const paint = new Uint8Array(w * h);
		paint[10 * w + 10] = 2;
		paint[2 * w + 2] = 1;
		const rgba = new Uint8ClampedArray(w * h * 4).fill(9);
		for (const softness of [0, 60]) {
			const alpha = composeAlphaOnly(base, paint, w, h, softness);
			const full = composeAlpha(rgba, base, paint, w, h, softness);
			for (let i = 0; i < w * h; i++) expect(full[4 * i + 3]).toBe(alpha[i]);
		}
	});

	it("does not change its inputs", () => {
		const base = blob(10, 10, [2, 2, 8, 8]);
		const copy = new Uint8Array(base);
		const paint = new Uint8Array(100).fill(2);
		composeAlphaOnly(base, paint, 10, 10, 50);
		expect(base).toEqual(copy);
	});
});
