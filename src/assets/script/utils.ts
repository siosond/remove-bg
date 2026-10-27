import type { Env } from "onnxruntime-web";

interface DownloadParams {
	url: string;
	/** Size in bytes to assume when the response doesn't report one. */
	fallbackSize?: number;
	progress: (loaded: number, total: number) => void;
	finalCb: (flag: boolean, data: Error | ArrayBuffer) => void;
}

interface IWebCanUse {
	webGpu: boolean;
	threads: boolean;
}

export function downloadFile({
	url,
	fallbackSize,
	progress,
	finalCb,
}: DownloadParams) {
	fetch(url)
		.then((response) => {
			if (!response.ok) {
				throw Error(`${response.status} ${response.statusText}`);
			}

			if (!response.body) {
				throw Error("ReadableStream not yet supported in this browser.");
			}

			// to access headers, server must send CORS header "Access-Control-Expose-Headers: content-encoding, content-length x-file-size"
			// server must send custom x-file-size header if gzip or other content-encoding is used
			const contentEncoding = response.headers.get("content-encoding");
			const contentLength = response.headers.get(
				contentEncoding ? "x-file-size" : "content-length",
			);
			if (contentLength === null && !fallbackSize) {
				throw Error("Response size header unavailable");
			}

			const total =
				contentLength === null
					? (fallbackSize as number)
					: parseInt(contentLength, 10);
			let loaded = 0;

			return new Response(
				new ReadableStream({
					start(controller) {
						const reader = (
							response.body as ReadableStream<Uint8Array>
						).getReader();

						read();
						function read() {
							reader
								.read()
								.then(({ done, value }) => {
									if (done) {
										controller.close();
										return;
									}
									loaded += value.byteLength;
									progress(loaded, total);
									controller.enqueue(value);
									read();
								})
								.catch((error) => {
									console.error(error);
									controller.error(error);
								});
						}
					},
				}),
			);
		})
		.then((response) => response.arrayBuffer())
		.then((res) => {
			finalCb(true, res);
		})
		.catch((error) => {
			finalCb(false, error);
		});
}

const checkWebGpu = async () => {
	if (!navigator.gpu) {
		return false;
	}
	return !!(await navigator.gpu.requestAdapter());
};

const checkThreads = () =>
	(async (e) => {
		try {
			if (typeof MessageChannel !== "undefined") {
				new MessageChannel().port1.postMessage(new SharedArrayBuffer(1));
			}
			return WebAssembly.validate(e);
		} catch {
			return false;
		}
	})(
		new Uint8Array([
			0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 3, 2, 1, 0, 5, 4, 1, 3, 1,
			1, 10, 11, 1, 9, 0, 65, 0, 254, 16, 2, 0, 26, 11,
		]),
	);

export const getWebCanUse = async (): Promise<IWebCanUse> => {
	return {
		webGpu: await checkWebGpu(),
		threads: await checkThreads(),
	};
};

export const setOrtEnv = (webCanUse: IWebCanUse, env: Env) => {
	if (import.meta.env.DEV) {
		console.log("ORT DEV MODE:", webCanUse);
		env.debug = true;
		env.logLevel = "error";
	}
	const { webGpu, threads } = webCanUse;
	if (webGpu) {
		env.wasm.numThreads = 1;
	} else if (threads) {
		env.wasm.numThreads = navigator.hardwareConcurrency ?? 4;
	}
};
