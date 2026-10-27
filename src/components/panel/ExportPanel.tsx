import type React from "react";
import Section from "./Section";
import ToggleRow from "./ToggleRow";

interface ExportPanelProps {
	trim: boolean;
	disabled: boolean;
	onChangeTrim: (trim: boolean) => void;
}

const ExportPanel: React.FC<ExportPanelProps> = ({
	trim,
	disabled,
	onChangeTrim,
}) => (
	<Section title="Export">
		<ToggleRow
			id="trim"
			label="Trim empty space"
			checked={trim}
			disabled={disabled}
			onChange={onChangeTrim}
		/>
	</Section>
);

export default ExportPanel;
