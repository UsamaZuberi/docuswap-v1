# DocuSwap

DocuSwap is a client-side file conversion studio built with Next.js 16, Tailwind CSS, and shadcn/ui. It focuses on fast, private conversions that run entirely in the browser, including DOCX to PDF rendering.

## Features

- Drag-and-drop batch uploads with individual file cards.
- Global source + target selectors with Auto-detect mode and suggested targets.
- Per-file progress, retry, delete, and download controls.
- Batch stats bar (count, total size, completed).
- Global actions for Convert All, Download ZIP, and Clear.
- Client-side conversions for images, data formats, developer utilities, and documents.
- Web Worker template for offloading data conversions.
- DOCX to PDF conversion using docx-preview with a mammoth fallback.

## Tech Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui + Lucide icons
- Framer Motion for motion states
- JSZip, PapaParse, XML-js, pdf-lib
- docx-preview, mammoth, html2pdf.js

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

- DOCX → PDF runs fully in the browser. Large documents can take longer to render.
- DOCX conversions are limited to 5 files per batch to keep performance predictable.

## Deployment & SEO

Set your public site URL so sitemap, robots, and metadata resolve correctly:

```bash
NEXT_PUBLIC_SITE_URL="https://your-domain.com"
```

The project includes:

- Sitemap: /sitemap.xml
- Robots: /robots.txt
- Open Graph + Twitter metadata

## PWA & Offline Cache

DocuSwap registers a service worker and ships a web app manifest for offline caching.
After deployment, install the app from the browser menu (Add to Home Screen / Install App).
