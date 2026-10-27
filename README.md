<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="src/assets/img/readme-logo-dark.svg">
  <img src="src/assets/img/readme-logo-light.svg" alt="remove-bg" width="320">
</picture>

A free, open-source background remover that runs entirely in your browser.<br>
Powered by WebGPU and WebAssembly. No uploads, no accounts, no cost.

[Features](#features) · [Getting started](#getting-started) · [Tech stack](#tech-stack) · [How it works](#how-it-works) · [License](#license)

</div>

## Features

- **Local processing.** Images are processed in the browser and are never uploaded.
- **Hardware acceleration.** Uses WebGPU when available and falls back to multi-threaded WebAssembly.
- **Small model.** The ~5 MB model is downloaded the first time you remove a background, then cached in the browser.
- **Cutout controls.** Sliders for removal, edge size and edge softness, plus options to clean up small specks and holes and to keep only the main subject.
- **Brush.** Erase or restore areas, with adjustable brush size and undo and redo.
- **Background.** Transparent, a solid or custom color, or a blurred copy of the original image.
- **Compare.** Drag a divider to compare before and after.
- **Download.** Save a PNG, optionally cropped to the subject.
- **Input.** Drag and drop anywhere on the page, or select a file.
- **Themes.** Light and dark.

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) 22.12 or later

### Run locally

```bash
git clone https://github.com/siosond/remove-bg.git
cd remove-bg
npm install
npm run dev
```

Then open the local URL printed in the terminal.

### Scripts

| Command           | Description                                    |
| ----------------- | ---------------------------------------------- |
| `npm run dev`     | Start the Vite dev server                      |
| `npm run build`   | Type-check (`tsc -b`) and build for production |
| `npm run preview` | Preview the production build locally           |
| `npm run lint`    | Lint the sources with Biome                    |
| `npm run format`  | Format the sources with Biome                  |
| `npm run check`   | Run Biome lint, format and import checks       |
| `npm test`        | Run the unit tests with Vitest                 |

## Tech stack

| Layer         | Technologies                                                                                                                 |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| UI            | React 19, TypeScript 6, shadcn/ui (Radix UI), Tailwind CSS 4, lucide-react, sonner, next-themes, react-compare-slider, Inter |
| Build & tools | Vite 8, Vitest, Testing Library (jsdom), Biome                                                                               |
| ML runtime    | ONNX Runtime Web (`onnxruntime-web/webgpu`), ndarray                                                                         |
| Storage       | localforage (IndexedDB) for the cached model                                                                                 |
| Model         | [U²-Net](https://github.com/xuebinqin/U-2-Net) lightweight variant (`u2netp.onnx`, ~5 MB, Apache-2.0), shipped with the app  |

## How it works

1. **Model download.** The first time an image is processed, `ensureModel` in `model.ts` fetches `u2netp.onnx` from the app's own `public/models/` folder (URL in `src/assets/script/config.ts`), `Download.tsx` shows a progress dialog, and the model is stored in IndexedDB. Later visits read it straight from the cache, and nothing is downloaded until an image is chosen.
2. **Runtime setup.** `utils.ts` checks for WebGPU and WebAssembly threads, and `inference.ts` creates the ONNX Runtime session on WebGPU when available, otherwise on WASM. The 27 MiB ONNX Runtime wasm exceeds the 25 MiB per-asset limit of Cloudflare Workers, so it is not bundled; it is loaded from jsDelivr at the installed `onnxruntime-web` version (`ORT_WASM_BASE_URL` in `config.ts`).
3. **Inference.** The image is resized to 320 × 320 with bilinear interpolation, normalized, converted from HWC to BCHW layout and passed to the model. The output saliency mask is min-max normalized.
4. **Mask adjustment.** The mask is scaled back to the original size and shaped by the removal, cleanup, edge size, brush and edge softness settings in `mask.ts`. The live preview works on a reduced-size copy; the export applies the same settings to the full-size image.
5. **Compositing.** `composite.ts` draws the result over the chosen background for both the preview and the downloaded PNG.

### Project layout

```text
src/assets/script/      Model storage, inference pipeline, runtime utilities, config
src/components/         App components (upload, preview, background picker, ...)
src/components/ui/      shadcn/ui primitives
public/models/          Bundled U²-Net model with its license and notice
```

## License

Released under the [GNU GPL v3.0](LICENSE).

The bundled model and other third-party material keep their own licenses. See [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).

## Acknowledgements

This project is a fork of [daxmeng/remove-bg](https://github.com/daxmeng/remove-bg).

Background removal is powered by [U²-Net](https://github.com/xuebinqin/U-2-Net) by Xuebin Qin et al., released under the Apache License 2.0. The bundled `u2netp.onnx` is the export from [rembg](https://github.com/danielgatis/rembg)'s release assets; its license text and origin are in [`public/models/`](public/models/NOTICE).

<details>
<summary>Citation (BibTeX)</summary>

```bibtex
@InProceedings{Qin_2020_PR,
title = {U2-Net: Going Deeper with Nested U-Structure for Salient Object Detection},
author = {Qin, Xuebin and Zhang, Zichen and Huang, Chenyang and Dehghan, Masood and Zaiane, Osmar and Jagersand, Martin},
journal = {Pattern Recognition},
volume = {106},
pages = {107404},
year = {2020}
}
```

</details>
