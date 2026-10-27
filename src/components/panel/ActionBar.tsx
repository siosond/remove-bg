import { Download as DownloadIcon, Loader2, Trash2 } from "lucide-react";
import type React from "react";
import { Button } from "@/components/ui/button";
import ToggleRow from "./ToggleRow";

interface ActionBarProps {
	trim: boolean;
	ready: boolean;
	saving: boolean;
	onChangeTrim: (trim: boolean) => void;
	onDownload: () => void;
	onStartOver: () => void;
}

/** What you do when you're done: always visible under the tabs. */
const ActionBar: React.FC<ActionBarProps> = ({
	trim,
	ready,
	saving,
	onChangeTrim,
	onDownload,
	onStartOver,
}) => (
	<div className="flex flex-col gap-3">
		<ToggleRow
			id="trim"
			label="Trim empty space"
			checked={trim}
			disabled={!ready}
			onChange={onChangeTrim}
		/>
		<div className="flex flex-col gap-2">
			<Button size="lg" disabled={!ready || saving} onClick={onDownload}>
				{saving ? <Loader2 className="animate-spin" /> : <DownloadIcon />}
				Download
			</Button>
			<Button variant="destructive" size="lg" onClick={onStartOver}>
				<Trash2 />
				Start over
			</Button>
		</div>
	</div>
);

export default ActionBar;
