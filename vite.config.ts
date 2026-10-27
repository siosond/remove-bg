import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defaultClientConditions } from "vite";
import { defineConfig } from "vitest/config";

const ortVersion = (
	JSON.parse(
		readFileSync(
			new URL("./node_modules/onnxruntime-web/package.json", import.meta.url),
			"utf8",
		),
	) as { version: string }
).version;

// https://vite.dev/config/
export default defineConfig({
	plugins: [react(), tailwindcss()],
	define: {
		__ORT_VERSION__: JSON.stringify(ortVersion),
	},
	resolve: {
		// Resolve onnxruntime-web to its build without the wasm runtime bundled in.
		// The runtime is loaded from a CDN instead (see ORT_WASM_BASE_URL).
		conditions: ["onnxruntime-web-use-extern-wasm", ...defaultClientConditions],
		alias: {
			"@": fileURLToPath(new URL("./src", import.meta.url)),
		},
	},
	test: {
		environment: "jsdom",
		setupFiles: ["./src/setupTests.ts"],
	},
});
