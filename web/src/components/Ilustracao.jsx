// Ilustrações dos produtos, desenhadas de propósito para esta aplicação. São só decoração
// (aria-hidden), e as cores são fixas: um kiwi é verde tanto no modo claro como no escuro.
const ANGULOS_DAS_SEMENTES = Array.from({ length: 12 }, (_, i) => i * 30);

const DESENHOS = {
  kiwi: (
    <>
      <ellipse cx="60" cy="64" rx="46" ry="44" fill="#7A5A33" />
      <ellipse cx="60" cy="62" rx="40" ry="38" fill="#7FB341" />
      <ellipse cx="60" cy="62" rx="31" ry="29" fill="#A6D266" />
      <ellipse cx="60" cy="62" rx="12" ry="11" fill="#F2F6D8" />
      <g fill="#2B2416">
        {ANGULOS_DAS_SEMENTES.map((angulo) => (
          <ellipse
            key={angulo}
            cx="60"
            cy="41"
            rx="1.9"
            ry="3.6"
            transform={`rotate(${angulo} 60 62)`}
          />
        ))}
      </g>
    </>
  ),
  mel: (
    <>
      <rect x="34" y="20" width="52" height="16" rx="6" fill="#7A4A26" />
      <rect x="38" y="33" width="44" height="8" rx="3" fill="#5E3719" />
      <path
        d="M30 52c0-8 6-12 14-12h32c8 0 14 4 14 12v42c0 8-6 14-14 14H44c-8 0-14-6-14-14z"
        fill="#F2A33A"
      />
      <path
        d="M30 72h60v22c0 8-6 14-14 14H44c-8 0-14-6-14-14z"
        fill="#E08A1E"
      />
      <rect x="40" y="56" width="40" height="30" rx="6" fill="#FFF3D6" />
      <path
        d="M60 62l7 4v8l-7 4-7-4v-8z"
        fill="none"
        stroke="#C77A12"
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </>
  ),
  vinho: (
    <>
      <rect x="53" y="8" width="14" height="12" rx="3" fill="#C2410C" />
      <path
        d="M54 18h12v22c0 4 4 7 8 10 5 4 8 9 8 16v40c0 5-4 8-8 8H46c-4 0-8-3-8-8V66c0-7 3-12 8-16 4-3 8-6 8-10z"
        fill="#2E6B45"
      />
      <rect x="44" y="66" width="32" height="26" rx="4" fill="#F4EEDD" />
      <rect x="49" y="72" width="22" height="3.5" rx="1.75" fill="#2E6B45" />
      <rect x="52" y="79" width="16" height="3" rx="1.5" fill="#B98C3B" />
    </>
  ),
  abobora: (
    <>
      <path
        d="M60 32c2-8 6-12 12-14"
        stroke="#4E6B2A"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />
      <path d="M66 26c10-6 20-3 24 4-8 3-17 2-24-4z" fill="#6E9A3A" />
      <ellipse cx="38" cy="70" rx="24" ry="34" fill="#E5832F" />
      <ellipse cx="82" cy="70" rx="24" ry="34" fill="#E5832F" />
      <ellipse cx="60" cy="70" rx="24" ry="36" fill="#F09A45" />
    </>
  ),
  couve: (
    <>
      <path
        d="M60 108C30 96 16 70 22 44c4-18 20-30 38-30s34 12 38 30c6 26-8 52-38 64z"
        fill="#3F8F4E"
      />
      <path
        d="M60 104V26"
        stroke="#BFE3B4"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M60 50L40 38M60 66L36 56M60 82L42 76M60 50l20-12M60 66l24-10M60 82l18-6"
        stroke="#BFE3B4"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </>
  ),
  queijo: (
    <>
      <path d="M16 62L88 28l16 34z" fill="#FCD970" />
      <path d="M16 62h88v34H16z" fill="#F2B83A" />
      <circle cx="40" cy="78" r="6" fill="#DB9A1E" />
      <circle cx="64" cy="86" r="4" fill="#DB9A1E" />
      <circle cx="84" cy="74" r="5" fill="#DB9A1E" />
      <circle cx="62" cy="46" r="4" fill="#E9B43A" />
    </>
  ),
  broa: (
    <>
      <ellipse cx="60" cy="70" rx="46" ry="32" fill="#C98A3E" />
      <ellipse cx="60" cy="64" rx="42" ry="27" fill="#E2AA5C" />
      <path
        d="M34 58c8-6 16-8 24-8M46 70c10-6 20-8 30-8M62 82c8-4 14-5 20-5"
        stroke="#F6D79A"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
    </>
  ),
  castanha: (
    <>
      <path
        d="M60 18c4 6 6 10 6 14 18 4 34 20 34 42 0 22-18 34-40 34S20 96 20 74c0-22 16-38 34-42 0-4 2-8 6-14z"
        fill="#7B4526"
      />
      <path
        d="M24 84c8 14 22 20 36 20s28-6 36-20c-10 6-22 8-36 8s-26-2-36-8z"
        fill="#D7B48A"
      />
      <path
        d="M44 46c-8 6-12 14-12 22"
        stroke="#A86A3E"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
      />
    </>
  ),
  maca: (
    <>
      <path
        d="M60 38c-6-6-16-8-24-4-14 6-18 24-12 42 6 18 18 30 30 30 3 0 4-2 6-2s3 2 6 2c12 0 24-12 30-30 6-18 2-36-12-42-8-4-18-2-24 4z"
        fill="#D9442F"
      />
      <path
        d="M60 38c0-10 2-16 6-22"
        stroke="#6B4A2B"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
      />
      <path d="M64 24c8-8 18-8 24-4-6 6-16 8-24 4z" fill="#5E9A3A" />
    </>
  ),
  caixa: (
    <>
      <g fill="#7A5A33">
        <circle cx="40" cy="46" r="16" />
        <circle cx="100" cy="45" r="16" />
        <circle cx="126" cy="50" r="14" />
        <circle cx="56" cy="54" r="15" />
        <circle cx="86" cy="54" r="16" />
        <circle cx="114" cy="58" r="13" />
        <circle cx="70" cy="42" r="17" />
      </g>
      <circle cx="70" cy="42" r="13" fill="#7FB341" />
      <circle cx="70" cy="42" r="9" fill="#A6D266" />
      <circle cx="70" cy="42" r="4" fill="#F2F6D8" />
      <rect x="18" y="58" width="124" height="50" rx="6" fill="#C79A64" />
      <rect x="18" y="58" width="124" height="10" fill="#B3854F" />
      <path d="M18 84h124" stroke="#B3854F" strokeWidth="4" />
      <rect x="58" y="72" width="44" height="22" rx="4" fill="#F4EEDD" />
    </>
  ),
  cesto: (
    <>
      <path
        d="M30 50a30 30 0 0 1 60 0"
        stroke="#B98552"
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M18 50h84l-10 50c-1 5-5 8-10 8H38c-5 0-9-3-10-8z"
        fill="#C99A62"
      />
      <path
        d="M32 64h56M34 80h52M37 94h46"
        stroke="#AE7F48"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </>
  ),
};

export default function Ilustracao({ nome, className }) {
  const desenho = DESENHOS[nome];
  // Um nome errado é um erro de programação: falha logo, para se notar durante o desenvolvimento
  if (!desenho) {
    throw new Error(`Ilustração desconhecida: "${nome}"`);
  }
  return (
    <svg
      className={className}
      viewBox={nome === 'caixa' ? '0 0 160 120' : '0 0 120 120'}
      aria-hidden="true"
    >
      {desenho}
    </svg>
  );
}
