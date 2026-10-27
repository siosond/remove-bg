// both adjustments run from MIN_ADJUST (keep more) to MAX_ADJUST (remove more)
export const MIN_ADJUST = -100;
export const MAX_ADJUST = 100;

export const MAX_FEATHER = 100;

export interface MaskAdjust {
	/** how confident the model must be before a pixel is kept */
	cutoff: number;
	/** pixels to grow (negative) or shrink (positive) the cutout by */
	edge: number;
	/** 0 (sharp) to MAX_FEATHER (soft): blurs the edge */
	feather: number;
	/** drop small stray blobs and fill small holes */
	cleanup: boolean;
	/** drop every blob but the biggest one */
	largestOnly: boolean;
}

export const NO_ADJUST: MaskAdjust = {
	cutoff: 0,
	edge: 0,
	feather: 0,
	cleanup: false,
	largestOnly: false,
};

export function isDefaultAdjust(adjust: MaskAdjust) {
	return (
		adjust.cutoff === NO_ADJUST.cutoff &&
		adjust.edge === NO_ADJUST.edge &&
		adjust.feather === NO_ADJUST.feather &&
		adjust.cleanup === NO_ADJUST.cleanup &&
		adjust.largestOnly === NO_ADJUST.largestOnly
	);
}

// how far the mask range is squeezed at the cutoff extremes
const MAX_SHIFT = 0.99;

// the largest edge grow/shrink, as a share of the image's longer side
const MAX_EDGE_SHARE = 0.01;

// the largest feather radius, as a share of the image's longer side
const MAX_FEATHER_SHARE = 0.005;

// blobs and holes below this share of the image count as specks
const SPECK_SHARE = 0.001;

// values in the touch-up layer: untouched, painted back in, painted out
export const PAINT_NONE = 0;
export const PAINT_RESTORE = 1;
export const PAINT_ERASE = 2;

// pixels at or below this alpha don't count as part of the subject when trimming
const VISIBLE_ALPHA = 8;

// connected components are found on a grid no bigger than this
const ANALYSIS_SIZE = 512;

/**
 * Maps a raw mask value (0-255) to an alpha value (0-255).
 *
 * `cutoff` runs from -100 (keep more) to 100 (remove more) and 0 leaves the
 * mask untouched. Values beyond that are clamped.
 */
export function buildAlphaLut(cutoff: number) {
	const amount =
		Math.min(Math.max(cutoff, MIN_ADJUST), MAX_ADJUST) / MAX_ADJUST;
	const low = amount > 0 ? amount * MAX_SHIFT : 0;
	const high = amount < 0 ? 1 + amount * MAX_SHIFT : 1;
	const lut = new Uint8Array(256);
	for (let i = 0; i < 256; i++) {
		const alpha = (i / 255 - low) / (high - low);
		lut[i] = Math.round(Math.min(Math.max(alpha, 0), 1) * 255);
	}
	return lut;
}

/** How many pixels `edge` shrinks or grows the cutout by, for this image size. */
export function edgeRadius(edge: number, width: number, height: number) {
	const amount = Math.min(Math.abs(edge), MAX_ADJUST) / MAX_ADJUST;
	const maxRadius = Math.max(
		2,
		Math.round(Math.max(width, height) * MAX_EDGE_SHARE),
	);
	return Math.round(amount * maxRadius);
}

/**
 * Min (erode) or max (dilate) filter with a square window of `radius` pixels.
 * Runs in O(width * height) whatever the radius (van Herk / Gil-Werman).
 */
export function morphMask(
	mask: Uint8Array,
	width: number,
	height: number,
	radius: number,
	mode: "erode" | "dilate",
) {
	if (radius <= 0) return mask;
	const erode = mode === "erode";
	const pad = erode ? 255 : 0;
	const pick = erode ? Math.min : Math.max;
	const win = 2 * radius + 1;
	const capacity = Math.max(width, height) + 2 * radius;
	const line = new Uint8Array(capacity);
	const prefix = new Uint8Array(capacity);
	const suffix = new Uint8Array(capacity);

	const pass = (
		src: Uint8Array,
		dst: Uint8Array,
		lines: number,
		length: number,
		lineStep: number,
		step: number,
	) => {
		const padded = length + 2 * radius;
		for (let l = 0; l < lines; l++) {
			const base = l * lineStep;
			line.fill(pad, 0, radius);
			for (let i = 0; i < length; i++) {
				line[radius + i] = src[base + i * step];
			}
			line.fill(pad, radius + length, padded);

			for (let j = 0; j < padded; j++) {
				prefix[j] = j % win === 0 ? line[j] : pick(prefix[j - 1], line[j]);
			}
			for (let j = padded - 1; j >= 0; j--) {
				suffix[j] =
					j === padded - 1 || j % win === win - 1
						? line[j]
						: pick(suffix[j + 1], line[j]);
			}
			for (let i = 0; i < length; i++) {
				dst[base + i * step] = pick(suffix[i], prefix[i + win - 1]);
			}
		}
	};

	const tmp = new Uint8Array(mask.length);
	const out = new Uint8Array(mask.length);
	pass(mask, tmp, height, width, width, 1);
	pass(tmp, out, width, height, 1, width);
	return out;
}

