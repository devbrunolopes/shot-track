# Shot Track v1.10.0

## Novidades
- Login e cadastro com Firebase Authentication (e-mail e senha).
- Recuperação de senha por e-mail.
- Botão para sair da conta.
- Identidade visual preto, dourado e marfim na tela de autenticação.
- Os registros, planos, substâncias e locais continuam salvos localmente no dispositivo; login não ativa sincronização na nuvem.

## Configuração Firebase
O aplicativo Web está configurado para o projeto `shot-track-6266`. A configuração web do Firebase é pública; não inclua credenciais administrativas ou chaves privadas no cliente.

No Console do Firebase:
1. Abra **Authentication → Settings → Authorized domains**.
2. Confirme `localhost` para desenvolvimento.
3. Adicione o domínio publicado do Shot Track, por exemplo `shot-track-three.vercel.app`, e qualquer domínio de produção personalizado utilizado.
4. Em **Authentication → Sign-in method**, confirme que **E-mail/senha** está habilitado.

## Executar localmente
Requer Node.js compatível com Next.js 16 e conexão com a internet para instalar dependências.

```bash
npm install
npm run dev
```

Se estiver usando o ZIP para atualizar um repositório existente, preserve a pasta `.git`. Rode `npm install` para atualizar o `package-lock.json` com a dependência Firebase antes de publicar.

## Importante sobre os dados
- O login controla quem consegue abrir a interface, mas não sincroniza registros entre dispositivos.
- O logout não apaga os dados locais.
- Os dados existentes do navegador/dispositivo permanecem no armazenamento local do Shot Track. Não limpe os dados do site nem o armazenamento do navegador durante a atualização.
- A integração atual ainda não implementa licenças, códigos de ativação, banco Firestore ou sincronização em nuvem.
