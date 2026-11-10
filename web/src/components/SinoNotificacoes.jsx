import { useCallback, useId, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router';
import Icone from './Icone.jsx';
import PainelNotificacoes from './PainelNotificacoes.jsx';
import { useNotificacoes } from '../hooks/useNotificacoes.js';

// O sino do cabeçalho, com o número de notificações por ler. No telemóvel abre a página das
// notificações, como nas aplicações; no computador abre um painel por baixo dele.
export default function SinoNotificacoes() {
  const { porLer } = useNotificacoes();
  const { pathname } = useLocation();
  const id = useId();
  const zona = useRef(null);
  const botao = useRef(null);
  // O painel fica aberto na página em que foi aberto: ao mudar de página, fecha sozinho
  const [abertoEm, setAbertoEm] = useState(null);
  const aberto = abertoEm === pathname;
  const rotulo = `Notificações${porLer > 0 ? `, ${porLer} por ler` : ''}`;

  const fechar = useCallback((devolverFoco) => {
    setAbertoEm(null);
    if (devolverFoco) {
      botao.current?.focus();
    }
  }, []);

  const numero = porLer > 0 && (
    <span className="contador contador-icone" aria-hidden="true">
      {porLer > 9 ? '9+' : porLer}
    </span>
  );

  return (
    <div className="sino" ref={zona}>
      <NavLink
        className="botao-icone d-lg-none"
        to="/notificacoes"
        aria-label={rotulo}
      >
        <Icone nome="sino" />
        {numero}
      </NavLink>
      <button
        ref={botao}
        className="botao-icone d-none d-lg-inline-grid"
        type="button"
        aria-label={rotulo}
        aria-expanded={aberto}
        aria-controls={aberto ? id : undefined}
        onClick={() => setAbertoEm(aberto ? null : pathname)}
      >
        <Icone nome="sino" />
        {numero}
      </button>
      {aberto && <PainelNotificacoes id={id} fechar={fechar} zona={zona} />}
    </div>
  );
}
