import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import AlertaDeErro from '../components/AlertaDeErro.jsx';
import Campo from '../components/Campo.jsx';
import EstadoVazio from '../components/EstadoVazio.jsx';
import { useFormulario } from '../hooks/useFormulario.js';
import { useSessao } from '../hooks/useSessao.js';
import { DURACOES } from '../leiloes.js';

// "2,50" passa a 2.5. Um campo vazio ou inválido fica por preencher, e a API diz o que falta.
function numero(texto) {
  const valor = Number(texto.trim().replace(',', '.'));
  return texto.trim() && Number.isFinite(valor) ? valor : undefined;
}

// O formulário de produto volta aqui depois de guardar, com o produto novo já escolhido
const CRIAR_E_VOLTAR = { voltarPara: '/conta/leiloes/novo' };

// Pôr em leilão um lote de um dos seus produtos (/conta/leiloes/novo)
export default function NovoLeilao() {
  const { pedir } = useSessao();
  const [produtos, setProdutos] = useState(null);
  const [erroAoCarregar, setErroAoCarregar] = useState(null);

  useEffect(() => {
    let cancelado = false;
    pedir('/products/meus')
      .then((lista) => !cancelado && setProdutos(lista))
      .catch((problema) => !cancelado && setErroAoCarregar(problema));
    return () => {
      cancelado = true;
    };
  }, [pedir]);

  return (
    <>
      <title>Novo leilão · Do Campo à Mesa</title>
      <h1 className="mb-3">Novo leilão</h1>
      <AlertaDeErro erro={erroAoCarregar} />
      {produtos === null && !erroAoCarregar && (
        <p className="text-body-secondary">A carregar…</p>
      )}
      {produtos?.length === 0 && (
        <EstadoVazio
          icone="produtos"
          titulo="Ainda não tem produtos"
          texto="O lote de um leilão é sempre de um dos seus produtos."
        >
          <Link
            className="btn btn-primary"
            to="/conta/produtos/novo"
            state={CRIAR_E_VOLTAR}
          >
            Novo produto
          </Link>
        </EstadoVazio>
      )}
      {produtos?.length > 0 && <FormularioLeilao produtos={produtos} />}
    </>
  );
}

