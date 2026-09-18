interface SourceBadgeProps {
  source: string;
}

export default function SourceBadge({ source }: SourceBadgeProps) {
  const isModel = source === "model" || source === "real";

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
        isModel
          ? "bg-green-100 text-green-800"
          : "bg-amber-100 text-amber-800"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          isModel ? "bg-green-500" : "bg-amber-500"
        }`}
      />
      {isModel ? "Model Output" : "Mock Data"}
    </span>
  );
}