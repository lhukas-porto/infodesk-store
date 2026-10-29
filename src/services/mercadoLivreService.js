/**
 * Serviço de Integração com o Mercado Livre (Frontend)
 */

export const mercadoLivreService = {
  /**
   * Consulta o status de conexão da conta com o Mercado Livre
   */
  async getStatus() {
    try {
      const res = await fetch('/api/mercadolivre/status')
      if (!res.ok) return { connected: false }
      return await res.json()
    } catch (err) {
      console.warn('[MercadoLivreService] Falha ao consultar status:', err.message)
      return { connected: false, error: err.message }
    }
  },

  /**
   * Inicia o fluxo de autenticação OAuth redirecionando o navegador
   */
  connectAccount() {
    window.location.href = '/api/mercadolivre/auth'
  },

  /**
   * Publica ou sincroniza um produto no Mercado Livre
   * @param {string} productId ID do produto no Supabase
   * @param {number} markupPercent Margem percentual de acréscimo (ex: 15 para 15%)
   * @param {string} listingType 'gold_special' (Clássico) ou 'gold_pro' (Premium)
   */
  async publishProduct(productId, markupPercent = 0, listingType = 'gold_special') {
    try {
      const res = await fetch('/api/mercadolivre/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, markupPercent, listingType })
      })
      const data = await res.json()
      return data
    } catch (err) {
      console.error('[MercadoLivreService] Erro ao publicar produto:', err)
      return { success: false, error: err.message }
    }
  }
}

