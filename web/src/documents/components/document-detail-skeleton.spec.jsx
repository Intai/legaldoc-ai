import React from 'react'
import { render, screen } from '@testing-library/react'

jest.mock('@/shadcn/ui/skeleton', () => ({
  Skeleton: props => <div data-slot="skeleton" {...props} />,
}))

import DocumentDetailSkeleton from './document-detail-skeleton'

describe('DocumentDetailSkeleton', () => {
  it('renders the skeleton layout with header, document viewer sections, and signature blocks', () => {
    render(<DocumentDetailSkeleton />)
    const root = screen.getByTestId('document-detail-skeleton')
    expect(root).toBeInTheDocument()

    const skeletons = root.querySelectorAll('[data-slot="skeleton"]')
    // Header: 1 title + 2 meta = 3
    // Doc viewer title: 1
    // Intro: 3 lines
    // Section 1: 1 heading + 4 lines = 5
    // Section 2: 1 heading + 5 lines = 6
    // Section 3: 1 heading + 3 lines = 4
    // Signature: 2 items x (1 label + 3 fields) = 8
    // Total = 3 + 1 + 3 + 5 + 6 + 4 + 8 = 30
    expect(skeletons.length).toBe(30)
  })
})
