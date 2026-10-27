import { useThrottleFn } from "@reactuses/core";
import { Ban } from "lucide-react";
import type React from "react";
import { useRef, useState } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

interface BackgroundComponentProps {
	onChangeBg: (backgroundColor: string) => void;
}

const CUSTOM = "custom";

const colorArr = [
	"#000000",
	"#ffffff",

	"#e91e63",
	"#9c27b0",
	"#673ab7",
	"#3f51b5",

	"#2196f3",
	"#03a9f4",
	"#00bcd4",
	"#009688",

	"#4caf50",
	"#8bc34a",
	"#cddc39",
	"#ffeb3b",
];

const swatchClass =
	"aspect-square h-auto w-full min-w-0 rounded-full border p-0 ring-offset-background data-[state=on]:ring-2 data-[state=on]:ring-ring data-[state=on]:ring-offset-2";

const Background: React.FC<BackgroundComponentProps> = ({ onChangeBg }) => {
	const [selected, setSelected] = useState("transparent");
	const [customColor, setCustomColor] = useState("#3f51b5");
	const colorInputRef = useRef<HTMLInputElement>(null);

	const { run: applyCustomColor } = useThrottleFn((value: string) => {
		onChangeBg(value);
	}, 300);

	const handleSelect = (value: string) => {
		// a single-select group reports '' when the active item is clicked again
		if (!value) return;
		setSelected(value);
		onChangeBg(value === CUSTOM ? customColor : value);
	};

	const openColorPicker = () => {
		const input = colorInputRef.current;
		if (!input) return;
		if (typeof input.showPicker === "function") {
			input.showPicker();
		} else {
			input.click();
		}
	};

	const handleCustomChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		setCustomColor(event.target.value);
		setSelected(CUSTOM);
		applyCustomColor(event.target.value);
	};

	return (
		<ToggleGroup
			type="single"
			value={selected}
			onValueChange={handleSelect}
			aria-label="Background color"
			className="grid w-full grid-cols-8 gap-2"
		>
			<ToggleGroupItem
				value="transparent"
				aria-label="Transparent"
				className={cn(swatchClass, "checkerboard")}
			>
				<Ban className="text-muted-foreground size-4" />
			</ToggleGroupItem>

			<span className="relative block">
				<ToggleGroupItem
					value={CUSTOM}
					aria-label="Custom color"
					className={swatchClass}
					style={{
						background:
							selected === CUSTOM
								? customColor
								: "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)",
					}}
					// onClick (not onValueChange) so clicking the active swatch reopens it
					onClick={openColorPicker}
				/>
				{/* hidden native input laid over the swatch so the dialog anchors to it */}
				<input
					ref={colorInputRef}
					type="color"
					value={customColor}
					onChange={handleCustomChange}
					tabIndex={-1}
					aria-hidden
					className="pointer-events-none absolute inset-0 size-full opacity-0"
				/>
			</span>

			{colorArr.map((item) => (
				<ToggleGroupItem
					key={item}
					value={item}
					aria-label={item}
					className={swatchClass}
					style={{ backgroundColor: item }}
				/>
			))}
		</ToggleGroup>
	);
};

export default Background;