function FormularioLeilao({ produtos }) {
  const { pedir } = useSessao();
  const navegar = useNavigate();
  // Ao voltar do formulário de produto, o produto novo fica escolhido
  const acabadoDeCriar = useLocation().state?.produto;
  const { valores, mudar, definir, erro, aEnviar, enviar, formulario } =
    useFormulario({
      produto: produtos.some(({ id }) => id === acabadoDeCriar)
        ? acabadoDeCriar
        : produtos[0].id,
      quantidade: '',
      doStock: false,
      descricao: '',
      precoBase: '',
      incremento: '',
      quando: 'agora',
      iniciaEm: '',
      duracao: '10',
    });
  const detalhes = erro?.detalhes ?? {};

  // Tirar do stock só é possível se a quantidade couber no stock do produto
  const escolhido = produtos.find(({ id }) => id === valores.produto);
  const quantidade = numero(valores.quantidade);
  const quantidadeValida = Number.isInteger(quantidade) && quantidade >= 1;
  const chega = quantidadeValida && quantidade <= escolhido.stock;
  let textoDoStock = `Tem ${escolhido.stock} em stock.`;
  if (escolhido.stock === 0) {
    textoDoStock = 'Este produto não tem stock.';
  } else if (quantidadeValida && !chega) {
    textoDoStock = `Não chega: tem ${escolhido.stock} em stock.`;
  } else if (chega) {
    textoDoStock = `Tem ${escolhido.stock} em stock. Se o leilão for cancelado ou acabar sem licitações, volta ao stock.`;
  }

  function submeter(evento) {
    evento.preventDefault();
    enviar(async () => {
      // O campo de data e hora está na hora deste dispositivo; o servidor recebe-a em UTC
      const iniciaEm =
        valores.quando === 'marcar' && valores.iniciaEm
          ? new Date(valores.iniciaEm).toISOString()
          : undefined;
      const leilao = await pedir('/auctions', {
        metodo: 'POST',
        corpo: {
          produto: valores.produto,
          quantidade,
          doStock: valores.doStock && chega,
          descricao: valores.descricao,
          precoBase: numero(valores.precoBase),
          incremento: numero(valores.incremento),
          iniciaEm: valores.quando === 'marcar' ? (iniciaEm ?? '') : undefined,
          duracao: Number(valores.duracao),
        },
      });
      navegar(`/leiloes/${leilao.id}`);
    });
  }

  return (
    <section className="card">
      <div className="card-body">
        <AlertaDeErro erro={erro} />
        <form ref={formulario} onSubmit={submeter} noValidate>
          <Campo
            rotulo="Produto"
            nome="produto"
            tipo="select"
            value={valores.produto}
            onChange={mudar}
            erro={detalhes.produto}
            ajuda={
              <Link to="/conta/produtos/novo" state={CRIAR_E_VOLTAR}>
                Criar produto novo
              </Link>
            }
          >
            {produtos.map(({ id, nome }) => (
              <option key={id} value={id}>
                {nome}
              </option>
            ))}
          </Campo>
          <Campo
            rotulo={`Quantidade do lote (${escolhido.unidade})`}
            nome="quantidade"
            inputMode="numeric"
            placeholder="200"
            value={valores.quantidade}
            onChange={mudar}
            erro={detalhes.quantidade}
          />
          <div className="form-check mb-3">
            <input
              className="form-check-input"
              type="checkbox"
              id="do-stock"
              checked={valores.doStock && chega}
              disabled={!chega}
              onChange={(evento) => definir('doStock', evento.target.checked)}
              aria-describedby="ajuda-do-stock"
            />
            <label className="form-check-label" htmlFor="do-stock">
              Tirar do stock do produto
            </label>
            <div id="ajuda-do-stock" className="form-text">
              {textoDoStock}
            </div>
          </div>
          <Campo
            rotulo="Descrição (opcional)"
            nome="descricao"
            tipo="textarea"
            rows={2}
            value={valores.descricao}
            onChange={mudar}
            erro={detalhes.descricao}
          />
          <div className="row g-2">
            <div className="col-6">
              <Campo
                rotulo="Preço base (€)"
                nome="precoBase"
                inputMode="decimal"
                placeholder="200,00"
                value={valores.precoBase}
                onChange={mudar}
                erro={detalhes.precoBase}
              />
            </div>
            <div className="col-6">
              <Campo
                rotulo="Incremento (€)"
                nome="incremento"
                inputMode="decimal"
                placeholder="5,00"
                ajuda="Quanto cada licitação sobe, no mínimo."
                value={valores.incremento}
                onChange={mudar}
                erro={detalhes.incremento}
              />
            </div>
          </div>

          <fieldset className="mb-3">
            <legend className="form-label">Início</legend>
            <div className="d-flex flex-wrap gap-3">
              {[
                ['agora', 'Começar já'],
                ['marcar', 'Marcar dia e hora'],
              ].map(([valor, texto]) => (
                <div className="form-check" key={valor}>
                  <input
                    className="form-check-input"
                    type="radio"
                    name="quando"
                    id={`quando-${valor}`}
                    value={valor}
                    checked={valores.quando === valor}
                    onChange={mudar}
                  />
                  <label
                    className="form-check-label"
                    htmlFor={`quando-${valor}`}
                  >
                    {texto}
                  </label>
                </div>
              ))}
            </div>
          </fieldset>
          {valores.quando === 'marcar' && (
            <Campo
              rotulo="Dia e hora de início"
              nome="iniciaEm"
              tipo="datetime-local"
              value={valores.iniciaEm}
              onChange={mudar}
              erro={detalhes.iniciaEm}
            />
          )}
          <Campo
            rotulo="Duração"
            nome="duracao"
            tipo="select"
            value={valores.duracao}
            onChange={mudar}
            erro={detalhes.duracao}
          >
            {DURACOES.map(({ minutos, nome }) => (
              <option key={minutos} value={minutos}>
                {nome}
              </option>
            ))}
          </Campo>

          <div className="d-flex flex-wrap gap-2">
            <button
              className="btn btn-primary"
              type="submit"
              disabled={aEnviar}
            >
              {aEnviar ? 'A criar…' : 'Criar leilão'}
            </button>
            <Link className="btn btn-suave" to="/conta/leiloes">
              Cancelar
            </Link>
          </div>
        </form>
      </div>
    </section>
  );
}
