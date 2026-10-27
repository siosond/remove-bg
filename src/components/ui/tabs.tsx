import { cn } from "cn";
import { Tabs as TabsPrimitive } from "radix-ui";
import type * as React from "react";

function Tabs({
	className,
	...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
	return (
		<TabsPrimitive.Root
			data-slot="tabs"
			className={cn("flex min-h-0 flex-col gap-4", className)}
			{...props}
		/>
	);
}

function TabsList({
	className,
	...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
	return (
		<TabsPrimitive.List
			data-slot="tabs-list"
			className={cn(
				"bg-muted text-muted-foreground grid w-full auto-cols-fr grid-flow-col rounded-lg p-1",
				className,
			)}
			{...props}
		/>
	);
}

function TabsTrigger({
	className,
	...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
	return (
		<TabsPrimitive.Trigger
			data-slot="tabs-trigger"
			className={cn(
				"data-[state=active]:bg-background data-[state=active]:text-foreground focus-visible:ring-ring/50 hover:text-foreground inline-flex h-8 items-center justify-center rounded-md px-2 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-4 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm",
				className,
			)}
			{...props}
		/>
	);
}

function TabsContent({
	className,
	...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
	return (
		<TabsPrimitive.Content
			data-slot="tabs-content"
			// inactive tabs stay mounted so state survives switching; they're hidden
			// but keep their space, so overlap them in one grid cell to keep the
			// panel the height of the tallest tab
			className={cn("outline-none data-[state=inactive]:invisible", className)}
			{...props}
		/>
	);
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
