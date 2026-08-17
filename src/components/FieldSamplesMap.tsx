import React, { useEffect, useRef, useMemo } from 'react';
import { MapPin, Navigation } from 'lucide-react';
import { AnalysisData } from '../types';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface FieldSamplesMapProps {
  samples: AnalysisData[];
  fieldName?: string;
  onSelectSample?: (sample: AnalysisData) => void;
}

/**
 * Componente para Visualização Geoespacial das Amostras por Talhão
 * utilizando OpenStreetMap e Leaflet com marcadores dinâmicos por nível de cobertura foliar.
 */
export const FieldSamplesMap: React.FC<FieldSamplesMapProps> = ({
  samples,
  fieldName,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Filtra amostras que possuem coordenadas GPS válidas
  const geoSamples = useMemo(() => {
    return samples.filter(
      (s) =>
        typeof s.latitude === 'number' &&
        typeof s.longitude === 'number' &&
        Number.isFinite(s.latitude) &&
        Number.isFinite(s.longitude) &&
        s.latitude >= -90 &&
        s.latitude <= 90 &&
        s.longitude >= -180 &&
        s.longitude <= 180 &&
        (s.latitude !== 0 || s.longitude !== 0)
    );
  }, [samples]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Destrói instância anterior se existir para evitar vazamentos de memória
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    if (geoSamples.length === 0) return;

    // Coordenada média inicial (centroide geográfico dos pontos)
    const avgLat = geoSamples.reduce((sum, s) => sum + s.latitude!, 0) / geoSamples.length;
    const avgLng = geoSamples.reduce((sum, s) => sum + s.longitude!, 0) / geoSamples.length;

    const map = L.map(mapContainerRef.current, {
      center: [avgLat, avgLng],
      zoom: 16,
      zoomControl: true,
      attributionControl: false,
    });

    mapInstanceRef.current = map;

    // Camada de tiles OpenStreetMap 100% gratuita
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    const bounds = L.latLngBounds([]);

    geoSamples.forEach((sample, idx) => {
      const lat = sample.latitude!;
      const lng = sample.longitude!;
      bounds.extend([lat, lng]);

      // Cor do marcador baseada no limiar de cobertura foliar
      const markerColor =
        sample.coveragePercent >= 15
          ? '#16a34a' // Verde: Cobertura Boa
          : sample.coveragePercent >= 8
            ? '#eab308' // Amarelo: Cobertura Moderada
            : '#dc2626'; // Vermelho: Cobertura Deficiente

      // Marcador circular customizado
      const customIcon = L.divIcon({
        className: 'custom-map-pin',
        html: `
          <div style="
            background-color: ${markerColor};
            width: 28px;
            height: 28px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.35);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 900;
            font-size: 11px;
            font-family: sans-serif;
          ">
            ${idx + 1}
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);

      // Sanitização e formatação do popup informativo
      const sampleTitle = sample.title ? String(sample.title).replace(/</g, '&lt;') : `Amostra #${idx + 1}`;
      const canopyText = sample.canopyPosition ? `Posição: <strong>${sample.canopyPosition.toUpperCase()}</strong>` : '';

      const popupContent = `
        <div style="font-family: sans-serif; font-size: 12px; color: #1e293b; min-width: 180px;">
          <div style="font-weight: 800; font-size: 13px; margin-bottom: 4px; color: #006439;">
            ${sampleTitle}
          </div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">
            ${canopyText} ${sample.date ? `· ${sample.date}` : ''}
          </div>
          <div style="border-top: 1px solid #e2e8f0; padding-top: 6px; display: flex; flex-direction: column; gap: 3px;">
            <div><strong>Densidade:</strong> ${sample.density} gotas/cm²</div>
            <div><strong>Cobertura:</strong> ${sample.coveragePercent}%</div>
            <div><strong>DMV:</strong> ${sample.vmdUm} µm (${sample.asabeCategory || 'N/A'})</div>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);
    });

    if (geoSamples.length > 1) {
      map.fitBounds(bounds, { padding: [40, 40] });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [geoSamples]);

  if (geoSamples.length === 0) {
    return (
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-3 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
          <Navigation className="w-6 h-6" />
        </div>
        <h3 className="font-bold text-sm text-on-surface">
          Nenhuma coordenada GPS registrada neste talhão
        </h3>
        <p className="text-xs text-on-surface-variant max-w-sm leading-relaxed">
          Ao fotografar os próximos cartões com o celular, permita o acesso à localização para que os pontos apareçam automaticamente no mapa espacial.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Map Card Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          <h3 className="font-bold text-xs uppercase tracking-wider text-on-surface">
            Mapa Espacial de Deposição {fieldName ? `— ${fieldName}` : ''}
          </h3>
        </div>
        <span className="text-[10px] font-bold text-primary px-2 py-0.5 bg-primary/10 rounded-full border border-primary/20">
          {geoSamples.length} {geoSamples.length === 1 ? 'Ponto Mapeado' : 'Pontos Mapeados'}
        </span>
      </div>

      {/* Interactive Map Canvas */}
      <div className="w-full h-80 sm:h-96 rounded-2xl overflow-hidden border border-outline-variant shadow-md relative z-0">
        <div ref={mapContainerRef} className="w-full h-full" />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 py-2 bg-surface-container rounded-xl text-[10px] text-on-surface-variant font-semibold border border-outline-variant/60">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-green-600 border border-white" />
          <span>Cobertura Boa (≥ 15%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-amber-500 border border-white" />
          <span>Cobertura Intermediária (8 - 14%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-600 border border-white" />
          <span>Cobertura Deficiente (&lt; 8%)</span>
        </div>
      </div>
    </div>
  );
};
