# RPE-Backend

Este repositório contém o backend do projeto RPE.

## Documentação

Descreva aqui o propósito do projeto, endpoints, exemplos de uso e outras informações relevantes.

## Padrão de Commits

Este projeto utiliza o padrão [Conventional Commits](https://www.conventionalcommits.org/pt-br/v1.0.0/), validado automaticamente pelo [commitlint](https://github.com/conventional-changelog/commitlint).

antes de começar execute
```
pnpm prepare
```
para ativar a configuração do husky

obs.: caso queira um passo a passo detalhado de como fazer um commit dentro do padrão, basta executar:
```
pnpm commit
```
e seguir o guia (irá fazer um commit automatico no fim)

### Estrutura do commit

```
<tipo>[escopo opcional]: <descrição>

[corpo opcional]

[rodapé(s) opcional(is)]
```

### Tipos aceitos
- **feat**: Adiciona nova funcionalidade
- **fix**: Corrige um bug
- **docs**: Mudanças na documentação
- **style**: Formatação, sem alteração de código (espaços, ponto e vírgula, etc)
- **refactor**: Refatoração de código, sem adicionar funcionalidade ou corrigir bug
- **perf**: Melhora de performance
- **test**: Adiciona ou corrige testes
- **build**: Mudanças que afetam o sistema de build ou dependências externas
- **ci**: Mudanças em arquivos de configuração de integração contínua
- **chore**: Outras mudanças que não modificam src ou arquivos de teste
- **revert**: Reverte um commit anterior

### Exemplos
```
feat: adicionar endpoint de autenticação
fix(usuario): corrigir validação de email
chore: atualizar dependências
refactor(auth): simplificar lógica de login
```

### Mudanças que quebram compatibilidade
Inclua `!` após o tipo ou escopo, ou adicione um rodapé `BREAKING CHANGE:`.

```
feat!: alterar formato de resposta da API

BREAKING CHANGE: O campo 'id' agora é obrigatório.
```

Commits fora desse padrão serão rejeitados.

## Endpoints do Módulo Colaborador

### Criar colaborador
```http
POST /colaborador/criar
Content-Type: application/json

{
  "nomeCompleto": "João da Silva",
  "email": "joao.silva@example.com",
  "senha": "senha123",
  "cargo": "Desenvolvedor",
  "trilhaCarreira": "Desenvolvimento",
  "unidade": "São Paulo"
}
```

### Remover colaborador
```http
DELETE /colaborador/remover/{id}
```

### Buscar colaborador por ID
```http
GET /colaborador/get/{id}
```

### Atualizar colaborador
```http
PUT /colaborador/atualizar/{id}
Content-Type: application/json

{
  "nomeCompleto": "João Silva Santos",
  "cargo": "Desenvolvedor Senior"
}
```

## Endpoints do Módulo Ciclo

### Criar ciclo
```http
POST /ciclo/criar
Content-Type: application/json

{
  "nome": "Ciclo TESTE",
  "dataInicio": "2025-06-28T00:00:00.000Z",
  "dataFim": "2025-06-28T23:50:00.000Z",
  "status": "EM_ANDAMENTO"
}
```

### Remover ciclo
```http
DELETE /ciclo/remover/{id}
```

### Buscar ciclo por ID
```http
GET /ciclo/get/{id}
```

### Buscar todos os ciclos
```http
GET /ciclo/get-all
```

### Atualizar ciclo
```http
PUT /ciclo/atualizar/{id}
Content-Type: application/json

{
  "nome": "Novo Nome",
  "dataInicio": "2025-07-01T00:00:00.000Z",
  "dataFim": "2025-07-31T23:59:59.000Z",
  "status": "FECHADO"
}
```