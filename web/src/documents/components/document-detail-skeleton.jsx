import React from 'react'
import { Skeleton } from '@/shadcn/ui/skeleton'

function DetailHeaderSkeleton() {
  return (
    <div className="px-6 pt-6 max-md:px-4 max-md:pt-4">
      <Skeleton className="h-[30px] w-3/5" />
      <div className="flex items-center gap-3 mt-2">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-3.5 w-30" />
      </div>
    </div>
  )
}

function DocViewerTitleSkeleton() {
  return (
    <div className="flex justify-center pb-4 border-b-2 border-neutral-200 mb-8">
      <Skeleton className="h-[22px] w-1/2" />
    </div>
  )
}

function DocViewerIntroSkeleton() {
  return (
    <div className="flex flex-col gap-2 mb-6">
      <Skeleton className="h-3.5 w-full" />
      <Skeleton className="h-3.5 w-full" />
      <Skeleton className="h-3.5 w-[70%]" />
    </div>
  )
}

function DocViewerSectionSkeleton({ headingWidth, lines }) {
  return (
    <div className="mt-8">
      <div className="mb-3">
        <Skeleton className={`h-[17px] ${headingWidth}`} />
      </div>
      <div className="flex flex-col gap-2">
        {lines.map((line, i) => (
          <Skeleton key={i} className={`h-3.5 ${line}`} />
        ))}
      </div>
    </div>
  )
}

function SignatureItemSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <div className="border-t border-neutral-200 pt-2 pb-2">
        <Skeleton className="h-[15px] w-1/2" />
      </div>
      <div className="mt-4 flex flex-col gap-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="border-b border-neutral-200 pb-1">
            <Skeleton className="h-3.5 w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

function SignatureBlockSkeleton() {
  return (
    <div className="grid grid-cols-2 max-md:grid-cols-1 gap-12 max-md:gap-8 mt-12 max-md:mt-8 pt-8">
      <SignatureItemSkeleton />
      <SignatureItemSkeleton />
    </div>
  )
}

function DocViewerSkeleton() {
  return (
    <div className="p-6 max-md:px-4">
      <div className="max-w-[720px] mx-auto bg-card border border-border rounded-lg shadow-md p-12 max-md:p-6">
        <DocViewerTitleSkeleton />
        <DocViewerIntroSkeleton />
        <DocViewerSectionSkeleton
          headingWidth="w-[30%]"
          lines={['w-full', 'w-[95%]', 'w-full', 'w-[60%]']}
        />
        <DocViewerSectionSkeleton
          headingWidth="w-1/4"
          lines={['w-full', 'w-full', 'w-[95%]', 'w-full', 'w-[60%]']}
        />
        <DocViewerSectionSkeleton
          headingWidth="w-1/5"
          lines={['w-full', 'w-[95%]', 'w-[60%]']}
        />
        <SignatureBlockSkeleton />
      </div>
    </div>
  )
}

function DocumentDetailSkeleton() {
  return (
    <div data-testid="document-detail-skeleton">
      <DetailHeaderSkeleton />
      <DocViewerSkeleton />
    </div>
  )
}

export default DocumentDetailSkeleton
