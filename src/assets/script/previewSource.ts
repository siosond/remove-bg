import { makeCutout } from "./composite";
import type { CanvasType, InferenceResult } from "./inference";
import { createCanvas } from "./inference";
import { downscaleMask, previewSize } from "./mask";

// the longest side the live preview works at, however big the photo is
export const PREVIEW_MAX_SIDE = 1280;

export interface PreviewSource extends InferenceResult {
	/** the (downscaled) photo on a canvas, for the blurred and removed-area views */
	original: CanvasType;
}

/**
 * A smaller copy of the photo and its mask for the live preview, so dragging a
 * slider or painting a stroke doesn't have to touch every pixel of a big photo.
 * The export is still made from the full-size result.
 */
export function makePreviewSource(
	result: InferenceResult,
	maxSide = PREVIEW_MAX_SIDE,
): PreviewSource {
	const { width, height } = previewSize(result.width, result.height, maxSide);
	if (width === result.width && height === result.height) {
		return {
			...result,
			original: makeCutout(result.rgba, width, height).canvas,
		};
	}

	const full = makeCutout(result.rgba, result.width, result.height).canvas;
	const original = createCanvas(width, height);
	const ctx = original.getContext("2d") as
		| CanvasRenderingContext2D
		| OffscreenCanvasRenderingContext2D;
	ctx.imageSmoothingQuality = "high";
	ctx.drawImage(full, 0, 0, width, height);
	return {
		width,
		height,
		rgba: ctx.getImageData(0, 0, width, height).data,
		mask: downscaleMask(
			result.mask,
			result.width,
			result.height,
			width,
			height,
		),
		original,
	};
}
