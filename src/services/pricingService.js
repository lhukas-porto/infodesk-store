/**
 * =========================================================================
 * INFODESK STORE — Serviço de Precificação & Arredondamento Comercial
 * =========================================================================
 * 
 * Regra de Arredondamento Psicológico de Varejo (.00 terminando em 5 ou 9):
 * 
 * 1. Terminações 0, 1, 2 -> Arredonda para o final 9 descendo (ex: 100 -> 99, 101 -> 99, 102 -> 99)
 * 2. Terminações 3, 4, 5, 6 -> Arredonda para o final 5 (ex: 253 -> 255, 254 -> 255, 255 -> 255, 256 -> 255)
 * 3. Terminações 7, 8, 9 -> Arredonda para o final 9 subindo (ex: 157 -> 159, 158 -> 159, 159 -> 159)
 */

/**
 * Aplica o arredondamento comercial a qualquer valor numérico.
 * @param {number|string} rawValue Valor original em Reais
 * @returns {number} Valor final arredondado (.00 com final 5 ou 9)
 */
export function roundCommercialPrice(rawValue) {
  const num = parseFloat(rawValue)
  if (!num || isNaN(num) || num <= 0) return 0

  const rounded = Math.round(num)
  if (rounded <= 4) return 5 // Piso comercial mínimo

  const d = ((rounded % 10) + 10) % 10
  const k = Math.floor(rounded / 10)

  let finalPrice = rounded
  if (d <= 2) {
    // Se próximo de 1/0/2 -> arredonda para 9 descendo
    finalPrice = 10 * k - 1
  } else if (d <= 6) {
    // Se próximo de 5 (3, 4, 5, 6) -> arredonda para 5
    finalPrice = 10 * k + 5
  } else {
    // Se próximo de 9 (7, 8, 9) -> arredonda para 9 subindo
    finalPrice = 10 * k + 9
  }

  return Math.max(5, finalPrice)
}

/**
 * Calcula o preço de venda sugerido a partir do Custo, Alíquota de Imposto e Margem de Lucro,
 * já aplicando o arredondamento comercial (final 5 ou 9).
 * Fórmula: Custo * (1 + Imposto%) * (1 + Margem%) -> arredondado
 */
export function calcCommercialSellPrice(cost, taxRate = 0, marginRate = 0) {
  const c = parseFloat(cost) || 0
  const t = parseFloat(taxRate) || 0
  const m = parseFloat(marginRate) || 0

  if (c <= 0) return 0
  const rawSell = c * (1 + t / 100) * (1 + m / 100)
  return roundCommercialPrice(rawSell)
}

/**
 * Calcula o preço riscado ("De R$ X,00") sugerido para promoção,
 * aplicando o markup padrão de ~15% a 20% com arredondamento comercial.
 * @param {number|string} sellPrice Preço de venda atual
 * @param {number} markupMultiplier Fator multiplicador padrão (1.15 = +15%)
 * @returns {number}
 */
export function calcCommercialOriginalPrice(sellPrice, markupMultiplier = 1.15) {
  const p = parseFloat(sellPrice) || 0
  if (p <= 0) return 0
  const rawOriginal = p * markupMultiplier
  return roundCommercialPrice(rawOriginal)
}

/**
 * Formata um valor numérico para exibição em Real brasileiro (R$ XX,XX).
 */
export function formatCurrencyBRL(value) {
  const v = parseFloat(value) || 0
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
