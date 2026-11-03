import { useEffect, useRef, useState } from 'react';
import Campo from './Campo.jsx';
import Icone from './Icone.jsx';

// Campo de password com um botão para a mostrar: evita erros de escrita, sobretudo no telemóvel, e
// dispensa o campo "repita a password". Começa sempre escondida.
export default function CampoPassword(props) {
  const [visivel, setVisivel] = useState(false);
  const campo = useRef(null);

  // Volta a esconder ao submeter: um campo de texto pode ficar guardado no histórico do browser
  useEffect(() => {
    const formulario = campo.current?.form;
    const esconder = () => setVisivel(false);
    formulario?.addEventListener('submit', esconder);
    return () => formulario?.removeEventListener('submit', esconder);
  }, []);

  return (
    <Campo
      {...props}
      ref={campo}
      tipo={visivel ? 'text' : 'password'}
      icone="cadeado"
      autoCapitalize="none"
      spellCheck={false}
      acessorio={
        // type="button": sem isto, clicar aqui submetia o formulário
        <button
          className="campo-mostrar"
          type="button"
          aria-label={
            visivel
              ? 'Esconder a password'
              : 'Mostrar a password (fica visível no ecrã)'
          }
          onClick={() => setVisivel((atual) => !atual)}
        >
          <Icone nome={visivel ? 'esconder' : 'mostrar'} tamanho={22} />
        </button>
      }
    />
  );
}
