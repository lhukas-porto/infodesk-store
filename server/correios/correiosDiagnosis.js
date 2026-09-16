// Módulo de Diagnóstico e Teste de Conexão em 8 Etapas com as APIs Oficiais dos Correios
import { getStoreCorreiosConfig, CORREIOS_SERVICES } from './config.js'
import { fetchCorreiosPrice } from './correiosPrice.js'
import { fetchCorreiosDeadline } from './correiosDeadline.js'

/**
 * Executa o diagnóstico completo de conexão com os Correios
 * @param {object} credentials - Dados das credenciais para testar (opcional, se não enviado usa as salvas)
 * @returns {Promise<object>}
 */
export async function diagnoseCorreiosConnection(credentials = {}, storeId = 'default') {
  const currentConfig = getStoreCorreiosConfig(storeId)

  const usuario = credentials.usuario || currentConfig.usuario
  // Se veio a máscara ou vazio, usa o salvo
  let codigoAcesso = credentials.codigoAcesso
  if (!codigoAcesso || codigoAcesso === '••••••••••••••••' || codigoAcesso.startsWith('••')) {
    codigoAcesso = currentConfig.codigoAcesso
  }
  const contrato = credentials.contrato || currentConfig.contrato
  const dr = credentials.dr || currentConfig.dr || '10'
  const cepOrigem = (credentials.cepOrigem || currentConfig.cepOrigem || '70673631').replace(/\D/g, '')

  const results = []

  // ETAPA 1: Validar se os campos obrigatórios estão preenchidos
  if (!usuario || !codigoAcesso || !contrato) {
    return {
      success: false,
      results: [
        { item: 'Credenciais válidas', ok: false, message: 'Informe Usuário, Código de Acesso e Contrato.' },
        { item: 'Contrato ativo', ok: false, message: 'Pendente' },
        { item: 'PAC disponível', ok: false, message: 'Pendente' },
        { item: 'SEDEX disponível', ok: false, message: 'Pendente' },
        { item: 'API Preço funcionando', ok: false, message: 'Pendente' },
        { item: 'API Prazo funcionando', ok: false, message: 'Pendente' }
      ],
      message: 'Campos obrigatórios não preenchidos.'
    }
  }

  results.push({
    item: 'Credenciais válidas',
    ok: true,
    message: `Usuário "${usuario}" e Contrato "${contrato}" configurados.`
  })

  // ETAPA 2: Gerar Token de Autenticação via Basic Auth
  const basicAuth = Buffer.from(`${usuario}:${codigoAcesso}`).toString('base64')
  let token = null
  let tokenData = null

  try {
    const authRes = await fetch(currentConfig.authUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        numero: contrato,
        dr: dr
      })
    })

    if (!authRes.ok) {
      const errText = await authRes.text().catch(() => '')
      return {
        success: false,
        results: [
          ...results,
          { item: 'Contrato ativo', ok: false, message: `Falha na autenticação (${authRes.status}): Verifique Usuário e Código de Acesso.` },
          { item: 'PAC disponível', ok: false, message: 'Não testado' },
          { item: 'SEDEX disponível', ok: false, message: 'Não testado' },
          { item: 'API Preço funcionando', ok: false, message: 'Não testado' },
          { item: 'API Prazo funcionando', ok: false, message: 'Não testado' }
        ],
        message: `Falha ao autenticar contrato nos Correios (HTTP ${authRes.status}).`
      }
    }

    tokenData = await authRes.json()
    token = tokenData.token || tokenData.jwt

    if (!token) {
      throw new Error('API não retornou token de autorização.')
    }
  } catch (err) {
    return {
      success: false,
      results: [
        ...results,
        { item: 'Contrato ativo', ok: false, message: `Erro de conexão: ${err.message}` },
        { item: 'PAC disponível', ok: false, message: 'Não testado' },
        { item: 'SEDEX disponível', ok: false, message: 'Não testado' },
        { item: 'API Preço funcionando', ok: false, message: 'Não testado' },
        { item: 'API Prazo funcionando', ok: false, message: 'Não testado' }
      ],
      message: 'Não foi possível conectar ao servidor dos Correios.'
    }
  }

  // ETAPA 3 & 4: Consultar Contrato e Confirmar DR
  let drIdentificada = dr
  if (tokenData.dr || tokenData.numeroDr) {
    drIdentificada = String(tokenData.dr || tokenData.numeroDr)
  }

  results.push({
    item: 'Contrato ativo',
    ok: true,
    message: `Contrato ${contrato} autenticado com sucesso (DR ${drIdentificada}).`
  })

  // ETAPA 5, 6 & 7: Testar acesso à API de Preço e Prazo com pacote de referência padrão
  const testPackage = { weightG: 1000, length: 30, width: 20, height: 15 }
  const testCepDestino = '01310100' // São Paulo / SP (Avenida Paulista)

  let priceOk = false
  let deadlineOk = false
  let pacFound = false
  let sedexFound = false

  try {
    let priceError = null
    let deadlineError = null

    const [priceResults, deadlineResults] = await Promise.all([
      fetchCorreiosPrice(token, testCepDestino, testPackage, {
        contrato,
        dr: drIdentificada || dr,
        cepOrigem,
        storeId
      }).catch(e => {
        console.warn('[Diagnóstico] Erro na API Preço:', e.message)
        priceError = e.message
        return []
      }),
      fetchCorreiosDeadline(token, testCepDestino, {
        cepOrigem,
        storeId
      }).catch(e => {
        console.warn('[Diagnóstico] Erro na API Prazo:', e.message)
        deadlineError = e.message
        return []
      })
    ])

    // Avalia disponibilidade de PAC (03298)
    const pacPrice = priceResults.find(p => p.coProduto === '03298' || p.nuRequisicao === 'PAC')
    const pacDeadline = deadlineResults.find(d => d.coProduto === '03298' || d.nuRequisicao === 'PAC')
    if (pacPrice || pacDeadline) {
      pacFound = true
      results.push({
        item: 'PAC disponível',
        ok: true,
        message: `coProduto 03298 habilitado no contrato (${pacDeadline ? pacDeadline.prazoEntrega + ' dias úteis' : 'ativo'}).`
      })
    } else {
      results.push({
        item: 'PAC disponível',
        ok: false,
        message: 'coProduto 03298 não retornou cotação no contrato.'
      })
    }

    // Avalia disponibilidade de SEDEX (03220)
    const sedexPrice = priceResults.find(p => p.coProduto === '03220' || p.nuRequisicao === 'SEDEX')
    const sedexDeadline = deadlineResults.find(d => d.coProduto === '03220' || d.nuRequisicao === 'SEDEX')
    if (sedexPrice || sedexDeadline) {
      sedexFound = true
      results.push({
        item: 'SEDEX disponível',
        ok: true,
        message: `coProduto 03220 habilitado no contrato (${sedexDeadline ? sedexDeadline.prazoEntrega + ' dia útil' : 'ativo'}).`
      })
    } else {
      results.push({
        item: 'SEDEX disponível',
        ok: false,
        message: 'coProduto 03220 não retornou cotação no contrato.'
      })
    }

    // Avalia API Preço
    if (priceResults.length > 0) {
      priceOk = true
      results.push({
        item: 'API Preço funcionando',
        ok: true,
        message: `${priceResults.length} serviço(s) tarifado(s) com sucesso em tempo real.`
      })
    } else {
      results.push({
        item: 'API Preço funcionando',
        ok: false,
        message: priceError ? `Erro na API Preço: ${priceError}` : 'Nenhum preço retornado pela API Preço.'
      })
    }

    // Avalia API Prazo
    if (deadlineResults.length > 0) {
      deadlineOk = true
      results.push({
        item: 'API Prazo funcionando',
        ok: true,
        message: `${deadlineResults.length} prazo(s) calculado(s) com sucesso em tempo real.`
      })
    } else {
      results.push({
        item: 'API Prazo funcionando',
        ok: false,
        message: deadlineError ? `Erro na API Prazo: ${deadlineError}` : 'Nenhum prazo retornado pela API Prazo.'
      })
    }
  } catch (err) {
    results.push({ item: 'API Preço funcionando', ok: false, message: err.message })
    results.push({ item: 'API Prazo funcionando', ok: false, message: err.message })
  }

  const allSuccess = priceOk && deadlineOk && (pacFound || sedexFound)

  return {
    success: allSuccess,
    drIdentificada,
    results,
    message: allSuccess
      ? 'Conexão com as APIs dos Correios validada com sucesso! Todos os serviços estão operacionais.'
      : 'Diagnóstico concluído com ressalvas. Verifique os itens apontados acima.'
  }
}
