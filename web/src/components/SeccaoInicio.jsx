import { useId } from 'react';
import { Link } from 'react-router';

// Uma secção do início: o título e, à direita, a ligação para ver tudo
export default function SeccaoInicio({
  titulo,
  ligacao,
  textoDaLigacao = 'Ver tudo',
  children,
}) {
  const id = useId();
  return (
    <section className="seccao-inicio" aria-labelledby={id}>
      <div className="seccao-inicio-cabecalho">
        <h2 className="h5 mb-0" id={id}>
          {titulo}
        </h2>
        {ligacao && (
          <Link className="small fw-semibold" to={ligacao}>
            {textoDaLigacao}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
