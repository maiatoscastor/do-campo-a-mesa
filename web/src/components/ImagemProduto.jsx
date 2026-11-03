import { enderecoDaImagem } from '../api/cliente.js';
import Ilustracao from './Ilustracao.jsx';
import { ILUSTRACAO_DA_CATEGORIA, semAcentos } from '../produtos.js';

// A fotografia do produto ou, se não houver, a ilustração da categoria sobre a cor dela
export default function ImagemProduto({ produto, className = '' }) {
  const { nome, categoria, imagemUrl } = produto;
  return (
    <div className={`imagem-produto tom-${semAcentos(categoria)} ${className}`}>
      {imagemUrl ? (
        <img
          src={enderecoDaImagem(imagemUrl)}
          alt={nome}
          loading="lazy"
          decoding="async"
        />
      ) : (
        <Ilustracao
          nome={ILUSTRACAO_DA_CATEGORIA[categoria] ?? 'cesto'}
          className="imagem-produto-ilustracao"
        />
      )}
    </div>
  );
}
