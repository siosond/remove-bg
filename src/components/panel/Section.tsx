import type React from "react";

interface SectionProps {
	title: string;
	action?: React.ReactNode;
	children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, action, children }) => (
	<section className="flex flex-col gap-3">
		<div className="flex h-6 items-center justify-between">
			<h3 className="text-sm font-medium">{title}</h3>
			{action}
		</div>
		{children}
	</section>
);

export default Section;
