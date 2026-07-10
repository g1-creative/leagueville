import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { Player } from '@/lib/types'

vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img alt={props.alt ?? ''} {...props} />,
}))

import { SquadTable } from './SquadTable'

const players: Player[] = [
  { id: 'p1', name: 'Jordan Pickford', position: 'Goalkeeper', jersey: '1', age: 31, nationality: 'England' },
]

describe('SquadTable', () => {
  it('groups players under their position heading', () => {
    render(<SquadTable players={players} />)
    expect(screen.getByText('Goalkeepers')).toBeDefined()
    expect(screen.getByText('Jordan Pickford')).toBeDefined()
  })

  it('never wraps the age column', () => {
    render(<SquadTable players={players} />)
    expect(screen.getByText('31 yrs').className).toContain('whitespace-nowrap')
  })
})
