import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ThemeProvider } from "next-themes";
import { afterEach, beforeAll, expect, test, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import App from "./App";
import Background from "./components/Background";

beforeAll(() => {
	// jsdom lacks matchMedia, which next-themes and sonner read
	window.matchMedia ??= ((query: string) => ({
		matches: false,
		media: query,
		onchange: null,
		addEventListener: () => {},
		removeEventListener: () => {},
		addListener: () => {},
		removeListener: () => {},
		dispatchEvent: () => false,
	})) as typeof window.matchMedia;
});

afterEach(() => {
	cleanup();
	document.documentElement.classList.remove("dark");
	localStorage.clear();
});

const renderApp = () =>
	render(
		<ThemeProvider attribute="class" defaultTheme="light">
			<TooltipProvider>
				<App />
			</TooltipProvider>
		</ThemeProvider>,
	);

test("renders the header and the upload screen", () => {
	renderApp();
	expect(screen.getByText("remove")).toBeInTheDocument();
	expect(
		screen.getByRole("button", { name: "Upload image" }),
	).toBeInTheDocument();
});

test("rejects files that are not images", async () => {
	const { container } = renderApp();
	const input = container.querySelector("input[type=file]") as HTMLInputElement;
	const file = new File(["hello"], "notes.txt", { type: "text/plain" });
	fireEvent.change(input, { target: { files: [file] } });
	expect(
		await screen.findByText("This file isn't an image"),
	).toBeInTheDocument();
	expect(
		screen.getByRole("button", { name: "Upload image" }),
	).toBeInTheDocument();
});

test("reports the selected background color", () => {
	const onChangeBg = vi.fn();
	render(<Background onChangeBg={onChangeBg} />);
	fireEvent.click(screen.getByRole("radio", { name: "#e91e63" }));
	expect(onChangeBg).toHaveBeenLastCalledWith("#e91e63");
	fireEvent.click(screen.getByRole("radio", { name: "Transparent" }));
	expect(onChangeBg).toHaveBeenLastCalledWith("transparent");
});
