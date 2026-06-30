# CF Scores — Setup

## 1. Supabase

1. Crie uma conta gratuita em [supabase.com](https://supabase.com)
2. Clique em **New project** e anote a URL e a `anon key` (Settings → API)
3. No **SQL Editor**, cole e execute o conteúdo de `supabase-setup.sql`
4. Em **Authentication → Users**, crie seu usuário com email e senha

## 2. Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

## 3. Rodar localmente

```bash
npm install
npm run dev
```

Acesse http://localhost:5174

## 4. Deploy (Vercel)

1. Crie um repositório no GitHub e faça push do projeto
2. Em [vercel.com](https://vercel.com), importe o repositório
3. Adicione as variáveis de ambiente (`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`)
4. Deploy automático!

## 5. iPhone (PWA)

No Safari, abra a URL do app → toque em **Compartilhar** → **Adicionar à Tela de Início**
O app vai funcionar como um app nativo, sem barra de URL.
