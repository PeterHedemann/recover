import { Badge } from "@/components/ui/badge";
import { statusLabels, type Cover } from "@/lib/covers/types";
import { cn } from "@/lib/utils";

export function CoverStatus({ status }: { status: Cover["status"] }) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "gap-1.5 text-xs",
        status === "failed" && "bg-red-50 text-red-700",
        status === "finished" && "bg-green-50 text-green-800",
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full bg-current",
          status === "processing" && "animate-pulse",
        )}
      />
      {statusLabels[status]}
    </Badge>
  );
}
