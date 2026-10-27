import { Eraser, Paintbrush, Redo2, Undo2 } from "lucide-react";
import type React from "react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { Tool } from "../useTouchUp";
import AdjustSlider from "./AdjustSlider";
import Section from "./Section";

interface TouchUpPanelProps {
	tool: Tool;
	size: number;
	disabled: boolean;
	canUndo: boolean;
	canRedo: boolean;
	onTool: (tool: Tool) => void;
	onSize: (size: number) => void;
	onUndo: () => void;
	onRedo: () => void;
	onClear: () => void;
}

const TouchUpPanel: React.FC<TouchUpPanelProps> = ({
	tool,
	size,
	disabled,
	canUndo,
	canRedo,
	onTool,
	onSize,
	onUndo,
	onRedo,
	onClear,
}) => (
	<Section description="Pick a brush, then paint on the photo to fix what the cutout got wrong.">
		<ToggleGroup
			type="single"
			variant="outline"
			spacing={0}
			// a single-select group reports '' when the active item is clicked again
			value={tool === "off" ? "" : tool}
			onValueChange={(value) => onTool(value ? (value as Tool) : "off")}
			disabled={disabled}
			aria-label="Brush"
			className="w-full"
		>
			<ToggleGroupItem value="erase" className="flex-1">
				<Eraser />
				Erase
			</ToggleGroupItem>
			<ToggleGroupItem value="restore" className="flex-1">
				<Paintbrush />
				Restore
			</ToggleGroupItem>
		</ToggleGroup>
		<AdjustSlider
			label="Brush size"
			value={size}
			lowLabel="Small"
			highLabel="Large"
			min={1}
			max={100}
			disabled={disabled || tool === "off"}
			onChange={onSize}
		/>
		<div className="flex gap-2">
			<Button
				variant="outline"
				size="sm"
				disabled={disabled || !canUndo}
				onClick={onUndo}
			>
				<Undo2 />
				Undo
			</Button>
			<Button
				variant="outline"
				size="sm"
				disabled={disabled || !canRedo}
				onClick={onRedo}
			>
				<Redo2 />
				Redo
			</Button>
			<Button
				variant="ghost"
				size="sm"
				className="ml-auto"
				disabled={disabled || !canUndo}
				onClick={onClear}
			>
				Clear
			</Button>
		</div>
	</Section>
);

export default TouchUpPanel;
