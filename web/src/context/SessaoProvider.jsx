import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api/cliente.js';
import { SessaoContext } from './sessao.js';

const CHAVE = 'do-campo-a-mesa:sessao';

// O browser pode bloquear o armazenamento (por exemplo, em janelas privadas). Nesse caso a aplicação
// funciona na mesma, e a sessão dura só até a página ser fechada.
function lerSessaoGuardada() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE));
  } catch {
    return null;
  }
}

function guardarSessao(sessao) {
  try {
    if (sessao) {
      localStorage.setItem(CHAVE, JSON.stringify(sessao));
    } else {
      localStorage.removeItem(CHAVE);
    }
  } catch {
    // Sem armazenamento, a sessão fica só na memória
  }
}

// Guarda quem tem a sessão iniciada e torna-o acessível a toda a aplicação (estado global).
// O token fica no localStorage para a sessão sobreviver a recarregar a página.
export default function SessaoProvider({ children }) {
  const [sessao, setSessao] = useState(lerSessaoGuardada);
  const token = sessao?.token;

  useEffect(() => guardarSessao(sessao), [sessao]);

  // Terminar a sessão num separador termina-a nos outros. O evento só chega aos outros separadores.
  useEffect(() => {
    function aoMudarNoutroSeparador(evento) {
      if (evento.key === CHAVE) {
        setSessao(lerSessaoGuardada());
      }
    }
    window.addEventListener('storage', aoMudarNoutroSeparador);
    return () => window.removeEventListener('storage', aoMudarNoutroSeparador);
  }, []);

  const entrar = useCallback(async (credenciais) => {
    setSessao(await api('/auth/login', { metodo: 'POST', corpo: credenciais }));
  }, []);

  const registar = useCallback(async (dados) => {
    setSessao(await api('/auth/registo', { metodo: 'POST', corpo: dados }));
  }, []);

  const sair = useCallback(() => setSessao(null), []);

  // Pedido à API em nome do utilizador. Um 401 quer dizer que o token já não serve, por isso a sessão
  // termina. A condição protege contra respostas atrasadas de uma sessão anterior.
  const pedir = useCallback(
    (caminho, opcoes) =>
      api(caminho, { ...opcoes, token }).catch((erro) => {
        if (erro.estado === 401) {
          setSessao((atual) => (atual?.token === token ? null : atual));
        }
        throw erro;
      }),
    [token],
  );

  // Vai buscar os dados atuais ao servidor (por exemplo, se o produtor já foi aprovado)
  const atualizar = useCallback(
    () =>
      pedir('/auth/eu').then((utilizador) => {
        setSessao((atual) =>
          atual?.token === token ? { token, utilizador } : atual,
        );
      }),
    [pedir, token],
  );

  // Ao abrir a aplicação, confirma a sessão guardada. Se o servidor não responder, mantém-se a sessão:
  // uma falha de rede não é motivo para obrigar a entrar outra vez.
  useEffect(() => {
    if (token) {
      atualizar().catch(() => {});
    }
  }, [token, atualizar]);

  const valor = useMemo(
    () => ({
      utilizador: sessao?.utilizador ?? null,
      token,
      entrar,
      registar,
      sair,
      pedir,
      atualizar,
    }),
    [sessao, token, entrar, registar, sair, pedir, atualizar],
  );

  return (
    <SessaoContext.Provider value={valor}>{children}</SessaoContext.Provider>
  );
}
