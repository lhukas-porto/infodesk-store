import assert from 'node:assert'
import {
  isValidCnpj,
  formatCnpj,
  isValidEmail,
  isValidUrl,
  formatPhone,
  formatCep,
  getCompanyPublicName,
  getCompanyFullAddress,
  getCompanyGoogleMapsUrl,
  DEFAULT_COMPANY_DATA
} from '../src/services/companyService.js'

console.log('--- Iniciando Testes Unitários de Dados da Empresa ---')

// 1. CNPJ Tests
console.log('1. Testando validação e máscara de CNPJ...')
assert.strictEqual(isValidCnpj('15.266.716/0001-02'), true, 'CNPJ da Infodesk deve ser válido')
assert.strictEqual(isValidCnpj('15266716000102'), true, 'CNPJ numérico da Infodesk deve ser válido')
assert.strictEqual(isValidCnpj('11.111.111/1111-11'), false, 'Dígitos repetidos não devem passar')
assert.strictEqual(isValidCnpj('12345678000199'), false, 'CNPJ com dígito verificador incorreto deve ser rejeitado')
assert.strictEqual(isValidCnpj(''), false, 'CNPJ vazio deve ser inválido')
assert.strictEqual(formatCnpj('15266716000102'), '15.266.716/0001-02', 'Formatação de CNPJ de 14 dígitos')
assert.strictEqual(formatCnpj('15.266.716/0001-02'), '15.266.716/0001-02', 'Formatação idempotente de CNPJ')
console.log('   ✓ CNPJ OK')

// 2. Email Tests
console.log('2. Testando validação de e-mail...')
assert.strictEqual(isValidEmail('lucas@infodesk.net.br'), true, 'Email institucional válido')
assert.strictEqual(isValidEmail('contato@empresa.com.br'), true, 'Email com.br válido')
assert.strictEqual(isValidEmail('invalido@'), false, 'Email sem domínio deve ser inválido')
assert.strictEqual(isValidEmail('invalido'), false, 'String simples deve ser inválida')
assert.strictEqual(isValidEmail(''), false, 'Email vazio deve ser inválido')
console.log('   ✓ Email OK')

// 3. URL Tests
console.log('3. Testando validação de URL do Site...')
assert.strictEqual(isValidUrl('https://infodesk.net.br'), true, 'URL https válida')
assert.strictEqual(isValidUrl('http://www.minhaloja.com.br'), true, 'URL http válida')
assert.strictEqual(isValidUrl('www.minhaloja.com.br'), true, 'URL com www deve ser aceita')
assert.strictEqual(isValidUrl(''), false, 'String vazia não é uma URL em si')
assert.strictEqual(!'' || isValidUrl(''), true, 'Padrão de campo opcional aceita vazio')
assert.strictEqual(isValidUrl('ftp://invalido'), false, 'Protocolo não suportado deve falhar')
console.log('   ✓ URL OK')

// 4. Phone & CEP Masks
console.log('4. Testando máscaras de telefone e CEP...')
assert.strictEqual(formatPhone('6130335373'), '(61) 3033-5373', 'Telefone fixo 10 dígitos')
assert.strictEqual(formatPhone('61996272630'), '(61) 99627-2630', 'Celular/WhatsApp 11 dígitos')
assert.strictEqual(formatCep('70673631'), '70673-631', 'Máscara de CEP 8 dígitos')
console.log('   ✓ Máscaras OK')

// 5. Public Helpers Tests
console.log('5. Testando funções auxiliares de apresentação pública...')
assert.strictEqual(getCompanyPublicName(DEFAULT_COMPANY_DATA), 'Infodesk Store', 'Deve priorizar Nome Fantasia')
assert.strictEqual(
  getCompanyPublicName({ razaoSocial: 'Empresa Teste LTDA', nomeFantasia: '' }),
  'Empresa Teste LTDA',
  'Deve usar Razão Social se Fantasia estiver vazio'
)
assert.strictEqual(getCompanyPublicName(null), 'Infodesk Store', 'Fallback quando nulo deve ser Infodesk Store')

const fullAddr = getCompanyFullAddress(DEFAULT_COMPANY_DATA)
assert(fullAddr.includes('CLSW 304 Bloco A Sala 108'), 'Endereço deve conter logradouro e número')
assert(fullAddr.includes('Sudoeste'), 'Endereço deve conter bairro')
assert(fullAddr.includes('Brasília - DF'), 'Endereço deve conter cidade e estado')
assert(fullAddr.includes('70673-631') || fullAddr.includes('70.673-631'), 'Endereço deve conter CEP')

const mapsUrl = getCompanyGoogleMapsUrl(DEFAULT_COMPANY_DATA)
assert(mapsUrl.startsWith('https://www.google.com/maps/search/?api=1&query='), 'Link do maps deve ter formato de busca')
assert(mapsUrl.includes('CLSW+304') || mapsUrl.includes('CLSW%20304'), 'Link do maps deve conter logradouro codificado')

console.log('   ✓ Helpers de Apresentação OK')
console.log('\nTODOS OS TESTES DE DADOS DA EMPRESA PASSARAM COM SUCESSO! 🎉')
