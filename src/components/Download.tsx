import type React from "react";
import { useEffect, useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { MODEL_SIZE, MODEL_URL } from "../assets/script/config";
import { getModel, setModel } from "../assets/script/model";
import { downloadFile } from "../assets/script/utils";

const Download: React.FC = () => {
	const [isOpen, setIsOpen] = useState(false);
	const [progress, setProgress] = useState(0);
	const [downloadFailed, setDownloadFailed] = useState(false);

	useEffect(() => {
		async function setModelData() {
			const modelBuffer: ArrayBuffer | null = await getModel();
			if (!modelBuffer) {
				setIsOpen(true);
				downloadFile({
					url: MODEL_URL,
					fallbackSize: MODEL_SIZE,
					progress: (loaded, total) => {
						const res = Math.min(100, Math.round((loaded / total) * 100));
						setProgress(res);
					},
					finalCb: (flag, data) => {
						if (flag === true) {
							console.log("download model successfully");
							setModel(data as ArrayBuffer);
							setIsOpen(false);
						} else {
							// download failed
							setDownloadFailed(true);
						}
					},
				});
			}
		}
		setModelData();
	}, []);

	return (
		<Dialog open={isOpen}>
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
								Download failed. Check your connection and reload the page.
							</span>
						) : (
							"One-time download, about 5 MB. It's saved in your browser for next time."
						)}
					</DialogDescription>
				</DialogHeader>
				<div className="flex flex-col gap-2">
					<Progress value={progress} />
					<span className="text-muted-foreground text-right text-xs">
						{progress}%
					</span>
				</div>
			</DialogContent>
		</Dialog>
	);
};

export default Download;
