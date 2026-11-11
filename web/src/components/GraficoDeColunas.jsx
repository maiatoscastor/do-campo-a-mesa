import { useEffect, useId, useRef, useState } from 'react';

// As medidas do gráfico, em píxeis: a altura da área das barras, o espaço do eixo de baixo (as
// datas) e da esquerda (os valores), e a largura máxima de cada barra (as barras finas deixam ver o
// ar entre elas)
const ALTURA = 180;
const MARGEM_CIMA = 10;
const MARGEM_BAIXO = 26;
const MARGEM_ESQUERDA = 52;
const LARGURA_MAXIMA = 24;
const RAIO = 4;

// Um degrau "redondo" para as linhas de referência (1, 2, 2,5 ou 5 vezes uma potência de 10), para o
// eixo ter 4 intervalos com números limpos (0, 25, 50, 75, 100)
function degrauLimpo(maximo) {
  const bruto = maximo / 4;
  const potencia = 10 ** Math.floor(Math.log10(bruto));
  const resto = bruto / potencia;
  const fator = [1, 2, 2.5, 5, 10].find((f) => resto <= f);
  return fator * potencia;
}

// O contorno de uma barra: os cantos de cima arredondados, a base direita (assente no eixo)
function caminhoDaBarra(x, base, largura, altura) {
  const r = Math.min(RAIO, altura, largura / 2);
  return [
    `M${x},${base}`,
    `V${base - altura + r}`,
    `Q${x},${base - altura} ${x + r},${base - altura}`,
    `H${x + largura - r}`,
    `Q${x + largura},${base - altura} ${x + largura},${base - altura + r}`,
    `V${base}`,
    'Z',
  ].join(' ');
}

