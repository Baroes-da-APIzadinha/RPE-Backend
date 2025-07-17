# RPE-Backend

Sistema de Avaliação de Desempenho Corporativo (RPE - Review Performance Evaluation)

## 📋 Descrição

O RPE-Backend é uma plataforma corporativa de avaliação de desempenho desenvolvida em NestJS, que permite gerenciar ciclos de avaliação, colaboradores, critérios avaliativos e equalização de resultados. O sistema suporta múltiplos tipos de avaliação (autoavaliação, pares, líder-colaborador, mentor-colaborador) e oferece funcionalidades de IA para auxiliar no processo de equalização.

## 🚀 Funcionalidades Principais

### 👥 Gestão de Colaboradores
- Cadastro e gerenciamento de colaboradores
- Sistema de perfis (Colaborador Comum, Gestor, Mentor, Líder, RH, Membro do Comitê, Admin)
- Associação de colaboradores a ciclos de avaliação
- Gestão de relacionamentos (gestor-colaborador, líder-colaborador, mentor-colaborador, pares)

### 📅 Ciclos de Avaliação
- Criação e gerenciamento de ciclos de avaliação
- Controle de status (Agendado, Em Andamento, Em Revisão, Em Equalização, Fechado)
- Configuração de durações para cada fase do ciclo
- Histórico e relatórios de ciclos

### 🎯 Critérios Avaliativos
- Definição de critérios com pesos e pilares
- Associação de critérios a ciclos específicos
- Categorização por pilares (Comportamento, Execução, Gestão e Liderança)

### 📊 Sistema de Avaliações
- **Autoavaliação**: Colaborador avalia seu próprio desempenho
- **Avaliação de Pares**: Colegas avaliam uns aos outros
- **Avaliação Líder-Colaborador**: Líderes avaliam seus liderados
- **Avaliação Colaborador-Mentor**: Colaboradores avaliam seus mentores
- Controle de status (Pendente, Concluída)

### ⚖️ Equalização
- Comitê de equalização para revisar avaliações
- Ajuste de notas com justificativas
- Geração de "Brutal Facts" (resumos finais)
- Integração com IA para sugestões de equalização

### 🤖 Inteligência Artificial
- Assistente de IA para equalização
- Análise de avaliações e sugestões de ajustes
- Configuração personalizada para diferentes contextos

### 📈 Relatórios e Analytics (RH)
- Dashboard de progresso por unidade e trilha
- Estatísticas de avaliações concluídas
- Relatórios de status por ciclo

### 🔄 Sincronização
- Integração com sistema ERP
- Sincronização automática de colaboradores, projetos e alocações
- Rotina agendada para atualizações

### 🔐 Autenticação e Autorização
- Sistema JWT para autenticação
- Controle de acesso baseado em perfis
- Auditoria de ações dos usuários

### 📤 Importação de Dados
- Importação de avaliações via arquivos Excel
- Validação e processamento de dados
- Seed automático de dados de teste
- Scripts SQL para população inicial do banco

## 🛠️ Tecnologias Utilizadas

- **Framework**: NestJS 11
- **Banco de Dados**: PostgreSQL 16
- **ORM**: Prisma 6
- **Autenticação**: JWT, Passport
- **Validação**: Class-validator, Class-transformer
- **IA**: Google Generative AI
- **Agendamento**: @nestjs/schedule
- **HTTP Client**: Axios
- **Testes**: Jest
- **Linting**: ESLint
- **Formatação**: Prettier
- **Git Hooks**: Husky
- **Commits**: Conventional Commits

## 📦 Pré-requisitos

- Node.js 18+
- PostgreSQL 16+
- pnpm (recomendado) ou npm

## 🚀 Instalação

1. **Clone o repositório**
```bash
git clone <url-do-repositorio>
cd RPE-Backend
```

2. **Instale as dependências**
```bash
pnpm install
```

3. **Configure as variáveis de ambiente**
```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/rpe_db"

# JWT
JWT_SECRET="sua-chave-secreta-jwt"

# PostgreSQL
POSTGRES_USER=postgres
POSTGRES_PASSWORD=sua-senha
POSTGRES_DB=rpe_db

# ERP Integration
ERP_URL=http://localhost:3001

# Google AI
GOOGLE_AI_API_KEY=sua-chave-api-google-ai
```

4. **Configure o banco de dados**
```bash
# Execute as migrações
pnpm prisma migrate dev

```

5. **Ative os hooks do Git**
```bash
pnpm prepare
```

**Nota**: Este comando configura o Husky para validar commits seguindo o padrão Conventional Commits. Para fazer commits, use `pnpm commit` para o modo interativo ou siga o padrão manualmente.

## 🏃‍♂️ Executando o Projeto

### Desenvolvimento
```bash
# Inicia o servidor de desenvolvimento
pnpm start:dev

# Inicia o servidor mock do ERP (opcional)
pnpm start:erp
```

### Produção
```bash
# Build do projeto
pnpm build

# Executa em produção
pnpm start:prod
```

### Docker
```bash
# Executa com Docker Compose
docker-compose up -d
```

## 🔐 Perfis e Permissões

### Tipos de Perfil
- **COLABORADOR_COMUM**: Acesso ao preenchimento de avaliações
- **GESTOR**: Gerencia equipes e avaliações
- **MENTOR**: Acesso a avaliações de mentoreados
- **LIDER**: Avalia seus liderados
- **RH**: Gerencia os ciclos avaliativos e tem acesso a relatórios e analytics, 
- **MEMBRO_COMITE**: Realiza as equalizações
- **ADMIN**: Acesso total ao sistema