/** How many pixels `feather` blurs the edge by, for this image size. */
export function featherRadius(feather: number, width: number, height: number) {
	const amount = Math.min(Math.max(feather, 0), MAX_FEATHER) / MAX_FEATHER;
	const maxRadius = Math.max(
		1,
		Math.round(Math.max(width, height) * MAX_FEATHER_SHARE),
	);
	return Math.round(amount * maxRadius);
}

/**
 * Box blur with a square window of `radius` pixels (edges are clamped).
 * Runs in O(width * height) whatever the radius.
 */
export function boxBlur(
	mask: Uint8Array,
	width: number,
	height: number,
	radius: number,
) {
	if (radius <= 0) return mask;
	const win = 2 * radius + 1;

	const pass = (
		src: Uint8Array,
		dst: Uint8Array,
		lines: number,
		length: number,
		lineStep: number,
		step: number,
	) => {
		const last = length - 1;
		for (let l = 0; l < lines; l++) {
			const base = l * lineStep;
			let sum = 0;
			for (let k = -radius; k <= radius; k++) {
				sum += src[base + Math.min(Math.max(k, 0), last) * step];
			}
			for (let i = 0; i < length; i++) {
				dst[base + i * step] = Math.round(sum / win);
				sum +=
					src[base + Math.min(i + radius + 1, last) * step] -
					src[base + Math.max(i - radius, 0) * step];
			}
		}
	};

	const tmp = new Uint8Array(mask.length);
	const out = new Uint8Array(mask.length);
	pass(mask, tmp, height, width, width, 1);
	pass(tmp, out, width, height, 1, width);
	return out;
}

/** Three box blurs in a row, which come close to a Gaussian blur. */
export function feather(
	mask: Uint8Array,
	width: number,
	height: number,
	radius: number,
) {
	let out = mask;
	for (let i = 0; i < 3 && radius > 0; i++) {
		out = boxBlur(out, width, height, radius);
	}
	return out;
}

/**
 * With `cleanup`, drops small stray blobs and fills small holes in `alpha`
 * (treating 128 and up as solid). With `largestOnly`, drops every blob but the
 * biggest one. Soft edges are left alone everywhere else.
 */
export function cleanMask(
	alpha: Uint8Array,
	width: number,
	height: number,
	{ cleanup, largestOnly }: Pick<MaskAdjust, "cleanup" | "largestOnly">,
) {
	// find the blobs on a coarse grid so this stays cheap on big photos
	const scale = Math.max(1, Math.ceil(Math.max(width, height) / ANALYSIS_SIZE));
	const gridWidth = Math.ceil(width / scale);
	const gridHeight = Math.ceil(height / scale);
	const cells = gridWidth * gridHeight;

	const solid = new Uint8Array(cells);
	for (let y = 0; y < height; y++) {
		const row = Math.floor(y / scale) * gridWidth;
		for (let x = 0; x < width; x++) {
			if (alpha[y * width + x] >= 128) solid[row + Math.floor(x / scale)] = 1;
		}
	}

	const labels = new Int32Array(cells).fill(-1);
	const stack = new Int32Array(cells);
	const sizes: number[] = [];
	const isSolid: boolean[] = [];
	const touchesBorder: boolean[] = [];

	for (let start = 0; start < cells; start++) {
		if (labels[start] !== -1) continue;
		const label = sizes.length;
		const kind = solid[start];
		let size = 0;
		let border = false;
		let top = 0;
		stack[top++] = start;
		labels[start] = label;
		while (top > 0) {
			const cell = stack[--top];
			size++;
			const x = cell % gridWidth;
			const y = (cell - x) / gridWidth;
			if (x === 0 || y === 0 || x === gridWidth - 1 || y === gridHeight - 1) {
				border = true;
			}
			const neighbors = [
				x > 0 ? cell - 1 : -1,
				x < gridWidth - 1 ? cell + 1 : -1,
				y > 0 ? cell - gridWidth : -1,
				y < gridHeight - 1 ? cell + gridWidth : -1,
			];
			for (const next of neighbors) {
				if (next !== -1 && labels[next] === -1 && solid[next] === kind) {
					labels[next] = label;
					stack[top++] = next;
				}
			}
		}
		sizes.push(size);
		isSolid.push(kind === 1);
		touchesBorder.push(border);
	}

	const speck = Math.max(1, Math.round(cells * SPECK_SHARE));
	let largest = -1;
	for (let label = 0; label < sizes.length; label++) {
		if (isSolid[label] && (largest === -1 || sizes[label] > sizes[largest])) {
			largest = label;
		}
	}

	// 0 = leave, 1 = clear, 2 = fill
	const action = new Uint8Array(sizes.length);
	for (let label = 0; label < sizes.length; label++) {
		if (isSolid[label]) {
			if (
				(cleanup && sizes[label] < speck) ||
				(largestOnly && label !== largest)
			) {
				action[label] = 1;
			}
		} else if (cleanup && !touchesBorder[label] && sizes[label] < speck) {
			action[label] = 2;
		}
	}

	const out = new Uint8Array(alpha);
	for (let y = 0; y < height; y++) {
		const row = Math.floor(y / scale) * gridWidth;
		for (let x = 0; x < width; x++) {
			const what = action[labels[row + Math.floor(x / scale)]];
			if (what === 1) out[y * width + x] = 0;
			else if (what === 2) out[y * width + x] = 255;
		}
	}
	return out;
}

