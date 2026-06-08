# Sistema de Coleta e Processamento – MTE Mediador

Sistema automatizado desenvolvido em **TypeScript** e **Bun** para coletar, armazenar e visualizar instrumentos coletivos de trabalho (Acordos Coletivos, Convenções Coletivas e Termos Aditivos) registrados no portal **Mediador do Ministério do Trabalho e Emprego (MTE)**.

Inclui um **dashboard web** para gerenciar empresas, visualizar instrumentos e explorar cláusulas extraídas, com suporte a coleta sob demanda diretamente pela interface.

---

## 🚀 Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Runtime & Package Manager | [Bun](https://bun.sh/) |
| Linguagem | TypeScript |
| Banco de Dados | MySQL 8 via Docker + [Drizzle ORM](https://orm.drizzle.team/) |
| Scraping | Axios & Cheerio |
| Servidor HTTP | `Bun.serve` (API REST + SPA) |
| Agendador | [Croner](https://github.com/hexon/croner) |
| Logger | [Pino](https://github.com/pinojs/pino) |
| Validação | [Zod](https://zod.dev/) |
| Testes | Bun Test |

---

## 📂 Estrutura de Pastas

```text
src/
├── config/           # Validação de variáveis de ambiente com Zod
├── database/         # Schema Drizzle, conexão e scripts de migração
├── jobs/             # Job diário agendado (cron às 03:00)
├── modules/
│   ├── mediador/     # Cliente HTTP (sessão, cookie, download XLS/HTML/PDF) + XLS parser
│   └── processamento/# Parser de cláusulas (Cheerio), classificador e stub de IA
├── public/
│   └── index.html    # Dashboard SPA (dark theme, glassmorphism)
├── services/         # ColetaOrchestrator – coordena coleta e processamento
├── utils/            # Logger (Pino) e helpers de arquivo
├── server.ts         # API REST servida pelo Bun.serve
└── index.ts          # Entry point (cron + CLI + boot do servidor)
storage/
├── raw/html/         # Documentos HTML baixados do MTE
├── raw/pdf/          # PDFs baixados
└── raw/xls/          # Planilhas XLS de exportação
```

---

## ⚙️ Configuração

### Pré-requisitos

- **[Bun](https://bun.sh/)** instalado (`curl -fsSL https://bun.sh/install | bash`)
- **[Docker](https://www.docker.com/)** + **Docker Compose** (para o MySQL)

### Variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=root_password
DB_DATABASE=mediador_db

HTTP_TIMEOUT=30000
HTTP_RETRIES=3

STORAGE_RAW_XLS=storage/raw/xls
STORAGE_RAW_HTML=storage/raw/html
STORAGE_RAW_PDF=storage/raw/pdf

LOG_LEVEL=info

IA_PROVIDER=stub
IA_API_KEY=mock-key
```

---

## 🐳 Execução com Docker (recomendado)

O jeito mais simples de rodar o projeto. O Docker Compose sobe o **MySQL 8** e a **aplicação** juntos:

```bash
docker-compose up --build
```

Aguarde a mensagem `Servidor frontend iniciado em http://localhost:3000` e acesse:

**➜ [http://localhost:3000](http://localhost:3000)**

Os arquivos baixados (XLS, HTML, PDF) são persistidos localmente em `./storage`.

> **Nota:** Na primeira execução o banco é migrado automaticamente. Não é necessário rodar comandos de migração manualmente.

---

## 🖥️ Dashboard Web

O dashboard é uma SPA servida diretamente pela API em `http://localhost:3000`.

### Funcionalidades

| Recurso | Descrição |
|---------|-----------|
| **Cadastro de empresa** | Insira CNPJ e nome para registrar uma nova empresa. A coleta no MTE é disparada automaticamente em background. |
| **Status de coleta** | Empresas em coleta exibem um badge animado "Coletando". A lista é atualizada a cada 4s até a conclusão. |
| **Lista de empresas** | Sidebar com busca por CNPJ ou nome, contagem de documentos e indicação de status. |
| **Instrumentos coletivos** | Grid de cards com tipo (ACT/CCT), UF, datas de protocolo/registro, vigência e situação. |
| **Visualizador de cláusulas** | Drawer lateral com acordeão por cláusula, filtro por categoria e renderização rica do HTML original. |
| **Acesso aos arquivos** | Links diretos para abrir o HTML ou PDF original do documento no navegador. |

---

## 🏃 Execução Local (sem Docker)

Requer MySQL rodando localmente e o `.env` configurado.

```bash
# Instalar dependências
bun install

# Rodar migrations
bun run db:migrate

# Popular sindicatos iniciais (opcional)
bun run src/database/seed.ts

# Iniciar em modo de desenvolvimento
bun run dev
```

### Coleta imediata (sem aguardar o cron)

```bash
bun run src/index.ts --now
```

---

## 🧪 Testes

```bash
bun test
```

Valida os parsers de XLS, HTML e os classificadores de categoria de cláusulas.

---

## 🗺️ UFs suportadas

Atualmente configurado para **DF** e **GO**. Para adicionar novas UFs, edite a lista em `src/services/coleta.orchestrator.ts` ou passe como argumento na chamada da API.

---

## 📋 Endpoints da API

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/unions` | Lista todas as empresas cadastradas com contagem de documentos e status de coleta |
| `POST` | `/api/unions` | Cadastra nova empresa `{ cnpj, nome? }` e inicia coleta em background |
| `GET` | `/api/instruments?cnpj=` | Lista instrumentos de um CNPJ |
| `GET` | `/api/clauses?instrumentId=` | Lista cláusulas de um instrumento |
| `GET` | `/api/files/html?file=` | Serve o HTML original do documento |
| `GET` | `/api/files/pdf?file=` | Serve o PDF do documento |