## 🧪 Testes

```bash
# Executar testes unitários
pnpm test

# Executar testes em modo watch
pnpm test:watch

# Executar testes com coverage
pnpm test:cov

# Executar testes e2e
pnpm test:e2e
```

## 🐳 Docker

### Build da Imagem
```bash
docker build -t rpe-backend .
```

### Executar com Docker Compose
```bash
docker-compose up -d
```

### Variáveis de Ambiente para Docker
```env
DATABASE_URL=postgresql://postgres:password@db:5432/rpe_db
JWT_SECRET=your-jwt-secret
ERP_URL=http://erp-service:3001
GOOGLE_AI_API_KEY=your-google-ai-key
```

### Configuração do Dockerfile
O Dockerfile utiliza multi-stage build para otimizar o tamanho da imagem:
- **Stage 1 (Builder)**: Instala dependências e gera o build
- **Stage 2 (Production)**: Imagem final otimizada com apenas os arquivos necessários
- **Node.js 20.9.0-slim**: Versão LTS otimizada
- **PNPM**: Gerenciador de pacotes mais eficiente
- **Prisma**: Geração automática do cliente

## 🔧 Configuração de Desenvolvimento

### Estrutura do Projeto
```
src/
├── auth/           # Autenticação e autorização
├── colaborador/    # Gestão de colaboradores
├── ciclo/         # Ciclos de avaliação
├── criterios/     # Critérios avaliativos
├── avaliacoes/    # Sistema de avaliações
├── equalizacao/   # Equalização de resultados
├── IA/            # Integração com IA
├── rh/            # Relatórios e analytics
├── projetos/      # Gestão de projetos
├── importacao/    # Importação de dados
├── auditoria/     # Logs de auditoria
├── sincronizacao/ # Sincronização com ERP
└── common/        # Utilitários compartilhados
```

### Scripts Disponíveis
- `pnpm start`: Inicia o servidor
- `pnpm start:dev`: Modo desenvolvimento com hot reload
- `pnpm start:debug`: Modo debug
- `pnpm start:prod`: Modo produção
- `pnpm build`: Build do projeto
- `pnpm test`: Executa testes
- `pnpm lint`: Linting do código
- `pnpm format`: Formatação do código

## 📊 Banco de Dados

### Migrações
```bash
# Criar nova migração
pnpm prisma migrate dev --name nome-da-migracao

# Aplicar migrações em desenvolvimento
pnpm prisma migrate dev

# Reset do banco (desenvolvimento)
pnpm prisma migrate reset
```

### Studio (Interface Visual)
```bash
# Abrir Prisma Studio
pnpm prisma studio
```

### Estrutura do Banco
O sistema utiliza PostgreSQL com as seguintes principais entidades:
- **Colaboradores**: Usuários do sistema com diferentes perfis
- **Ciclos de Avaliação**: Períodos de avaliação com status controlados
- **Critérios**: Métricas avaliativas organizadas por pilares
- **Avaliações**: Diferentes tipos de avaliação (auto, pares, líder, mentor)
- **Equalizações**: Ajustes de notas pelo comitê
- **Projetos**: Gestão de projetos e alocações
- **Auditoria**: Logs de todas as ações do sistema

## 🔍 Monitoramento e Logs

O sistema inclui:
- Logs de auditoria automáticos
- Rastreamento de ações dos usuários
- Logs de sincronização com ERP
- Monitoramento de performance

## 📄 Licença

Este projeto está sob a licença UNLICENSED. Veja o arquivo `LICENSE` para mais detalhes.

## 📞 Suporte

Para suporte e dúvidas:
- Abra uma issue no repositório
- Entre em contato com a equipe de desenvolvimento

## 🔄 Changelog

Veja o arquivo `CHANGELOG.md` para histórico de mudanças.

## 📁 Estrutura de Arquivos

```
RPE-Backend/
├── src/                    # Código fonte
│   ├── auth/              # Autenticação e autorização
│   ├── colaborador/       # Gestão de colaboradores
│   ├── ciclo/            # Ciclos de avaliação
│   ├── criterios/        # Critérios avaliativos
│   ├── avaliacoes/       # Sistema de avaliações
│   ├── equalizacao/      # Equalização de resultados
│   ├── IA/               # Integração com IA
│   ├── rh/               # Relatórios e analytics
│   ├── projetos/         # Gestão de projetos
│   ├── importacao/       # Importação de dados
│   ├── auditoria/        # Logs de auditoria
│   ├── sincronizacao/    # Sincronização com ERP
│   └── common/           # Utilitários compartilhados
├── prisma/               # Schema e migrações do banco
│   ├── migrations/       # Histórico de migrações
│   ├── seed.ts          # Script de seed
│   └── schema.prisma    # Schema do banco
├── SQL scripts/          # Scripts SQL adicionais
│   └── population.sql   # População inicial de dados
├── API.rest             # Coleção de endpoints para teste
├── erp-db.json          # Mock do ERP para desenvolvimento
├── docker-compose.yml   # Configuração Docker
├── Dockerfile           # Build da imagem Docker
└── package.json         # Dependências e scripts
```

## 🔧 Configurações de Desenvolvimento

### Arquivos de Configuração
- **`.env`**: Variáveis de ambiente (não versionado)
- **`tsconfig.json`**: Configuração TypeScript
- **`eslint.config.mjs`**: Regras de linting
- **`.prettierrc`**: Formatação de código
- **`commitlint.config.js`**: Validação de commits
- **`.gitignore`**: Arquivos ignorados pelo Git


**RPE-Backend** - Sistema de Avaliação de Desempenho Corporativo