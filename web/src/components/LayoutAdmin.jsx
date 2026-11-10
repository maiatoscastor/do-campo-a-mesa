import { Outlet } from 'react-router';
import Icone from './Icone.jsx';
import MenuSeccoes from './MenuSeccoes.jsx';
import { useTarefasAdmin } from '../hooks/useTarefasAdmin.js';

// As secções da administração, cada uma com o número do que espera por decisão
const SECCOES = [
  {
    caminho: '/admin/produtores',
    nome: 'Produtores',
    icone: 'validar',
    tarefa: 'produtoresPorValidar',
    sufixo: 'por validar',
  },
  {
    caminho: '/admin/denuncias',
    nome: 'Denúncias',
    icone: 'denuncia',
    tarefa: 'denunciasPorDecidir',
    sufixo: 'por decidir',
  },
];

// A área da administração (/admin), à parte de "A minha conta": o administrador chega aqui pela
// navegação principal, e a conta dele fica só com os dados pessoais. Os separadores são os mesmos
// da conta: uma faixa no telemóvel e uma coluna no computador.
export default function LayoutAdmin() {
  const tarefas = useTarefasAdmin();
  const seccoes = SECCOES.map((seccao) => ({
    ...seccao,
    contador: tarefas[seccao.tarefa],
  }));

  return (
    <div className="row g-4">
      <div className="col-lg-3">
        <div className="conta-lateral">
          {/* No telemóvel, a barra de baixo já diz onde se está */}
          <p className="admin-titulo d-none d-lg-flex">
            <Icone nome="admin" />
            Administração
          </p>
          <MenuSeccoes rotulo="Secções da administração" seccoes={seccoes} />
        </div>
      </div>
      <div className="col-lg-9">
        <Outlet />
      </div>
    </div>
  );
}
