import type React from "react";
import { Switch } from "@/components/ui/switch";

interface ToggleRowProps {
	id: string;
	label: string;
	checked: boolean;
	disabled: boolean;
	onChange: (checked: boolean) => void;
}

const ToggleRow: React.FC<ToggleRowProps> = ({
	id,
	label,
	checked,
	disabled,
	onChange,
}) => (
	<div className="flex items-center justify-between gap-3 text-sm">
		<label htmlFor={id}>{label}</label>
		<Switch
			id={id}
			checked={checked}
			disabled={disabled}
			onCheckedChange={onChange}
		/>
	</div>
);

export default ToggleRow;
