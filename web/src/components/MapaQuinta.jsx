import { lazy, Suspense } from 'react';

// O Leaflet (cerca de 150 KB) só se descarrega quando aparece um mapa, e não ao abrir a aplicação.
// Enquanto chega, fica um espaço com o tamanho do mapa, para a página não saltar.
const MapaLeaflet = lazy(() => import('./MapaLeaflet.jsx'));

export default function MapaQuinta({ ponto, aoMudar, rotulo }) {
  return (
    <Suspense fallback={<div className="mapa-quinta" aria-hidden="true" />}>
      <MapaLeaflet ponto={ponto} aoMudar={aoMudar} rotulo={rotulo} />
    </Suspense>
  );
}
