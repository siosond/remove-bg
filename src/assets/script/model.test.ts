import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MODEL_NAME } from "./config";
import {
	dismissModelFailure,
	ensureModel,
	getModelStatus,
	subscribeModelStatus,
} from "./model";

const store = vi.hoisted(() => new Map<string, unknown>());

vi.mock("localforage", () => ({
	default: {
		config: vi.fn(),
		getItem: vi.fn(async (key: string) => store.get(key) ?? null),
		setItem: vi.fn(async (key: string, value: unknown) => {
			store.set(key, value);
		}),
	},
}));

const bytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);

const serveModel = () => {
	const fetchMock = vi
		.fn()
		.mockImplementation(
			async () => new Response(bytes, { headers: { "content-length": "8" } }),
		);
	vi.stubGlobal("fetch", fetchMock);
	return fetchMock;
};

beforeEach(() => store.clear());

afterEach(() => {
	dismissModelFailure();
	vi.unstubAllGlobals();
});

describe("ensureModel", () => {
	it("returns the cached model without downloading", async () => {
		const cached = new ArrayBuffer(4);
		store.set(MODEL_NAME, cached);
		const fetchMock = serveModel();

		expect(await ensureModel()).toBe(cached);
		expect(fetchMock).not.toHaveBeenCalled();
		expect(getModelStatus().state).toBe("idle");
	});

	it("downloads and caches the model when it isn't cached", async () => {
		const fetchMock = serveModel();
		const states: string[] = [];
		const unsubscribe = subscribeModelStatus(() =>
			states.push(getModelStatus().state),
		);

		const model = await ensureModel();
		unsubscribe();

		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(model.byteLength).toBe(8);
		expect((store.get(MODEL_NAME) as ArrayBuffer).byteLength).toBe(8);
		expect(states).toContain("downloading");
		expect(getModelStatus().state).toBe("idle");
	});

	it("shares one download between concurrent callers", async () => {
		const fetchMock = serveModel();

		const [a, b] = await Promise.all([ensureModel(), ensureModel()]);

		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(a).toBe(b);
	});

	it("reports a failure, then recovers on the next call", async () => {
		vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

		await expect(ensureModel()).rejects.toThrow("offline");
		expect(getModelStatus().state).toBe("failed");
		dismissModelFailure();
		expect(getModelStatus().state).toBe("idle");

		serveModel();
		expect((await ensureModel()).byteLength).toBe(8);
		expect(getModelStatus().state).toBe("idle");
	});

	it("still returns the model when the browser can't store it", async () => {
		serveModel();
		const localforage = (await import("localforage")).default;
		vi.mocked(localforage.setItem).mockRejectedValueOnce(new Error("quota"));
		vi.spyOn(console, "warn").mockImplementation(() => {});

		expect((await ensureModel()).byteLength).toBe(8);
		expect(getModelStatus().state).toBe("idle");
	});
});
