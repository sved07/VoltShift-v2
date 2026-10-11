import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { GridZone, IndustrialWorkload } from '../types';
import {
  Sun,
  Wind,
  Flame,
  Layers,
  RefreshCw,
  HelpCircle,
  Radio,
  Server,
  Truck,
  Zap,
  Globe2,
  MapPin,
  ChevronRight,
  ShieldCheck,
  Activity,
  ExternalLink,
  Compass,
  X,
  Eye,
  Navigation,
  Moon,
} from 'lucide-react';

interface InteractiveMapProps {
  zones: GridZone[];
  workloads: IndustrialWorkload[];
  selectedSiteId: string | null;
  onSelectSite: (id: string | null) => void;
}

// Regional boundaries in [latitude, longitude] format for Leaflet
const ISO_LEAFLET_POLYGONS: Record<string, [number, number][]> = {
  CAISO: [
    [42.0, -124.4],
    [42.0, -120.0],
    [39.0, -120.0],
    [35.0, -114.6],
    [32.7, -114.1],
    [32.5, -117.2],
    [34.4, -120.5],
    [37.8, -122.5],
    [40.4, -124.4],
    [42.0, -124.4],
  ],
  ERCOT: [
    [32.0, -103.0],
    [32.0, -100.0],
    [33.8, -96.5],
    [33.5, -94.0],
    [30.0, -93.8],
    [28.9, -95.0],
    [26.0, -97.1],
    [26.5, -99.5],
    [29.5, -100.5],
    [29.8, -104.0],
    [32.0, -103.0],
  ],
  PJM: [
    [41.7, -84.8],
    [42.3, -80.5],
    [41.3, -74.7],
    [40.5, -73.9],
    [38.5, -75.2],
    [36.5, -76.0],
    [36.6, -82.0],
    [38.4, -82.6],
    [39.1, -84.8],
    [41.7, -84.8],
  ],
  MISO: [
    [49.0, -97.2],
    [48.0, -89.5],
    [45.8, -84.5],
    [41.7, -84.8],
    [37.5, -87.5],
    [36.5, -89.5],
    [33.0, -91.0],
    [33.5, -94.0],
    [40.5, -96.0],
    [43.5, -96.8],
    [49.0, -97.2],
  ],
};

const REGION_CENTERS: Record<string, { lat: number; lng: number; zoom: number; label: string }> = {
  CAISO: { lat: 36.8, lng: -119.5, zoom: 6, label: 'California (CAISO)' },
  ERCOT: { lat: 31.0, lng: -99.0, zoom: 6, label: 'Texas (ERCOT)' },
  PJM: { lat: 39.5, lng: -78.5, zoom: 6, label: 'Mid-Atlantic (PJM)' },
  MISO: { lat: 41.5, lng: -90.5, zoom: 5, label: 'Midwest (MISO)' },
};

export const ISO_SIGNATURE_COLORS: Record<string, string> = {
  CAISO: '#10b981', // Emerald Green (California)
  ERCOT: '#0ea5e9', // Sky Blue (Texas)
  PJM: '#a855f7',   // Royal Purple (Mid-Atlantic)
  MISO: '#f97316',  // Vivid Orange (Midwest - clearly distinct from PJM and ERCOT)
};

