export type Cover = {
  id: string;
  filename: string;
  status: "queued" | "processing" | "finished" | "failed";
  stage: string | null;
  title: string | null;
  author: string | null;
  error: string | null;
  metadataWarning: string | null;
  createdAt: string;
  finishedAt: string | null;
  attemptCount: number;
};
export type Library = {
  items: Cover[];
  total: number;
  page: number;
  pages: number;
  limit: number;
};
export const stageLabels: Record<string, string> = {
  preparing: "Preparing your cover…",
  extending: "Enhancing the cover, extending artwork, and reading details…",
  exporting: "Finishing your 1072 × 1448 cover…",
};
export const statusLabels = {
  queued: "Ready to process",
  processing: "Processing",
  finished: "Finished",
  failed: "Needs attention",
};
