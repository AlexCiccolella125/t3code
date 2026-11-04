import type { FilevineProof } from "@t3tools/contracts";

const percent = (fraction: number) => `${Math.min(Math.max(fraction, 0), 1) * 100}%`;

/** One document page with the cited region highlighted, drawn from the Proof's page text. */
export function DocumentProofPage({
  document,
}: {
  document: NonNullable<FilevineProof["document"]>;
}) {
  const { highlight } = document;
  return (
    <figure className="flex min-w-0 flex-col gap-2">
      <figcaption className="flex min-w-0 items-baseline justify-between gap-2 text-xs">
        <span className="min-w-0 truncate font-medium text-foreground">{document.fileName}</span>
        <span className="shrink-0 text-muted-foreground tabular-nums">
          Page {document.page} of {document.pageCount}
        </span>
      </figcaption>
      <div
        data-document-proof-page
        className="relative mx-auto aspect-[8.5/11] w-full max-w-md overflow-hidden rounded-xs border border-border bg-card text-card-foreground shadow-sm"
      >
        <p className="absolute inset-0 overflow-hidden whitespace-pre-wrap px-8 py-8 font-serif text-2xs leading-relaxed">
          {document.pageText}
        </p>
        <div
          aria-label="Cited region"
          role="img"
          data-document-proof-highlight
          className="pointer-events-none absolute rounded-xs border-2 border-primary bg-primary/20"
          style={{
            left: percent(highlight.x),
            top: percent(highlight.y),
            width: percent(highlight.width),
            height: percent(highlight.height),
          }}
        />
      </div>
    </figure>
  );
}