// Um gráfico de colunas com uma só série (por exemplo, as vendas de cada dia), desenhado em SVG à
// largura do espaço que tem. Ao passar o rato, ou com as setas do teclado, cada barra mostra o valor
// e o pormenor; os mesmos números estão na vista em tabela, para nunca dependerem só do gráfico.
// barras: [{ rotulo (curto, no eixo), rotuloLongo, valor, detalhe }].
export default function GraficoDeColunas({ barras, formatarValor, descricao }) {
  const caixa = useRef(null);
  const id = useId();
  const [largura, setLargura] = useState(0);
  const [ativa, setAtiva] = useState(null);
  const [emTabela, setEmTabela] = useState(false);

  // A largura acompanha o ecrã (rodar o telemóvel, alargar a janela)
  useEffect(() => {
    const elemento = caixa.current;
    if (!elemento) {
      return undefined;
    }
    const observador = new ResizeObserver(([entrada]) =>
      setLargura(Math.floor(entrada.contentRect.width)),
    );
    observador.observe(elemento);
    return () => observador.disconnect();
  }, [emTabela]);

  const maximo = Math.max(...barras.map(({ valor }) => valor), 0);
  const degrau = maximo > 0 ? degrauLimpo(maximo) : 1;
  const topo = Math.max(degrau * Math.ceil(maximo / degrau), degrau);
  const linhas = Array.from(
    { length: Math.round(topo / degrau) + 1 },
    (_, i) => i * degrau,
  );

  const larguraUtil = Math.max(largura - MARGEM_ESQUERDA, 0);
  const faixa = larguraUtil / barras.length;
  const larguraDaBarra = Math.min(LARGURA_MAXIMA, faixa * 0.6);
  const base = MARGEM_CIMA + ALTURA;
  const yDe = (valor) => base - (valor / topo) * ALTURA;
  // Só alguns rótulos no eixo de baixo, para não se atropelarem (sempre o mais recente)
  const cadaQuantos = Math.max(
    1,
    Math.ceil(barras.length / Math.max(1, Math.floor(larguraUtil / 48))),
  );
  const comRotulo = (i) => (barras.length - 1 - i) % cadaQuantos === 0;

  function teclado(evento) {
    const passos = { ArrowRight: 1, ArrowLeft: -1 };
    if (evento.key in passos) {
      evento.preventDefault();
      setAtiva((atual) => {
        const seguinte = (atual ?? barras.length) + passos[evento.key];
        return Math.min(Math.max(seguinte, 0), barras.length - 1);
      });
    } else if (evento.key === 'Escape') {
      setAtiva(null);
    }
  }

  const barraAtiva = ativa === null ? null : barras[ativa];
  const xDoMeio = (i) => MARGEM_ESQUERDA + faixa * i + faixa / 2;

  return (
    <div className="grafico">
      {emTabela ? (
        <table className="table table-sm grafico-tabela">
          <caption className="visually-hidden">{descricao}</caption>
          <thead>
            <tr>
              <th scope="col">Período</th>
              <th scope="col" className="text-end">
                Valor
              </th>
              <th scope="col">Pormenor</th>
            </tr>
          </thead>
          <tbody>
            {barras.map((barra) => (
              <tr key={barra.rotuloLongo}>
                <th scope="row" className="fw-normal">
                  {barra.rotuloLongo}
                </th>
                <td className="text-end numeros">
                  {formatarValor(barra.valor)}
                </td>
                <td className="text-body-secondary">{barra.detalhe}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="grafico-area" ref={caixa}>
          {largura > 0 && (
            <svg
              width={largura}
              height={base + MARGEM_BAIXO}
              role="img"
              aria-label={`${descricao}. Use as setas para ver o valor de cada barra.`}
              aria-describedby={barraAtiva ? `${id}-dica` : undefined}
              tabIndex={0}
              onKeyDown={teclado}
              onPointerLeave={() => setAtiva(null)}
              onBlur={() => setAtiva(null)}
            >
              {linhas.map((valor) => (
                <g key={valor}>
                  <line
                    className="grafico-linha"
                    x1={MARGEM_ESQUERDA}
                    x2={largura}
                    y1={yDe(valor)}
                    y2={yDe(valor)}
                  />
                  <text
                    className="grafico-eixo"
                    x={MARGEM_ESQUERDA - 8}
                    y={yDe(valor)}
                    textAnchor="end"
                    dominantBaseline="middle"
                  >
                    {formatarValor(valor, { curto: true })}
                  </text>
                </g>
              ))}
              {barras.map((barra, i) => (
                <g key={barra.rotuloLongo}>
                  {barra.valor > 0 && (
                    <path
                      className={`grafico-barra ${ativa === i ? 'grafico-barra-ativa' : ''}`}
                      d={caminhoDaBarra(
                        xDoMeio(i) - larguraDaBarra / 2,
                        base,
                        larguraDaBarra,
                        base - yDe(barra.valor),
                      )}
                    />
                  )}
                  {comRotulo(i) && (
                    <text
                      className="grafico-eixo"
                      x={xDoMeio(i)}
                      y={base + 18}
                      textAnchor="middle"
                    >
                      {barra.rotulo}
                    </text>
                  )}
                  {/* A zona sensível é a faixa toda, maior do que a barra: não é preciso acertar
                      na barra fina */}
                  <rect
                    className="grafico-alvo"
                    x={MARGEM_ESQUERDA + faixa * i}
                    y={MARGEM_CIMA}
                    width={faixa}
                    height={ALTURA}
                    onPointerEnter={() => setAtiva(i)}
                  />
                </g>
              ))}
            </svg>
          )}
          {barraAtiva && (
            <div
              id={`${id}-dica`}
              className="grafico-dica"
              role="status"
              // Ao lado da barra (e não por cima dela): à esquerda na metade direita do gráfico
              style={
                xDoMeio(ativa) > largura / 2
                  ? { right: largura - xDoMeio(ativa) + 14 }
                  : { left: xDoMeio(ativa) + 14 }
              }
            >
              <strong>{formatarValor(barraAtiva.valor)}</strong>
              <span>{barraAtiva.rotuloLongo}</span>
              {barraAtiva.detalhe && <span>{barraAtiva.detalhe}</span>}
            </div>
          )}
        </div>
      )}
      <button
        className="btn btn-link btn-sm px-0"
        type="button"
        onClick={() => {
          setAtiva(null);
          setEmTabela((atual) => !atual);
        }}
      >
        {emTabela ? 'Ver o gráfico' : 'Ver em tabela'}
      </button>
    </div>
  );
}
