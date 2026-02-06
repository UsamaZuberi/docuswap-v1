import { useCallback, useRef, useState } from "react";
import { motion } from "framer-motion";
import { CloudUpload, FolderOpen } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface DropZoneCardProps {
  onFilesAdded: (files: File[]) => void;
  sourceFormat: string;
  targetFormat: string;
}

export function DropZoneCard({ onFilesAdded, sourceFormat, targetFormat }: DropZoneCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList?.length) return;
      onFilesAdded(Array.from(fileList));
    },
    [onFilesAdded]
  );

  return (
    <Card className="border border-white/10 bg-white/5 shadow-xl shadow-slate-950/40 backdrop-blur">
      <CardContent className="p-6 md:p-8">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className={`group flex min-h-55 flex-col items-center justify-center gap-4 rounded-xl border border-dashed px-6 py-10 text-center transition ${
            isDragging ? "border-indigo-400 bg-indigo-500/10" : "border-white/10 bg-white/5"
          }`}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            handleFiles(event.dataTransfer.files);
          }}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-200">
            <CloudUpload className="h-7 w-7" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Drop files here</h3>
            <p className="text-sm text-slate-400">
              Upload .{sourceFormat} files and convert to {targetFormat.toUpperCase()}.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              variant="secondary"
              className="bg-white/10 text-white hover:bg-white/20"
              onClick={() => inputRef.current?.click()}
            >
              <FolderOpen className="h-4 w-4" />
              Browse Files
            </Button>
            <span className="text-xs text-slate-500">Supported: {sourceFormat.toUpperCase()} → {targetFormat.toUpperCase()}</span>
          </div>
        </motion.div>
        <input
          ref={inputRef}
          className="hidden"
          type="file"
          multiple
          accept={formatToAccept(sourceFormat)}
          onChange={(event) => handleFiles(event.target.files)}
        />
      </CardContent>
    </Card>
  );
}

function formatToAccept(format: string) {
  switch (format) {
    case "jpeg":
      return ".jpg,.jpeg,image/jpeg";
    case "png":
      return ".png,image/png";
    case "webp":
      return ".webp,image/webp";
    case "heic":
      return ".heic,image/heic";
    case "svg":
      return ".svg,image/svg+xml";
    case "json":
      return ".json,application/json";
    case "csv":
      return ".csv,text/csv";
    case "xml":
      return ".xml,application/xml,text/xml";
    case "md":
      return ".md,.markdown,text/markdown";
    case "html":
      return ".html,.htm,text/html";
    case "pdf":
      return ".pdf,application/pdf";
    case "docx":
      return ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "ppt":
      return ".ppt,application/vnd.ms-powerpoint";
    case "pptx":
      return ".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation";
    default:
      return undefined;
  }
}
