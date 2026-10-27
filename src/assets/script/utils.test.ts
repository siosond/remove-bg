import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadFile } from "./utils";

const bytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);

const respond = (headers: Record<string, string>) =>
	vi.stubGlobal(
		"fetch",
		vi.fn().mockResolvedValue(new Response(bytes, { headers })),
	);

const run = (fallbackSize?: number) =>
	new Promise<{ ok: boolean; data: unknown; totals: number[] }>((resolve) => {
		const totals: number[] = [];
		downloadFile({
			url: "/model",
			fallbackSize,
			progress: (_loaded, total) => totals.push(total),
			finalCb: (ok, data) => resolve({ ok, data, totals }),
		});
	});

afterEach(() => vi.unstubAllGlobals());

describe("downloadFile", () => {
	it("reports progress against the content-length header", async () => {
		respond({ "content-length": "8" });
		const { ok, totals } = await run(100);
		expect(ok).toBe(true);
		expect(new Set(totals)).toEqual(new Set([8]));
	});

	it("falls back to the given size when the server reports none", async () => {
		respond({});
		const { ok, data, totals } = await run(8);
		expect(ok).toBe(true);
		expect((data as ArrayBuffer).byteLength).toBe(8);
		expect(new Set(totals)).toEqual(new Set([8]));
	});

	it("falls back when the response is compressed without x-file-size", async () => {
		respond({ "content-encoding": "gzip", "content-length": "3" });
		const { ok, totals } = await run(8);
		expect(ok).toBe(true);
		expect(new Set(totals)).toEqual(new Set([8]));
	});

	it("fails when no size is available at all", async () => {
		respond({});
		const { ok } = await run();
		expect(ok).toBe(false);
	});
});
