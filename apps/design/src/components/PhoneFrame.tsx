import type { ReactNode } from 'react'

export function PhoneFrame({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={className}
      style={{
        width: '100%',
        maxWidth: 360,
        aspectRatio: '360/780',
        borderRadius: 40,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {children}
    </div>
  )
}
