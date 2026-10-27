import { Check, Download as DownloadIcon, Loader2, Trash2 } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import * as Slider from "react-compare-slider/components";
import { useReactCompareSlider } from "react-compare-slider/hooks";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
	type Backdrop,
	type Cutout,
	drawComposite,
	exportImage,
	makeCutout,
	TRANSPARENT_BACKDROP,
} from "../assets/script/composite";
import type { InferenceResult } from "../assets/script/inference";
import { renderResult, runModel } from "../assets/script/inference";
import { type MaskAdjust, NO_ADJUST } from "../assets/script/mask";
import BrushOverlay from "./BrushOverlay";
import BackgroundPanel from "./panel/BackgroundPanel";
import CutoutPanel from "./panel/CutoutPanel";
import ExportPanel from "./panel/ExportPanel";
import TouchUpPanel from "./panel/TouchUpPanel";
import { useTouchUp } from "./useTouchUp";

interface PreviewComponentProps {
	originUrl: string;
	originName: string;
	onClick: (type: "delete") => void;
}

const calcCanvasShape: (w: number, h: number) => [number, number] = (w, h) => {
	let canvasWidth: number;
	let canvasHeight: number;
	if (w < h) {
		canvasHeight = Math.floor(Math.min(window.innerHeight * 0.7, h));
		canvasWidth = Math.floor((canvasHeight * w) / h);
	} else {
		canvasWidth = Math.floor(Math.min(window.innerWidth * 0.6, w));
		canvasHeight = Math.floor((canvasWidth * h) / w);
	}
	return [canvasWidth, canvasHeight];
};

const loadImage = (url: string) =>
	new Promise<HTMLImageElement>((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = reject;
		img.src = url;
	});

const saveBlob = (blob: Blob, filename: string) => {
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;

	link.dispatchEvent(
		new MouseEvent("click", {
			bubbles: true,
			cancelable: true,
			view: window,
		}),
	);

	setTimeout(() => {
		link.remove();
		URL.revokeObjectURL(url);
	}, 1000);
};

