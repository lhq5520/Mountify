"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";

interface GalleryImage {
  url: string;
  publicId: string;
  displayOrder: number;
  isPrimary: boolean;
}

interface ImageGalleryProps {
  images: GalleryImage[];
  productName: string;
}

export default function ImageGallery({
  images,
  productName,
}: ImageGalleryProps) {
  const sorted = useMemo(() => {
    return [...images].sort((a, b) => {
      // primary first, then displayOrder
      if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
      return (a.displayOrder ?? 0) - (b.displayOrder ?? 0);
    });
  }, [images]);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [fitMode, setFitMode] = useState<"fit" | "fill">("fit"); // fit=contain, fill=cover

  const thumbsRef = useRef<HTMLDivElement | null>(null);
  const activeBtnRef = useRef<HTMLButtonElement | null>(null);

  // Mobile swipe track
  const mobileTrackRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  // If no images
  if (!sorted.length) {
    return (
      <div className="aspect-[4/5] w-full rounded-2xl bg-[#f1f2f4] flex items-center justify-center">
        <p className="text-sm text-[var(--color-text-tertiary)]">No images</p>
      </div>
    );
  }

  const selected = sorted[selectedIndex];

  // Keep active thumb in view (desktop)
  useEffect(() => {
    if (!thumbsRef.current || !activeBtnRef.current) return;
    activeBtnRef.current.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [selectedIndex]);

  function prev() {
    setSelectedIndex((i) => (i - 1 + sorted.length) % sorted.length);
  }
  function next() {
    setSelectedIndex((i) => (i + 1) % sorted.length);
  }

  // --- Mobile: keep selectedIndex in sync with swipe position ---
  useEffect(() => {
    const el = mobileTrackRef.current;
    if (!el) return;

    function onScroll() {
      // Avoid updating state too frequently while scrolling
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        if (!el) return;
        const width = el.clientWidth || 1;
        const idx = Math.round(el.scrollLeft / width);
        const clamped = Math.max(0, Math.min(sorted.length - 1, idx));
        if (clamped !== selectedIndex) setSelectedIndex(clamped);
      });
    }

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [selectedIndex, sorted.length]);

  // Mobile: when clicking dots, scroll to that image
  function scrollToMobileIndex(index: number) {
    const el = mobileTrackRef.current;
    if (!el) return;
    const width = el.clientWidth || 1;
    el.scrollTo({ left: width * index, behavior: "smooth" });
    setSelectedIndex(index);
  }

  // Foreground main image padding:
  // - In fit mode we intentionally give bigger bottom padding to visually "push image upward"
  //   so the lower container area doesn't feel empty.
  const fitPaddingClass =
    fitMode === "fit"
      ? "object-contain px-4 pt-3 pb-10 md:px-5 md:pt-4 md:pb-14"
      : "object-cover";

  return (
    <div className="w-full">
      {/* ===================== Mobile (MyProtein-like swipe) ===================== */}
      <div className="md:hidden">
        <div className="relative w-full overflow-hidden rounded-2xl bg-black">
          {/* Swipe track */}
          <div
            ref={mobileTrackRef}
            className="flex w-full overflow-x-auto snap-x snap-mandatory scroll-smooth"
            style={{
              WebkitOverflowScrolling: "touch",
              scrollbarWidth: "none",
            }}
          >
            {sorted.map((img, index) => {
              return (
                <div
                  key={img.publicId}
                  className="relative w-full flex-shrink-0 snap-center"
                >
                  <div className="relative aspect-[4/5] w-full">
                    {/* Background “fill” layer (always cover + blur) */}
                    <Image
                      src={img.url}
                      alt=""
                      fill
                      aria-hidden
                      sizes="100vw"
                      className="object-cover scale-110 blur-2xl opacity-40"
                      quality={60}
                      priority={index === 0}
                    />

                    {/* Foreground image (mobile: always fit/contain for product-like feel) */}
                    <Image
                      src={img.url}
                      alt={`${productName} - Image ${index + 1}`}
                      fill
                      sizes="100vw"
                      className="object-contain px-4 pt-3 pb-10"
                      quality={85}
                      priority={index === 0}
                    />

                    {/* Counter (mobile) */}
                    {sorted.length > 1 && (
                      <div className="absolute top-3 right-3 rounded-full bg-white/75 px-3 py-1 text-xs backdrop-blur">
                        {index + 1} / {sorted.length}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Dots */}
          {sorted.length > 1 && (
            <div className="flex items-center justify-center gap-2 py-3">
              {sorted.map((_, i) => {
                const active = i === selectedIndex;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => scrollToMobileIndex(i)}
                    aria-label={`Go to image ${i + 1}`}
                    className={[
                      "h-2 w-2 rounded-full transition",
                      active ? "bg-black/80" : "bg-black/20",
                    ].join(" ")}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ===================== Desktop ===================== */}
      <div className="hidden md:block space-y-3">
        {/* Main */}
        <div className="relative w-full overflow-hidden rounded-2xl bg-black">
          <div className="relative aspect-[4/5] w-full max-h-[720px]">
            {/* Background “fill” layer (always cover + blur) */}
            <Image
              src={selected.url}
              alt=""
              fill
              aria-hidden
              sizes="(max-width: 1279px) 50vw, 50vw"
              className="object-cover scale-110 blur-2xl opacity-40"
              quality={60}
              priority={selectedIndex === 0}
            />

            {/* Foreground main image (fit or fill) */}
            <Image
              src={selected.url}
              alt={`${productName} - Image ${selectedIndex + 1}`}
              fill
              sizes="(max-width: 1279px) 50vw, 50vw"
              className={["transition-all duration-300", fitPaddingClass].join(
                " "
              )}
              quality={85}
              priority={selectedIndex === 0}
            />

            {/* Counter */}
            {sorted.length > 1 && (
              <div className="absolute bottom-3 left-3 rounded-full bg-white/75 px-3 py-1 text-xs backdrop-blur">
                {selectedIndex + 1} / {sorted.length}
              </div>
            )}

            {/* Controls: arrows moved to bottom-right (desktop) */}
            {sorted.length > 1 && (
              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={prev}
                  aria-label="Previous image"
                  className="h-10 w-10 inline-flex items-center justify-center rounded-full bg-white/85 backdrop-blur hover:bg-white transition shadow-sm"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={next}
                  aria-label="Next image"
                  className="h-10 w-10 inline-flex items-center justify-center rounded-full bg-white/85 backdrop-blur hover:bg-white transition shadow-sm"
                >
                  →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Thumbnails */}
        {sorted.length > 1 && (
          <div className="space-y-2">
            {/* Fit/Fill toggle moved to top-right of thumbnail area */}
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() =>
                  setFitMode((m) => (m === "fit" ? "fill" : "fit"))
                }
                className="rounded-full bg-black/5 px-3 py-1 text-xs font-medium hover:bg-black/10 transition"
              >
                {fitMode === "fit" ? "Fill" : "Fit"}
              </button>
            </div>

            <div ref={thumbsRef} className="flex gap-2 overflow-x-auto pb-2">
              {sorted.map((img, index) => {
                const active = index === selectedIndex;
                return (
                  <button
                    key={img.publicId}
                    ref={active ? activeBtnRef : null}
                    type="button"
                    onClick={() => setSelectedIndex(index)}
                    className={[
                      "relative flex-shrink-0 h-16 w-16 overflow-hidden rounded-lg border-2 transition",
                      active
                        ? "border-black"
                        : "border-transparent hover:border-gray-300",
                    ].join(" ")}
                    aria-label={`Select image ${index + 1}`}
                  >
                    <Image
                      src={img.url}
                      alt={`${productName} thumbnail ${index + 1}`}
                      fill
                      sizes="64px"
                      className="object-cover"
                      quality={70}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
