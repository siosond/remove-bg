import type React from "react";
import { useRef, useState } from "react";

interface BrushOverlayProps {
	/** the image's size, so pointer positions can be mapped onto it */
	width: number;
	height: number;
	/** brush radius in image pixels */
	radius: number;
	onBegin: (x: number, y: number) => void;
	onMove: (x: number, y: number) => void;
	onEnd: () => void;
}

interface Cursor {
	x: number;
	y: number;
	size: number;
}

/**
 * Sits over the preview and turns pointer input into brush strokes. It covers
 * the compare handle on purpose, so painting never drags the divider.
 */
const BrushOverlay: React.FC<BrushOverlayProps> = ({
	width,
	height,
	radius,
	onBegin,
	onMove,
	onEnd,
}) => {
	const ref = useRef<HTMLDivElement>(null);
	const drawing = useRef(false);
	const [cursor, setCursor] = useState<Cursor | null>(null);

	const locate = (event: React.PointerEvent) => {
		const rect = ref.current?.getBoundingClientRect();
		if (!rect?.width) return null;
		const px = event.clientX - rect.left;
		const py = event.clientY - rect.top;
		const scale = width / rect.width;
		return { px, py, x: px * scale, y: py * (height / rect.height), scale };
	};

	const handleDown = (event: React.PointerEvent<HTMLDivElement>) => {
		const at = locate(event);
		if (!at) return;
		event.currentTarget.setPointerCapture(event.pointerId);
		drawing.current = true;
		onBegin(at.x, at.y);
	};

	const handleMove = (event: React.PointerEvent<HTMLDivElement>) => {
		const at = locate(event);
		if (!at) return;
		setCursor({ x: at.px, y: at.py, size: (2 * radius) / at.scale });
		if (drawing.current) onMove(at.x, at.y);
	};

	const handleUp = () => {
		if (!drawing.current) return;
		drawing.current = false;
		onEnd();
	};

	return (
		<div
			ref={ref}
			className="absolute inset-0 z-30 cursor-none touch-none"
			onPointerDown={handleDown}
			onPointerMove={handleMove}
			onPointerUp={handleUp}
			onPointerCancel={handleUp}
			onPointerLeave={() => {
				if (!drawing.current) setCursor(null);
			}}
		>
			{cursor && (
				<div
					className="pointer-events-none absolute rounded-full border-2 border-white shadow-[0_0_0_1px_rgb(0_0_0/0.6)]"
					style={{
						left: cursor.x - cursor.size / 2,
						top: cursor.y - cursor.size / 2,
						width: cursor.size,
						height: cursor.size,
					}}
				/>
			)}
		</div>
	);
};

export default BrushOverlay;
