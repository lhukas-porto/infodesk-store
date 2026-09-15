import fs from 'fs'

const content = fs.readFileSync('src/components/AdminDashboard.jsx', 'utf8')
const importMatch = content.match(/import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/)
const imported = importMatch[1].split(',').map(s => {
  const parts = s.trim().split(' as ')
  return (parts[1] || parts[0]).trim()
}).filter(Boolean)

const importedSet = new Set(imported)
const nativeOrComponents = new Set([
  'React', 'AdminDashboard', 'ShippingLabelModal', 'AdminCustomersSection', 'AdminPaymentsSection', 'ImageIcon'
])

const jsxTags = [...content.matchAll(/<([A-Z][a-zA-Z0-9]+)/g)].map(m => m[1])
const missing = new Set()

for (const tag of jsxTags) {
  if (!nativeOrComponents.has(tag) && !importedSet.has(tag)) {
    missing.add(tag)
  }
}

console.log('Faltando no AdminDashboard.jsx:', [...missing])
