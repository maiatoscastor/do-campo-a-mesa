import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { enderecoDaImagem } from '../api/cliente.js';
import AlertaDeErro from '../components/AlertaDeErro.jsx';
import Campo from '../components/Campo.jsx';
import CamposLocalizacao from '../components/CamposLocalizacao.jsx';
import Icone from '../components/Icone.jsx';
import MapaQuinta from '../components/MapaQuinta.jsx';
import { useFormulario } from '../hooks/useFormulario.js';
import { useSessao } from '../hooks/useSessao.js';
import { DIAS_DA_SEMANA } from '../paginaDoProdutor.js';
import { iniciais } from '../utilizador.js';

const VALIDACAO = {
  pendente: {
    nome: 'À espera de validação',
    classe: 'bg-warning-subtle text-warning-emphasis',
    texto:
      'Um administrador vai rever os seus dados. A página fica pública e pode publicar produtos assim que a conta for aprovada.',
  },
  aprovado: {
    nome: 'Aprovado',
    classe: 'bg-success-subtle text-success-emphasis',
    texto: 'A sua página está pública.',
  },
  rejeitado: {
    nome: 'Não aprovado',
    classe: 'bg-danger-subtle text-danger-emphasis',
    texto:
      'A sua conta de produtor não foi aprovada, por isso a página não é pública.',
  },
};

// As imagens da página: o tamanho mínimo é o mesmo que o servidor exige
const IMAGENS = {
  capa: {
    nome: 'capa',
    campo: 'capaUrl',
    minimo: { largura: 1200, altura: 300 },
  },
  logotipo: {
    nome: 'logótipo',
    campo: 'logotipoUrl',
    minimo: { largura: 200, altura: 200 },
  },
};
const TAMANHO_MAXIMO = 5 * 1024 * 1024;

// A largura e a altura de uma imagem escolhida, para avisar logo se for pequena (o servidor volta
// a confirmar). Se o browser não a conseguir abrir, quem decide é o servidor.
async function dimensoes(ficheiro) {
  try {
    const imagem = await createImageBitmap(ficheiro);
    const resultado = { largura: imagem.width, altura: imagem.height };
    imagem.close();
    return resultado;
  } catch {
    return null;
  }
}

// "A minha página" (/conta/quinta): o produtor personaliza a sua página pública. As imagens
// guardam-se logo que são escolhidas; o resto, com o botão Guardar.
export default function MinhaPagina() {
  const { pedir } = useSessao();
  const [pagina, setPagina] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    let cancelado = false;
    pedir('/producers/eu')
      .then((dados) => !cancelado && setPagina(dados))
      .catch((problema) => !cancelado && setErro(problema));
    return () => {
      cancelado = true;
    };
  }, [pedir]);

  if (!pagina) {
    return (
      <>
        <title>A minha página · Do Campo à Mesa</title>
        <h1 className="mb-3">A minha página</h1>
        <AlertaDeErro erro={erro} />
        {!erro && <p className="text-body-secondary">A carregar…</p>}
      </>
    );
  }

  const validacao = VALIDACAO[pagina.validacao];

  return (
    <>
      <title>A minha página · Do Campo à Mesa</title>
      <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
        <h1 className="mb-0 me-auto">A minha página</h1>
        <span className={`badge ${validacao.classe}`}>{validacao.nome}</span>
      </div>
      <p className="text-body-secondary mb-2">{validacao.texto}</p>
      <Link
        className="btn btn-suave btn-sm mb-4"
        to={`/produtores/${pagina.id}`}
      >
        Ver a minha página
      </Link>

      <ImagensDaPagina pagina={pagina} aoMudar={setPagina} />
      <FormularioDaPagina pagina={pagina} />
    </>
  );
}