/**
 * The box around everything that is visibly opaque, grown by `padding` (a share
 * of the box's longer side) and kept inside the image. Falls back to the whole
 * image when nothing is visible.
 */
export function alphaBounds(
	rgba: Uint8ClampedArray,
	width: number,
	height: number,
	padding = 0,
) {
	let minX = width;
	let minY = height;
	let maxX = -1;
	let maxY = -1;
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			if (rgba[4 * (y * width + x) + 3] > VISIBLE_ALPHA) {
				if (x < minX) minX = x;
				if (x > maxX) maxX = x;
				if (y < minY) minY = y;
				if (y > maxY) maxY = y;
			}
		}
	}
	if (maxX < 0) return { x: 0, y: 0, width, height };

	const pad = Math.round(Math.max(maxX - minX + 1, maxY - minY + 1) * padding);
	const x = Math.max(minX - pad, 0);
	const y = Math.max(minY - pad, 0);
	return {
		x,
		y,
		width: Math.min(maxX + pad + 1, width) - x,
		height: Math.min(maxY + pad + 1, height) - y,
	};
}

/** Everything before the touch-up layer: the cutoff curve, cleanup and edge. */
export function baseAlpha(
	mask: Uint8Array,
	width: number,
	height: number,
	{ cutoff, edge, cleanup, largestOnly }: MaskAdjust,
) {
	const lut = buildAlphaLut(cutoff);
	let alpha: Uint8Array = new Uint8Array(mask.length);
	for (let i = 0; i < mask.length; i++) {
		alpha[i] = lut[mask[i]];
	}
	if (cleanup || largestOnly) {
		alpha = cleanMask(alpha, width, height, { cleanup, largestOnly });
	}
	return morphMask(
		alpha,
		width,
		height,
		edgeRadius(edge, width, height),
		edge > 0 ? "erode" : "dilate",
	);
}

/**
 * Lays the touch-up layer over `base`, feathers the result and returns a copy of
 * `rgba` with it as the alpha channel. Painted pixels are exactly as drawn, so
 * the feather softens their edges too.
 */
export function composeAlpha(
	rgba: Uint8ClampedArray,
	base: Uint8Array,
	paint: Uint8Array | null,
	width: number,
	height: number,
	softness: number,
) {
	let alpha = base;
	if (paint) {
		alpha = new Uint8Array(base);
		for (let i = 0; i < alpha.length; i++) {
			if (paint[i] === PAINT_RESTORE) alpha[i] = 255;
			else if (paint[i] === PAINT_ERASE) alpha[i] = 0;
		}
	}
	alpha = feather(alpha, width, height, featherRadius(softness, width, height));

	const out = new Uint8ClampedArray(rgba);
	for (let i = 0; i < alpha.length; i++) {
		out[4 * i + 3] = alpha[i];
	}
	return out;
}

/** Returns a copy of `rgba` with the alpha channel taken from `mask`. */
export function applyMask(
	rgba: Uint8ClampedArray,
	mask: Uint8Array,
	width: number,
	height: number,
	adjust: MaskAdjust,
	paint: Uint8Array | null = null,
) {
	return composeAlpha(
		rgba,
		baseAlpha(mask, width, height, adjust),
		paint,
		width,
		height,
		adjust.feather,
	);
}