type BasemapStyle = 'dark' | 'satellite' | 'streets';
type ColorMode = 'carbon' | 'iso';

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  zones,
  workloads,
  selectedSiteId,
  onSelectSite,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const polygonLayersRef = useRef<{ [key: string]: L.Polygon }>({});
  const markerLayersRef = useRef<{ [key: string]: L.Marker }>({});
  const baseLayersGroupRef = useRef<L.LayerGroup | null>(null);

  const [mapStyle, setMapStyle] = useState<BasemapStyle>('dark');
  const [colorMode, setColorMode] = useState<ColorMode>('iso');
  const [showHelp, setShowHelp] = useState(false);
  const [highlightTier, setHighlightTier] = useState<string | null>(null);
  const [streetViewSite, setStreetViewSite] = useState<IndustrialWorkload | null>(null);
  const [nrelSolar, setNrelSolar] = useState<{ annual_dni: number; annual_ghi: number; annual_tilt: number } | null>(null);

  // Fetch NREL solar resource for inspected facility
  useEffect(() => {
    const active = streetViewSite || workloads.find((w) => w.id === selectedSiteId);
    if (!active) {
      setNrelSolar(null);
      return;
    }
    fetch(`/api/nrel/solar?lat=${active.coordinates[0]}&lon=${active.coordinates[1]}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && typeof d.annual_ghi === 'number') {
          setNrelSolar({
            annual_dni: d.annual_dni,
            annual_ghi: d.annual_ghi,
            annual_tilt: d.annual_tilt,
          });
        }
      })
      .catch(() => {});
  }, [streetViewSite, selectedSiteId, workloads]);

  const getCarbonColor = (intensity: number, zoneId?: string) => {
    // If in carbon mode, ensure each region has a distinct informative color tone
    if (zoneId === 'PJM') return '#a855f7'; // Purple (Mid-Atlantic PJM grid)
    if (zoneId === 'MISO') return '#ef4444'; // Red (Midwest MISO coal grid)
    if (zoneId === 'ERCOT') return '#0ea5e9'; // Sky Blue (Texas ERCOT grid)
    if (zoneId === 'CAISO') return '#10b981'; // Emerald Green (California CAISO clean grid)
    if (intensity < 160) return '#10b981';
    if (intensity <= 345) return '#f59e0b';
    return '#ef4444';
  };

  const getZoneColor = (zoneId: string, carbon: number) => {
    if (colorMode === 'iso') {
      return ISO_SIGNATURE_COLORS[zoneId] || '#10b981';
    }
    return getCarbonColor(carbon, zoneId);
  };

  // Helper to load basemap layers
  const setBasemapTiles = useCallback((map: L.Map, style: BasemapStyle) => {
    if (baseLayersGroupRef.current) {
      baseLayersGroupRef.current.clearLayers();
    } else {
      baseLayersGroupRef.current = L.layerGroup().addTo(map);
    }

    const group = baseLayersGroupRef.current;

    if (style === 'dark') {
      // 100% reliable Esri Dark Gray Base + Reference Labels
      const esriDark = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: '&copy; Esri, DeLorme, NAVTEQ',
          maxZoom: 16,
          subdomains: ['server', 'services'],
        }
      );
      const esriLabels = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: '',
          maxZoom: 16,
          opacity: 0.9,
        }
      );
      group.addLayer(esriDark);
      group.addLayer(esriLabels);
    } else if (style === 'satellite') {
      // High-res Esri Satellite Imagery
      const satellite = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: '&copy; Esri, Maxar, Earthstar Geographics',
          maxZoom: 19,
        }
      );
      const satLabels = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: '',
          maxZoom: 19,
          opacity: 0.85,
        }
      );
      group.addLayer(satellite);
      group.addLayer(satLabels);
    } else {
      // High-resolution Esri World Street Map (roads, highway shields, street names, buildings, exits)
      const streets = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: '&copy; Esri, DeLorme, USGS, NPS, OpenStreetMap contributors',
          maxZoom: 19,
        }
      );
      group.addLayer(streets);
    }
  }, []);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Set maxZoom: 19 to enable full street-level zoom down to individual roads and intersections
    const map = L.map(mapContainerRef.current, {
      center: [38.5, -96.0],
      zoom: 4,
      minZoom: 3,
      maxZoom: 19,
      zoomControl: false,
    });

    // Add zoom control to top-right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Apply selected basemap tiles
    setBasemapTiles(map, mapStyle);

    mapInstanceRef.current = map;

    // Multiple invalidateSize calls to guarantee tile rendering
    const t1 = setTimeout(() => map.invalidateSize(), 80);
    const t2 = setTimeout(() => map.invalidateSize(), 300);
    const t3 = setTimeout(() => map.invalidateSize(), 800);

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      resizeObserver.disconnect();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Basemap when mapStyle changes
  useEffect(() => {
    if (mapInstanceRef.current) {
      setBasemapTiles(mapInstanceRef.current, mapStyle);
      mapInstanceRef.current.invalidateSize();
    }
  }, [mapStyle, setBasemapTiles]);

  // Render & Update ISO Region Polygons
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    Object.entries(ISO_LEAFLET_POLYGONS).forEach(([zoneId, coords]) => {
      const zoneData = zones.find((z) => z.zone_id === zoneId);
      const carbon = zoneData ? zoneData.carbon_intensity : 200;
      const color = getZoneColor(zoneId, carbon);

      const isTierMatch =
        !highlightTier ||
        (highlightTier === 'green' && carbon < 150) ||
        (highlightTier === 'amber' && carbon >= 150 && carbon <= 320) ||
        (highlightTier === 'red' && carbon > 320);

      // In street view mode, keep fill very subtle so streets and road names remain razor sharp
      const fillOpacity =
        mapStyle === 'streets'
          ? isTierMatch
            ? highlightTier
              ? 0.16
              : 0.06
            : 0.02
          : isTierMatch
          ? highlightTier
            ? 0.38
            : 0.22
          : 0.08;

      const strokeOpacity = isTierMatch ? (mapStyle === 'streets' ? 0.75 : 0.9) : 0.25;
      const weight = isTierMatch ? (highlightTier ? 3.5 : 2.5) : 1.5;

      let polygon = polygonLayersRef.current[zoneId];

      if (!polygon) {
        polygon = L.polygon(coords, {
          color: color,
          weight: weight,
          fillColor: color,
          fillOpacity: fillOpacity,
          opacity: strokeOpacity,
          dashArray: mapStyle === 'streets' ? '4, 4' : undefined,
        }).addTo(map);

        // Hover tooltip
        polygon.bindTooltip(
          `<strong>${zoneId} Grid</strong><br/>${carbon} gCO₂/kWh (${
            carbon < 150 ? 'Clean' : carbon <= 320 ? 'Moderate' : 'High Carbon'
          })`,
          { sticky: true, className: 'leaflet-custom-tooltip' }
        );

        polygon.on('click', () => {
          const center = REGION_CENTERS[zoneId];
          if (center) {
            map.flyTo([center.lat, center.lng], center.zoom, { duration: 1.0 });
          }
        });

        polygonLayersRef.current[zoneId] = polygon;
      } else {
        polygon.setStyle({
          color: color,
          fillColor: color,
          fillOpacity: fillOpacity,
          opacity: strokeOpacity,
          weight: weight,
          dashArray: mapStyle === 'streets' ? '4, 4' : undefined,
        });

        polygon.setTooltipContent(
          `<strong>${zoneId} Grid</strong><br/>${carbon} gCO₂/kWh (${
            carbon < 150 ? 'Clean' : carbon <= 320 ? 'Moderate' : 'High Carbon'
          })`
        );
      }
    });
  }, [zones, highlightTier, mapStyle, colorMode]);

  // Render & Update Workload / Facility Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    workloads.forEach((site) => {
      const lat = site.coordinates[0];
      const lng = site.coordinates[1];
      const isSelected = selectedSiteId === site.id;

      let marker = markerLayersRef.current[site.id];

      // Custom HTML Pin with facility status
      const badgeBg =
        site.status === 'BOOST'
          ? 'background: #064e3b; color: #34d399; border: 1.5px solid #059669;'
          : site.status === 'THROTTLE'
          ? 'background: #78350f; color: #fbbf24; border: 1.5px solid #d97706;'
          : site.status === 'DEFER'
          ? 'background: #881337; color: #fb7185; border: 1.5px solid #e11d48;'
          : 'background: #27272a; color: #d4d4d8; border: 1.5px solid #52525b;';

      const ringEffect = isSelected
        ? 'box-shadow: 0 0 0 4px #34d399, 0 10px 20px rgba(0,0,0,0.8);'
        : 'box-shadow: 0 6px 16px rgba(0,0,0,0.6);';

      const actionText =
        site.status === 'BOOST'
          ? `+${site.delta_kw} kW BOOST`
          : site.status === 'THROTTLE'
          ? `${site.delta_kw} kW THROTTLE`
          : site.status === 'DEFER'
          ? 'DEFERRED'
          : 'NORMAL';

      const iconHtml = `
        <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer; transform: translate(-50%, -100%);">
          <div style="${badgeBg} ${ringEffect} padding: 5px 9px; border-radius: 8px; font-size: 11px; font-weight: 700; font-family: monospace; white-space: nowrap; display: flex; align-items: center; gap: 5px; transition: transform 0.2s;">
            <span>${site.type === 'AI_TRAINING' ? 'AI' : 'EV'}</span>
            <span>${actionText}</span>
          </div>
          <div style="width: 2px; height: 10px; background: #a1a1aa;"></div>
          <div style="width: 10px; height: 10px; border-radius: 50%; background: ${
            site.status === 'BOOST' ? '#34d399' : site.status === 'THROTTLE' ? '#fbbf24' : '#fb7185'
          }; border: 2px solid #09090b; box-shadow: 0 0 8px ${site.status === 'BOOST' ? '#34d399' : '#fbbf24'};"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-leaflet-marker',
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      if (!marker) {
        marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);

        marker.on('click', () => {
          onSelectSite(site.id);
          map.flyTo([lat, lng], 10, { duration: 0.8 });
        });

        markerLayersRef.current[site.id] = marker;
      } else {
        marker.setIcon(customIcon);
      }
    });
  }, [workloads, selectedSiteId, onSelectSite]);

  // Center on selected site if selectedSiteId changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedSiteId) return;

    const site = workloads.find((w) => w.id === selectedSiteId);
    if (site) {
      map.flyTo([site.coordinates[0], site.coordinates[1]], 10, { duration: 0.8 });
    }
  }, [selectedSiteId, workloads]);

  const resetToUsView = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([38.5, -96.0], 4, { duration: 1.0 });
    }
    onSelectSite(null);
    setHighlightTier(null);
  };

  const flyToRegion = (zoneId: string) => {
    const center = REGION_CENTERS[zoneId];
    if (center && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([center.lat, center.lng], center.zoom, { duration: 0.9 });
    }
  };

  const zoomToSiteStreetLevel = (site: IndustrialWorkload) => {
    setMapStyle('streets');
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([site.coordinates[0], site.coordinates[1]], 16, { duration: 1.2 });
    }
  };

  return (
    <div className="relative w-full h-full select-none overflow-hidden bg-zinc-950">
      {/* 100% Full-Viewport Leaflet Canvas */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full bg-zinc-950 z-0" />

      {/* Top Floating Region Navigation Bar */}
      <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-2 max-w-[calc(100%-80px)]">
        {/* Reset to All USA */}
        <button
          type="button"
          onClick={resetToUsView}
          className="h-8 px-3 rounded-lg text-xs font-medium bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/80 shadow-lg backdrop-blur-md flex items-center gap-1.5 transition-all"
          title="Reset to Continental US Overview"
        >
          <Globe2 className="h-3.5 w-3.5 text-emerald-400" />
          <span>All US Grids</span>
        </button>

        {/* Quick Regional Jump Buttons */}
        {Object.entries(REGION_CENTERS).map(([zoneId, info]) => {
          const zoneData = zones.find((z) => z.zone_id === zoneId);
          const carbon = zoneData?.carbon_intensity ?? 200;
          const color = getZoneColor(zoneId, carbon);

          return (
            <button
              key={zoneId}
              type="button"
              onClick={() => flyToRegion(zoneId)}
              className="h-8 px-3 rounded-lg text-xs font-medium bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 shadow-lg backdrop-blur-md flex items-center gap-2 transition-all hover:border-zinc-700"
              title={`Center on ${info.label}`}
            >
              <span
                className="w-2 h-2 rounded-full shadow-sm"
                style={{ backgroundColor: color }}
              />
              <span className="font-bold">{zoneId}</span>
              <span className="font-mono text-[10px] text-zinc-400">
                {carbon} gCO₂
              </span>
            </button>
          );
        })}

        {/* Color Highlight Mode Toggle (Carbon Tiers vs Unique ISO Colors) */}
        <div className="h-8 p-0.5 rounded-lg bg-zinc-900/90 border border-zinc-800 shadow-lg backdrop-blur-md flex items-center text-xs">
          <button
            type="button"
            onClick={() => setColorMode('carbon')}
            className={`h-full px-2.5 rounded-md transition-all font-medium flex items-center gap-1.5 ${
              colorMode === 'carbon'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="Highlight regions by Carbon Emissions tier (Clean, Moderate, High)"
          >
            <Zap className="h-3 w-3 text-amber-400" />
            <span>Carbon Tiers</span>
          </button>
          <button
            type="button"
            onClick={() => setColorMode('iso')}
            className={`h-full px-2.5 rounded-md transition-all font-medium flex items-center gap-1.5 ${
              colorMode === 'iso'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="Give each regional ISO its own distinct signature color"
          >
            <Layers className="h-3 w-3 text-cyan-400" />
            <span>Unique ISO Colors</span>
          </button>
        </div>

        {/* Street View Quick Switcher Indicator */}
        <button
          type="button"
          onClick={() => {
            const next = mapStyle === 'streets' ? 'dark' : 'streets';
            setMapStyle(next);
          }}
          className={`h-8 px-3 rounded-lg text-xs font-medium border shadow-lg backdrop-blur-md flex items-center gap-1.5 transition-all ${
            mapStyle === 'streets'
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-emerald-500/10'
              : 'bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
          }`}
          title="Toggle Street View on/off"
        >
          <Compass className="h-3.5 w-3.5 text-emerald-400" />
          <span>{mapStyle === 'streets' ? 'Street View: ON' : 'Switch to Street View'}</span>
        </button>
      </div>

      {/* Carbon Intensity Legend HUD */}
      {colorMode === 'carbon' && (
        <div className="absolute top-16 left-4 z-10 flex items-center gap-2 p-1.5 px-3 rounded-xl bg-zinc-950/85 backdrop-blur-md border border-zinc-800/80 shadow-lg text-[11px] font-sans">
          <span className="text-zinc-400 text-[10px] font-mono uppercase tracking-wider mr-1">
            Carbon Tiers:
          </span>
          <button
            type="button"
            onClick={() => setHighlightTier(highlightTier === 'green' ? null : 'green')}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md transition-all ${
              highlightTier === 'green'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-zinc-300 hover:bg-zinc-900'
            }`}
            title="Clean grid: Under 160 gCO₂/kWh (e.g. CAISO)"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Clean (&lt;160g)</span>
          </button>
          <button
            type="button"
            onClick={() => setHighlightTier(highlightTier === 'amber' ? null : 'amber')}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md transition-all ${
              highlightTier === 'amber'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-zinc-300 hover:bg-zinc-900'
            }`}
            title="Moderate grid: 160 - 345 gCO₂/kWh (e.g. ERCOT)"
          >
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Moderate (160–345g)</span>
          </button>
          <button
            type="button"
            onClick={() => setHighlightTier(highlightTier === 'red' ? null : 'red')}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md transition-all ${
              highlightTier === 'red'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : 'text-zinc-300 hover:bg-zinc-900'
            }`}
            title="High carbon grid: Above 345 gCO₂/kWh (e.g. PJM, MISO)"
          >
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>High (&gt;345g)</span>
          </button>
          {highlightTier && (
            <button
              type="button"
              onClick={() => setHighlightTier(null)}
              className="text-[10px] text-zinc-400 hover:text-zinc-200 underline ml-1"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Unique ISO Colors Legend HUD */}
      {colorMode === 'iso' && (
        <div className="absolute top-16 left-4 z-10 flex items-center gap-2 p-1.5 px-3 rounded-xl bg-zinc-950/85 backdrop-blur-md border border-zinc-800/80 shadow-lg text-[11px] font-sans">
          <span className="text-zinc-400 text-[10px] font-mono uppercase tracking-wider mr-1">
            ISO Grids:
          </span>
          <span className="flex items-center gap-1 text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> CAISO (CA)
          </span>
          <span className="flex items-center gap-1 text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-sky-500" /> ERCOT (TX)
          </span>
          <span className="flex items-center gap-1 text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-purple-500" /> PJM (Mid-Atl)
          </span>
          <span className="flex items-center gap-1 text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-orange-500" /> MISO (Midwest)
          </span>
        </div>
      )}

      {/* Floating Basemap Style Switcher (Dark, Satellite, Streets) - Apple Segmented Control */}
      <div className="absolute bottom-4 right-4 z-10 flex items-center gap-1 p-1 rounded-2xl bg-zinc-950/90 backdrop-blur-2xl border border-zinc-800/80 shadow-2xl">
        <button
          type="button"
          onClick={() => setMapStyle('dark')}
          className={`h-7 px-3 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all ${
            mapStyle === 'dark'
              ? 'bg-zinc-800 text-zinc-100 shadow-sm font-semibold'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
          title="Dark Theme Map"
        >
          <Moon className="h-3 w-3 text-zinc-300" />
          <span>Dark</span>
        </button>

        <button
          type="button"
          onClick={() => setMapStyle('satellite')}
          className={`h-7 px-3 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all ${
            mapStyle === 'satellite'
              ? 'bg-zinc-800 text-zinc-100 shadow-sm font-semibold'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
          title="High-Resolution Satellite Imagery"
        >
          <Globe2 className="h-3 w-3 text-emerald-400" />
          <span>Satellite</span>
        </button>

        <button
          type="button"
          onClick={() => setMapStyle('streets')}
          className={`h-7 px-3 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all ${
            mapStyle === 'streets'
              ? 'bg-zinc-800 text-zinc-100 shadow-sm font-semibold'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
          title="Street View: Detailed Roads, Highways & Streets"
        >
          <Navigation className="h-3 w-3 text-cyan-400" />
          <span>Street Map</span>
        </button>
      </div>

      {/* Interactive Facility Inspector Drawer */}
      {selectedSiteId && (
        <aside className="absolute bottom-4 left-4 z-20 bg-zinc-950/95 backdrop-blur-2xl border border-zinc-800 p-4 rounded-2xl text-xs shadow-2xl max-w-sm flex flex-col gap-3 font-sans">
          {(() => {
            const site = workloads.find((w) => w.id === selectedSiteId);
            if (!site) return null;
            const zone = zones.find((z) => z.zone_id === site.zone_id);

            return (
              <>
                <div className="flex items-start justify-between gap-3 border-b border-zinc-800/80 pb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`h-8 w-8 rounded-xl flex items-center justify-center ${
                        site.type === 'AI_TRAINING'
                          ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {site.type === 'AI_TRAINING' ? (
                        <Server className="h-4 w-4" />
                      ) : (
                        <Truck className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 uppercase font-mono tracking-wider block">
                        {site.type === 'AI_TRAINING'
                          ? 'AI Data Center Supercluster'
                          : 'Commercial EV Delivery Fleet'}
                      </span>
                      <h3 className="text-sm font-semibold text-zinc-100">{site.site_name}</h3>
                    </div>
                  </div>
                  <button
                    onClick={() => onSelectSite(null)}
                    className="text-zinc-400 hover:text-zinc-200 text-base leading-none p-1 rounded-lg hover:bg-zinc-800 cursor-pointer"
                    title="Close"
                  >
                    ×
                  </button>
                </div>

                {/* Plain English explanation of the AI action */}
                <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 text-[11px] leading-relaxed text-zinc-200">
                  {site.status === 'BOOST' ? (
                    <span className="text-emerald-300 flex items-start gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 mt-1 shrink-0" />
                      <span>
                        <strong>Power Boost Active:</strong> Power increased by{' '}
                        <strong>+{site.delta_kw} kW</strong> because local {site.zone_id} grid has
                        surplus clean solar and wind energy.
                      </span>
                    </span>
                  ) : site.status === 'THROTTLE' ? (
                    <span className="text-amber-300 flex items-start gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400 mt-1 shrink-0" />
                      <span>
                        <strong>Carbon-Saving Throttle:</strong> Draw reduced by{' '}
                        <strong>{site.delta_kw} kW</strong> to avoid dirty gas peaker plants and high
                        peak electricity tariffs.
                      </span>
                    </span>
                  ) : site.status === 'DEFER' ? (
                    <span className="text-rose-300 flex items-start gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-400 mt-1 shrink-0" />
                      <span>
                        <strong>Job Deferred:</strong> Non-urgent loads paused until clean night wind.
                        Delivery SLA ({site.deadline_hour}:00) is strictly preserved.
                      </span>
                    </span>
                  ) : (
                    <span className="text-zinc-300 flex items-start gap-2">
                      <span className="w-2 h-2 rounded-full bg-zinc-400 mt-1 shrink-0" />
                      <span>
                        <strong>Baseline Operation:</strong> Operating at steady baseline power (
                        {site.current_kw} kW).
                      </span>
                    </span>
                  )}
                </div>

                {/* Action Buttons: Zoom to Street Level & 360 Street View */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => zoomToSiteStreetLevel(site)}
                    className="py-2 px-2.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    title="Zoom in to see streets and building roads"
                  >
                    <Navigation className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Zoom to Streets</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStreetViewSite(site)}
                    className="py-2 px-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    title="View 360° Ground Street View"
                  >
                    <Eye className="h-3.5 w-3.5 text-cyan-400" />
                    <span>360° Street View</span>
                  </button>
                </div>

                {/* Numbers for details */}
                <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                  <div className="p-2.5 rounded-lg bg-zinc-900/70 border border-zinc-800">
                    <span className="text-zinc-500 block text-[10px] font-sans">Current Power Draw</span>
                    <span className="font-bold text-zinc-100 text-xs">
                      {site.current_kw.toLocaleString()} kW
                    </span>
                    <span className="text-zinc-500 text-[10px] block">
                      Max: {site.max_kw.toLocaleString()} kW
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-zinc-900/70 border border-zinc-800">
                    <span className="text-zinc-500 block text-[10px] font-sans">Batch / SLA Progress</span>
                    <span className="font-bold text-emerald-400 text-xs">
                      {site.sla_progress_pct}%
                    </span>
                    <span className="text-zinc-500 text-[10px] block">
                      Deadline: {site.deadline_hour}:00
                    </span>
                  </div>
                </div>

                {/* Federal NREL Solar Potential */}
                {nrelSolar && (
                  <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800 font-mono text-[11px]">
                    <div className="flex items-center justify-between text-[10px] font-sans text-amber-400 mb-1">
                      <span className="flex items-center gap-1 font-semibold">
                        <Sun className="h-3 w-3" /> NREL Solar Resource Potential
                      </span>
                      <span className="text-zinc-500 font-mono text-[9px]">developer.nlr.gov</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-zinc-300">
                      <div>
                        <span className="text-zinc-500 text-[10px] font-sans block">Global Horizontal (GHI)</span>
                        <span className="font-bold text-zinc-100">{nrelSolar.annual_ghi}</span>
                        <span className="text-zinc-500 text-[9px] ml-1">kWh/m²/day</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 text-[10px] font-sans block">Direct Beam (DNI)</span>
                        <span className="font-bold text-amber-300">{nrelSolar.annual_dni}</span>
                        <span className="text-zinc-500 text-[9px] ml-1">kWh/m²/day</span>
                      </div>
                    </div>
                  </div>
                )}

                {zone && (
                  <div className="flex flex-col gap-1 text-[11px] text-zinc-400 pt-1">
                    <div className="flex items-center justify-between">
                      <span>
                        Grid Region: <strong className="text-zinc-200">{zone.name}</strong>
                      </span>
                      <span className="font-mono text-emerald-400 font-bold">
                        {zone.carbon_intensity} gCO₂/kWh
                      </span>
                    </div>
                    {zone.eia_fuel_breakdown && (
                      <div className="flex items-center justify-between text-[10px] font-mono text-blue-400">
                        <span>US EIA Certified Clean Mix:</span>
                        <span className="font-bold">{zone.eia_fuel_breakdown.clean_pct}% clean</span>
                      </div>
                    )}
                  </div>
                )}
              </>
            );
          })()}
        </aside>
      )}

      {/* Dedicated Street View & Ground Panorama Modal */}
      {streetViewSite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-emerald-500/40 rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col gap-4 text-zinc-100">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Compass className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-zinc-100">
                      {streetViewSite.site_name}
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-900 border border-zinc-700 text-zinc-300">
                      {streetViewSite.zone_id}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    GPS Coordinates: {streetViewSite.coordinates[0].toFixed(4)}° N,{' '}
                    {Math.abs(streetViewSite.coordinates[1]).toFixed(4)}° W
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStreetViewSite(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Interactive Street View Preview Box */}
            <div className="rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 relative h-72 flex flex-col">
              {/* Fallback & Visual Street Context Card */}
              <div className="relative w-full h-full flex flex-col justify-between p-5 bg-gradient-to-br from-zinc-900 via-zinc-950 to-emerald-950/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-mono font-bold text-emerald-300 uppercase tracking-wider">
                      Ground & Street Inspection
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-400 font-mono">
                    Zoom: 16 (Street Level)
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800 backdrop-blur-md flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Facility Type:</span>
                    <span className="font-semibold text-zinc-200">
                      {streetViewSite.type === 'AI_TRAINING'
                        ? 'High-Density GPU Computing Cluster'
                        : 'Heavy Commercial EV Charging Depot'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Grid Interconnection:</span>
                    <span className="font-mono text-emerald-400 font-bold">
                      {streetViewSite.zone_id} 345kV Substation Feed
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Maximum Power Capacity:</span>
                    <span className="font-mono text-zinc-100 font-bold">
                      {streetViewSite.max_kw.toLocaleString()} kW
                    </span>
                  </div>

                  {/* NREL Irradiance metrics */}
                  {nrelSolar && (
                    <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] font-mono">
                      <span className="text-amber-400 flex items-center gap-1">
                        <Sun className="h-3 w-3" /> NREL Solar Yield:
                      </span>
                      <span className="text-zinc-200">
                        GHI {nrelSolar.annual_ghi} kWh/m²/day · DNI {nrelSolar.annual_dni} kWh/m²/day
                      </span>
                    </div>
                  )}
                </div>

                <div className="text-xs text-zinc-400 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>
                    Direct Street View imagery and road access pathways are ready to view.
                  </span>
                </div>
              </div>
            </div>

            {/* Street View Action Triggers */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  zoomToSiteStreetLevel(streetViewSite);
                  setStreetViewSite(null);
                }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
              >
                <Compass className="h-4 w-4" />
                <span>Fly to Street View on App Map</span>
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <a
                  href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${streetViewSite.coordinates[0]},${streetViewSite.coordinates[1]}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Google Street View 360°</span>
                </a>

                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${streetViewSite.coordinates[0]},${streetViewSite.coordinates[1]}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <MapPin className="h-3.5 w-3.5 text-amber-400" />
                  <span>Google Maps</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
