import FilaDeProdutos from './FilaDeProdutos.jsx';
import SeccaoInicio from './SeccaoInicio.jsx';
import { epocaDe } from '../produtos.js';

// Os produtos desta época do ano (os que o produtor marcou para ela, e não os de todo o ano), com
// stock. Se não houver nenhum, os últimos que chegaram ao catálogo.
export default function ProdutosDaEpoca({ produtos }) {
  const epoca = epocaDe();
  const comStock = produtos.filter(({ stock }) => stock > 0);
  const daEpoca = comStock.filter(({ epocas }) => epocas?.includes(epoca));
  const lista =
    daEpoca.length > 0
      ? daEpoca
      : [...comStock].sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
        );
  if (lista.length === 0) {
    return null;
  }

  return (
    <SeccaoInicio
      titulo={
        daEpoca.length > 0
          ? `Da época: ${epoca.toLowerCase()}`
          : 'Novos no catálogo'
      }
      ligacao={
        daEpoca.length > 0
          ? `/produtos?epoca=${encodeURIComponent(epoca)}`
          : '/produtos'
      }
      textoDaLigacao="Ver todos"
    >
      <FilaDeProdutos produtos={lista} />
    </SeccaoInicio>
  );
}
