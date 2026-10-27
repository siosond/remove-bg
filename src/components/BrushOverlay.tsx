import type React from "react";
import { useRef } from "react";

interface BrushOverlayProps {
	/** the size strokes are recorded at, so pointer positions can be mapped onto it */
	width: number;
	height: number;
	/** brush radius in those pixels */
	radius: number;
	onBegin: (x: number, y: number) => void;
	onMove: (x: number, y: number) => void;
	onEnd: () => void;
}

/**
 * Sits over the preview and turns pointer input into brush strokes. It covers
 * the compare handle on purpose, so painting never drags the divider.
 *
 * The cursor ring is moved through a ref rather than state, so a pointer move
 * costs no React render.
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
	const ringRef = useRef<HTMLDivElement>(null);
	const drawing = useRef(false);

	const locate = (event: React.PointerEvent) => {
		const rect = ref.current?.getBoundingClientRect();
		if (!rect?.width) return null;
		const px = event.clientX - rect.left;
		const py = event.clientY - rect.top;
		const scale = width / rect.width;
		return { px, py, x: px * scale, y: py * (height / rect.height), scale };
	};

	const placeRing = (px: number, py: number, scale: number) => {
		const ring = ringRef.current;
		if (!ring) return;
		const size = (2 * radius) / scale;
		ring.style.display = "block";
		ring.style.width = `${size}px`;
		ring.style.height = `${size}px`;
		ring.style.transform = `translate(${px - size / 2}px, ${py - size / 2}px)`;
	};

	const handleDown = (event: React.PointerEvent<HTMLDivElement>) => {
		const at = locate(event);
		if (!at) return;
		event.currentTarget.setPointerCapture(event.pointerId);
		drawing.current = true;
		placeRing(at.px, at.py, at.scale);
		onBegin(at.x, at.y);
	};

	const handleMove = (event: React.PointerEvent<HTMLDivElement>) => {
		const at = locate(event);
		if (!at) return;
		placeRing(at.px, at.py, at.scale);
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
				if (!drawing.current && ringRef.current) {
					ringRef.current.style.display = "none";
				}
			}}
		>
			<div
				ref={ringRef}
				className="pointer-events-none absolute top-0 left-0 hidden rounded-full border-2 border-white shadow-[0_0_0_1px_rgb(0_0_0/0.6)]"
			/>
		</div>
	);
};

export default BrushOverlay;
