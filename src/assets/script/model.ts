import localforage from "localforage";
import { MODEL_NAME, MODEL_SIZE, MODEL_URL } from "./config";
import { downloadFile } from "./utils";

localforage.config({
	name: "modelStore",
});

export async function setModel(modelBlob: ArrayBuffer) {
	await localforage.setItem(MODEL_NAME, modelBlob);
}

export async function getModel(): Promise<ArrayBuffer | null> {
	const model = (await localforage.getItem(MODEL_NAME)) as ArrayBuffer | null;
	return model;
}

export type ModelStatus =
	| { state: "idle" }
	| { state: "downloading"; progress: number }
	| { state: "failed" };

const IDLE: ModelStatus = { state: "idle" };
const FAILED: ModelStatus = { state: "failed" };

let status: ModelStatus = IDLE;
const listeners = new Set<() => void>();

function setStatus(next: ModelStatus) {
	status = next;
	for (const listener of listeners) listener();
}

/** For useSyncExternalStore. */
export function subscribeModelStatus(listener: () => void) {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

export function getModelStatus() {
	return status;
}

/** Hides a failed download. The next ensureModel() call tries again. */
export function dismissModelFailure() {
	if (status.state === "failed") setStatus(IDLE);
}

function download() {
	setStatus({ state: "downloading", progress: 0 });
	return new Promise<ArrayBuffer>((resolve, reject) => {
		downloadFile({
			url: MODEL_URL,
			fallbackSize: MODEL_SIZE,
			progress: (loaded, total) => {
				const progress = Math.min(100, Math.round((loaded / total) * 100));
				setStatus({ state: "downloading", progress });
			},
			finalCb: (ok, data) => {
				if (ok) resolve(data as ArrayBuffer);
				else reject(data);
			},
		});
	});
}

let pending: Promise<ArrayBuffer> | null = null;

/**
 * The model from the browser cache, downloading it first when it isn't there
 * yet. Callers that arrive during a download share it.
 */
export function ensureModel(): Promise<ArrayBuffer> {
	pending ??= (async () => {
		try {
			const cached = await getModel().catch(() => null);
			if (cached) return cached;
			const data = await download();
			// the model still works this session if the browser won't store it
			await setModel(data).catch((error) => console.warn(error));
			setStatus(IDLE);
			return data;
		} catch (error) {
			setStatus(FAILED);
			throw error;
		} finally {
			pending = null;
		}
	})();
	return pending;
}
