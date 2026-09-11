# Tarefas de Implementação: Identificação de Produtos por Fotografia

- [x] 1. Criar endpoint backend `api/barcode/identify-photo.js` com pipeline Gemini + GTIN validation + SerpApi Lens + Ranqueamento
- [x] 2. Criar endpoint backend `api/barcode/confirm-match.js` para persistência de cache de aprendizado no Supabase
- [x] 3. Atualizar `vite.config.js` para servir os novos endpoints no ambiente local de desenvolvimento
- [x] 4. Atualizar `src/services/barcodeService.js` com funções client-side de compressão/otimização de imagem e chamada aos endpoints
- [x] 5. Atualizar `src/components/BarcodeScannerModal.jsx` para integrar as duas formas de identificação (código de barras e foto), prévia, andamento e cards de candidatos com confirmação
- [x] 6. Criar script de verificação e testar localmente com `npm run build`
