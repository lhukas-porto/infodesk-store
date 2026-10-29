# Tarefas de Correção de Segurança - Infodesk Store

- [x] 1. Criar e preparar migração de segurança Supabase (`20261029_fix_security_flaws.sql`) para endurecer RLS
- [x] 2. Corrigir autenticação administrativa em `lib/api/admin/auth.js` (remover senhas fixas, remover localConfigPassword, validação estrita de e-mail e JWT_SECRET seguro)
- [x] 3. Corrigir recuperação de senha em `lib/api/auth/password-reset.js` (remover resetUrl da resposta, remover segredo padrão e validar existência)
- [x] 4. Corrigir controle de acesso em `lib/api/company/config.js` (exigir token JWT administrativo real)
- [x] 5. Corrigir autenticação no frontend em `src/context/StoreContext.jsx` (remover bypass local e senhas fixas)
- [x] 6. Verificar build e integridade do código (`npm run build`)
