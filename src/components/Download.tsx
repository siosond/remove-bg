import type React from "react";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
	dismissModelFailure,
	getModelStatus,
	subscribeModelStatus,
} from "../assets/script/model";

// The download starts when the first image is processed (see ensureModel in
// model.ts); this only shows how it's going.
const Download: React.FC = () => {
	const status = useSyncExternalStore(subscribeModelStatus, getModelStatus);
	const downloadFailed = status.state === "failed";
	const progress = status.state === "downloading" ? status.progress : 0;

	return (
		<Dialog open={status.state !== "idle"}>
			<DialogContent
				className="sm:max-w-lg"
				showCloseButton={false}
				onEscapeKeyDown={(e) => e.preventDefault()}
				onPointerDownOutside={(e) => e.preventDefault()}
				onInteractOutside={(e) => e.preventDefault()}
			>
				<DialogHeader>
					<DialogTitle>Downloading model</DialogTitle>
					<DialogDescription>
						{downloadFailed ? (
							<span className="text-destructive">
								Download failed. Check your connection, then pick the image
								again.
							</span>
						) : (
							"One-time download, about 5 MB. It's saved in your browser for next time."
						)}
					</DialogDescription>
				</DialogHeader>
				{downloadFailed ? (
					<DialogFooter>
						<Button onClick={dismissModelFailure}>Close</Button>
					</DialogFooter>
				) : (
					<div className="flex flex-col gap-2">
						<Progress value={progress} />
						<span className="text-muted-foreground text-right text-xs">
							{progress}%
						</span>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
};

export default Download;
