import React from 'react'
import logoClean from './infodesk-logo-clean.png'
import logoWhite from './infodesk-logo-white.png'

export default function InfodeskLogo({ size = 160, variant = 'dark', className = '' }) {
  const src = variant === 'light' ? logoWhite : logoClean

  return (
    <img
      src={src}
      alt="Infodesk"
      style={{
        width: typeof size === 'number' ? `${size}px` : size,
        height: 'auto',
        display: 'block',
        objectFit: 'contain'
      }}
      className={className}
    />
  )
}
