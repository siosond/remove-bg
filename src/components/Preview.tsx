import { Check, Loader2 } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import * as Slider from "react-compare-slider/components";
import { useReactCompareSlider } from "react-compare-slider/hooks";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	type Backdrop,
	type Cutout,
	drawComposite,
	exportImage,
	makeCutout,
	TRANSPARENT_BACKDROP,
	updateCutoutAlpha,
} from "../assets/script/composite";
import type { InferenceResult } from "../assets/script/inference";
import {
	renderAlpha,
	renderResult,
	runModel,
} from "../assets/script/inference";
import { type MaskAdjust, NO_ADJUST } from "../assets/script/mask";
import {
	makePreviewSource,
	PREVIEW_MAX_SIDE,
	type PreviewSource,
} from "../assets/script/previewSource";
import BrushOverlay from "./BrushOverlay";
import ActionBar from "./panel/ActionBar";
import BackgroundPanel from "./panel/BackgroundPanel";
import CutoutPanel from "./panel/CutoutPanel";
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

// puts every tab body in the same grid cell
const overlap = "col-start-1 row-start-1";

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
	const [saving, setSaving] = useState(false);
	const [tab, setTab] = useState("cutout");
	// the full-size result is only used for the export; everything live runs on
	// a smaller preview copy so big photos stay responsive
	const sourceRef = useRef<InferenceResult | null>(null);
	const previewRef = useRef<PreviewSource | null>(null);
	const cutoutRef = useRef<Cutout | null>(null);
	const originalRef = useRef<HTMLImageElement | null>(null);
	const originUrlRef = useRef(originUrl);
	const frameRef = useRef(0);
	const scheduleRef = useRef<() => void>(() => {});
	const touchUp = useTouchUp(() => scheduleRef.current());
	const { reset: resetTouchUp, paintRef } = touchUp;
	const showRemoved = touchUp.tool !== "off";

	const adjustRef = useRef(adjust);
	const backdropRef = useRef(backdrop);
	const showRemovedRef = useRef(showRemoved);

	useEffect(() => {
		sliderRef.current = slider;
		adjustRef.current = adjust;
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
				{
					cutout,
					original: previewRef.current?.original ?? null,
					showRemoved: removed,
					quality: "low",
				},
				target,
			);
		},
		[],
	);

	// recompute the preview's alpha from the cached mask, with no model run and
	// no allocation beyond the alpha itself
	const renderNow = useCallback(() => {
		const preview = previewRef.current;
		const cutout = cutoutRef.current;
		if (!preview || !cutout) return;
		updateCutoutAlpha(
			cutout,
			renderAlpha(preview, adjustRef.current, paintRef.current),
		);
		paintPreview();
	}, [paintPreview, paintRef]);

	// many strokes or slider moves in one frame cost a single render
	const scheduleRender = useCallback(() => {
		if (frameRef.current) return;
		frameRef.current = requestAnimationFrame(() => {
			frameRef.current = 0;
			renderNow();
		});
	}, [renderNow]);

	useEffect(() => {
		scheduleRef.current = scheduleRender;
		return () => {
			cancelAnimationFrame(frameRef.current);
			frameRef.current = 0;
		};
	}, [scheduleRender]);

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
				// a little more than the canvas shows is plenty to work at
				const shown = Math.max(
					canvasRef.current?.width ?? 0,
					canvasRef.current?.height ?? 0,
				);
				const preview = makePreviewSource(
					res,
					Math.min(Math.max(Math.ceil(shown * 1.5), 640), PREVIEW_MAX_SIDE),
				);
				sourceRef.current = res;
				previewRef.current = preview;
				// renderResult hands back a private copy, which the cutout then edits
				cutoutRef.current = makeCutout(
					renderResult(preview, NO_ADJUST),
					preview.width,
					preview.height,
				);
				resetTouchUp(preview.width, preview.height);
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

	// a slider or toggle moved
	useEffect(() => {
		if (status === "done" && adjust) scheduleRender();
	}, [adjust, status, scheduleRender]);

	// the cutout is ready, or the backdrop or the removed-area view changed
	useEffect(() => {
		if (status === "done") paintPreview(backdrop, showRemoved);
	}, [backdrop, showRemoved, status, paintPreview]);

	// painting needs the whole cutout in view, not the before/after split
	useEffect(() => {
		if (showRemoved) sliderRef.current.setPosition(0);
	}, [showRemoved]);

	// the brush and the removed-area view only belong on the touch-up tab
	const handleTab = (next: string) => {
		setTab(next);
		if (next !== "touchup") touchUp.setTool("off");
	};

	const handleChangeBackdrop = (next: Backdrop) => {
		sliderRef.current.setPosition(0);
		setBackdrop(next);
	};

	const downloadHandledImage = async () => {
		const full = sourceRef.current;
		if (!full || saving) return;
		setSaving(true);
		try {
			// let the button show it's busy before the full-size work starts
			await new Promise((resolve) => setTimeout(resolve, 30));
			const cutout = makeCutout(
				renderResult(
					full,
					adjustRef.current,
					touchUp.exportPaint(full.width, full.height),
				),
				full.width,
				full.height,
			);
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
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="mb-auto grid items-start gap-6 lg:grid-cols-[1fr_20rem]">
			<Card className="lg:sticky lg:top-20">
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

						{status === "done" && showRemoved && previewRef.current && (
							<BrushOverlay
								width={previewRef.current.width}
								height={previewRef.current.height}
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

			<Card className="gap-4 lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6.5rem)]">
				<Tabs value={tab} onValueChange={handleTab} className="min-h-0 flex-1">
					<CardContent>
						<TabsList>
							<TabsTrigger value="cutout">Cutout</TabsTrigger>
							<TabsTrigger value="touchup">Touch up</TabsTrigger>
							<TabsTrigger value="background">Background</TabsTrigger>
						</TabsList>
					</CardContent>
					{/* the tab bodies scroll if the window is short; the actions below never do.
					    All three stay mounted so what you picked survives switching tabs. */}
					<CardContent className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto">
						<TabsContent value="cutout" forceMount className={overlap}>
							<CutoutPanel
								adjust={adjust}
								disabled={status !== "done"}
								onChange={setAdjust}
							/>
						</TabsContent>
						<TabsContent value="touchup" forceMount className={overlap}>
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
						</TabsContent>
						<TabsContent value="background" forceMount className={overlap}>
							<BackgroundPanel
								backdrop={backdrop}
								onChange={handleChangeBackdrop}
							/>
						</TabsContent>
					</CardContent>
				</Tabs>
				<CardContent className="border-t pt-4">
					<ActionBar
						trim={trim}
						ready={status === "done"}
						saving={saving}
						onChangeTrim={setTrim}
						onDownload={downloadHandledImage}
						onStartOver={() => onClick("delete")}
					/>
				</CardContent>
			</Card>
		</div>
	);
};

export default Preview;
