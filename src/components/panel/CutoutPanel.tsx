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
		description="Shape the edge of the cutout."
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
				label="Cutoff"
				value={adjust.cutoff}
				lowLabel="Keep more"
				highLabel="Remove more"
				disabled={disabled}
				onChange={(cutoff) => onChange({ ...adjust, cutoff })}
			/>
			<AdjustSlider
				label="Edge"
				value={adjust.edge}
				lowLabel="Grow"
				highLabel="Shrink"
				disabled={disabled}
				onChange={(edge) => onChange({ ...adjust, edge })}
			/>
			<AdjustSlider
				label="Feather"
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
					label="Remove specks and holes"
					checked={adjust.cleanup}
					disabled={disabled}
					onChange={(cleanup) => onChange({ ...adjust, cleanup })}
				/>
				<ToggleRow
					id="largest-only"
					label="Keep only the largest subject"
					checked={adjust.largestOnly}
					disabled={disabled}
					onChange={(largestOnly) => onChange({ ...adjust, largestOnly })}
				/>
			</div>
		</div>
	</Section>
);

export default CutoutPanel;
