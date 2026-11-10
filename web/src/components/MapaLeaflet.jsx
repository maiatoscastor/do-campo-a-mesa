import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useEffectEvent, useRef } from 'react';

// Sem ponto marcado, o mapa mostra o continente; com ponto, a zona à volta da quinta
const PORTUGAL = [39.6, -8.0];
const ZOOM_DA_QUINTA = 14;

// O pino da quinta, desenhado em CSS (os ícones de imagem do Leaflet não se dão bem com o Vite)
const PINO = L.divIcon({
  className: 'pino-mapa',
  html: '<span></span>',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

// Mapa do OpenStreetMap, com o Leaflet, e o ponto da quinta. Com "aoMudar", serve para o produtor
// marcar o ponto (tocando no mapa ou arrastando o pino); sem ele, é só para ver. O mapa é criado
// uma vez e o pino acompanha o "ponto" que vem de fora.
export default function MapaLeaflet({ ponto, aoMudar, rotulo }) {
  const editavel = Boolean(aoMudar);
  const elemento = useRef(null);
  const mapa = useRef(null);
  const pino = useRef(null);
  const pontoInicial = useRef(ponto);
  const mudar = useEffectEvent(({ lat, lng }) =>
    aoMudar?.({ lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) }),
  );

  useEffect(() => {
    const inicial = pontoInicial.current;
    const novo = L.map(elemento.current, {
      // A roda do rato só faz zoom depois de se clicar no mapa, para não prender quem desliza a página
      scrollWheelZoom: false,
      // Pela mesma razão, no telemóvel o mapa só de ver não se arrasta com um dedo (desliza-se a
      // página); com dois dedos aproxima-se e afasta-se. Para marcar o ponto, arrasta-se.
      dragging: editavel || !L.Browser.mobile,
    }).setView(
      inicial ? [inicial.lat, inicial.lng] : PORTUGAL,
      inicial ? ZOOM_DA_QUINTA : 6,
    );
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(novo);
    novo.on('focus click', () => novo.scrollWheelZoom.enable());
    if (editavel) {
      novo.on('click', (evento) => mudar(evento.latlng));
    }
    mapa.current = novo;
    return () => {
      novo.remove();
      mapa.current = null;
      pino.current = null;
    };
  }, [editavel]);

  // O pino segue o ponto: aparece, muda de sítio ou desaparece
  useEffect(() => {
    const atual = mapa.current;
    if (!ponto) {
      pino.current?.remove();
      pino.current = null;
      return;
    }
    if (pino.current) {
      pino.current.setLatLng([ponto.lat, ponto.lng]);
    } else {
      pino.current = L.marker([ponto.lat, ponto.lng], {
        icon: PINO,
        draggable: editavel,
        keyboard: false,
      }).addTo(atual);
      if (editavel) {
        pino.current.on('dragend', () => mudar(pino.current.getLatLng()));
      }
    }
    // Com o mapa ainda afastado (o país todo), aproxima-se do ponto, para se poder acertar o pino
    if (atual.getZoom() < ZOOM_DA_QUINTA) {
      atual.setView([ponto.lat, ponto.lng], ZOOM_DA_QUINTA);
    } else {
      atual.panTo([ponto.lat, ponto.lng]);
    }
  }, [ponto, editavel]);

  return (
    <div
      className="mapa-quinta"
      ref={elemento}
      role="region"
      aria-label={rotulo}
    />
  );
}
