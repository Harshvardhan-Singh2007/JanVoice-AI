import { useMemo, useState } from 'react';
import type { IssueMapMarker } from '../../features/issues/issueApi';

interface Tile {
  url: string;
  left: number;
  top: number;
}

const tileUrlTemplate = import.meta.env.VITE_MAP_TILE_URL ?? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

const worldPoint = (latitude: number, longitude: number, zoom: number): { x: number; y: number } => {
  const size = 256 * 2 ** zoom;
  const safeLatitude = Math.max(-85.0511, Math.min(85.0511, latitude));
  const sin = Math.sin((safeLatitude * Math.PI) / 180);
  return {
    x: ((longitude + 180) / 360) * size,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * size,
  };
};

export function IssueMap({ markers, unavailable = false }: { markers: IssueMapMarker[]; unavailable?: boolean }) {
  const [tileError, setTileError] = useState(false);
  const [selectedReference, setSelectedReference] = useState<string>();
  const mapData = useMemo(() => {
    const valid = markers.filter(({ coordinates }) => Number.isFinite(coordinates?.latitude)
      && Number.isFinite(coordinates?.longitude)
      && coordinates.latitude >= -90 && coordinates.latitude <= 90
      && coordinates.longitude >= -180 && coordinates.longitude <= 180);
    if (!valid.length) return undefined;

    let zoom = 3;
    let projected: Array<{ marker: IssueMapMarker; x: number; y: number }> = [];
    for (let candidateZoom = 3; candidateZoom <= 16; candidateZoom += 1) {
      const next = valid.map((marker) => ({
        marker,
        ...worldPoint(marker.coordinates.latitude, marker.coordinates.longitude, candidateZoom),
      }));
      const spanX = Math.max(...next.map((point) => point.x)) - Math.min(...next.map((point) => point.x));
      const spanY = Math.max(...next.map((point) => point.y)) - Math.min(...next.map((point) => point.y));
      if (spanX <= 540 && spanY <= 205) {
        zoom = candidateZoom;
        projected = next;
      } else break;
    }
    if (!projected.length) projected = valid.map((marker) => ({
      marker,
      ...worldPoint(marker.coordinates.latitude, marker.coordinates.longitude, zoom),
    }));
    const centerX = (Math.min(...projected.map((point) => point.x)) + Math.max(...projected.map((point) => point.x))) / 2;
    const centerY = (Math.min(...projected.map((point) => point.y)) + Math.max(...projected.map((point) => point.y))) / 2;
    const left = centerX - 384;
    const top = centerY - 170;
    const tileMinX = Math.floor(left / 256);
    const tileMaxX = Math.floor((left + 768) / 256);
    const tileMinY = Math.max(0, Math.floor(top / 256));
    const tileMaxY = Math.min(2 ** zoom - 1, Math.floor((top + 340) / 256));
    const tiles: Tile[] = [];
    for (let tileY = tileMinY; tileY <= tileMaxY; tileY += 1) {
      for (let tileX = tileMinX; tileX <= tileMaxX; tileX += 1) {
        const wrappedX = ((tileX % (2 ** zoom)) + 2 ** zoom) % (2 ** zoom);
        tiles.push({
          url: tileUrlTemplate.replace('{z}', String(zoom)).replace('{x}', String(wrappedX)).replace('{y}', String(tileY)),
          left: ((tileX * 256 - left) / 768) * 100,
          top: ((tileY * 256 - top) / 340) * 100,
        });
      }
    }
    return {
      tiles,
      markers: projected.map(({ marker, x, y }) => ({
        marker,
        left: Math.max(1, Math.min(99, ((x - left) / 768) * 100)),
        top: Math.max(3, Math.min(95, ((y - top) / 340) * 100)),
      })),
    };
  }, [markers]);

  if (!mapData) {
    return <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[.04]">
      <h2 className="text-lg font-bold">Community issue map</h2>
      <p className="mt-2 text-sm text-slate-500">{unavailable ? "The map data could not be loaded. You can still view and submit reports." : "No reports with shared coordinates are available to map."}</p>
    </section>;
  }

  return <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[.04]">
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div><h2 className="text-lg font-bold">Community issue map</h2><p className="mt-1 text-xs text-slate-500">Approximate locations for reports where citizens chose to share GPS.</p></div>
      <span className="text-xs text-slate-500">{mapData.markers.length} mapped</span>
    </div>
    <div className="relative mt-4 aspect-[768/340] overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800" aria-label="Map of approximate complaint locations">
      {!tileError && mapData.tiles.map((tile) => <img key={tile.url} src={tile.url} alt="" loading="lazy" referrerPolicy="strict-origin-when-cross-origin" onError={() => setTileError(true)} className="absolute h-[75.3%] w-[33.333%]" style={{ left: `${tile.left}%`, top: `${tile.top}%` }} />)}
      {tileError && <p className="absolute left-2 top-2 z-10 rounded bg-white/90 px-2 py-1 text-xs text-slate-600">Map tiles are unavailable; approximate report markers remain visible.</p>}
      {mapData.markers.map(({ marker, left, top }) => <button key={marker.reference} type="button" title={`${marker.category} · ${marker.status}`} aria-label={`Report ${marker.reference.slice(-6)}, ${marker.category}, ${marker.status}`} className="absolute z-20 grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white bg-cyan-600 text-[10px] font-bold text-white shadow-lg" style={{ left: `${left}%`, top: `${top}%` }} onClick={() => setSelectedReference(marker.reference)}>{marker.reference.slice(-2)}</button>)}
      <p className="absolute bottom-2 right-2 z-30 rounded bg-white/90 px-2 py-1 text-[10px] text-slate-600">© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline">OpenStreetMap contributors</a></p>
    </div>
    {selectedReference && (() => {
      const selected = markers.find((marker) => marker.reference === selectedReference);
      return selected ? <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm dark:bg-white/5" aria-live="polite">
        <p className="font-bold">Report #{selected.reference.slice(-6)}</p>
        <p className="mt-1 text-slate-600 dark:text-slate-300">{selected.category} · {selected.status} · {new Date(selected.createdAt).toLocaleDateString()}</p>
        <button type="button" className="mt-2 text-xs font-semibold text-cyan-700 underline dark:text-cyan-300" onClick={() => setSelectedReference(undefined)}>Close details</button>
      </div> : null;
    })()}
    <p className="mt-2 text-right text-[10px] text-slate-500">Map markers show approximate locations only.</p>
  </section>;
}
