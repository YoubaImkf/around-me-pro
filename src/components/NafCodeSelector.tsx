"use client";

import React, { useState, useRef, useEffect, useId, useMemo, useCallback } from "react";
import {
  getNafCodeByCode,
  searchNafCodes,
  type NafCodeEntry,
} from "@/lib/nafCodes";

interface NafCodeSelectorProps {
  value: string;
  onChange: (code: string) => void;
}

export default function NafCodeSelector({ value, onChange }: NafCodeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const inputId = useId();
  const listboxId = useId();
  const hintId = useId();

  const selectedEntry = useMemo(
    () => (value ? getNafCodeByCode(value) : undefined),
    [value]
  );

  const suggestions = useMemo(
    () => searchNafCodes(searchTerm),
    [searchTerm]
  );

  const showCompactSelection = Boolean(selectedEntry && !isOpen);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (focusedIndex < 0 || !dropdownRef.current) return;
    const activeEl = dropdownRef.current.querySelector(
      `[data-index="${focusedIndex}"]`
    ) as HTMLElement;
    activeEl?.scrollIntoView({ block: "nearest" });
  }, [focusedIndex]);

  const selectEntry = useCallback(
    (entry: NafCodeEntry) => {
      onChange(entry.code);
      setSearchTerm("");
      setIsOpen(false);
      setFocusedIndex(-1);
    },
    [onChange]
  );

  const clearSelection = useCallback(
    (e?: React.MouseEvent | React.KeyboardEvent) => {
      e?.stopPropagation();
      onChange("");
      setSearchTerm("");
      setIsOpen(false);
      setFocusedIndex(-1);
      inputRef.current?.focus();
    },
    [onChange]
  );

  const openSearch = useCallback(() => {
    setIsOpen(true);
    setSearchTerm("");
    setFocusedIndex(0);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !searchTerm && value) {
      e.preventDefault();
      clearSelection();
      return;
    }

    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setIsOpen(true);
        setFocusedIndex(suggestions.length > 0 ? 0 : -1);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setFocusedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusedIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < suggestions.length) {
          selectEntry(suggestions[focusedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        setSearchTerm("");
        setFocusedIndex(-1);
        inputRef.current?.focus();
        break;
      case "Tab":
        setIsOpen(false);
        setSearchTerm("");
        break;
      default:
        break;
    }
  };

  const showDropdown = isOpen;
  const hasQuery = searchTerm.trim().length > 0;
  const showEmptyState = showDropdown && hasQuery && suggestions.length === 0;

  return (
    <div ref={containerRef} className="relative w-full">
      <label
        {...(!showCompactSelection ? { htmlFor: inputId } : {})}
        className="block text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1.5"
      >
        Type d&apos;établissement
        <span className="ml-1 font-medium normal-case tracking-normal text-zinc-300 dark:text-zinc-600">
          (optionnel)
        </span>
      </label>

      {showCompactSelection && selectedEntry ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-start gap-2 rounded-lg border border-zinc-200/80 bg-zinc-50/80 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/40">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <span className="shrink-0 rounded border border-zinc-200 bg-white px-1.5 py-0.5 font-mono text-[10px] font-bold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
                  {selectedEntry.code}
                </span>
                <span className="truncate text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  {selectedEntry.shortLabel}
                </span>
              </div>
              <p className="line-clamp-2 text-[10px] leading-snug text-zinc-400 dark:text-zinc-500">
                {selectedEntry.label}
              </p>
            </div>
            <button
              type="button"
              onClick={clearSelection}
              aria-label="Retirer le filtre d'activité"
              className="mt-0.5 cursor-pointer flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-200/60 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-3.5 w-3.5"
                aria-hidden
              >
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>
          <button
            type="button"
            onClick={openSearch}
            className="cursor-pointer self-start text-[10px] font-bold text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            Changer d&apos;activité
          </button>
          <p id={hintId} className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500">
            Filtre actif sur ce code NAF pour affiner les résultats.
          </p>
        </div>
      ) : (
        <>
          <div className="relative">
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-3.5 w-3.5"
                aria-hidden
              >
                <path
                  fillRule="evenodd"
                  d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <input
              ref={inputRef}
              id={inputId}
              type="text"
              role="combobox"
              aria-expanded={showDropdown}
              aria-haspopup="listbox"
              aria-controls={listboxId}
              aria-autocomplete="list"
              aria-describedby={hintId}
              autoComplete="off"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                if (!isOpen) setIsOpen(true);
                setFocusedIndex(0);
                if (value) onChange("");
              }}
              onFocus={() => setIsOpen(true)}
              onKeyDown={handleKeyDown}
              placeholder="Ex : restaurant, logiciel, agence marketing…"
              className="min-h-11 w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-9 text-sm font-medium text-zinc-900 shadow-xs transition-all placeholder-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-800 dark:bg-[#1a1a1c] dark:text-zinc-100 dark:focus:border-zinc-600 dark:focus:ring-zinc-600"
            />
            {searchTerm && (
              <button
                type="button"
                tabIndex={-1}
                onClick={clearSelection}
                aria-label="Effacer la recherche"
                className="absolute right-8 top-1/2 -translate-y-1/2 cursor-pointer text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-3 w-3"
                >
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            )}
            <button
              type="button"
              tabIndex={-1}
              aria-label={isOpen ? "Fermer les suggestions" : "Afficher les suggestions"}
              onClick={() => {
                setIsOpen((prev) => !prev);
                if (!isOpen) inputRef.current?.focus();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-zinc-400 hover:text-zinc-600 focus:outline-none dark:text-zinc-500 dark:hover:text-zinc-400"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className={`h-3.5 w-3.5 transition-transform duration-200 ${
                  isOpen ? "rotate-180" : ""
                }`}
              >
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>

          <p id={hintId} className="mt-1.5 text-[10px] font-medium text-zinc-400 dark:text-zinc-500">
            Recherchez par métier ou secteur — le code NAF est appliqué automatiquement.
          </p>

          {showDropdown && suggestions.length > 0 && (
            <div
              ref={dropdownRef}
              id={listboxId}
              role="listbox"
              aria-label="Activités NAF suggérées"
              className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-zinc-200/50 bg-white shadow-md dark:border-zinc-800 dark:bg-[#272729]"
            >
              {!hasQuery && (
                <div className="border-b border-zinc-100 px-3 py-1.5 dark:border-zinc-900/40">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    Toutes les activités
                  </span>
                </div>
              )}
              {suggestions.map((entry, index) => {
                const isFocused = index === focusedIndex;
                const isSelected = value === entry.code;

                return (
                  <div
                    key={entry.code}
                    role="option"
                    aria-selected={isSelected}
                    data-index={index}
                    onClick={() => selectEntry(entry)}
                    onMouseEnter={() => setFocusedIndex(index)}
                    className={`cursor-pointer select-none border-b border-zinc-100 px-3 py-2 transition-colors last:border-0 dark:border-zinc-900/40 ${
                      isFocused ? "bg-zinc-50 dark:bg-zinc-900/50" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="shrink-0 rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-300">
                        {entry.code}
                      </span>
                      <span className="truncate text-xs font-bold text-zinc-900 dark:text-zinc-100 flex-1">
                        {entry.shortLabel}
                      </span>
                      {isSelected && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="h-3.5 w-3.5 shrink-0 text-zinc-900 dark:text-zinc-100"
                          aria-hidden
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {showEmptyState && (
            <div className="absolute z-30 mt-1 w-full rounded-lg border border-zinc-200/50 bg-white px-4 py-4 text-center shadow-md dark:border-zinc-800 dark:bg-[#272729]">
              <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                Aucune activité ne correspond à votre recherche.
              </p>
              <p className="mt-1 text-[10px] text-zinc-400 dark:text-zinc-500">
                Essayez un autre mot-clé (ex. « restauration », « conseil », « 62.01 »).
              </p>
            </div>
          )}
        </>
      )}

    </div>
  );
}
