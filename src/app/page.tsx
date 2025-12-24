// src/app/page.tsx
import Link from "next/link";
import Image from "next/image";

// Toggle: normal mode / sale mode
const IS_SALE = false;

const NORMAL_HERO = {
  badge: "Built By Curiosity",
  title: "Small-Batch 3D Prints.\nMade to Be Used.",
  subtitle:
    "An experimental store for 3D-printed goods \nFrom key shells and mounts \nTo small, practical, and occasionally fun creations.",
  primaryCta: "Shop now",
  secondaryCta: "Explore products",
  imageSrc: "/images/home3.png",
  imageAlt: "Workbench-style scene with 3D-printed objects and tools",
};

const SALE_HERO = {
  badge: "Black Friday · Up to 30% off",
  title: "Gear up.\nDrive harder.",
  subtitle:
    "Limited-time pricing on our most popular mounts and performance parts. Built to stay solid on bad roads and late-night runs.",
  primaryCta: "Shop the sale",
  secondaryCta: "View all products",
  imageSrc: "/images/home.JPG",
  imageAlt: "Black Friday automotive parts sale hero",
};

const HERO = IS_SALE ? SALE_HERO : NORMAL_HERO;

export default function Home() {
  return (
    <main className="bg-black">
      {/* Fullscreen background hero */}
      <section className="relative h-[70vh] md:h-[80vh] w-full overflow-hidden">
        {/* Background image */}
        <Image
          src={HERO.imageSrc}
          alt={HERO.imageAlt}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />

        {/* Left gradient overlay to ensure text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/55 to-black/5" />

        {/* Content layer */}
        <div className="relative z-10 flex h-full items-center">
          <div className="container-custom">
            <div className="max-w-xl space-y-6">
              {/* badge */}
              <p className="inline-flex items-center rounded-full bg-white/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/70">
                {HERO.badge}
              </p>

              {/* title */}
              <h1 className="whitespace-pre-line text-balance text-3xl md:text-[46px] lg:text-[56px] font-semibold leading-[1.03] tracking-[-0.015em] text-white drop-shadow-md">
                {HERO.title}
              </h1>

              {/* subtitle */}
              <p className="whitespace-pre-line text-base md:text-lg text-balance text-white/85 leading-relaxed tracking-[0.01em] max-w-xl md:max-w-2xl">
                {HERO.subtitle}
              </p>

              {/* CTA buttons */}
              <div className="flex flex-wrap gap-3 pt-2">
                <Link
                  href="/products"
                  className="inline-flex items-center justify-center rounded-full bg-white px-6 py-2.5 text-sm md:text-base font-medium text-black shadow-sm transition hover:bg-gray-100"
                >
                  {HERO.primaryCta} →
                </Link>

                <Link
                  href="/products"
                  className="inline-flex items-center justify-center rounded-full border border-white/40 bg-white/5 px-5 py-2 text-sm font-medium text-white/80 backdrop-blur-sm hover:bg-white/10 hover:text-white"
                >
                  {HERO.secondaryCta}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Brand story section (content unchanged, placeholder text) */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#f6f7fb] via-[#f1f2f6] to-[#e7e9ef] text-slate-900 py-10 md:py-14">
        {/* Subtle top fade to tie into darker hero image */}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/8 via-transparent to-transparent"
          aria-hidden
        />

        <div className="relative container-custom max-w-3xl text-sm md:text-base leading-relaxed md:leading-7 text-slate-800 text-pretty">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">
            Our story
          </p>
          <p className="text-slate-700">
            Mountify started as a personal experiment — building a real
            e-commerce site from scratch, driven by a love for technology and
            the urge to make things. 3D printing became the fastest way to turn
            ideas into physical objects.
          </p>
          <p className="mt-3 text-slate-700">
            This site is a playground for creating small, useful, and sometimes
            just fun products. No hype, no mass production — just thoughtful
            designs, printed in small batches, and refined as we keep learning
            and building.
          </p>
        </div>
      </section>
    </main>
  );
}
