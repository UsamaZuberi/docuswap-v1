# DocuSwap

DocuSwap is a client-side file conversion studio built with Next.js 15, Tailwind CSS, and shadcn/ui. It focuses on fast, private conversions that run entirely in the browser with Web Worker support for heavy tasks.

## Features

- Drag-and-drop batch uploads with individual file cards.
- Per-file target format selection, progress, retry, and download controls.
- Global batch actions for Convert All and Download ZIP.
- Client-side conversions for images, data formats, and developer utilities.
- Web Worker template for offloading data conversions.

## Tech Stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui + Lucide icons
- Framer Motion for motion states
- JSZip, PapaParse, XML-js, heic2any, pdf-lib

## Project Layout

- src/components: UI sections and shadcn components
- src/hooks: state management (useConverter)
- src/utils/converters: conversion logic
- src/workers: Web Worker template

## Getting Started

Install dependencies:

```bash
yarn install
```

Run the development server:

```bash
yarn dev
```

Build for production:

```bash
yarn build
```

Start the production server:

```bash
yarn start
```

## Notes

- PDF → DOCX uses a stub payload with pdf-lib metadata extraction.
- DOCX → PDF is a placeholder for a WASM-based implementation.
- HEIC output is not supported in-browser yet.