const Preview: React.FC<PreviewComponentProps> = ({
	originUrl,
	originName,
	onClick,
}) => {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const slider = useReactCompareSlider();
	const sliderRef = useRef(slider);
	const [aspect, setAspect] = useState(1);
	const [status, setStatus] = useState<"processing" | "done" | "error">(
		"processing",
	);
	const [adjust, setAdjust] = useState<MaskAdjust>(NO_ADJUST);
	const [backdrop, setBackdrop] = useState<Backdrop>(TRANSPARENT_BACKDROP);
	const [trim, setTrim] = useState(false);
	const resultRef = useRef<InferenceResult | null>(null);
	const cutoutRef = useRef<Cutout | null>(null);
	const originalRef = useRef<HTMLImageElement | null>(null);
	const renderedAdjustRef = useRef(NO_ADJUST);
	const renderedVersionRef = useRef(-1);
	const originUrlRef = useRef(originUrl);
	const touchUp = useTouchUp();
	const { reset: resetTouchUp, version: paintVersion, paintRef } = touchUp;
	const showRemoved = touchUp.tool !== "off";

	const backdropRef = useRef(backdrop);
	const showRemovedRef = useRef(showRemoved);

	useEffect(() => {
		sliderRef.current = slider;
		backdropRef.current = backdrop;
		showRemovedRef.current = showRemoved;
	});

	const fireTransition = useCallback(async () => {
		await new Promise((resolve) =>
			window.requestAnimationFrame(() => {
				setTimeout(() => {
					sliderRef.current.setPosition(90);
					resolve(true);
				}, 750);
			}),
		);
		await new Promise((resolve) =>
			window.requestAnimationFrame(() => {
				setTimeout(() => {
					sliderRef.current.setPosition(10);
					resolve(true);
				}, 750);
			}),
		);
		await new Promise((resolve) =>
			window.requestAnimationFrame(() => {
				setTimeout(() => {
					sliderRef.current.setPosition(50);
					resolve(true);
				}, 750);
			}),
		);
	}, []);

	// the latest settings unless told otherwise, so async callbacks never paint stale ones
	const paintPreview = useCallback(
		(target = backdropRef.current, removed = showRemovedRef.current) => {
			const canvas = canvasRef.current;
			const cutout = cutoutRef.current;
			const ctx = canvas?.getContext("2d");
			if (!canvas || !ctx || !cutout) return;
			drawComposite(
				ctx,
				canvas.width,
				canvas.height,
				{ cutout, original: originalRef.current, showRemoved: removed },
				target,
			);
		},
		[],
	);

	useEffect(() => {
		originUrlRef.current = originUrl;

		// size the preview canvas and show the original until the cutout is ready
		loadImage(originUrl)
			.then((img) => {
				const canvas = canvasRef.current;
				const ctx = canvas?.getContext("2d");
				if (!canvas || !ctx || originUrlRef.current !== originUrl) return;
				originalRef.current = img;
				const [width, height] = calcCanvasShape(img.width, img.height);
				canvas.width = width;
				canvas.height = height;
				if (width && height) setAspect(width / height);
				if (cutoutRef.current) {
					paintPreview();
				} else {
					ctx.drawImage(img, 0, 0, width, height);
				}
			})
			.catch(console.error);

		runModel(originUrl)
			.then((res) => {
				if (!res || originUrlRef.current !== originUrl) return;
				resultRef.current = res;
				renderedAdjustRef.current = NO_ADJUST;
				cutoutRef.current = makeCutout(
					renderResult(res, NO_ADJUST),
					res.width,
					res.height,
				);
				resetTouchUp(res.width, res.height);
				setStatus("done");
				fireTransition();
			})
			.catch((error) => {
				console.error(error);
				setStatus("error");
				toast.error("Couldn't remove the background", {
					description: "Try a different photo.",
				});
			});
	}, [originUrl, paintPreview, fireTransition, resetTouchUp]);

	// re-apply the cached mask when a slider moves or a stroke is painted,
	// without re-running the model
	useEffect(() => {
		const result = resultRef.current;
		if (
			status !== "done" ||
			!result ||
			(adjust === renderedAdjustRef.current &&
				paintVersion === renderedVersionRef.current)
		) {
			return;
		}
		const frame = requestAnimationFrame(() => {
			cutoutRef.current = makeCutout(
				renderResult(result, adjust, paintRef.current),
				result.width,
				result.height,
			);
			renderedAdjustRef.current = adjust;
			renderedVersionRef.current = paintVersion;
			paintPreview();
		});
		return () => cancelAnimationFrame(frame);
	}, [adjust, paintVersion, paintRef, status, paintPreview]);

	// the cutout is ready, or the backdrop or the removed-area view changed
	useEffect(() => {
		if (status === "done") paintPreview(backdrop, showRemoved);
	}, [backdrop, showRemoved, status, paintPreview]);

	// painting needs the whole cutout in view, not the before/after split
	useEffect(() => {
		if (showRemoved) sliderRef.current.setPosition(0);
	}, [showRemoved]);

	const handleChangeBackdrop = (next: Backdrop) => {
		sliderRef.current.setPosition(0);
		setBackdrop(next);
	};

	const downloadHandledImage = async () => {
		const cutout = cutoutRef.current;
		if (!cutout) return;
		try {
			const blob = await exportImage(
				{ cutout, original: originalRef.current },
				backdrop,
				trim,
			);
			saveBlob(blob, `${originName}_rbg.png`);
			toast.success("Saved!", {
				description: `${originName}_rbg.png`,
			});
		} catch (error) {
			console.error(error);
			toast.error("Couldn't save the image");
		}
	};

	return (
		<div className="grid items-start gap-6 lg:grid-cols-[1fr_20rem]">
			<Card>
				<CardHeader>
					<CardTitle className="truncate">{originName}</CardTitle>
					<CardDescription>
						Drag the slider to see before and after.
					</CardDescription>
					<CardAction>
						{status === "processing" && (
							<Badge variant="secondary">
								<Loader2 className="animate-spin" />
								Working on it
							</Badge>
						)}
						{status === "done" && (
							<Badge>
								<Check />
								Ready
							</Badge>
						)}
						{status === "error" && (
							<Badge variant="destructive">{"Didn't work"}</Badge>
						)}
					</CardAction>
				</CardHeader>
				<CardContent>
					<div
						className="relative mx-auto w-full overflow-hidden rounded-lg border"
						style={{
							aspectRatio: aspect,
							maxWidth: `calc(70vh * ${aspect})`,
						}}
					>
						<Slider.Provider {...slider}>
							<Slider.Root
								style={{
									width: "100%",
									height: "100%",
									overflow: "hidden",
								}}
							>
								<Slider.Item item="itemOne">
									<img
										src={originUrl}
										alt="Original"
										style={{
											width: "100%",
											height: "100%",
										}}
									/>
								</Slider.Item>
								<Slider.Item item="itemTwo">
									<canvas
										ref={canvasRef}
										className="checkerboard"
										style={{
											width: "100%",
											height: "100%",
										}}
									/>
								</Slider.Item>
								<Slider.HandleRoot>
									<Slider.Handle />
								</Slider.HandleRoot>
							</Slider.Root>
						</Slider.Provider>

						{status === "done" && showRemoved && resultRef.current && (
							<BrushOverlay
								width={resultRef.current.width}
								height={resultRef.current.height}
								radius={touchUp.radius()}
								onBegin={touchUp.begin}
								onMove={touchUp.move}
								onEnd={touchUp.end}
							/>
						)}

						{status === "processing" && (
							<div className="absolute inset-0 z-10 flex items-center justify-center">
								<Skeleton className="absolute inset-0 rounded-none" />
								<div className="bg-background/90 relative flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium shadow-sm">
									<Loader2 className="size-4 animate-spin" />
									Removing the background…
								</div>
							</div>
						)}
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Adjust</CardTitle>
					<CardDescription>
						Fine-tune the cutout and pick a backdrop.
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-6">
					<CutoutPanel
						adjust={adjust}
						disabled={status !== "done"}
						onChange={setAdjust}
					/>
					<Separator />
					<TouchUpPanel
						tool={touchUp.tool}
						size={touchUp.size}
						disabled={status !== "done"}
						canUndo={touchUp.canUndo}
						canRedo={touchUp.canRedo}
						onTool={touchUp.setTool}
						onSize={touchUp.setSize}
						onUndo={touchUp.undo}
						onRedo={touchUp.redo}
						onClear={touchUp.clear}
					/>
					<Separator />
					<BackgroundPanel
						backdrop={backdrop}
						onChange={handleChangeBackdrop}
					/>
					<Separator />
					<ExportPanel
						trim={trim}
						disabled={status !== "done"}
						onChangeTrim={setTrim}
					/>
					<Separator />
					<div className="flex flex-col gap-2">
						<Button
							size="lg"
							disabled={status !== "done"}
							onClick={downloadHandledImage}
						>
							<DownloadIcon />
							Download
						</Button>
						<Button
							variant="destructive"
							size="lg"
							onClick={() => onClick("delete")}
						>
							<Trash2 />
							Start over
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
};

export default Preview;
