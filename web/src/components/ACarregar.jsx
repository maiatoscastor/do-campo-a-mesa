// O que aparece enquanto chega o código de uma página aberta diretamente pelo endereço (normalmente,
// uma fração de segundo). Só se vê passado meio segundo, para não piscar nas ligações rápidas.
export default function ACarregar() {
  return (
    <p className="a-carregar" role="status">
      A carregar…
    </p>
  );
}
