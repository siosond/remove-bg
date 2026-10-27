# Third-party notices

remove-bg is released under the [GNU GPL v3.0](LICENSE). It includes or ships the
following third-party material, each under its own license. All of these licenses are
compatible with the GPL v3.0.

## Model

| Component                                                      | License    | Notes                                                                                      |
| -------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------ |
| [U²-Net](https://github.com/xuebinqin/U-2-Net) (`u2netp.onnx`) | Apache-2.0 | Shipped in `public/models/`. See `public/models/NOTICE` and `public/models/LICENSE-U2NET`. |

## Code and assets copied into this repository

| Component                                            | License | Notes                                                                                                                                         |
| ---------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| [shadcn/ui](https://ui.shadcn.com) components        | MIT     | `src/components/ui/`. Copyright (c) 2023 shadcn.                                                                                              |
| [Inter](https://github.com/rsms/inter) variable font | OFL-1.1 | Bundled through `@fontsource-variable/inter`. Copyright 2016 The Inter Project Authors. The license text is in that package's `LICENSE` file. |

## npm dependencies

Runtime dependencies are installed from npm and keep their own licenses, which ship
with each package. At the time of writing they are MIT, ISC, BSD-2-Clause,
BSD-3-Clause, Apache-2.0, 0BSD, BlueOak-1.0.0 or Unlicense, plus the OFL-1.1 font
above. The `MPL-2.0` packages (lightningcss) are build-time tools and are not shipped.
Notable runtime dependencies:

- [React](https://react.dev), [Radix UI](https://www.radix-ui.com), [Tailwind CSS](https://tailwindcss.com) (MIT)
- [ONNX Runtime Web](https://github.com/microsoft/onnxruntime) (MIT)
- [lucide-react](https://lucide.dev) (ISC)
- [sonner](https://sonner.emilkowal.ski), [next-themes](https://github.com/pacocoursey/next-themes), [react-compare-slider](https://github.com/nerdyman/react-compare-slider), [localforage](https://github.com/localForage/localForage), [ndarray](https://github.com/scijs/ndarray) (MIT)

Run `npm ls --prod` to list the full set, or check each package's `LICENSE` file under
`node_modules/`.
