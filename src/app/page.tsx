// src/app/page.tsx
import Link from "next/link";
import Image from "next/image";

// Toggle: normal mode / sale mode
const IS_SALE = false;

const NORMAL_HERO = {
  badge: "Designed for drivers",
  title: "Premium parts.\nBuilt for real driving.",
  subtitle:
    "Minimal, purpose-built hardware for people who actually enjoy being behind the wheel — from phone mounts to aero and chassis upgrades.",
  primaryCta: "Shop now",
  secondaryCta: "Explore products",
  imageSrc: "/images/home.JPG",
  imageAlt: "Driver-focused interior with clean mounts and hardware",
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
              <p className="inline-flex items-center rounded-full bg-white/10 px-4 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-white/80">
                {HERO.badge}
              </p>

              {/* title */}
              <h1 className="whitespace-pre-line text-3xl md:text-5xl font-semibold tracking-tight text-white">
                {HERO.title}
              </h1>

              {/* subtitle */}
              <p className="text-sm md:text-base text-white/80 leading-relaxed max-w-lg">
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
      <section className="bg-gradient-to-b from-black to-[#050509] text-white/80 py-10 md:py-14">
        <div className="container-custom max-w-3xl text-sm md:text-base leading-relaxed">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40 mb-2">
            Our story
          </p>
          <p>
            Mountify started as a small experiment in a parking lot — trying to
            mount a phone and data without rattles, clutter, or cheap plastic.
            We now design small-batch hardware focused on feel, everyday
            usability, and clean integration with modern interiors.
          </p>
          <p className="mt-3">
            No fake carbon, no loud branding. Just parts that make your car
            nicer to live with and more fun to drive.
          </p>
        </div>
      </section>
    </main>
  );
}
