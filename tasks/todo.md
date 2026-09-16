# Tarefas de Otimização e Pente Fino do E-commerce (Painel & Vitrine)

## Painel de Controle
- [x] 1. Otimizar `AdminCustomersSection.jsx` e `customerService.js` (indexação O(1) de pedidos e métricas memoizadas)
- [x] 2. Ajustar `AdminDashboard.jsx` (memoizações com `useMemo`, Correios apenas na aba de frete, remoção de formulário duplicado e props do marketing)

## Vitrine & Loja Pública
- [x] 3. Otimizar `StoreContext.jsx` (memoizar `filteredProducts`, `featuredProducts`, totais de carrinho e estabilizar `popstate`)
- [x] 4. Consolidar estilos no `src/index.css` e remover tags `<style>` repetitivas de `ProductCard.jsx` e `BrandCarousel.jsx`
- [x] 5. Memoizar `ProductCard` e `BrandCarousel` com `React.memo`
- [x] 6. Implementar cache instantâneo de CEP em memória em `correiosService.js`
- [x] 7. Executar build (`npm run build`) para validação técnica (concluído em 1.94s)
- [x] 8. Inicializar servidor local em `http://localhost:5173/` e atualizar walkthrough detalhado
