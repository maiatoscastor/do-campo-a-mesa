import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import AlertaDeErro from '../components/AlertaDeErro.jsx';
import Campo from '../components/Campo.jsx';
import ImagemProduto from '../components/ImagemProduto.jsx';
import { useFormulario } from '../hooks/useFormulario.js';
import { useSessao } from '../hooks/useSessao.js';
import { CATEGORIAS, EPOCAS } from '../produtos.js';

const UNIDADES = [
  'kg',
  'unidade',
  'dúzia',
  'molho',
  'garrafa 75 cl',
  'frasco 500 g',
];
const TIPOS_DE_IMAGEM = ['image/jpeg', 'image/png', 'image/webp'];
const TAMANHO_MAXIMO = 5 * 1024 * 1024;

// "2,90" passa a 2.9. Um campo vazio ou inválido fica por preencher, e a API diz o que falta.
function numero(texto) {
  const valor = Number(texto.trim().replace(',', '.'));
  return texto.trim() && Number.isFinite(valor) ? valor : undefined;
}

// Novo produto (/conta/produtos/novo) ou edição de um existente (/conta/produtos/:id)
export default function EditarProduto() {
  const { id } = useParams();
  const { pedir } = useSessao();
  const [produto, setProduto] = useState(null);
  const [erro, setErro] = useState(null);
  const titulo = id ? 'Editar produto' : 'Novo produto';

  useEffect(() => {
    if (!id) {
      return undefined;
    }
    let cancelado = false;
    pedir(`/products/${id}`)
      .then((dados) => !cancelado && setProduto(dados))
      .catch((problema) => !cancelado && setErro(problema));
    return () => {
      cancelado = true;
    };
  }, [id, pedir]);

  return (
    <>
      <title>{`${titulo} · Do Campo à Mesa`}</title>
      <h1 className="mb-3">{titulo}</h1>
      <AlertaDeErro erro={erro} />
      {id && !produto && !erro && <p role="status">A carregar…</p>}
      {/* O formulário só aparece com os dados prontos, porque começa com eles */}
      {(!id || produto) && (
        <FormularioProduto key={id ?? 'novo'} produto={produto} />
      )}
    </>
  );
}

