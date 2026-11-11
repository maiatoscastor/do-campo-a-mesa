import { NavLink } from 'react-router';

// No telemóvel e no tablet, a barra de baixo já tem cinco destinos: os produtores ficam ao lado dos
// produtos, com este seletor no topo das duas páginas (no computador estão os dois no menu de cima)
export default function AlternarProdutos() {
  return (
    <nav
      className="alternador alternador-produtos d-lg-none"
      aria-label="Produtos ou produtores"
    >
      <NavLink to="/produtos" viewTransition>
        Produtos
      </NavLink>
      <NavLink to="/produtores" end viewTransition>
        Produtores
      </NavLink>
    </nav>
  );
}
