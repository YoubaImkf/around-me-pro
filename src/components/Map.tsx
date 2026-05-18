"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-rotate";
import { getCategoryBySection } from "@/lib/categories";
import { formatAddress, getActivityLabel, getEstablishmentDisplayName } from "@/lib/establishments";
import { Company, Etablissement } from "@/types/company";

interface MapProps {
  center: [number, number]; // [lat, lon]
  radius: number; // in kilometers
  companies: Company[];
  selectedSiret?: string | null;
  onSelectEstablishment?: (company: Company, establishment: Etablissement) => void;
  onLongPressEstablishment?: (company: Company, establishment: Etablissement) => void;
  onMapClick?: (lat: number, lng: number) => void;
  customCenter?: [number, number] | null;
  theme: "light" | "dark";
  /** When false (hidden tab), skip resize work until visible again */
  isVisible?: boolean;
  isFullscreen?: boolean;
}

// Beautiful custom modern SVG marker icon builder
const createCustomIcon = (color: string, isSelected: boolean) => {
  const size = isSelected ? 38 : 30;
  const shadowFilter = isSelected ? "drop-shadow(0px 4px 6px rgba(0,0,0,0.3))" : "drop-shadow(0px 2px 3px rgba(0,0,0,0.2))";
  
  return L.divIcon({
    html: `
      <div class="marker-icon-inner" style="filter: ${shadowFilter}; cursor: pointer;">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" width="${size}" height="${size}">
          <path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
        </svg>
      </div>
    `,
    className: "custom-leaflet-marker",
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size]
  });
};

const createCenterIcon = () => {
  return L.divIcon({
    html: `
      <div style="filter: drop-shadow(0px 3px 6px rgba(37,99,235,0.4)); cursor: pointer;">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#2563eb" width="34" height="34">
          <path fill-rule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v5.25H6a.75.75 0 000 1.5h5.25V18a.75.75 0 001.5 0v-5.25H18a.75.75 0 000-1.5h-5.25V6z" clip-rule="evenodd" />
        </svg>
      </div>
    `,
    className: "custom-center-marker",
    iconSize: [34, 34],
    iconAnchor: [17, 17]
  });
};

