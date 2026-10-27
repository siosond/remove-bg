// the biggest brush radius, as a share of the image's longer side
const MAX_BRUSH_SHARE = 0.1;

export interface Stroke {
	/** PAINT_ERASE or PAINT_RESTORE */
	value: number;
	/** in image pixels */
	radius: number;
	/** x, y pairs in image pixels */
	points: number[];
}

/** The brush radius in image pixels for a size from 1 to 100. */
export function brushRadius(size: number, width: number, height: number) {
	const amount = Math.min(Math.max(size, 1), 100) / 100;
	return Math.max(
		1,
		Math.round(amount * MAX_BRUSH_SHARE * Math.max(width, height)),
	);
}

export function stampCircle(
	paint: Uint8Array,
	width: number,
	height: number,
	cx: number,
	cy: number,
	radius: number,
	value: number,
) {
	const top = Math.max(Math.floor(cy - radius), 0);
	const bottom = Math.min(Math.ceil(cy + radius), height - 1);
	const left = Math.max(Math.floor(cx - radius), 0);
	const right = Math.min(Math.ceil(cx + radius), width - 1);
	const limit = radius * radius;
	for (let y = top; y <= bottom; y++) {
		for (let x = left; x <= right; x++) {
			const dx = x - cx;
			const dy = y - cy;
			if (dx * dx + dy * dy <= limit) paint[y * width + x] = value;
		}
	}
}

/** Stamps circles along the line so a fast stroke leaves no gaps. */
export function stampSegment(
	paint: Uint8Array,
	width: number,
	height: number,
	x0: number,
	y0: number,
	x1: number,
	y1: number,
	radius: number,
	value: number,
) {
	const distance = Math.hypot(x1 - x0, y1 - y0);
	const steps = Math.max(1, Math.ceil(distance / Math.max(1, radius / 2)));
	for (let step = 1; step <= steps; step++) {
		const t = step / steps;
		stampCircle(
			paint,
			width,
			height,
			x0 + (x1 - x0) * t,
			y0 + (y1 - y0) * t,
			radius,
			value,
		);
	}
}

/** Replays `strokes` in order onto a fresh touch-up layer. */
export function rasterizeStrokes(
	width: number,
	height: number,
	strokes: Stroke[],
) {
	const paint = new Uint8Array(width * height);
	for (const { value, radius, points } of strokes) {
		if (points.length < 2) continue;
		stampCircle(paint, width, height, points[0], points[1], radius, value);
		for (let i = 2; i < points.length; i += 2) {
			stampSegment(
				paint,
				width,
				height,
				points[i - 2],
				points[i - 1],
				points[i],
				points[i + 1],
				radius,
				value,
			);
		}
	}
	return paint;
}
