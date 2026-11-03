import { useEffect, useRef, useState } from 'react';
import { ErroApi } from '../api/cliente.js';

// Estado comum aos formulários: os valores dos campos, o erro devolvido pela API e se o pedido ainda
// está a decorrer. Os campos são controlados: o que está no ecrã é sempre o que está no estado.
export function useFormulario(valoresIniciais) {
  const [valores, setValores] = useState(valoresIniciais);
  const [erro, setErro] = useState(null);
  const [aEnviar, setAEnviar] = useState(false);
  const formulario = useRef(null);

  // Num formulário comprido o erro pode estar fora do ecrã: o foco vai para o primeiro campo inválido
  useEffect(() => {
    formulario.current?.querySelector('.is-invalid')?.focus();
  }, [erro]);

  // Muda um valor a partir do código (por exemplo, limpar a freguesia quando muda o concelho)
  function definir(nome, valor) {
    setValores((atuais) => ({ ...atuais, [nome]: valor }));
  }

  // Serve para qualquer campo, porque o atributo name indica o valor a mudar
  function mudar(evento) {
    definir(evento.target.name, evento.target.value);
  }

  async function enviar(pedido) {
    setAEnviar(true);
    setErro(null);
    try {
      await pedido();
    } catch (problema) {
      // Só os erros da API são para mostrar: outro erro é um defeito no código
      if (!(problema instanceof ErroApi)) {
        throw problema;
      }
      setErro(problema);
    } finally {
      setAEnviar(false);
    }
  }

  return { valores, mudar, definir, erro, aEnviar, enviar, formulario };
}
