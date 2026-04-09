"use client";

import { Document, Page, pdfjs } from "react-pdf";
import type { PDFDocumentProxy } from "pdfjs-dist";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFViewerProps {
  file: { url: string };
  onLoadSuccess: (pdf: PDFDocumentProxy) => void;
  onLoadError: (error: Error) => void;
  onPageLoadSuccess: () => void;
  pageWidth?: number;
}

export default function PDFViewer({
  file,
  onLoadSuccess,
  onLoadError,
  onPageLoadSuccess,
  pageWidth,
}: PDFViewerProps) {
  console.log("PDFViewer rendering with file:", file, "pageWidth:", pageWidth);

  return (
    <Document
      file={file}
      onLoadSuccess={(pdf) => {
        console.log("✅ Document loaded successfully in PDFViewer, pages:", pdf.numPages);
        onLoadSuccess(pdf);
      }}
      onLoadError={(error) => {
        console.error("❌ Document load error in PDFViewer:", error);
        onLoadError(error);
      }}
      loading={
        <div className="flex items-center justify-center bg-gray-50 dark:bg-gray-900" style={{ minHeight: "1010px" }}>
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400" />
            <div className="text-center">
              <p className="text-gray-700 dark:text-gray-300 font-medium">
                Rendering PDF...
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                This may take a few moments for large files
              </p>
            </div>
          </div>
        </div>
      }
    >
      <Page
        pageNumber={1}
        width={pageWidth || undefined}
        onLoadSuccess={() => {
          console.log("✅ Page 1 loaded successfully in PDFViewer");
          onPageLoadSuccess();
        }}
        renderTextLayer={false}
        renderAnnotationLayer={false}
      />
    </Document>
  );
}
