import { useCallback, useRef, useState } from "react";
import { PAINT_ERASE, PAINT_RESTORE } from "../assets/script/mask";
import {
	brushRadius,
	rasterizeStrokes,
	type Stroke,
	stampCircle,
	stampSegment,
} from "../assets/script/paint";

export type Tool = "off" | "erase" | "restore";

/**
 * The touch-up layer: what the user has painted in or out of the cutout, plus
 * undo and redo. The layer lives in a ref and `onPaint` is called whenever it
 * changes, so painting never re-renders React per pointer move. Strokes are
 * recorded at the size `reset` was given, which is the preview's size.
 */
export function useTouchUp(onPaint: () => void) {
	const [tool, setTool] = useState<Tool>("off");
	const [size, setSize] = useState(20);
	const [depth, setDepth] = useState({ undo: 0, redo: 0 });
	const paintRef = useRef<Uint8Array | null>(null);
	const dimsRef = useRef({ width: 0, height: 0 });
	const strokesRef = useRef<Stroke[]>([]);
	const redoRef = useRef<Stroke[]>([]);
	const currentRef = useRef<Stroke | null>(null);
	const onPaintRef = useRef(onPaint);
	onPaintRef.current = onPaint;

	const changed = useCallback(() => {
		setDepth({ undo: strokesRef.current.length, redo: redoRef.current.length });
		onPaintRef.current();
	}, []);

	const rebuild = useCallback(() => {
		const { width, height } = dimsRef.current;
		paintRef.current = rasterizeStrokes(width, height, strokesRef.current);
		changed();
	}, [changed]);

	/** The touch-up layer at the size of the full photo, for the export. */
	const exportPaint = (width: number, height: number) =>
		rasterizeStrokes(
			width,
			height,
			strokesRef.current,
			width / (dimsRef.current.width || width),
		);

	/** Starts a blank layer for an image of this size. */
	const reset = useCallback(
		(width: number, height: number) => {
			dimsRef.current = { width, height };
			strokesRef.current = [];
			redoRef.current = [];
			currentRef.current = null;
			rebuild();
		},
		[rebuild],
	);

	const radius = () =>
		brushRadius(size, dimsRef.current.width, dimsRef.current.height);

	const begin = (x: number, y: number) => {
		const paint = paintRef.current;
		if (!paint || tool === "off") return;
		const { width, height } = dimsRef.current;
		const stroke: Stroke = {
			value: tool === "erase" ? PAINT_ERASE : PAINT_RESTORE,
			radius: radius(),
			points: [x, y],
		};
		currentRef.current = stroke;
		redoRef.current = [];
		stampCircle(paint, width, height, x, y, stroke.radius, stroke.value);
		changed();
	};

	const move = (x: number, y: number) => {
		const paint = paintRef.current;
		const stroke = currentRef.current;
		if (!paint || !stroke) return;
		const { width, height } = dimsRef.current;
		const last = stroke.points.length;
		stampSegment(
			paint,
			width,
			height,
			stroke.points[last - 2],
			stroke.points[last - 1],
			x,
			y,
			stroke.radius,
			stroke.value,
		);
		stroke.points.push(x, y);
		onPaintRef.current();
	};

	const end = () => {
		const stroke = currentRef.current;
		if (!stroke) return;
		currentRef.current = null;
		strokesRef.current.push(stroke);
		changed();
	};

	const undo = () => {
		const stroke = strokesRef.current.pop();
		if (!stroke) return;
		redoRef.current.push(stroke);
		rebuild();
	};

	const redo = () => {
		const stroke = redoRef.current.pop();
		if (!stroke) return;
		strokesRef.current.push(stroke);
		rebuild();
	};

	const clear = () => {
		strokesRef.current = [];
		redoRef.current = [];
		rebuild();
	};

	return {
		tool,
		setTool,
		size,
		setSize,
		paintRef,
		canUndo: depth.undo > 0,
		canRedo: depth.redo > 0,
		radius,
		exportPaint,
		reset,
		begin,
		move,
		end,
		undo,
		redo,
		clear,
	};
}
