import LinhaDaAgenda from './LinhaDaAgenda.jsx';
import SeccaoInicio from './SeccaoInicio.jsx';

// Os próximos leilões marcados, no início (sem o que já está em destaque no topo)
export default function ProximosLeiloes({ leiloes }) {
  if (leiloes.length === 0) {
    return null;
  }
  return (
    <SeccaoInicio
      titulo="Próximos leilões"
      ligacao="/leiloes"
      textoDaLigacao="Ver a agenda"
    >
      <ul className="list-group">
        {leiloes.map((leilao) => (
          <li className="list-group-item" key={leilao.id}>
            <LinhaDaAgenda leilao={leilao} comDia />
          </li>
        ))}
      </ul>
    </SeccaoInicio>
  );
}
