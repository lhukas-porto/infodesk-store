import React from 'react'

export default function AdminSectionHeader({
  icon: Icon,
  iconColor = 'var(--lime-dark, #4d7c0f)',
  iconBg = 'var(--lime-glow, rgba(132, 204, 22, 0.15))',
  title,
  badge,
  description,
  actions,
  gradient
}) {
  const bgStyle = gradient || 'var(--white, #ffffff)'
  const borderStyle = gradient ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid var(--dark-200, #e2e8f0)'

  return (
    <div
      className="adm-section-header"
      style={{
        background: bgStyle,
        border: borderStyle,
        borderRadius: 'var(--radius-xl, 16px)',
        padding: '20px 24px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        boxShadow: 'var(--shadow-sm, 0 1px 3px rgba(0, 0, 0, 0.05))',
        width: '100%',
        boxSizing: 'border-box'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: '260px', flex: '1 1 auto' }}>
        {Icon && (
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: iconBg,
              color: iconColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
            }}
          >
            <Icon size={24} />
          </div>
        )}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--dark-900, #0f172a)', letterSpacing: '-0.02em' }}>
              {title}
            </h3>
            {badge && (
              <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                {badge}
              </span>
            )}
          </div>
          {description && (
            <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--dark-600, #475569)', lineHeight: 1.45 }}>
              {description}
            </p>
          )}
        </div>
      </div>

      {actions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flexShrink: 0 }}>
          {actions}
        </div>
      )}
    </div>
  )
}
