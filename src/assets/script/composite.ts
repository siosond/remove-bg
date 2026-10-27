import type { CanvasType } from "./inference";
import { canvasToBlob, createCanvas } from "./inference";
import { alphaBounds } from "./mask";

export type Backdrop =
	| { kind: "transparent" }
	| { kind: "color"; color: string }
	| { kind: "blur"; amount: number };

export const TRANSPARENT_BACKDROP: Backdrop = { kind: "transparent" };

export const MAX_BLUR = 100;

// the strongest background blur, as a share of the image's longer side
const MAX_BLUR_SHARE = 0.03;

// how far a trimmed export extends past the subject, as a share of its size
const TRIM_PADDING = 0.04;

type Context2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export interface Cutout {
	width: number;
	height: number;
	/** the source pixels with the mask as their alpha */
	rgba: Uint8ClampedArray;
	/** the same pixels on a canvas, so they can be drawn at any size */
	canvas: CanvasType;
}

export interface Scene {
	cutout: Cutout;
	/** the untouched photo, needed for a blurred backdrop */
	original: CanvasImageSource | null;
	/** preview only: ghost in what was cut out, tinted red */
	showRemoved?: boolean;
}

export function makeCutout(
	rgba: Uint8ClampedArray,
	width: number,
	height: number,
): Cutout {
	const canvas = createCanvas(width, height);
	const ctx = canvas.getContext("2d") as Context2D;
	ctx.putImageData(
		new ImageData(rgba as Uint8ClampedArray<ArrayBuffer>, width, height),
		0,
		0,
	);
	return { width, height, rgba, canvas };
}

function drawBlurred(
	ctx: Context2D,
	width: number,
	height: number,
	original: CanvasImageSource,
	amount: number,
) {
	const radius =
		(Math.min(Math.max(amount, 0), MAX_BLUR) / MAX_BLUR) *
		MAX_BLUR_SHARE *
		Math.max(width, height);
	if (radius < 0.5) {
		ctx.drawImage(original, 0, 0, width, height);
		return;
	}
	// older Safari has no canvas filters, so the property is missing there
	if (typeof (ctx as { filter?: unknown }).filter === "string") {
		// draw a little past the edges so the blur doesn't fade out at the border
		const bleed = radius * 2;
		ctx.save();
		ctx.filter = `blur(${radius}px)`;
		ctx.drawImage(
			original,
			-bleed,
			-bleed,
			width + 2 * bleed,
			height + 2 * bleed,
		);
		ctx.restore();
		return;
	}
	// no canvas filters here (older Safari): blur by scaling down and back up
	const small = createCanvas(
		Math.max(1, Math.round(width / radius)),
		Math.max(1, Math.round(height / radius)),
	);
	const smallCtx = small.getContext("2d") as Context2D;
	smallCtx.imageSmoothingQuality = "high";
	smallCtx.drawImage(original, 0, 0, small.width, small.height);
	ctx.imageSmoothingQuality = "high";
	ctx.drawImage(small, 0, 0, width, height);
}

/**
 * Draws the backdrop and the cutout onto `ctx`, scaled to `width` x `height`.
 * The preview and the download both go through here, so they always match.
 */
export function drawComposite(
	ctx: Context2D,
	width: number,
	height: number,
	{ cutout, original, showRemoved }: Scene,
	backdrop: Backdrop,
) {
	ctx.clearRect(0, 0, width, height);
	if (backdrop.kind === "color") {
		ctx.fillStyle = backdrop.color;
		ctx.fillRect(0, 0, width, height);
	} else if (backdrop.kind === "blur" && original) {
		drawBlurred(ctx, width, height, original, backdrop.amount);
	}
	ctx.imageSmoothingQuality = "high";
	if (showRemoved && original) {
		// red wherever the cutout isn't, over a faint copy of the photo
		const tint = createCanvas(width, height);
		const tintCtx = tint.getContext("2d") as Context2D;
		tintCtx.fillStyle = "rgba(239, 68, 68, 0.55)";
		tintCtx.fillRect(0, 0, width, height);
		tintCtx.globalCompositeOperation = "destination-out";
		tintCtx.drawImage(cutout.canvas, 0, 0, width, height);

		ctx.globalAlpha = 0.45;
		ctx.drawImage(original, 0, 0, width, height);
		ctx.globalAlpha = 1;
		ctx.drawImage(tint, 0, 0);
	}
	ctx.drawImage(cutout.canvas, 0, 0, width, height);
}

/** Renders the finished image at full size and encodes it as a PNG. */
export function exportImage(scene: Scene, backdrop: Backdrop, trim: boolean) {
	const { width, height, rgba } = scene.cutout;
	const full = createCanvas(width, height);
	drawComposite(
		full.getContext("2d") as Context2D,
		width,
		height,
		scene,
		backdrop,
	);

	let output = full;
	if (trim) {
		const box = alphaBounds(rgba, width, height, TRIM_PADDING);
		output = createCanvas(box.width, box.height);
		(output.getContext("2d") as Context2D).drawImage(
			full,
			box.x,
			box.y,
			box.width,
			box.height,
			0,
			0,
			box.width,
			box.height,
		);
	}
	return canvasToBlob(output, { quality: 0.8, type: "image/png" });
}

export function backdropFromColor(color: string): Backdrop {
	return color === "transparent"
		? TRANSPARENT_BACKDROP
		: { kind: "color", color };
}
