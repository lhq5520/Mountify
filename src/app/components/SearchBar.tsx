"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Loader2 } from "lucide-react";
import Link from "next/link";

interface Suggestion {
  id: number;
  name: string;
  price: number;
  imageUrl: string;
}

interface SearchBarProps {
  className?: string;
  placeholder?: string;
}

export default function SearchBar({
  className = "",
  placeholder = "Search products...",
}: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce search
  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/products/search?q=${encodeURIComponent(query)}&limit=6`
        );
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.suggestions);
          setIsOpen(data.suggestions.length > 0);
        }
      } catch (e) {
        console.error("Search failed:", e);
      } finally {
        setLoading(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [query]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard navigation
  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && suggestions[activeIndex]) {
          router.push(`/products/${suggestions[activeIndex].id}`);
          setIsOpen(false);
          setQuery("");
        } else if (query.trim()) {
          router.push(`/products?search=${encodeURIComponent(query)}`);
          setIsOpen(false);
        }
        break;
      case "Escape":
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/products?search=${encodeURIComponent(query)}`);
      setIsOpen(false);
    }
  }

  function clearSearch() {
    setQuery("");
    setSuggestions([]);
    setIsOpen(false);
    inputRef.current?.focus();
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <form onSubmit={handleSubmit}>
        <div className="relative">
          {/* Search Icon */}
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]"
          />

          {/* Input */}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(-1);
            }}
            onFocus={() => {
              if (suggestions.length > 0) setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full pl-11 pr-10 py-3 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-primary)] focus:outline-none transition-colors"
          />

          {/* Loading / Clear Button */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            {loading ? (
              <Loader2
                size={18}
                className="text-[var(--color-text-tertiary)] animate-spin"
              />
            ) : query ? (
              <button
                type="button"
                onClick={clearSearch}
                className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors"
              >
                <X size={18} />
              </button>
            ) : null}
          </div>
        </div>
      </form>

      {/* Suggestions Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-lg border border-[var(--color-border)] overflow-hidden z-50">
          <div className="p-2">
            <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
              Top Suggestions
            </p>

            {suggestions.map((item, index) => (
              <Link
                key={item.id}
                href={`/products/${item.id}`}
                onClick={() => {
                  setIsOpen(false);
                  setQuery("");
                }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  index === activeIndex
                    ? "bg-[var(--color-background)]"
                    : "hover:bg-[var(--color-background)]"
                }`}
              >
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-10 h-10 rounded-lg object-cover bg-gray-100"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                    {item.name}
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    ${Number(item.price).toFixed(2)}
                  </p>
                </div>
              </Link>
            ))}

            {/* View All Results */}
            {query.trim() && (
              <button
                onClick={() => {
                  router.push(`/products?search=${encodeURIComponent(query)}`);
                  setIsOpen(false);
                }}
                className="w-full px-3 py-2.5 mt-1 text-sm text-[var(--color-primary)] hover:bg-[var(--color-background)] rounded-lg transition-colors text-left"
              >
                View all results for "{query}"
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
