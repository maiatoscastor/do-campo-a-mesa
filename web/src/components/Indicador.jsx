// Um número importante (por exemplo, as vendas dos últimos 30 dias), com uma linha de pormenor e, se
// houver, a comparação com o período anterior. O sentido muda a cor, mas o texto também o diz
// ("+25 %"), para não depender só da cor.
export default function Indicador({ rotulo, valor, detalhe, comparacao }) {
  return (
    <div className="indicador">
      <p className="indicador-rotulo">{rotulo}</p>
      <p className="indicador-valor">{valor}</p>
      {detalhe && <p className="indicador-detalhe">{detalhe}</p>}
      {comparacao && (
        <p className={`indicador-comparacao indicador-${comparacao.sentido}`}>
          {comparacao.texto}
        </p>
      )}
    </div>
  );
}
