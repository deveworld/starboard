"use client";

import { useEffect, useState } from "react";

const figures: { src: string; n: string; cap: string }[] = [
  { src: "/starboard.svg", n: "02", cap: "Schematic" },
  { src: "/pcb-front.svg", n: "03", cap: "Board — front copper" },
  { src: "/pcb-back.svg", n: "04", cap: "Board — back copper" },
];

export default function Gallery() {
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open !== null ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <div className="grid gap-6 sm:grid-cols-3">
        {figures.map((g, i) => (
          <figure key={g.cap} className="border border-ink/20 bg-white">
            <button
              type="button"
              onClick={() => setOpen(i)}
              className="group block w-full cursor-zoom-in"
              aria-label={`Enlarge ${g.cap}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={g.src}
                alt={g.cap}
                className="aspect-square w-full object-contain p-5 transition-opacity group-hover:opacity-80"
              />
            </button>
            <figcaption className="label flex items-center justify-between border-t border-ink/20 px-3 py-2 text-faint">
              <span>Fig. {g.n}</span>
              <span className="normal-case tracking-normal">{g.cap}</span>
            </figcaption>
          </figure>
        ))}
      </div>

      {open !== null && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-ink/95"
          onClick={() => setOpen(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="label flex items-center justify-between px-6 py-4 text-paper/70">
            <span>
              Fig. {figures[open].n} —{" "}
              <span className="normal-case tracking-normal text-paper">{figures[open].cap}</span>
            </span>
            <button
              type="button"
              onClick={() => setOpen(null)}
              className="transition-colors hover:text-accent"
            >
              Close ✕
            </button>
          </div>
          <div className="flex flex-1 items-center justify-center px-4 pb-8" onClick={() => setOpen(null)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={figures[open].src}
              alt={figures[open].cap}
              className="max-h-full max-w-full bg-white p-4"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </>
  );
}
