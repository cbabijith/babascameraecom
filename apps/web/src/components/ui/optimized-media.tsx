"use client"

import { useState, useCallback } from "react"
import Image from "next/image"
import { Skeleton } from "./skeleton"

interface OptimizedMediaProps {
  src: string
  alt: string
  isVideo: boolean
  className?: string
  muted?: boolean
  autoPlay?: boolean
  loop?: boolean
  priority?: boolean
  fetchPriority?: 'high' | 'low' | 'auto'
  onError?: () => void
  onLoad?: () => void
  fill?: boolean
  width?: number
  height?: number
}

export function OptimizedMedia({
  src,
  alt,
  isVideo,
  className = "",
  muted = true,
  autoPlay = true,
  loop = true,
  priority = false,
  fetchPriority,
  onError,
  onLoad,
  fill = true,
  width,
  height,
}: OptimizedMediaProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  const handleLoad = useCallback(() => {
    setIsLoading(false)
    onLoad?.()
  }, [onLoad])

  const handleError = useCallback(() => {
    setIsLoading(false)
    setHasError(true)
    onError?.()
  }, [onError])

  if (hasError) {
    return (
      <div className={`bg-gradient-to-r from-gray-800 to-gray-900 flex items-center justify-center ${className}`}>
        <div className="text-center text-white">
          <p className="text-sm opacity-75">Media unavailable</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {isLoading && (
        <Skeleton className="absolute inset-0" />
      )}
      
      {isVideo ? (
        <video
          src={src}
          autoPlay={autoPlay}
          loop={loop}
          muted={muted}
          className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
          onLoadedData={handleLoad}
          onError={handleError}
          preload="metadata"
        />
      ) : (
        <Image
          src={src || "/placeholder.svg"}
          alt={alt}
          fill={fill}
          width={!fill ? width : undefined}
          height={!fill ? height : undefined}
          className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
          priority={priority}
          fetchPriority={fetchPriority}
          onLoad={handleLoad}
          onError={handleError}
          sizes="(max-width: 768px) 100vw, 50vw"
        />
      )}
    </>
  )
}