// A capa e o logótipo, como vão aparecer na página, com os botões para os pôr, trocar ou tirar
function ImagensDaPagina({ pagina, aoMudar }) {
  const { pedir } = useSessao();
  const [aEnviar, setAEnviar] = useState(null);
  const [mensagem, setMensagem] = useState(null);

  async function escolher(tipo, evento) {
    const ficheiro = evento.target.files?.[0];
    // Limpa o campo, para se poder escolher o mesmo ficheiro outra vez depois de um erro
    evento.target.value = '';
    if (!ficheiro) {
      return;
    }
    const { nome, minimo } = IMAGENS[tipo];
    if (ficheiro.size > TAMANHO_MAXIMO) {
      setMensagem({ erro: `A ${nome} não pode ter mais de 5 MB.` });
      return;
    }
    const tamanho = await dimensoes(ficheiro);
    if (
      tamanho &&
      (tamanho.largura < minimo.largura || tamanho.altura < minimo.altura)
    ) {
      setMensagem({
        erro: `A imagem tem ${tamanho.largura} × ${tamanho.altura} px. A ${nome} precisa de pelo menos ${minimo.largura} × ${minimo.altura} px.`,
      });
      return;
    }
    const dados = new FormData();
    dados.append('imagem', ficheiro);
    await enviar(tipo, () =>
      pedir(`/producers/eu/${tipo}`, { metodo: 'PUT', corpo: dados }),
    );
  }

  async function enviar(tipo, pedido) {
    setAEnviar(tipo);
    setMensagem(null);
    try {
      aoMudar(await pedido());
      setMensagem({ ok: 'Guardado.' });
    } catch (problema) {
      setMensagem({ erro: problema.message });
    } finally {
      setAEnviar(null);
    }
  }

  const tirar = (tipo) =>
    enviar(tipo, () => pedir(`/producers/eu/${tipo}`, { metodo: 'DELETE' }));

  return (
    <section className="card mb-4" aria-labelledby="imagens-da-pagina">
      <div className="card-body">
        <h2 className="h5" id="imagens-da-pagina">
          Capa e logótipo
        </h2>
        <div className="produtor-topo mb-2">
          <div className="produtor-capa">
            {pagina.capaUrl && (
              <img src={enderecoDaImagem(pagina.capaUrl)} alt="A capa atual" />
            )}
          </div>
          <div className="produtor-identidade">
            <span className="produtor-logotipo">
              {pagina.logotipoUrl ? (
                <img
                  src={enderecoDaImagem(pagina.logotipoUrl)}
                  alt="O logótipo atual"
                />
              ) : (
                <span aria-hidden="true">
                  {iniciais(pagina.nomeExploracao)}
                </span>
              )}
            </span>
          </div>
        </div>

        {['capa', 'logotipo'].map((tipo) => (
          <div className="d-flex flex-wrap gap-2 mb-2" key={tipo}>
            <label
              className={`btn btn-suave btn-sm d-inline-flex align-items-center gap-1 ${
                aEnviar ? 'disabled' : ''
              }`}
            >
              <Icone nome="fotografia" tamanho={18} />
              {aEnviar === tipo
                ? 'A enviar…'
                : `${pagina[IMAGENS[tipo].campo] ? 'Trocar' : 'Escolher'} ${IMAGENS[tipo].nome}`}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="visually-hidden"
                disabled={Boolean(aEnviar)}
                onChange={(evento) => escolher(tipo, evento)}
              />
            </label>
            {pagina[IMAGENS[tipo].campo] && (
              <button
                className="btn btn-suave-perigo btn-sm"
                type="button"
                disabled={Boolean(aEnviar)}
                onClick={() => tirar(tipo)}
              >
                Tirar {IMAGENS[tipo].nome}
              </button>
            )}
          </div>
        ))}
        <p className="form-text mb-0">
          Capa: 1600 × 500 px recomendado (pelo menos 1200 × 300); no telemóvel
          mostra-se o centro da imagem. Logótipo: quadrado, pelo menos 200 × 200
          px. JPEG, PNG ou WebP, até 5 MB.
        </p>
        <p
          className={`small fw-semibold mt-2 mb-0 ${
            mensagem?.erro ? 'text-danger-emphasis' : 'text-success-emphasis'
          }`}
          role={mensagem?.erro ? 'alert' : 'status'}
        >
          {mensagem?.erro ?? mensagem?.ok}
        </p>
      </div>
    </section>
  );
}