function FormularioProduto({ produto }) {
  const { pedir } = useSessao();
  const navegar = useNavigate();
  const { valores, mudar, definir, erro, aEnviar, enviar, formulario } =
    useFormulario({
      nome: produto?.nome ?? '',
      categoria: produto?.categoria ?? '',
      preco: produto ? produto.preco.toFixed(2).replace('.', ',') : '',
      unidade: produto?.unidade ?? '',
      stock: produto ? String(produto.stock) : '',
      biologico: produto?.biologico ?? false,
      epocas: produto?.epocas ?? [],
      descricao: produto?.descricao ?? '',
    });
  // Depois de criado, o produto passa a ser editado: se a fotografia falhar, voltar a guardar não
  // cria um segundo produto
  const [idGuardado, setIdGuardado] = useState(produto?.id);
  const [ficheiro, setFicheiro] = useState(null);
  const [erroFicheiro, setErroFicheiro] = useState();
  const [tirarFotografia, setTirarFotografia] = useState(false);
  const detalhes = erro?.detalhes ?? {};

  // Pré-visualização da fotografia escolhida, que ainda não foi enviada
  const previsualizacao = useMemo(
    () => ficheiro && URL.createObjectURL(ficheiro),
    [ficheiro],
  );
  useEffect(
    () => () => previsualizacao && URL.revokeObjectURL(previsualizacao),
    [previsualizacao],
  );

  // Verifica a fotografia antes de a enviar; a API volta a verificá-la
  function escolherFicheiro(evento) {
    const escolhido = evento.target.files[0];
    setErroFicheiro(undefined);
    if (escolhido && !TIPOS_DE_IMAGEM.includes(escolhido.type)) {
      setErroFicheiro('Escolha uma fotografia JPEG, PNG ou WebP');
    } else if (escolhido && escolhido.size > TAMANHO_MAXIMO) {
      setErroFicheiro('A fotografia não pode ter mais de 5 MB');
    } else {
      setFicheiro(escolhido ?? null);
      return;
    }
    evento.target.value = '';
    setFicheiro(null);
  }

  function alternarEpoca(epoca) {
    definir(
      'epocas',
      valores.epocas.includes(epoca)
        ? valores.epocas.filter((e) => e !== epoca)
        : [...valores.epocas, epoca],
    );
  }

  function submeter(evento) {
    evento.preventDefault();
    enviar(async () => {
      const corpo = {
        ...valores,
        preco: numero(valores.preco),
        stock: numero(valores.stock),
      };
      const guardado = await pedir(
        idGuardado ? `/products/${idGuardado}` : '/products',
        { metodo: idGuardado ? 'PUT' : 'POST', corpo },
      );
      setIdGuardado(guardado.id);

      const caminhoDaImagem = `/products/${guardado.id}/imagem`;
      if (ficheiro) {
        const dados = new FormData();
        dados.append('imagem', ficheiro);
        await pedir(caminhoDaImagem, { metodo: 'PUT', corpo: dados });
      } else if (tirarFotografia && produto?.imagemUrl) {
        await pedir(caminhoDaImagem, { metodo: 'DELETE' });
      }
      navegar('/conta/produtos');
    });
  }

  // O que aparece na pré-visualização: a nova fotografia, a atual ou a ilustração da categoria
  const imagemAtual = tirarFotografia ? undefined : produto?.imagemUrl;

  return (
    <>
      <AlertaDeErro erro={erro} />
      <form ref={formulario} onSubmit={submeter} noValidate>
        <Campo
          rotulo="Nome"
          nome="nome"
          value={valores.nome}
          onChange={mudar}
          erro={detalhes.nome}
        />
        <Campo
          rotulo="Categoria"
          nome="categoria"
          tipo="select"
          value={valores.categoria}
          onChange={mudar}
          erro={detalhes.categoria}
        >
          <option value="">Escolha a categoria</option>
          {CATEGORIAS.map((categoria) => (
            <option key={categoria}>{categoria}</option>
          ))}
        </Campo>

        <div className="row g-2">
          <div className="col-6">
            <Campo
              rotulo="Preço (€)"
              nome="preco"
              inputMode="decimal"
              placeholder="2,90"
              value={valores.preco}
              onChange={mudar}
              erro={detalhes.preco}
            />
          </div>
          <div className="col-6">
            <Campo
              rotulo="Por"
              nome="unidade"
              list="unidades"
              placeholder="kg"
              value={valores.unidade}
              onChange={mudar}
              erro={detalhes.unidade}
            />
            <datalist id="unidades">
              {UNIDADES.map((unidade) => (
                <option key={unidade} value={unidade} />
              ))}
            </datalist>
          </div>
        </div>

        <Campo
          rotulo="Stock"
          nome="stock"
          inputMode="numeric"
          value={valores.stock}
          onChange={mudar}
          erro={detalhes.stock}
        />

        <div className="form-check mb-3">
          <input
            id="biologico"
            className="form-check-input"
            type="checkbox"
            checked={valores.biologico}
            onChange={(evento) => definir('biologico', evento.target.checked)}
          />
          <label className="form-check-label" htmlFor="biologico">
            Produção biológica
          </label>
        </div>

        <fieldset className="mb-3">
          <legend className="form-label">Épocas</legend>
          {EPOCAS.map((epoca) => (
            <div className="form-check form-check-inline" key={epoca}>
              <input
                id={`epoca-${epoca}`}
                className="form-check-input"
                type="checkbox"
                checked={valores.epocas.includes(epoca)}
                onChange={() => alternarEpoca(epoca)}
              />
              <label className="form-check-label" htmlFor={`epoca-${epoca}`}>
                {epoca}
              </label>
            </div>
          ))}
          <div className="form-text">
            Sem nenhuma escolhida, o produto está disponível todo o ano.
          </div>
        </fieldset>

        <Campo
          rotulo="Descrição (opcional)"
          nome="descricao"
          tipo="textarea"
          rows={3}
          value={valores.descricao}
          onChange={mudar}
          erro={detalhes.descricao}
        />

        <div className="d-flex align-items-start gap-3">
          {previsualizacao ? (
            <img
              className="imagem-produto imagem-produto-mini"
              src={previsualizacao}
              alt=""
            />
          ) : (
            <ImagemProduto
              produto={{
                nome: valores.nome,
                categoria: valores.categoria || 'Outros',
                imagemUrl: imagemAtual,
              }}
              className="imagem-produto-mini"
            />
          )}
          <div className="flex-grow-1">
            <Campo
              rotulo="Fotografia (opcional)"
              nome="imagem"
              tipo="file"
              accept={TIPOS_DE_IMAGEM.join(',')}
              onChange={escolherFicheiro}
              erro={erroFicheiro}
              ajuda="JPEG, PNG ou WebP, até 5 MB. Sem fotografia, aparece a ilustração da categoria."
            />
            {imagemAtual && !ficheiro && (
              <button
                className="btn btn-link px-0 mb-3"
                type="button"
                onClick={() => setTirarFotografia(true)}
              >
                Tirar a fotografia
              </button>
            )}
          </div>
        </div>

        <div className="d-flex flex-wrap gap-2">
          <button className="btn btn-primary" type="submit" disabled={aEnviar}>
            {aEnviar ? 'A guardar…' : 'Guardar'}
          </button>
          <Link className="btn btn-suave" to="/conta/produtos">
            Cancelar
          </Link>
        </div>
      </form>
    </>
  );
}
