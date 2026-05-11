import { Button } from "@/components/ui/button";

interface ProGateProps {
  feature: string;
  description: string;
}

export function ProGate({ feature, description }: ProGateProps) {
  return (
    <div className="max-w-sm mx-auto mt-16 text-center space-y-4 rounded-xl border bg-card p-8 shadow-sm">
      <div className="text-4xl">🔒</div>
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">Pro feature</h2>
        <p className="text-sm text-muted-foreground font-medium">{feature}</p>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
      <Button variant="outline" disabled className="w-full opacity-60">
        Upgrade to Pro — coming soon
      </Button>
    </div>
  );
}
