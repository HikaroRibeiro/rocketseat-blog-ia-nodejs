# Rocketseat Blog IA NodeJS

API REST para cadastro de postagens e comentários de um blog, com geração automática de postagens a partir de ideias usando um agente de IA (Mastra + OpenAI).

## Funcionalidades

- Cadastro, listagem, consulta e remoção de postagens
- Cadastro, listagem e remoção de comentários
- Filtro de comentários por `postId`, `author` e `content`
- Geração de sugestões de postagem a partir de uma ideia usando o agente **Blog Writer** (GPT-4o-mini)
- Persistência em arquivo JSON
- Sem dependências de banco de dados externo

## Stack

- **Node.js** (>= 20.6.0, recomendado 24.x via `.nvmrc`)
- **HTTP nativo** (`node:http`) — sem frameworks
- **Mastra** (`@mastra/core`) — agentes de IA
- **OpenAI** — modelo `gpt-4o-mini`
- **Zod** — validação de saída estruturada dos agentes
- **nanoid** — geração de IDs
- **oxlint / oxfmt** — lint e formatação
- **lefthook + commitlint + lint-staged** — hooks de git

## Requisitos

- Node.js `>= 20.6.0`
- Chave da API da OpenAI (para o gerador de postagens)

## Instalação

```bash
npm install
```

> A instalação executa `lefthook install` automaticamente (script `prepare`) para configurar os hooks de git.

## Configuração

Crie um arquivo `.env.local` a partir do exemplo:

```bash
cp .env.example .env.local
```

### Variáveis de ambiente

| Variável        | Descrição                                        | Padrão            |
| --------------- | ------------------------------------------------ | ----------------- |
| `PORT`          | Porta em que a API será exposta                  | `3000`            |
| `HOST`          | Host em que a API será exposta                   | `0.0.0.0`         |
| `DB_FILE`       | Caminho do arquivo de persistência dos dados     | `./data/db.json`  |
| `OPENAI_API_KEY`| Chave da API da OpenAI (necessária para o agente) | —                 |

> O servidor carrega as variáveis do arquivo `.env.local` nos scripts `start` e `dev`.

## Executando

Desenvolvimento (com reload automático):

```bash
npm run dev
```

Produção:

```bash
npm start
```

A API fica disponível em `http://localhost:3000`.

## Rotas da API

### Health check

| Método | Rota          | Descrição                |
| ------ | ------------- | ------------------------ |
| GET    | `/api/health` | Verifica se a API está no ar |

### Postagens

| Método | Rota                 | Descrição                            |
| ------ | -------------------- | ------------------------------------ |
| POST   | `/api/posts`         | Cria uma postagem                    |
| GET    | `/api/posts`         | Lista todas as postagens             |
| GET    | `/api/posts/:id`     | Consulta uma postagem                |
| DELETE | `/api/posts/:id`     | Remove uma postagem (e comentários)  |
| POST   | `/api/posts/:id/comments` | Adiciona comentário a uma postagem |
| GET    | `/api/posts/:id/comments` | Lista os comentários da postagem   |

Exemplo de body para criar uma postagem:

```json
{
  "title": "Introdução ao Node.js",
  "content": "Node.js é um runtime JavaScript...",
  "author": "Maria"
}
```

### Comentários

| Método | Rota                | Descrição                                   |
| ------ | ------------------- | ------------------------------------------- |
| GET    | `/api/comments`     | Lista comentários (com filtros opcionais)   |
| DELETE | `/api/comments/:id` | Remove um comentário                        |

Filtros da listagem de comentários (query params):

```bash
GET /api/comments?postId=abc&author=maria&content=node
```

### Sugestões de postagem (IA)

| Método | Rota                 | Descrição                                  |
| ------ | -------------------- | ------------------------------------------ |
| POST   | `/api/suggestions`   | Gera uma postagem a partir de uma ideia    |
| GET    | `/api/suggestions`   | Lista as sugestões geradas                 |

Exemplo de body para gerar uma sugestão:

```json
{
  "idea": "Como usar streams para processar arquivos grandes em Node.js"
}
```

A ideia é enviada ao agente **Blog Writer**, que retorna `title` e `content` (em Markdown, português do Brasil) validados por um schema Zod.

## Estrutura do projeto

```
.
├── index.js          # Servidor HTTP e rotas
├── lib/
│   ├── agent.js      # Agente Mastra (Blog Writer) e geração a partir de ideias
│   └── store.js      # Persistência e operações de dados em JSON
├── data/             # Arquivos de persistência (ignorados no git)
├── .env.example      # Exemplo de variáveis de ambiente
├── .nvmrc            # Versão do Node recomendada
└── package.json
```

## Scripts

| Comando                 | Descrição                        |
| ----------------------- | -------------------------------- |
| `npm run dev`           | Inicia com reload automático     |
| `npm start`             | Inicia em modo produção          |
| `npm run lint`          | Roda o oxlint                    |
| `npm run lint:fix`      | Corrige problemas de lint        |
| `npm run format`        | Formata o código com oxfmt       |
| `npm run format:check`  | Verifica a formatação            |
| `npm run install-hooks` | Instala os hooks do lefthook     |