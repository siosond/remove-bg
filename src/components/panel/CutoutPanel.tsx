import type React from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
	isDefaultAdjust,
	MAX_FEATHER,
	type MaskAdjust,
	NO_ADJUST,
} from "../../assets/script/mask";
import AdjustSlider from "./AdjustSlider";
import Section from "./Section";
import ToggleRow from "./ToggleRow";

interface CutoutPanelProps {
	adjust: MaskAdjust;
	disabled: boolean;
	onChange: (adjust: MaskAdjust) => void;
}

const CutoutPanel: React.FC<CutoutPanelProps> = ({
	adjust,
	disabled,
	onChange,
}) => (
	<Section
		action={
			!isDefaultAdjust(adjust) && (
				<Button
					variant="ghost"
					size="xs"
					disabled={disabled}
					onClick={() => onChange(NO_ADJUST)}
				>
					Reset
				</Button>
			)
		}
	>
		<div className="flex flex-col gap-4">
			<AdjustSlider
				label="Removal"
				value={adjust.cutoff}
				lowLabel="Less"
				highLabel="More"
				disabled={disabled}
				onChange={(cutoff) => onChange({ ...adjust, cutoff })}
			/>
			<AdjustSlider
				label="Edge size"
				value={adjust.edge}
				lowLabel="Smaller"
				highLabel="Larger"
				disabled={disabled}
				onChange={(edge) => onChange({ ...adjust, edge })}
			/>
			<AdjustSlider
				label="Edge softness"
				value={adjust.feather}
				lowLabel="Sharp"
				highLabel="Soft"
				min={0}
				max={MAX_FEATHER}
				disabled={disabled}
				onChange={(feather) => onChange({ ...adjust, feather })}
			/>
			<Separator />
			<div className="flex flex-col gap-3">
				<ToggleRow
					id="cleanup"
					label="Clean up specks and holes"
					checked={adjust.cleanup}
					disabled={disabled}
					onChange={(cleanup) => onChange({ ...adjust, cleanup })}
				/>
				<ToggleRow
					id="largest-only"
					label="Keep main subject only"
					checked={adjust.largestOnly}
					disabled={disabled}
					onChange={(largestOnly) => onChange({ ...adjust, largestOnly })}
				/>
			</div>
		</div>
	</Section>
);

export default CutoutPanel;
