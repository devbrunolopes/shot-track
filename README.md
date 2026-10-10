# Shot Track — v1.3

Registro pessoal de aplicações, com armazenamento local no dispositivo.

## Novidades da 1.2

- Editar aplicações existentes
- Confirmação antes de excluir
- Histórico reorganizado
- Dashboard com última aplicação, volume e quantidade nos últimos 30 dias
- Cálculo automático de mg para conferência do registro
- Melhorias de responsividade e componentes visuais
- Alias TypeScript `@/*` configurado
- Ícone SVG válido no App Router

## Rodar

```bash
npm install
npm run dev
```

Abra http://localhost:3000.

Os dados ficam no localStorage do navegador.

> O aplicativo é um registro pessoal. Os cálculos exibidos são apenas para conferência dos dados inseridos e não constituem recomendação ou orientação de tratamento.


### Dashboard e filtros

- Cards de resumo com período selecionável
- Gráfico simples de aplicações dos últimos 7 dias
- Filtro por período, substância e local
- Indicador de filtros ativos
- Limpeza rápida dos filtros
- Observações visíveis no histórico


## Novidades da 1.3

- Calendário mensal com navegação entre meses
- Marcação visual dos dias que possuem aplicações
- Contagem de aplicações por dia
- Seleção de um dia para visualizar seus registros
- Botão para registrar diretamente no dia selecionado
- Resumo mensal: aplicações, dias registrados e volume
- Histórico diário com edição e exclusão


## v1.4 — Substâncias e locais personalizáveis

- Substâncias pré-definidas no formulário de aplicação.
- Cadastro de novas substâncias diretamente no formulário.
- Locais pré-definidos no formulário.
- Cadastro de novos locais diretamente no formulário.
- Listas personalizadas persistidas no `localStorage` junto com os registros.
- Migração automática do estado persistido da v1.3.
- Registros históricos continuam armazenando o texto da substância/local usado no momento, mesmo que a lista seja alterada no futuro.


## v1.5.9 — Cadastro de marca, concentração e tipo de aplicação

- Substâncias podem ter marca e concentração padrão pré-cadastradas.
- Ao selecionar uma substância com preset, marca e concentração são preenchidas automaticamente.
- A lista de seleção exibe substância + marca + concentração quando essas informações estão cadastradas.
- Marca e concentração continuam editáveis no registro.
- Tipo de aplicação selecionável: Intramuscular ou Subcutânea.
- O tipo de aplicação faz parte dos planos, registros e componentes de mesma seringa.
- Ao selecionar um plano em “Mesma seringa”, marca, concentração, volume e tipo de aplicação são preenchidos automaticamente.
- Migração de persistência para v7 preserva os registros e planos existentes.
- O preset informado para Enantato de testosterona está configurado como ZPCH 250 mg/mL; os demais podem receber seus dados conforme o produto utilizado.


## v1.6.0 — Preparação para instalação no celular (PWA)

- Manifesto PWA com nome, cores, orientação e modo standalone.
- Ícones PNG em 192x192 e 512x512, incluindo variante maskable.
- Metadados para instalação como web app no ecossistema Apple.
- Registro automático de service worker e fallback de navegação para a última página inicial em cache.
- A instalação exige publicação em HTTPS (ou localhost para testes). O armazenamento dos dados continua local no navegador e ainda não sincroniza entre dispositivos.

### Testar localmente

1. Extraia o ZIP e abra a pasta do projeto no terminal.
2. Execute `npm install` e depois `npm run dev`.
3. Acesse `http://localhost:3000` no computador.
4. Para testar instalação em celular, publique em HTTPS; acessar pelo IP local não habilita todas as condições de instalação em todos os navegadores.
