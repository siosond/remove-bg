import type React from "react";
import { useState } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
	type Backdrop,
	backdropFromColor,
	MAX_BLUR,
	TRANSPARENT_BACKDROP,
} from "../../assets/script/composite";
import Background from "../Background";
import AdjustSlider from "./AdjustSlider";
import Section from "./Section";

interface BackgroundPanelProps {
	backdrop: Backdrop;
	onChange: (backdrop: Backdrop) => void;
}

const BackgroundPanel: React.FC<BackgroundPanelProps> = ({
	backdrop,
	onChange,
}) => {
	// remember each mode's last choice so switching back restores it
	const [colorBackdrop, setColorBackdrop] =
		useState<Backdrop>(TRANSPARENT_BACKDROP);
	const [blurAmount, setBlurAmount] = useState(40);
	const mode = backdrop.kind === "blur" ? "blur" : "color";

	const handleMode = (next: string) => {
		// a single-select group reports '' when the active item is clicked again
		if (!next || next === mode) return;
		onChange(
			next === "blur" ? { kind: "blur", amount: blurAmount } : colorBackdrop,
		);
	};

	const handleColor = (color: string) => {
		const next = backdropFromColor(color);
		setColorBackdrop(next);
		onChange(next);
	};

	const handleBlur = (amount: number) => {
		setBlurAmount(amount);
		onChange({ kind: "blur", amount });
	};

	return (
		<Section title="Background">
			<ToggleGroup
				type="single"
				variant="outline"
				spacing={0}
				value={mode}
				onValueChange={handleMode}
				aria-label="Background type"
				className="w-full"
			>
				<ToggleGroupItem value="color" className="flex-1">
					Color
				</ToggleGroupItem>
				<ToggleGroupItem value="blur" className="flex-1">
					Blur
				</ToggleGroupItem>
			</ToggleGroup>

			{/* stays mounted so the swatches remember what was picked */}
			<div hidden={mode !== "color"}>
				<Background onChangeBg={handleColor} />
			</div>
			{mode === "blur" && (
				<AdjustSlider
					label="Amount"
					value={blurAmount}
					lowLabel="Subtle"
					highLabel="Strong"
					min={0}
					max={MAX_BLUR}
					disabled={false}
					onChange={handleBlur}
				/>
			)}
		</Section>
	);
};

export default BackgroundPanel;
