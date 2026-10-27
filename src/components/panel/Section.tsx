import type React from "react";

interface SectionProps {
	description?: string;
	action?: React.ReactNode;
	children: React.ReactNode;
}

/** The body of one tab: a short description, an optional action, then the controls. */
const Section: React.FC<SectionProps> = ({ description, action, children }) => (
	<div className="flex flex-col gap-4">
		<div className="flex min-h-6 items-center justify-between gap-2">
			<p className="text-muted-foreground text-xs">{description}</p>
			{action}
		</div>
		{children}
	</div>
);

export default Section;
