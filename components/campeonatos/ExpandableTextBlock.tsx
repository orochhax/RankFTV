"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

type ExpandableTextBlockProps = {
  text: string;
  expandLabel?: string;
  collapseLabel?: string;
  collapsedMaxHeightClass?: string;
  className?: string;
};

export function ExpandableTextBlock({
  text,
  expandLabel = "Ver mais",
  collapseLabel = "Mostrar menos",
  collapsedMaxHeightClass = "max-h-20",
  className = "",
}: ExpandableTextBlockProps) {
  const [expanded, setExpanded] = useState(false);

  if (!text || !text.trim()) return null;

  return (
    <div className={className}>
      <div
        className={`relative overflow-hidden transition-all ${
          expanded ? "" : collapsedMaxHeightClass
        }`}
      >
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-600">
          {text}
        </p>
        {!expanded && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-app-bg to-transparent"
          />
        )}
      </div>
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 transition-colors hover:text-blue-700"
      >
        {expanded ? (
          <>
            {collapseLabel}
            <ChevronUp className="size-3.5" />
          </>
        ) : (
          <>
            {expandLabel}
            <ChevronDown className="size-3.5" />
          </>
        )}
      </button>
    </div>
  );
}
