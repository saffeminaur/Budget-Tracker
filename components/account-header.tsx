import { Badge } from "@/components/ui/badge";

interface AccountHeaderProps {
  primary: string;
  tag: string;
}

export function AccountHeader({ primary, tag }: AccountHeaderProps) {
  return (
    <div className="flex items-center gap-2">
      <h1 className="text-xl font-semibold">{primary}</h1>
      <Badge variant="outline" className="text-muted-foreground font-normal">
        {tag}
      </Badge>
    </div>
  );
}