export default function InteractiveMap({
  center,
  radius,
  companies,
  selectedSiret,
  onSelectEstablishment,
  onLongPressEstablishment,
  onMapClick,
  customCenter,
  theme,
  isVisible = true,
  isFullscreen = false
}: MapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const centerMarkerRef = useRef<L.Marker | null>(null);
  const markerGroupRef = useRef<L.FeatureGroup | null>(null);
  const markersMapRef = useRef<Map<string, L.Marker>>(new Map());
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const prevRadiusRef = useRef<number>(0);
  const [bearing, setBearing] = useState(0);
  const activeTimersRef = useRef<Set<NodeJS.Timeout>>(new Set());

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstance) return;

    // Create Map with disabled marker zoom animation to avoid rendering jitters,
    // disabled default scroll wheel zooming to prevent page scroll hijacking,
    // and disabled double-click zoom to use it for targeting search zones
    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      markerZoomAnimation: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      rotate: true,
      touchRotate: true,
      rotateControl: false
    } as any).setView(center, 12);

    const isMobile = window.matchMedia("(max-width: 1023px)").matches;
    L.control.zoom({ position: isMobile ? "bottomleft" : "bottomright" }).addTo(map);

    // Feature group to manage markers
    const markerGroup = L.featureGroup().addTo(map);

    // Double-click handler to select search center coordinates (prevent accidental shifts)
    map.on("dblclick", (e: L.LeafletMouseEvent) => {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    });

    map.on("rotate", () => {
      if (map.getBearing) {
        setBearing(map.getBearing());
      }
    });

    // Toggle scroll wheel zooming based on Ctrl key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey) {
        map.scrollWheelZoom.enable();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.ctrlKey) {
        map.scrollWheelZoom.disable();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    markerGroupRef.current = markerGroup;
    setMapInstance(map);

    // Clean up on unmount and reset refs to prevent memory leaks or stale layer collisions
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      map.remove();
      circleRef.current = null;
      centerMarkerRef.current = null;
      markerGroupRef.current = null;
      tileLayerRef.current = null;
      markersMapRef.current.clear();
      setMapInstance(null);
    };
  }, []);

  // Fix tile gaps after container resize (mobile tab switch, orientation)
  useEffect(() => {
    if (!mapInstance || !isVisible) return;

    const container = mapContainerRef.current;
    if (!container) return;

    const refresh = () => {
      requestAnimationFrame(() => {
        mapInstance.invalidateSize({ animate: false });
      });
    };

    refresh();

    const ro = new ResizeObserver(refresh);
    ro.observe(container);
    window.addEventListener("orientationchange", refresh);

    return () => {
      ro.disconnect();
      window.removeEventListener("orientationchange", refresh);
    };
  }, [mapInstance, isVisible]);

  // Dynamically swap map tile layers when theme switches, preserving center/zoom state!
  useEffect(() => {
    if (!mapInstance) return;

    // Safely remove previous tile layer to prevent memory leaks or overlay stacking
    if (tileLayerRef.current) {
      tileLayerRef.current.remove();
    }

    // Always use standard, bright Voyager light tiles so the dark theme does not impact the map!
    const tileUrl = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

    const newTileLayer = L.tileLayer(tileUrl, {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 20
    }).addTo(mapInstance);

    tileLayerRef.current = newTileLayer;
  }, [mapInstance, theme]);

  // Update center, radius, and circle overlay
  useEffect(() => {
    if (!mapInstance) return;

    // Pan map to new center smoothly
    mapInstance.panTo(center, { animate: true, duration: 0.8 });

    // Update or create radius circle
    if (circleRef.current) {
      circleRef.current.setLatLng(center);
      circleRef.current.setRadius(radius * 1000); // Leaflet expects radius in meters
    } else {
      circleRef.current = L.circle(center, {
        radius: radius * 1000,
        color: "#2563eb",
        fillColor: "#3b82f6",
        fillOpacity: 0.12,
        weight: 2,
        dashArray: "6, 6"
      }).addTo(mapInstance);
    }

    // Update or create custom center marker pin
    if (customCenter) {
      if (centerMarkerRef.current) {
        centerMarkerRef.current.setLatLng(customCenter);
      } else {
        centerMarkerRef.current = L.marker(customCenter, {
          icon: createCenterIcon(),
          zIndexOffset: 2000
        }).addTo(mapInstance);
        centerMarkerRef.current.bindPopup(
          `<div class="p-2 select-none" style="font-family: var(--font-sans), sans-serif; min-width: 150px;">
            <p class="text-xs font-extrabold text-blue-600 mb-0.5">📍 Point de recherche actif</p>
            <p class="text-[10px] text-zinc-500 font-medium">Coordonnées personnalisées sélectionnées sur la carte.</p>
          </div>`,
          { closeButton: false, offset: [0, 0] }
        );
      }
    } else {
      if (centerMarkerRef.current) {
        centerMarkerRef.current.remove();
        centerMarkerRef.current = null;
      }
    }

    // Adjust zoom dynamically based on radius ONLY if radius changed
    if (prevRadiusRef.current !== radius) {
      const calculateZoom = (r: number) => {
        if (r <= 2) return 14;
        if (r <= 5) return 13;
        if (r <= 12) return 12;
        if (r <= 25) return 11;
        return 10;
      };
      mapInstance.setZoom(calculateZoom(radius), { animate: true });
      prevRadiusRef.current = radius;
    }

  }, [mapInstance, center, radius, customCenter]);

  // Update Markers when companies change
  useEffect(() => {
    const markerGroup = markerGroupRef.current;
    if (!mapInstance || !markerGroup) return;

    // Clear old markers
    markerGroup.clearLayers();
    markersMapRef.current.clear();

    // Plot all physical establishments
    companies.forEach((company) => {
      const category = getCategoryBySection(company.secteur);
      const color = category?.color || "#6b7280"; // Fallback gray

      company.etablissements.forEach((etab) => {
        if (isNaN(etab.latitude) || isNaN(etab.longitude)) return;

        const isSelected = selectedSiret === etab.siret;
        const icon = createCustomIcon(color, isSelected);

        const marker = L.marker([etab.latitude, etab.longitude], { icon })
          .addTo(markerGroup);

        // Save marker in map to reference later for highlighting
        markersMapRef.current.set(etab.siret, marker);

        const displayName = getEstablishmentDisplayName(company, etab);
        const popupContent = `
          <div class="p-2 select-none" style="font-family: var(--font-sans), sans-serif; min-width: 200px;">
            <div class="flex items-center gap-1.5 mb-1.5">
              ${etab.estSiege 
                ? `<span class="px-1.5 py-0.5 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 text-[10px] font-bold rounded border border-blue-100 dark:border-blue-900/30">Siège</span>` 
                : `<span class="px-1.5 py-0.5 bg-zinc-50 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400 text-[10px] font-bold rounded border border-zinc-100 dark:border-zinc-800/50">Établissement</span>`}
              ${etab.statut === "Fermé"
                ? `<span class="px-1.5 py-0.5 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 text-[10px] font-bold rounded border border-rose-100 dark:border-rose-900/30">Fermé</span>`
                : `<span class="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 text-[10px] font-bold rounded border border-emerald-100 dark:border-emerald-900/30">Actif</span>`}
            </div>
            <h4 class="text-xs font-black text-zinc-950 dark:text-zinc-50 leading-tight mb-0.5">
              ${displayName}
            </h4>
            <p class="text-[9px] text-zinc-400 dark:text-zinc-500 mb-1">Raison sociale : ${company.nomComplet}</p>
            <p class="text-[10px] text-zinc-500 dark:text-zinc-400 leading-normal mb-2">
              ${formatAddress(etab)}
            </p>
            <div class="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 border-t pt-1.5 border-zinc-100 dark:border-zinc-800/80">
              ${getActivityLabel(etab, company)}
            </div>
          </div>
        `;

        marker.bindPopup(popupContent, {
          closeButton: false,
          offset: [0, -10]
        });

        let pressTimer: NodeJS.Timeout | null = null;
        let isLongPress = false;

        const startPress = () => {
          isLongPress = false;
          const timer = setTimeout(() => {
            isLongPress = true;
            activeTimersRef.current.delete(timer);
            if (onLongPressEstablishment) {
              onLongPressEstablishment(company, etab);
            }
          }, 500); // 500ms prolonged click threshold
          pressTimer = timer;
          activeTimersRef.current.add(timer);
        };

        const cancelPress = () => {
          if (pressTimer) {
            clearTimeout(pressTimer);
            activeTimersRef.current.delete(pressTimer);
            pressTimer = null;
          }
        };

        marker.on("mousedown", startPress);
        marker.on("touchstart", startPress);

        marker.on("mouseup", cancelPress);
        marker.on("mouseleave", cancelPress);
        marker.on("touchend", cancelPress);
        marker.on("touchmove", cancelPress);

        // Click marker interaction
        marker.on("click", () => {
          if (isLongPress) {
            isLongPress = false;
            return;
          }
          marker.openPopup();
          if (onSelectEstablishment) {
            onSelectEstablishment(company, etab);
          }
        });
      });
    });

    return () => {
      // Clear any pending long press timers to avoid background race conditions
      activeTimersRef.current.forEach((t) => clearTimeout(t));
      activeTimersRef.current.clear();
    };
  }, [mapInstance, companies.length, onSelectEstablishment, onLongPressEstablishment, selectedSiret]);

  // Handle selectedSiret changes (highlight and center on selected marker)
  useEffect(() => {
    if (!mapInstance || !selectedSiret) return;

    const marker = markersMapRef.current.get(selectedSiret);
    if (marker) {
      const latLng = marker.getLatLng();
      mapInstance.setView(latLng, mapInstance.getZoom(), { animate: true });
      marker.openPopup();

      // Temporarily scale icons for selected
      markersMapRef.current.forEach((m, siret) => {
        const isSelected = siret === selectedSiret;
        const color = getCategoryBySection(
          companies.find(c => c.etablissements.some(e => e.siret === siret))?.secteur || ""
        )?.color || "#6b7280";
        
        m.setIcon(createCustomIcon(color, isSelected));
        if (isSelected) {
          m.setZIndexOffset(1000); // Bring selected marker to front
        } else {
          m.setZIndexOffset(0);
        }
      });
    }
  }, [selectedSiret, companies]);

  return (
    <div className="relative flex-1 min-h-[300px] h-full w-full flex flex-col overflow-hidden lg:rounded-xl border-y border-zinc-200/50 shadow-xs lg:border lg:border-zinc-200/50 dark:border-zinc-900/80">
      <div ref={mapContainerRef} className="z-0 flex-1 w-full min-h-0" />
      
      {/* Visual floating helper card for zoom/scale info */}
      <div className={`absolute top-3.5 z-10 pointer-events-none hidden sm:flex flex-col gap-1.5 px-3 py-2.5 bg-white/90 backdrop-blur-md border border-zinc-200/50 rounded-lg shadow-sm text-[10px] font-bold text-zinc-800 dark:bg-[#272729]/90 dark:border-zinc-800 dark:text-zinc-200 transition-all duration-300 ${
        isFullscreen 
          ? "left-[440px]" 
          : "left-3.5"
      }`}>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-zinc-900 dark:bg-zinc-100 rounded-full animate-pulse" />
          <span>Zone active</span>
        </div>
        <div className="flex flex-col gap-0.5 text-[9px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          <span>Rayon : {radius === 0.5 ? "500 m" : `${radius} km`}</span>
          <span className="normal-case tracking-normal font-medium text-zinc-500/80 dark:text-zinc-400/80 flex flex-col gap-1 mt-1 border-t border-zinc-100 pt-1 dark:border-zinc-800/80">
            <span className="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 shrink-0 text-zinc-400">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
              </svg>
              Ctrl + Molette pour zoomer
            </span>
            <span className="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 shrink-0 text-zinc-400">
                <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 003.051 2.206l.018.008.007.003zM10 13a4 4 0 100-8 4 4 0 000 8z" clipRule="evenodd" />
              </svg>
              Double-clic pour cibler
            </span>
          </span>
        </div>
      </div>
      <p className="pointer-events-none absolute bottom-3 right-3 z-10 max-w-[10rem] rounded-md bg-white/90 px-2 py-1 text-center text-[9px] font-medium leading-tight text-zinc-500 backdrop-blur-sm dark:bg-zinc-900/80 dark:text-zinc-400 lg:hidden">
        Double-touchez pour cibler une zone
      </p>

      {/* Custom Compass Reset Button */}
      {mapInstance && Math.abs(bearing) > 0.1 && (
        <button
          type="button"
          onClick={() => {
            if (mapInstance && (mapInstance as any).setBearing) {
              (mapInstance as any).setBearing(0);
              setBearing(0);
            }
          }}
          className="absolute z-10 bottom-[96px] left-[12px] h-[36px] w-[36px] flex items-center justify-center rounded-lg bg-white border border-zinc-200/50 dark:bg-[#18181b] dark:border-zinc-800 shadow-md hover:bg-zinc-50 dark:hover:bg-zinc-800 active:scale-95 transition-all text-zinc-700 dark:text-zinc-300 pointer-events-auto cursor-pointer"
          title="Réinitialiser l'orientation au Nord"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2.5"
            stroke="currentColor"
            className="h-5 w-5 transition-transform duration-200"
            style={{ transform: `rotate(${-bearing}deg)` }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M12 3l-4 4m4-4l4 4" />
          </svg>
        </button>
      )}
    </div>
  );
}
