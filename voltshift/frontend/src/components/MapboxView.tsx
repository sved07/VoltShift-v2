import React, { useEffect, useRef, useState, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { GridZone, IndustrialWorkload } from '../types';
import { Server, Truck, Eye, RefreshCw, Layers, Compass, AlertTriangle, ShieldCheck } from 'lucide-react';

interface MapboxViewProps {
  zones: GridZone[];
  workloads: IndustrialWorkload[];
  selectedSiteId: string | null;
  onSelectSite: (id: string | null) => void;
}

// Approximate regional boundaries for ISO territories in GeoJSON
const ISO_GEOJSON_POLYGONS: Record<string, [number, number][]> = {
  CAISO: [
    [-124.4, 42.0],
    [-120.0, 42.0],
    [-120.0, 39.0],
    [-114.6, 35.0],
    [-114.1, 32.7],
    [-117.2, 32.5],
    [-120.5, 34.4],
    [-122.5, 37.8],
    [-124.4, 40.4],
    [-124.4, 42.0],
  ],
  ERCOT: [
    [-103.0, 32.0],
    [-100.0, 32.0],
    [-96.5, 33.8],
    [-94.0, 33.5],
    [-93.8, 30.0],
    [-95.0, 28.9],
    [-97.1, 26.0],
    [-99.5, 26.5],
    [-100.5, 29.5],
    [-104.0, 29.8],
    [-103.0, 32.0],
  ],
  PJM: [
    [-84.8, 41.7],
    [-80.5, 42.3],
    [-74.7, 41.3],
    [-73.9, 40.5],
    [-75.2, 38.5],
    [-76.0, 36.5],
    [-82.0, 36.6],
    [-82.6, 38.4],
    [-84.8, 39.1],
    [-84.8, 41.7],
  ],
  MISO: [
    [-97.2, 49.0],
    [-89.5, 48.0],
    [-84.5, 45.8],
    [-84.8, 41.7],
    [-87.5, 37.5],
    [-89.5, 36.5],
    [-91.0, 33.0],
    [-94.0, 33.5],
    [-96.0, 40.5],
    [-96.8, 43.5],
    [-97.2, 49.0],
  ],
};

export const MapboxView: React.FC<MapboxViewProps> = ({
  zones,
  workloads,
  selectedSiteId,
  onSelectSite,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const [mapLoaded, setMapLoaded] = useState(false);
  const [useFallbackView, setUseFallbackView] = useState(false);
  const [viewMode3D, setViewMode3D] = useState(true);

  // Helper for carbon color
  const getCarbonColor = (intensity: number) => {
    if (intensity < 160) return '#10b981'; // Green
    if (intensity <= 345) return '#f59e0b'; // Amber
    return '#f43f5e'; // Red
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Check WebGL support
    if (!mapboxgl.supported()) {
      console.warn('WebGL not supported in current environment; using interactive isometric vector map.');
      setUseFallbackView(true);
      return;
    }

    const token = ((import.meta as any).env?.VITE_MAPBOX_TOKEN || '').trim();
    if (!token) {
      console.info('No VITE_MAPBOX_TOKEN configured in environment; utilizing interactive vector grid view.');
      setUseFallbackView(true);
      return;
    }
    mapboxgl.accessToken = token;

    let mapInstance: mapboxgl.Map | null = null;
    let fallbackTimeout: NodeJS.Timeout | null = null;

    try {
      mapInstance = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [-98.5, 39.0],
        zoom: 3.8,
        pitch: 45,
        bearing: -8,
        attributionControl: false,
      });

      mapInstance.addControl(new mapboxgl.NavigationControl({ showCompass: true }), 'top-right');

      // Fallback timer: if mapbox tiles take longer than 3.5s (e.g. invalid token or network block), enable high-fidelity vector view
      fallbackTimeout = setTimeout(() => {
        if (!mapLoaded && !mapInstance?.loaded()) {
          console.info('Mapbox tile response timeout; switching to high-performance vector grid view.');
          setUseFallbackView(true);
        }
      }, 3500);

      mapInstance.on('load', () => {
        if (fallbackTimeout) clearTimeout(fallbackTimeout);
        setMapLoaded(true);
        setUseFallbackView(false);

        // Force resize to ensure canvas fits dimensions properly
        mapInstance?.resize();

        // ISO Polygons GeoJSON layer
        const isoFeatures = Object.entries(ISO_GEOJSON_POLYGONS).map(([zone_id, coords]) => {
          const zoneData = zones.find((z) => z.zone_id === zone_id);
          const carbon = zoneData ? zoneData.carbon_intensity : 200;
          return {
            type: 'Feature' as const,
            properties: {
              zone_id,
              name: zoneData?.name || zone_id,
              carbon_intensity: carbon,
              color: getCarbonColor(carbon),
            },
            geometry: {
              type: 'Polygon' as const,
              coordinates: [coords],
            },
          };
        });

        if (!mapInstance?.getSource('iso-zones')) {
          mapInstance?.addSource('iso-zones', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: isoFeatures,
            },
          });

          mapInstance?.addLayer({
            id: 'iso-zones-fill',
            type: 'fill',
            source: 'iso-zones',
            paint: {
              'fill-color': ['get', 'color'],
              'fill-opacity': 0.22,
            },
          });

          mapInstance?.addLayer({
            id: 'iso-zones-outline',
            type: 'line',
            source: 'iso-zones',
            paint: {
              'line-color': ['get', 'color'],
              'line-width': 2.5,
              'line-opacity': 0.85,
              'line-dasharray': [2, 1],
            },
          });
        }

        // 3D Extruded Buildings
        const siteExtrusions = workloads.map((w) => {
          const [lat, lng] = w.coordinates;
          const delta = 0.28;
          const height = Math.max(90000, w.current_kw * 130);
          return {
            type: 'Feature' as const,
            properties: {
              id: w.id,
              name: w.site_name,
              height: height,
              base_height: 0,
              color:
                w.status === 'BOOST'
                  ? '#10b981'
                  : w.status === 'THROTTLE'
                  ? '#f59e0b'
                  : w.status === 'DEFER'
                  ? '#f43f5e'
                  : '#71717a',
            },
            geometry: {
              type: 'Polygon' as const,
              coordinates: [
                [
                  [lng - delta, lat - delta],
                  [lng + delta, lat - delta],
                  [lng + delta, lat + delta],
                  [lng - delta, lat + delta],
                  [lng - delta, lat - delta],
                ],
              ],
            },
          };
        });

        if (!mapInstance?.getSource('industrial-extrusions')) {
          mapInstance?.addSource('industrial-extrusions', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: siteExtrusions,
            },
          });

          mapInstance?.addLayer({
            id: 'industrial-extrusions-layer',
            type: 'fill-extrusion',
            source: 'industrial-extrusions',
            paint: {
              'fill-extrusion-color': ['get', 'color'],
              'fill-extrusion-height': ['get', 'height'],
              'fill-extrusion-base': ['get', 'base_height'],
              'fill-extrusion-opacity': 0.8,
            },
          });
        }
      });

      mapInstance.on('error', (err) => {
        console.warn('Mapbox GL runtime warning:', err);
        // If style or authentication fails, switch to high-performance vector fallback
        if (err.error && (err.error as any).status === 401) {
          setUseFallbackView(true);
        }
      });

      mapRef.current = mapInstance;

      // Resize observer to ensure full dimensions
      const resizeObserver = new ResizeObserver(() => {
        mapInstance?.resize();
      });
      resizeObserver.observe(mapContainerRef.current);

      return () => {
        if (fallbackTimeout) clearTimeout(fallbackTimeout);
        resizeObserver.disconnect();
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
      };
    } catch (err) {
      console.warn('Mapbox init caught error, activating fallback:', err);
      setUseFallbackView(true);
    }
  }, []);

  // Update dynamic layers when telemetry updates
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || useFallbackView) return;

    const isoSource = map.getSource('iso-zones') as mapboxgl.GeoJSONSource | undefined;
    if (isoSource) {
      const updatedIso = Object.entries(ISO_GEOJSON_POLYGONS).map(([zone_id, coords]) => {
        const zoneData = zones.find((z) => z.zone_id === zone_id);
        const carbon = zoneData ? zoneData.carbon_intensity : 200;
        return {
          type: 'Feature' as const,
          properties: {
            zone_id,
            name: zoneData?.name || zone_id,
            carbon_intensity: carbon,
            color: getCarbonColor(carbon),
          },
          geometry: {
            type: 'Polygon' as const,
            coordinates: [coords],
          },
        };
      });

      isoSource.setData({
        type: 'FeatureCollection',
        features: updatedIso,
      });
    }

    const extrusionSource = map.getSource('industrial-extrusions') as mapboxgl.GeoJSONSource | undefined;
    if (extrusionSource) {
      const siteExtrusions = workloads.map((w) => {
        const [lat, lng] = w.coordinates;
        const delta = 0.28;
        const height = Math.max(90000, w.current_kw * 130);
        return {
          type: 'Feature' as const,
          properties: {
            id: w.id,
            name: w.site_name,
            height: height,
            base_height: 0,
            color:
              w.status === 'BOOST'
                ? '#10b981'
                : w.status === 'THROTTLE'
                ? '#f59e0b'
                : w.status === 'DEFER'
                ? '#f43f5e'
                : '#71717a',
          },
          geometry: {
            type: 'Polygon' as const,
            coordinates: [
              [
                [lng - delta, lat - delta],
                [lng + delta, lat - delta],
                [lng + delta, lat + delta],
                [lng - delta, lat + delta],
                [lng - delta, lat - delta],
              ],
            ],
          },
        };
      });

      extrusionSource.setData({
        type: 'FeatureCollection',
        features: siteExtrusions,
      });
    }

    // HTML/SVG Site Badges
    workloads.forEach((w) => {
      const [lat, lng] = w.coordinates;
      let marker = markersRef.current[w.id];

      const statusColor =
        w.status === 'BOOST'
          ? 'text-emerald-400 border-emerald-500/40 bg-zinc-950/90'
          : w.status === 'THROTTLE'
          ? 'text-amber-400 border-amber-500/40 bg-zinc-950/90'
          : w.status === 'DEFER'
          ? 'text-rose-400 border-rose-500/40 bg-zinc-950/90'
          : 'text-zinc-400 border-zinc-700 bg-zinc-950/90';

      const isSelected = selectedSiteId === w.id;

      if (!marker) {
        const el = document.createElement('div');
        el.className = 'cursor-pointer select-none transition-transform hover:scale-110';
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          onSelectSite(w.id);
          map.flyTo({
            center: [lng, lat],
            zoom: 6.5,
            pitch: 55,
            bearing: 15,
            duration: 1200,
          });
        });

        marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' }).setLngLat([lng, lat]).addTo(map);
        markersRef.current[w.id] = marker;
      }

      const el = marker.getElement();
      el.innerHTML = `
        <div class="flex flex-col items-center">
          <div class="px-2.5 py-1 rounded-md border text-[11px] font-mono font-medium shadow-xl flex items-center gap-1.5 ${statusColor} ${
        isSelected ? 'ring-2 ring-emerald-400 ring-offset-1 ring-offset-zinc-950 scale-105' : ''
      }">
            <span>${w.type === 'AI_TRAINING' ? 'AI' : 'EV'}</span>
            <span class="font-bold">${w.status === 'BOOST' ? `+${w.delta_kw}` : `${w.delta_kw}`} kW</span>
            <span class="text-[9px] uppercase px-1 py-0.2 rounded bg-zinc-800 text-zinc-300">${w.status}</span>
          </div>
          <div class="w-1.5 h-3 bg-zinc-600"></div>
          <div class="w-2.5 h-2.5 rounded-full ${
            w.status === 'BOOST'
              ? 'bg-emerald-400 animate-ping'
              : w.status === 'THROTTLE'
              ? 'bg-amber-400'
              : w.status === 'DEFER'
              ? 'bg-rose-400 animate-pulse'
              : 'bg-zinc-400'
          }"></div>
        </div>
      `;
    });
  }, [zones, workloads, selectedSiteId, mapLoaded, useFallbackView, onSelectSite]);

  // Coordinate projection helper for the 2.5D Isometric Vector Fallback
  const projectIsoCoord = (lng: number, lat: number) => {
    // US Bounding Box: approx -125 to -67 lng, 24 to 50 lat
    const minLng = -125;
    const maxLng = -67;
    const minLat = 24;
    const maxLat = 50;

    const x = ((lng - minLng) / (maxLng - minLng)) * 100;
    const y = (1 - (lat - minLat) / (maxLat - minLat)) * 100;
    return { x, y };
  };

  const resetView = () => {
    if (mapRef.current && !useFallbackView) {
      mapRef.current.flyTo({
        center: [-98.5, 39.0],
        zoom: 3.8,
        pitch: viewMode3D ? 45 : 0,
        bearing: 0,
        duration: 1000,
      });
    }
    onSelectSite(null);
  };

  const togglePitch = () => {
    if (mapRef.current && !useFallbackView) {
      const next3D = !viewMode3D;
      setViewMode3D(next3D);
      mapRef.current.easeTo({
        pitch: next3D ? 50 : 0,
        bearing: next3D ? -15 : 0,
        duration: 800,
      });
    }
  };

  return (
    <div className="relative w-full h-full min-h-[500px] bg-zinc-950 overflow-hidden select-none">
      {/* 1. Mapbox Canvas Container */}
      <div
        ref={mapContainerRef}
        className={`w-full h-full transition-opacity duration-300 ${useFallbackView ? 'hidden' : 'block'}`}
      />

      {/* 2. Interactive High-Performance 2.5D Isometric Vector Map (Guaranteed Fallback) */}
      {useFallbackView && (
        <div className="w-full h-full relative flex items-center justify-center p-6 bg-zinc-950 overflow-hidden">
          {/* Subtle Grid Background */}
          <div
            className="absolute inset-0 opacity-15"
            style={{
              backgroundImage:
                'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.2) 1px, transparent 0)',
              backgroundSize: '32px 32px',
            }}
          />

          {/* SVG Map Container of the United States and Regional ISOs */}
          <div className="relative w-full max-w-5xl aspect-[16/10] bg-zinc-900/30 border border-zinc-800/80 rounded-2xl p-6 shadow-2xl backdrop-blur-sm flex flex-col justify-between">
            {/* SVG Territorial Boundaries */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none p-4"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              {Object.entries(ISO_GEOJSON_POLYGONS).map(([zoneId, coords]) => {
                const zone = zones.find((z) => z.zone_id === zoneId);
                const carbon = zone ? zone.carbon_intensity : 200;
                const strokeColor = getCarbonColor(carbon);

                const points = coords
                  .map(([lng, lat]) => {
                    const p = projectIsoCoord(lng, lat);
                    return `${p.x},${p.y}`;
                  })
                  .join(' ');

                return (
                  <polygon
                    key={zoneId}
                    points={points}
                    fill={strokeColor}
                    fillOpacity={0.16}
                    stroke={strokeColor}
                    strokeWidth={0.7}
                    strokeDasharray="2, 1"
                  />
                );
              })}
            </svg>

            {/* Regional ISO Center Labels */}
            {zones.map((zone) => {
              const [lat, lng] = zone.coordinates;
              const p = projectIsoCoord(lng, lat);
              const carbonColor = getCarbonColor(zone.carbon_intensity);

              return (
                <div
                  key={zone.zone_id}
                  style={{ left: `${p.x}%`, top: `${p.y}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center"
                >
                  <span className="font-mono text-[11px] font-bold text-zinc-300 tracking-wider bg-zinc-950/80 px-2 py-0.5 rounded border border-zinc-800">
                    {zone.zone_id}
                  </span>
                  <span
                    className="text-[10px] font-mono font-semibold mt-0.5"
                    style={{ color: carbonColor }}
                  >
                    {zone.carbon_intensity} gCO₂/kWh
                  </span>
                </div>
              );
            })}

            {/* Interactive Industrial Facilities Markers */}
            {workloads.map((site) => {
              const [lat, lng] = site.coordinates;
              const p = projectIsoCoord(lng, lat);
              const isSelected = selectedSiteId === site.id;

              const statusColor =
                site.status === 'BOOST'
                  ? 'border-emerald-500/50 text-emerald-400 bg-zinc-950/95 shadow-emerald-500/20'
                  : site.status === 'THROTTLE'
                  ? 'border-amber-500/50 text-amber-400 bg-zinc-950/95 shadow-amber-500/20'
                  : site.status === 'DEFER'
                  ? 'border-rose-500/50 text-rose-400 bg-zinc-950/95 shadow-rose-500/20'
                  : 'border-zinc-700 text-zinc-300 bg-zinc-950/95';

              return (
                <div
                  key={site.id}
                  onClick={() => onSelectSite(isSelected ? null : site.id)}
                  style={{ left: `${p.x}%`, top: `${p.y}%` }}
                  className="absolute -translate-x-1/2 -translate-y-full cursor-pointer z-20 group transition-all duration-300"
                >
                  {/* Glowing 3D Extruded Building Representation */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`px-2.5 py-1 rounded-md border text-xs font-mono font-semibold shadow-xl flex items-center gap-1.5 transition-all group-hover:scale-110 ${statusColor} ${
                        isSelected ? 'ring-2 ring-emerald-400 scale-110' : ''
                      }`}
                    >
                      <span>{site.type === 'AI_TRAINING' ? 'AI' : 'EV'}</span>
                      <span className="font-bold">
                        {site.status === 'BOOST' ? `+${site.delta_kw}` : `${site.delta_kw}`} kW
                      </span>
                      <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-zinc-800 text-zinc-300">
                        {site.status}
                      </span>
                    </div>

                    {/* Extruded Pillar Height */}
                    <div
                      className={`w-1 rounded-sm mt-0.5 transition-all ${
                        site.status === 'BOOST'
                          ? 'bg-emerald-500'
                          : site.status === 'THROTTLE'
                          ? 'bg-amber-500'
                          : site.status === 'DEFER'
                          ? 'bg-rose-500'
                          : 'bg-zinc-600'
                      }`}
                      style={{ height: `${Math.max(12, (site.current_kw / site.max_kw) * 36)}px` }}
                    />
                    <div className="w-2.5 h-2.5 rounded-full bg-zinc-400 border-2 border-zinc-950" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Map Legend Overlay */}
      <div className="absolute top-4 left-4 z-10 bg-zinc-950/90 backdrop-blur-md border border-zinc-800 p-3.5 rounded-xl font-sans text-xs flex flex-col gap-2.5 shadow-xl max-w-xs">
        <div className="flex items-center justify-between">
          <div className="font-semibold text-zinc-200 flex items-center gap-1.5">
            <Layers className="h-4 w-4 text-emerald-400" />
            <span>Regional Carbon Intensity</span>
          </div>
          <span className="text-[10px] text-zinc-500 font-mono">gCO₂/kWh</span>
        </div>

        <div className="grid grid-cols-3 gap-1.5 text-[11px] font-mono text-center">
          <div className="p-1 rounded bg-emerald-950/40 border border-emerald-500/30 text-emerald-300">
            &lt; 150 <span className="block text-[9px] font-sans text-emerald-400 font-normal">Clean</span>
          </div>
          <div className="p-1 rounded bg-amber-950/40 border border-amber-500/30 text-amber-300">
            150-320 <span className="block text-[9px] font-sans text-amber-400 font-normal">Moderate</span>
          </div>
          <div className="p-1 rounded bg-rose-950/40 border border-rose-500/30 text-rose-300">
            &gt; 320 <span className="block text-[9px] font-sans text-rose-400 font-normal">High Carbon</span>
          </div>
        </div>

        {/* Territory Status Quick Summary */}
        <div className="pt-2 border-t border-zinc-800/80 flex flex-col gap-1 text-[11px]">
          {zones.map((z) => (
            <div key={z.zone_id} className="flex items-center justify-between text-zinc-300">
              <span className="font-medium">{z.name}</span>
              <div className="flex items-center gap-2 font-mono">
                <span
                  className={
                    z.carbon_intensity < 150
                      ? 'text-emerald-400 font-bold'
                      : z.carbon_intensity <= 320
                      ? 'text-amber-400 font-bold'
                      : 'text-rose-400 font-bold'
                  }
                >
                  {z.carbon_intensity} g
                </span>
                <span className="text-zinc-500 text-[10px]">({z.renewable_pct}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating View & Mode Toggle Controls */}
      <div className="absolute bottom-4 right-4 z-10 flex items-center gap-2">
        {/* Toggle between 3D Mapbox GL and 2.5D Isometric Grid */}
        <button
          type="button"
          onClick={() => setUseFallbackView(!useFallbackView)}
          className="h-8 px-3 rounded-md bg-zinc-900/90 border border-zinc-800 text-zinc-300 hover:text-zinc-100 text-xs font-mono flex items-center gap-1.5 shadow-lg backdrop-blur-md"
          title="Toggle between Mapbox GL Satellite/Dark and 2.5D Vector Grid"
        >
          <Compass className="h-3.5 w-3.5 text-emerald-400" />
          <span>{useFallbackView ? 'Switch to Mapbox GL' : 'Isometric Vector Grid'}</span>
        </button>

        {!useFallbackView && (
          <button
            type="button"
            onClick={togglePitch}
            className="h-8 px-3 rounded-md bg-zinc-900/90 border border-zinc-800 text-zinc-300 hover:text-zinc-100 text-xs font-mono flex items-center gap-1.5 shadow-lg backdrop-blur-md"
          >
            <Eye className="h-3.5 w-3.5 text-zinc-400" />
            <span>{viewMode3D ? '3D Oblique' : '2D Top-Down'}</span>
          </button>
        )}

        <button
          type="button"
          onClick={resetView}
          className="h-8 px-3 rounded-md bg-zinc-900/90 border border-zinc-800 text-zinc-300 hover:text-zinc-100 text-xs font-mono flex items-center gap-1.5 shadow-lg backdrop-blur-md"
        >
          <RefreshCw className="h-3.5 w-3.5 text-zinc-400" />
          <span>Reset US View</span>
        </button>
      </div>

      {/* Selected Facility Callout Box */}
      {selectedSiteId && (
        <div className="absolute bottom-4 left-4 z-10 bg-zinc-950/90 backdrop-blur-md border border-emerald-500/40 p-3.5 rounded-lg text-xs shadow-2xl max-w-sm">
          {(() => {
            const site = workloads.find((w) => w.id === selectedSiteId);
            if (!site) return null;
            const zone = zones.find((z) => z.zone_id === site.zone_id);
            return (
              <div className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-1.5 text-zinc-400 text-[11px]">
                      {site.type === 'AI_TRAINING' ? (
                        <Server className="h-3.5 w-3.5 text-cyan-400" />
                      ) : (
                        <Truck className="h-3.5 w-3.5 text-emerald-400" />
                      )}
                      <span>{site.type === 'AI_TRAINING' ? 'AI Supercluster' : 'Commercial EV Depot'}</span>
                      <span>·</span>
                      <span className="font-semibold text-zinc-200">{site.zone_id}</span>
                    </div>
                    <div className="text-sm font-bold text-zinc-100 mt-0.5">{site.site_name}</div>
                  </div>
                  <button
                    onClick={() => onSelectSite(null)}
                    className="text-zinc-400 hover:text-zinc-200 text-base leading-none p-1"
                  >
                    ×
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 p-2 bg-zinc-900/60 rounded border border-zinc-800 font-mono text-[11px]">
                  <div>
                    <span className="text-zinc-400 block text-[10px] font-sans">Active Power</span>
                    <span className="font-bold text-zinc-100">{site.current_kw.toLocaleString()} kW</span>
                    <span className="text-zinc-500 text-[10px] ml-1">/ {site.max_kw.toLocaleString()} kW</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block text-[10px] font-sans">Shift Delta</span>
                    <span
                      className={`font-bold ${
                        site.delta_kw > 0
                          ? 'text-emerald-400'
                          : site.delta_kw < 0
                          ? 'text-amber-400'
                          : 'text-zinc-400'
                      }`}
                    >
                      {site.delta_kw > 0 ? `+${site.delta_kw}` : site.delta_kw} kW
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block text-[10px] font-sans">SLA Deadline</span>
                    <span className="text-zinc-200">{site.deadline_hour}:00 Target</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block text-[10px] font-sans">Quota Progress</span>
                    <span className="text-emerald-400 font-bold">{site.sla_progress_pct}%</span>
                  </div>
                </div>

                {zone && (
                  <div className="text-[11px] text-zinc-400">
                    Connected Grid Marginal Fuel:{' '}
                    <span className="text-zinc-200 font-medium">{zone.marginal_fuel}</span> (
                    {zone.carbon_intensity} gCO₂/kWh)
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};
