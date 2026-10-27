import type React from "react";
import { Slider } from "@/components/ui/slider";
import { MAX_ADJUST, MIN_ADJUST } from "../../assets/script/mask";

interface AdjustSliderProps {
	label: string;
	value: number;
	lowLabel: string;
	highLabel: string;
	disabled: boolean;
	min?: number;
	max?: number;
	onChange: (value: number) => void;
}

const AdjustSlider: React.FC<AdjustSliderProps> = ({
	label,
	value,
	lowLabel,
	highLabel,
	disabled,
	min = MIN_ADJUST,
	max = MAX_ADJUST,
	onChange,
}) => (
	<div className="flex flex-col gap-2">
		<div className="flex items-center justify-between text-sm">
			<span>{label}</span>
			<span className="text-muted-foreground tabular-nums">
				{value > 0 && min < 0 ? `+${value}` : value}
			</span>
		</div>
		<Slider
			aria-label={label}
			min={min}
			max={max}
			step={1}
			value={[value]}
			disabled={disabled}
			onValueChange={([next]) => onChange(next)}
		/>
		<div className="text-muted-foreground flex justify-between text-xs">
			<span>{lowLabel}</span>
			<span>{highLabel}</span>
		</div>
	</div>
);

export default AdjustSlider;
