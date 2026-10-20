# Do Campo à Mesa

Mercado digital de produtores locais do Alto Minho, com encomendas e leilões em tempo real.

Trabalho prático individual de **Desenvolvimento Web e para a Cloud** · Mestrado em Engenharia Informática · IPVC–ESTG · 2026/2027

**Autor:** Diogo Esteves de Sá, 31378

> **Estado:** em desenvolvimento, semana 2 de 7.
> Este README é o relatório do projeto e contém as instruções de instalação. É escrito ao longo do trabalho, à medida que cada parte fica concluída.

## Estrutura do repositório

```
.
├── web/        aplicação web (SPA): React · Vite
└── README.md   relatório e instruções de instalação
```

## Relatório

O relatório vai seguir esta estrutura, preenchida passo a passo:

1. Introdução
2. Arquitetura
3. Frontend e SPA
4. API REST e documentação
5. Modelo de dados
6. Segurança
7. Tempo real e consistência dos leilões
8. Deployment na Cloud
9. Testes
10. Dificuldades e trabalho futuro
11. Declaração de uso de ferramentas e IA

## Instalação e execução

### Requisitos

- [Node.js](https://nodejs.org/) 24 ou mais recente (inclui o npm)
- Git

### Frontend (SPA)

```bash
cd web
npm install      # só na primeira vez, ou quando mudam as dependências
npm run dev      # servidor de desenvolvimento em http://localhost:5173
```

As alterações aos ficheiros aparecem no browser assim que são guardadas. Para abrir a aplicação no telemóvel (na mesma rede Wi-Fi), correr `npm run dev -- --host` e abrir o endereço indicado em "Network".

| Comando                | O que faz                                                 |
| ---------------------- | --------------------------------------------------------- |
| `npm run dev`          | Servidor de desenvolvimento com recarregamento automático |
| `npm run lint`         | Verifica o código com o ESLint                            |
| `npm run format`       | Formata o código com o Prettier                           |
| `npm run format:check` | Confirma que o código está formatado, sem o alterar       |
| `npm run build`        | Gera a versão de produção em `web/dist/`                  |
| `npm run preview`      | Serve localmente a versão de produção                     |
