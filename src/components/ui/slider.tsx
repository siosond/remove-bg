import { cn } from "cn";
import { Slider as SliderPrimitive } from "radix-ui";
import type * as React from "react";

function Slider({
	className,
	value,
	defaultValue,
	min = 0,
	max = 100,
	"aria-label": ariaLabel,
	...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
	const thumbCount = (value ?? defaultValue ?? [min]).length;

	return (
		<SliderPrimitive.Root
			data-slot="slider"
			value={value}
			defaultValue={defaultValue}
			min={min}
			max={max}
			className={cn(
				"relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50",
				className,
			)}
			{...props}
		>
			<SliderPrimitive.Track
				data-slot="slider-track"
				className="bg-muted relative h-1.5 w-full grow overflow-hidden rounded-full"
			>
				<SliderPrimitive.Range
					data-slot="slider-range"
					className="bg-primary absolute h-full"
				/>
			</SliderPrimitive.Track>
			{Array.from({ length: thumbCount }, (_, index) => (
				<SliderPrimitive.Thumb
					// biome-ignore lint/suspicious/noArrayIndexKey: thumbs have no identity beyond their position
					key={index}
					aria-label={ariaLabel}
					data-slot="slider-thumb"
					className="border-primary bg-background ring-ring/50 block size-4 shrink-0 rounded-full border shadow-sm transition-[box-shadow] hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden disabled:pointer-events-none"
				/>
			))}
		</SliderPrimitive.Root>
	);
}

export { Slider };
