import React from 'react'
import { Card, CardContent, CardHeader } from '@/shadcn/ui/card'
import { Skeleton } from '@/shadcn/ui/skeleton'

const SKELETON_COUNT = 6

function SkeletonCard() {
  return (
    <Card className="p-5">
      <CardHeader className="flex flex-row items-start justify-between gap-3 p-0">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-5 w-16" />
      </CardHeader>
      <CardContent className="p-0 mt-2">
        <Skeleton className="h-4 w-full mb-1" />
        <Skeleton className="h-4 w-3/4 mb-4" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-10" />
        </div>
      </CardContent>
    </Card>
  )
}

function SkeletonGrid() {
  return (
    <div
      className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(300px,1fr))]"
      data-testid="skeleton-grid"
    >
      {Array.from({ length: SKELETON_COUNT }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}

export default SkeletonGrid
