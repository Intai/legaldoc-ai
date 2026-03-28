import React from 'react'
import { render, screen } from '@testing-library/react'

jest.mock('@/shadcn/ui/card', () => ({
  Card: ({ children, ...props }) => <div data-slot="card" {...props}>{children}</div>,
  CardHeader: ({ children, ...props }) => <div data-slot="card-header" {...props}>{children}</div>,
  CardContent: ({ children, ...props }) => <div data-slot="card-content" {...props}>{children}</div>,
}))

jest.mock('@/shadcn/ui/skeleton', () => ({
  Skeleton: props => <div data-slot="skeleton" {...props} />,
}))

import SkeletonGrid from './skeleton-grid'

describe('SkeletonGrid', () => {
  it('renders 6 skeleton cards with expected skeleton elements', () => {
    render(<SkeletonGrid />)
    const skeletonGrid = screen.getByTestId('skeleton-grid')
    expect(skeletonGrid).toBeInTheDocument()

    const skeletons = skeletonGrid.querySelectorAll('[data-slot="skeleton"]')
    // Each skeleton card has 7 skeleton blocks
    expect(skeletons.length).toBe(6 * 7)
  })
})
