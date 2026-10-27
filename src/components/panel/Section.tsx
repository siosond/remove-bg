import type React from "react";

interface SectionProps {
	action?: React.ReactNode;
	children: React.ReactNode;
}

/**
 * The body of one tab. When `action` is passed, even as `false`, a fixed-height
 * row above the controls holds it, so showing or hiding it moves nothing.
 */
const Section: React.FC<SectionProps> = ({ action, children }) => (
	<div className="flex flex-col gap-4">
		{action !== undefined && (
			<div className="flex min-h-6 items-center justify-end">{action}</div>
		)}
		{children}
	</div>
);

export default Section;