// O resto da página: os dados da quinta, a história, o levantamento, os contactos e o mapa
function FormularioDaPagina({ pagina }) {
  const { pedir, atualizar } = useSessao();
  const { levantamento, contactos = {}, localizacao } = pagina;
  const { valores, mudar, definir, erro, aEnviar, enviar, formulario } =
    useFormulario({
      nomeExploracao: pagina.nomeExploracao ?? '',
      concelho: localizacao?.concelho ?? '',
      freguesia: localizacao?.freguesia ?? '',
      descricao: pagina.descricao ?? '',
      comLevantamento: Boolean(levantamento),
      dias: levantamento?.dias ?? [],
      abre: levantamento?.abre ?? '09:00',
      fecha: levantamento?.fecha ?? '13:00',
      nota: levantamento?.nota ?? '',
      telefone: contactos.telefone ?? '',
      site: contactos.site ?? '',
      instagram: contactos.instagram ?? '',
      facebook: contactos.facebook ?? '',
      ponto: pagina.ponto ?? null,
    });
  const [guardado, setGuardado] = useState(false);
  const [avisoDoMapa, setAvisoDoMapa] = useState('');
  const detalhes = erro?.detalhes ?? {};
  // A localização do dispositivo só existe em ligações seguras (HTTPS ou o próprio computador)
  const podeLocalizar = window.isSecureContext && 'geolocation' in navigator;

  function alternarDia(dia) {
    definir(
      'dias',
      valores.dias.includes(dia)
        ? valores.dias.filter((outro) => outro !== dia)
        : [...valores.dias, dia].sort((a, b) => a - b),
    );
  }

  function usarALocalizacao() {
    setAvisoDoMapa('A procurar a sua localização…');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setAvisoDoMapa('');
        definir('ponto', {
          lat: Number(coords.latitude.toFixed(6)),
          lng: Number(coords.longitude.toFixed(6)),
        });
      },
      () =>
        setAvisoDoMapa(
          'Não foi possível saber a localização. Toque no mapa para marcar o ponto.',
        ),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function submeter(evento) {
    evento.preventDefault();
    setGuardado(false);
    enviar(async () => {
      await pedir('/producers/eu', {
        metodo: 'PATCH',
        corpo: {
          nomeExploracao: valores.nomeExploracao,
          concelho: valores.concelho,
          freguesia: valores.freguesia,
          descricao: valores.descricao,
          levantamento: valores.comLevantamento
            ? {
                dias: valores.dias,
                abre: valores.abre,
                fecha: valores.fecha,
                nota: valores.nota,
              }
            : null,
          contactos: {
            telefone: valores.telefone,
            site: valores.site,
            instagram: valores.instagram,
            facebook: valores.facebook,
          },
          ponto: valores.ponto,
        },
      });
      // O nome da quinta também aparece noutros sítios da conta
      await atualizar();
      setGuardado(true);
    });
  }

  return (
    <form ref={formulario} onSubmit={submeter} noValidate>
      <AlertaDeErro erro={erro} />

      <section className="card mb-4" aria-labelledby="sobre-a-quinta">
        <div className="card-body">
          <h2 className="h5" id="sobre-a-quinta">
            Sobre a quinta
          </h2>
          <Campo
            rotulo="Nome da quinta ou do negócio"
            nome="nomeExploracao"
            autoComplete="organization"
            value={valores.nomeExploracao}
            onChange={mudar}
            erro={detalhes.nomeExploracao}
          />
          <CamposLocalizacao
            concelho={valores.concelho}
            freguesia={valores.freguesia}
            definir={definir}
            detalhes={detalhes}
            textoInicial={{
              concelho: localizacao?.nomeConcelho,
              freguesia: localizacao?.nomeFreguesia,
            }}
          />
          <Campo
            rotulo="A nossa história (opcional)"
            nome="descricao"
            tipo="textarea"
            rows={5}
            maxLength={2000}
            ajuda={`Quem são, o que produzem e como. ${valores.descricao.length} de 2000 caracteres.`}
            value={valores.descricao}
            onChange={mudar}
            erro={detalhes.descricao}
          />
        </div>
      </section>

      <section className="card mb-4" aria-labelledby="levantamento-na-quinta">
        <div className="card-body">
          <h2 className="h5" id="levantamento-na-quinta">
            Levantamento na quinta
          </h2>
          <div className="form-check form-switch mb-3">
            <input
              className="form-check-input"
              type="checkbox"
              role="switch"
              id="com-levantamento"
              checked={valores.comLevantamento}
              onChange={(evento) =>
                definir('comLevantamento', evento.target.checked)
              }
            />
            <label className="form-check-label" htmlFor="com-levantamento">
              Mostrar o horário de levantamento
            </label>
          </div>
          {valores.comLevantamento && (
            <>
              <fieldset className="mb-3">
                <legend className="form-label">Dias</legend>
                <div className="dias-da-semana">
                  {DIAS_DA_SEMANA.map(({ dia, nome, curto }) => (
                    <button
                      key={dia}
                      className="dia-da-semana"
                      type="button"
                      aria-pressed={valores.dias.includes(dia)}
                      aria-label={nome}
                      onClick={() => alternarDia(dia)}
                    >
                      {curto}
                    </button>
                  ))}
                </div>
                {detalhes.dias && (
                  <div className="invalid-feedback d-block">
                    {detalhes.dias}
                  </div>
                )}
              </fieldset>
              <div className="row g-2">
                <div className="col-6">
                  <Campo
                    rotulo="Abre às"
                    nome="abre"
                    tipo="time"
                    value={valores.abre}
                    onChange={mudar}
                    erro={detalhes.abre}
                  />
                </div>
                <div className="col-6">
                  <Campo
                    rotulo="Fecha às"
                    nome="fecha"
                    tipo="time"
                    value={valores.fecha}
                    onChange={mudar}
                    erro={detalhes.fecha}
                  />
                </div>
              </div>
              <Campo
                rotulo="Nota (opcional)"
                nome="nota"
                placeholder="Por exemplo: tocar à campainha do armazém"
                maxLength={200}
                value={valores.nota}
                onChange={mudar}
                erro={detalhes.nota}
              />
            </>
          )}
        </div>
      </section>

      <section className="card mb-4" aria-labelledby="contactos-da-pagina">
        <div className="card-body">
          <h2 className="h5" id="contactos-da-pagina">
            Contactos e redes (opcionais)
          </h2>
          <Campo
            rotulo="Telefone"
            nome="telefone"
            tipo="tel"
            icone="telefone"
            autoComplete="tel"
            value={valores.telefone}
            onChange={mudar}
            erro={detalhes.telefone}
          />
          <Campo
            rotulo="Site"
            nome="site"
            tipo="url"
            icone="site"
            placeholder="https://"
            value={valores.site}
            onChange={mudar}
            erro={detalhes.site}
          />
          <Campo
            rotulo="Instagram"
            nome="instagram"
            placeholder="nome de utilizador"
            autoCapitalize="none"
            value={valores.instagram}
            onChange={mudar}
            erro={detalhes.instagram}
          />
          <Campo
            rotulo="Facebook"
            nome="facebook"
            tipo="url"
            placeholder="https://www.facebook.com/…"
            value={valores.facebook}
            onChange={mudar}
            erro={detalhes.facebook}
          />
        </div>
      </section>

      <section className="card mb-4" aria-labelledby="onde-fica">
        <div className="card-body">
          <h2 className="h5" id="onde-fica">
            Onde fica a quinta
          </h2>
          <p className="small text-body-secondary">
            Toque no mapa para marcar o sítio; pode arrastar o pino para
            acertar.
          </p>
          <MapaQuinta
            ponto={valores.ponto}
            aoMudar={(ponto) => definir('ponto', ponto)}
            rotulo="Mapa para marcar onde fica a quinta"
          />
          <div className="d-flex flex-wrap gap-2 mt-2">
            {podeLocalizar && (
              <button
                className="btn btn-suave btn-sm d-inline-flex align-items-center gap-1"
                type="button"
                onClick={usarALocalizacao}
              >
                <Icone nome="minhaLocalizacao" tamanho={18} />
                Usar a minha localização
              </button>
            )}
            {valores.ponto && (
              <button
                className="btn btn-suave-perigo btn-sm"
                type="button"
                onClick={() => definir('ponto', null)}
              >
                Tirar o ponto
              </button>
            )}
          </div>
          <p className="small mt-2 mb-0" role="status">
            {avisoDoMapa}
          </p>
          {(detalhes.lat || detalhes.lng) && (
            <div className="invalid-feedback d-block">
              {detalhes.lat ?? detalhes.lng}
            </div>
          )}
        </div>
      </section>

      {/* No telemóvel, o botão fica sempre à mão, por cima da barra de navegação */}
      <div className="barra-guardar">
        <button className="btn btn-primary" type="submit" disabled={aEnviar}>
          {aEnviar ? 'A guardar…' : 'Guardar'}
        </button>
        <span className="small text-success-emphasis fw-semibold" role="status">
          {guardado && !erro && 'Guardado.'}
        </span>
      </div>
    </form>
  );
}
