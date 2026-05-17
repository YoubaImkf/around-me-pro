"use client";

import React, { useState, useRef, useEffect, useId } from "react";
import { COMPANY_CATEGORIES, CompanyCategory } from "@/lib/categories";

interface CategorySelectorProps {
  selectedCategoryIds: string[];
  onChange: (selectedIds: string[]) => void;
}

export default function CategorySelector({
  selectedCategoryIds,
  onChange
}: CategorySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(-1);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const inputId = useId();
  const listboxId = useId();

  // Filter categories by search term
  const filteredCategories = COMPANY_CATEGORIES.filter(
    (cat) =>
      cat.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cat.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard navigation handler for accessibility
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setIsOpen(true);
        setFocusedIndex(0);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setFocusedIndex((prev) =>
          prev < filteredCategories.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredCategories.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < filteredCategories.length) {
          handleToggleCategory(filteredCategories[focusedIndex].id);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        inputRef.current?.focus();
        break;
      case "Tab":
        // Keep standard tab navigation working, just close dropdown
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  // Scroll focused option into view
  useEffect(() => {
    if (focusedIndex < 0 || !dropdownRef.current) return;
    const activeEl = dropdownRef.current.querySelector(
      `[data-index="${focusedIndex}"]`
    ) as HTMLElement;
    if (activeEl) {
      activeEl.scrollIntoView({ block: "nearest" });
    }
  }, [focusedIndex]);

  const handleToggleCategory = (id: string) => {
    const isSelected = selectedCategoryIds.includes(id);
    if (isSelected) {
      onChange(selectedCategoryIds.filter((cid) => cid !== id));
    } else {
      onChange([...selectedCategoryIds, id]);
    }
    // Retain focus in the search box
    inputRef.current?.focus();
  };

  const handleRemoveCategory = (id: string, e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    onChange(selectedCategoryIds.filter((cid) => cid !== id));
    inputRef.current?.focus();
  };

  // Get selected category details
  const selectedCategories = COMPANY_CATEGORIES.filter((cat) =>
    selectedCategoryIds.includes(cat.id)
  );

  return (
    <div ref={containerRef} className="relative w-full">
      <label
        htmlFor={inputId}
        className="block text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1.5"
      >
        Secteurs d&apos;activité
      </label>

      {/* Selected Tags Area */}
      {selectedCategories.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2.5">
          {selectedCategories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold rounded border shadow-xs transition-all select-none"
              style={{
                backgroundColor: `${cat.color}0a`,
                color: cat.color,
                borderColor: `${cat.color}25`,
              }}
            >
              <span>{cat.label}</span>
              <button
                type="button"
                aria-label={`Enlever le secteur ${cat.label}`}
                onClick={(e) => handleRemoveCategory(cat.id, e)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleRemoveCategory(cat.id, e);
                  }
                }}
                className="w-3.5 h-3.5 rounded-sm flex items-center justify-center font-bold hover:bg-black/5 dark:hover:bg-white/5 transition-colors focus:outline-none"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input wrapper */}
      <div className="relative">
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={listboxId}
          aria-autocomplete="list"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (!isOpen) setIsOpen(true);
            setFocusedIndex(0);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={
            selectedCategoryIds.length === 0
              ? "Rechercher ou sélectionner des secteurs..."
              : "Ajouter d'autres secteurs..."
          }
          className="min-h-11 w-full rounded-xl border border-zinc-200 bg-white px-3.5 text-sm font-medium text-zinc-900 shadow-xs transition-all placeholder-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-800 dark:bg-[#1a1a1c] dark:text-zinc-100 dark:focus:border-zinc-600 dark:focus:ring-zinc-600"
        />

        {/* Floating indicator */}
        <button
          type="button"
          tabIndex={-1}
          aria-label="Afficher les options"
          onClick={() => setIsOpen((prev) => !prev)}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 focus:outline-none dark:text-zinc-500 dark:hover:text-zinc-400"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
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

      {/* Accessible Dropdown Listbox */}
      {isOpen && filteredCategories.length > 0 && (
        <div
          ref={dropdownRef}
          id={listboxId}
          role="listbox"
          aria-label="Secteurs d'activité suggérés"
          className="absolute z-30 w-full mt-1 max-h-60 overflow-y-auto bg-white border border-zinc-200/50 rounded-lg shadow-md dark:bg-[#272729] dark:border-zinc-800"
        >
          {filteredCategories.map((cat, index) => {
            const isSelected = selectedCategoryIds.includes(cat.id);
            const isFocused = index === focusedIndex;

            return (
              <div
                key={cat.id}
                role="option"
                id={`option-${cat.id}`}
                aria-selected={isSelected}
                data-index={index}
                onClick={() => handleToggleCategory(cat.id)}
                onMouseEnter={() => setFocusedIndex(index)}
                className={`flex min-h-11 cursor-pointer select-none items-start gap-3 border-b border-zinc-100 px-3 py-3 transition-colors last:border-0 dark:border-zinc-900/40 ${
                  isFocused
                    ? "bg-zinc-50 dark:bg-zinc-900/50"
                    : ""
                }`}
              >
                {/* Checked indicator */}
                <div
                  className={`mt-0.5 w-3.5 h-3.5 flex items-center justify-center rounded border transition-all ${
                    isSelected
                      ? "bg-zinc-950 border-zinc-950 text-white dark:bg-zinc-100 dark:border-zinc-100 dark:text-zinc-950"
                      : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#1a1a1c]"
                  }`}
                >
                  {isSelected && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="w-2.5 h-2.5 stroke-2"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      {cat.label}
                    </span>
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: cat.color }}
                      aria-hidden="true"
                    />
                  </div>
                  <p className="text-[10px] text-zinc-400 truncate dark:text-zinc-500 mt-0.5">
                    {cat.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isOpen && filteredCategories.length === 0 && (
        <div className="absolute z-30 w-full mt-1.5 px-4 py-3 bg-white border border-zinc-200/50 rounded-lg shadow-md text-xs text-zinc-500 text-center dark:bg-[#272729] dark:border-zinc-800 dark:text-zinc-400">
          Aucun secteur ne correspond à votre recherche.
        </div>
      )}
    </div>
  );
}
