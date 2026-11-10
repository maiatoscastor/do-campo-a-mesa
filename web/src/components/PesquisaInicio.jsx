import { useState } from 'react';
import { useNavigate } from 'react-router';
import Icone from './Icone.jsx';

// A pesquisa no topo do início: leva ao catálogo com o texto já pesquisado (no nome, na descrição e
// no produtor, como a pesquisa do catálogo)
export default function PesquisaInicio() {
  const navegar = useNavigate();
  const [texto, setTexto] = useState('');

  function pesquisar(evento) {
    evento.preventDefault();
    const procura = texto.trim();
    navegar(
      procura ? `/produtos?q=${encodeURIComponent(procura)}` : '/produtos',
    );
  }

  return (
    <form className="pesquisa-inicio" role="search" onSubmit={pesquisar}>
      <label className="visually-hidden" htmlFor="pesquisa-inicio">
        Pesquisar produtos ou produtores
      </label>
      <Icone nome="pesquisa" tamanho={20} className="pesquisa-inicio-icone" />
      <input
        id="pesquisa-inicio"
        className="form-control"
        type="search"
        placeholder="Produto ou produtor"
        value={texto}
        onChange={(evento) => setTexto(evento.target.value)}
      />
      <button className="btn btn-primary" type="submit">
        Pesquisar
      </button>
    </form>
  );
}
