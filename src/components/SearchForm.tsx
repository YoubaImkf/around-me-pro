"use client";

import React, { useState, useEffect, useRef, useId } from "react";
import CategorySelector from "./CategorySelector";
import NafCodeSelector from "./NafCodeSelector";
import { semanticSuggester } from "@/lib/semanticSearch";
import { getCategoryById } from "@/lib/categories";

interface SearchFormProps {
  city: string;
  radius: number;
  onlyActive: boolean;
  initialNafCode?: string;
  onSearch: (params: { city: string; radius: number; categoryIds: string[]; onlyActive: boolean; nafCode: string }) => void;
  loading: boolean;
  selectedCategoryIds: string[];
  setSelectedCategoryIds: (ids: string[]) => void;
  onRadiusChange?: (radius: number) => void;
  onCitySelect?: (cityName: string, coordinates: [number, number]) => void;
}

interface CitySuggestion {
  nom: string;
  code: string;
  codesPostaux: string[];
  centre?: {
    type: string;
    coordinates: [number, number];
  };
}

export default function SearchForm({
  city,
  radius,
  onlyActive,
  initialNafCode = "",
  onSearch,
  loading,
  selectedCategoryIds,
  setSelectedCategoryIds,
  onRadiusChange,
  onCitySelect
}: SearchFormProps) {
  const [cityInput, setCityInput] = useState("");
  const [radiusState, setRadiusState] = useState(10);
  const [radiusInputString, setRadiusInputString] = useState("10");
  const [onlyActiveState, setOnlyActiveState] = useState(true);
  const [citySuggestions, setCitySuggestions] = useState<CitySuggestion[]>([]);
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
  const [cityFocusedIndex, setCityFocusedIndex] = useState(-1);

  // Sync cityInput when city prop changes from map click or initial search
  useEffect(() => {
    setCityInput(city);
  }, [city]);

  // Sync radiusState when radius prop changes externally
  useEffect(() => {
    setRadiusState(radius);
    setRadiusInputString(radius.toString().replace(".", ","));
  }, [radius]);

  // Sync onlyActiveState when onlyActive prop changes externally
  useEffect(() => {
    setOnlyActiveState(onlyActive);
  }, [onlyActive]);

  const handleRadiusInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    setRadiusInputString(rawVal);

    // Normalize comma to dot, parse as float
    const normalized = rawVal.replace(",", ".");
    const parsed = parseFloat(normalized);
    if (!isNaN(parsed) && parsed > 0) {
      setRadiusState(parsed);
      if (onRadiusChange) onRadiusChange(parsed);
    }
  };

  const handleRadiusInputBlur = () => {
    const normalized = radiusInputString.replace(",", ".");
    const parsed = parseFloat(normalized);
    if (isNaN(parsed) || parsed <= 0) {
      setRadiusInputString(radiusState.toString().replace(".", ","));
    } else {
      setRadiusInputString(parsed.toString().replace(".", ","));
    }
  };

  // Future Semantic phase extension states
  const [jobTitle, setJobTitle] = useState("");
  const [semanticSuggestions, setSemanticSuggestions] = useState<string[]>([]);
  
  const [nafCodeState, setNafCodeState] = useState(initialNafCode);

  useEffect(() => {
    setNafCodeState(initialNafCode);
  }, [initialNafCode]);

  const cityContainerRef = useRef<HTMLDivElement>(null);
  const cityInputRef = useRef<HTMLInputElement>(null);
  const cityDropdownRef = useRef<HTMLDivElement>(null);

  const cityInputId = useId();
  const radiusInputId = useId();
  const jobInputId = useId();

  // Handle City Autocomplete via public French Government API (geo.api.gouv.fr)
  useEffect(() => {
    const trimmedQuery = cityInput.trim();
    if (trimmedQuery.length < 2) {
      setCitySuggestions([]);
      return;
    }

    const abortController = new AbortController();
    
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(
            trimmedQuery
          )}&limit=5&fields=nom,code,codesPostaux,centre&boost=population`,
          { 
            headers: { "User-Agent": "AroundMePro/1.0" },
            signal: abortController.signal
          }
        );
        if (response.ok) {
          const data = await response.json();
          setCitySuggestions(data);
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("City autocomplete fetch failed", err);
        }
      }
    }, 250); // Fast 250ms debounce

    return () => {
      clearTimeout(timer);
      abortController.abort();
    };
  }, [cityInput]);

  // Click outside listener for city dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        cityContainerRef.current &&
        !cityContainerRef.current.contains(event.target as Node)
      ) {
        setIsCityDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Semantic job-title category inference observer
  useEffect(() => {
    const trimmedJob = jobTitle.trim();
    if (trimmedJob.length < 2) {
      setSemanticSuggestions([]);
      return;
    }

    const inferSectors = async () => {
      // Execute local semantic search implementation (easily swappable for LLM endpoint)
      const suggestions = await semanticSuggester.suggestCategories(trimmedJob);
      setSemanticSuggestions(suggestions);
    };

    inferSectors();
  }, [jobTitle]);

  const handleCityKeyDown = (e: React.KeyboardEvent) => {
    if (!isCityDropdownOpen && citySuggestions.length > 0) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        e.preventDefault();
        setIsCityDropdownOpen(true);
        setCityFocusedIndex(0);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setCityFocusedIndex((prev) =>
          prev < citySuggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setCityFocusedIndex((prev) =>
          prev > 0 ? prev - 1 : citySuggestions.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (cityFocusedIndex >= 0 && cityFocusedIndex < citySuggestions.length) {
          handleSelectCity(citySuggestions[cityFocusedIndex]);
        } else {
          // If no suggestion focused, just submit form
          handleSubmit(e as any);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsCityDropdownOpen(false);
        break;
      default:
        break;
    }
  };

  const handleSelectCity = (suggestion: CitySuggestion) => {
    setCityInput(suggestion.nom);
    setIsCityDropdownOpen(false);
    setCitySuggestions([]); // Clear suggestions to prevent reopening immediately
    setCityFocusedIndex(-1);
    
    // Optional: Only refocus if strictly necessary, otherwise it might re-trigger the dropdown
    // cityInputRef.current?.focus();

    if (suggestion.centre?.coordinates) {
      const [lng, lat] = suggestion.centre.coordinates;
      if (onCitySelect) {
        onCitySelect(suggestion.nom, [lat, lng]);
      }
    }
  };

  const handleApplySemanticCategory = (catId: string) => {
    if (!selectedCategoryIds.includes(catId)) {
      setSelectedCategoryIds([...selectedCategoryIds, catId]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cityInput.trim()) return;
    onSearch({
      city: cityInput.trim(),
      radius: radiusState,
      categoryIds: selectedCategoryIds,
      onlyActive: onlyActiveState,
      nafCode: nafCodeState
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-5.5 p-5 bg-white border border-zinc-200/50 rounded-xl shadow-xs dark:bg-[#272729] dark:border-zinc-800"
    >
      {/* City search input */}
      <div ref={cityContainerRef} className="relative">
        <label
          htmlFor={cityInputRef.current?.id || cityInputId}
          className="block text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1.5"
        >
          Ville en France
        </label>
        <div className="relative">
          <input
            ref={cityInputRef}
            id={cityInputId}
            type="text"
            required
            autoComplete="off"
            value={cityInput}
            onChange={(e) => {
              setCityInput(e.target.value);
              setIsCityDropdownOpen(true);
              setCityFocusedIndex(-1);
            }}
            onFocus={() => {
              if (citySuggestions.length > 0) setIsCityDropdownOpen(true);
            }}
            onBlur={() => {
              // Delay hiding to allow clicks on dropdown to register
              setTimeout(() => setIsCityDropdownOpen(false), 200);
            }}
            onKeyDown={handleCityKeyDown}
            placeholder="Ex: Paris, Lyon, Bordeaux..."
            className="w-full h-10 pl-9 pr-3.5 bg-white border border-zinc-200 rounded-lg text-xs font-medium text-zinc-900 shadow-xs transition-all focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400 placeholder-zinc-400 dark:bg-[#1a1a1c] dark:border-zinc-800 dark:text-zinc-100 dark:focus:ring-zinc-600 dark:focus:border-zinc-600"
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4"
            >
              <path
                fillRule="evenodd"
                d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.374 7.627.83.8 1.653 1.38 2.273 1.765.312.193.572.337.758.433.11.057.202.102.263.135l.017.008.006.003M10 11a2 2 0 100-4 2 2 0 000 4z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>

        {/* Autocomplete Dropdown */}
        {isCityDropdownOpen && citySuggestions.length > 0 && (
          <div
            ref={cityDropdownRef}
            role="listbox"
            className="absolute z-50 w-full mt-1 bg-white border border-zinc-200/50 rounded-lg shadow-xl max-h-60 overflow-y-auto overflow-x-hidden animate-in fade-in slide-in-from-top-2 duration-200 dark:bg-[#272729] dark:border-zinc-800"
          >
            {citySuggestions.map((suggestion, index) => (
              <div
                key={suggestion.code}
                role="option"
                aria-selected={index === cityFocusedIndex}
                onMouseDown={(e) => {
                  // Use onMouseDown instead of onClick to prevent onBlur from firing before selection is complete
                  e.preventDefault();
                  handleSelectCity(suggestion);
                }}
                onMouseEnter={() => setCityFocusedIndex(index)}
                className={`px-4 py-3 cursor-pointer transition-colors border-b border-zinc-100 last:border-0 dark:border-zinc-900/40 hover:bg-zinc-50 dark:hover:bg-zinc-800 ${
                  index === cityFocusedIndex
                    ? "bg-zinc-50 dark:bg-zinc-800"
                    : ""
                }`}
              >
                <div className="flex flex-col">
                  <span className="font-bold text-zinc-900 dark:text-zinc-50 text-sm">
                    {suggestion.nom}
                  </span>
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {suggestion.codesPostaux?.[0] || ""} - {suggestion.code.substring(0, 2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Radius Input */}
      <div>
        <label
          htmlFor={radiusInputId}
          className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block mb-2"
        >
          Rayon de recherche
        </label>
        <div className="relative flex items-center">
          <input
            id={radiusInputId}
            type="text"
            value={radiusInputString}
            onChange={handleRadiusInputChange}
            onBlur={handleRadiusInputBlur}
            className="w-full bg-white dark:bg-[#1a1a1c] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3.5 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-400 pr-10"
            placeholder="Ex: 1,2 ou 10 ou 57"
          />
          <span className="absolute right-3.5 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase pointer-events-none select-none">
            km
          </span>
        </div>
        
        {/* Clean, minimal fast distance filters */}
        <div className="flex items-center gap-1.5 mt-2 select-none">
          <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mr-0.5">
            Filtres rapides :
          </span>
          {[1, 5, 10, 20].map((val) => {
            const isActive = radiusState === val;
            return (
              <button
                key={val}
                type="button"
                onClick={() => {
                  setRadiusState(val);
                  setRadiusInputString(val.toString());
                  if (onRadiusChange) onRadiusChange(val);
                }}
                className={`px-2 py-0.5 text-[9px] font-bold rounded transition-all cursor-pointer border ${
                  isActive
                    ? "bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100"
                    : "bg-zinc-50/50 hover:bg-zinc-100 text-zinc-500 border-zinc-200/40 dark:bg-zinc-900/30 dark:hover:bg-zinc-900/60 dark:text-zinc-400 dark:border-zinc-800/60"
                }`}
              >
                {val} km
              </button>
            );
          })}
        </div>
      </div>

      {/* Category selector */}
      <CategorySelector
        selectedCategoryIds={selectedCategoryIds}
        onChange={setSelectedCategoryIds}
      />

      <NafCodeSelector value={nafCodeState} onChange={setNafCodeState} />

      {/* Active Only Filter Switch */}
      <div className="flex items-center justify-between p-3.5 bg-zinc-50 border border-zinc-200/50 rounded-lg dark:bg-zinc-900/10 dark:border-zinc-900">
        <div className="flex flex-col gap-0.5 select-none">
          <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
            Établissements actifs uniquement
          </span>
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
            Masquer les établissements définitivement fermés
          </span>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={onlyActiveState}
            onChange={(e) => setOnlyActiveState(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-zinc-200 dark:bg-zinc-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:after:bg-zinc-200 dark:after:border-zinc-600 peer-checked:bg-zinc-950 dark:peer-checked:bg-zinc-200 peer-focus:outline-none"></div>
        </label>
      </div>

      {/* Job Title Assistant (Semantic Inference Extension Point) */}
      <div className="p-3.5 bg-zinc-50 border border-zinc-200/50 rounded-lg dark:bg-zinc-900/10 dark:border-zinc-900">
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-3.5 h-3.5 text-zinc-450 dark:text-zinc-550"
          >
            <path d="M15.98 1.804a1 1 0 00-1.96 0l-.24 1.192a2.21 2.21 0 01-1.724 1.724l-1.192.24a1 1 0 000 1.96l1.192.24a2.21 2.21 0 011.724 1.724l.24 1.192a1 1 0 001.96 0l.24-1.192a2.21 2.21 0 011.724-1.724l1.192-.24a1 1 0 000-1.96l-1.192-.24a2.21 2.21 0 01-1.724-1.724l-.24-1.192zM7.5 7.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
            <path d="M10.293 11.293a1 1 0 011.414 0l4.5 4.5a1 1 0 01-1.414 1.414l-4.5-4.5a1 1 0 010-1.414zM2.5 13.5A1.5 1.5 0 114 15a1.5 1.5 0 01-1.5-1.5z" />
          </svg>
          <span>Assistant Métier (Recherche Sémantique)</span>
        </div>
        <input
          id={jobInputId}
          type="text"
          value={jobTitle}
          onChange={(e) => setJobTitle(e.target.value)}
          placeholder="Ex: Backend Developer, Childcare Assistant..."
          className="w-full h-8 px-2.5 bg-white border border-zinc-200 rounded-md text-xs font-medium text-zinc-900 shadow-xs transition-all focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400 placeholder-zinc-400 dark:bg-[#1a1a1c] dark:border-zinc-800 dark:text-zinc-100 dark:focus:ring-zinc-600"
        />

        {/* Semantic suggestions display */}
        {semanticSuggestions.length > 0 && (
          <div className="mt-3">
            <p className="text-[10px] text-zinc-400 font-bold dark:text-zinc-500 mb-1.5">
              Secteurs suggérés (cliquez pour ajouter) :
            </p>
            <div className="flex flex-wrap gap-1.5">
              {semanticSuggestions.map((catId) => {
                const category = getCategoryById(catId);
                if (!category) return null;
                const isSelected = selectedCategoryIds.includes(category.id);
                return (
                  <button
                    key={`sug-${category.id}`}
                    type="button"
                    onClick={() => {
                      if (!isSelected) {
                        setSelectedCategoryIds([...selectedCategoryIds, category.id]);
                      }
                    }}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 border rounded-md text-[10px] font-bold transition-all ${
                      isSelected
                        ? "bg-zinc-900 border-zinc-900 text-white dark:bg-zinc-100 dark:border-zinc-100 dark:text-zinc-900 shadow-xs"
                        : "bg-white border-zinc-200 text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50 dark:bg-zinc-900/10 dark:border-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800/40"
                    }`}
                  >
                    <span>{category.label}</span>
                    {isSelected && (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full h-10 flex items-center justify-center gap-2 bg-zinc-900 text-white rounded-lg text-xs font-bold hover:bg-zinc-950 transition-all shadow-xs disabled:bg-zinc-100 disabled:text-zinc-400 disabled:cursor-not-allowed dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white dark:disabled:bg-zinc-900/60 dark:disabled:text-zinc-600 cursor-pointer"
      >
        {loading ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Recherche en cours...
          </>
        ) : (
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-3.5 h-3.5"
            >
              <path
                fillRule="evenodd"
                d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                clipRule="evenodd"
              />
            </svg>
            Découvrir les entreprises
          </>
        )}
      </button>
    </form>
  );
}
