export const MODEL_NAME = "u2netp";

// Served from public/models; see public/models/NOTICE for its license and origin.
export const MODEL_URL = `${import.meta.env.BASE_URL}models/u2netp.onnx`;

// The ONNX Runtime wasm is 27 MiB, over the 25 MiB per-asset limit of Cloudflare
// Workers, so it is loaded from a CDN. The version matches the installed package.
export const ORT_WASM_BASE_URL = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${__ORT_VERSION__}/dist/`;

// Size in bytes, used for progress when the server doesn't report it
// (for example when it compresses the response).
export const MODEL_SIZE = 4574861;
