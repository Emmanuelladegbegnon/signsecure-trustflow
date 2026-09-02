import type { CSSProperties } from 'react'

interface IconProps {
  name: string
  filled?: boolean
  className?: string
  size?: number
  style?: CSSProperties
}

/** Google "Material Symbols Outlined" glyph, loaded globally via index.html. */
export function Icon({ name, filled = false, className = '', size, style }: IconProps) {
  return (
    <span
      className={`material-symbols-outlined${filled ? ' filled' : ''} ${className}`}
      style={{ fontSize: size, ...style }}
      aria-hidden="true"
    >
      {name}
    </span>
  )
}
