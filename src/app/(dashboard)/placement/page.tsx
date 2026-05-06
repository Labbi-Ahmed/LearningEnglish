import { PlacementRunner } from "./placement-runner";

export default function PlacementPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Placement test</h1>
        <p className="text-muted-foreground text-sm mt-1">
          ~5 minutes · 13 questions covering vocabulary, grammar, listening, and
          reading. We&apos;ll set your CEFR level based on the result. You can
          retake it anytime.
        </p>
      </div>
      <PlacementRunner />
    </div>
  );
}
