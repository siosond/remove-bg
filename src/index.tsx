import { ThemeProvider } from "next-themes";
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import App from "./App";

const root = ReactDOM.createRoot(
	document.getElementById("root") as HTMLElement,
);
root.render(
	<React.StrictMode>
		<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
			<TooltipProvider>
				<App />
			</TooltipProvider>
		</ThemeProvider>
	</React.StrictMode>,
);
