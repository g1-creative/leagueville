import Image from 'next/image'

export function TeamLogo({ src, alt, size = 32 }: { src?: string; alt: string; size?: number }) {
  if (!src) {
    return <div style={{ width: size, height: size }} className="shrink-0 rounded-full bg-board-hi" />
  }
  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      className="shrink-0 object-contain"
      style={{ width: size, height: size }}
    />
  )
}
