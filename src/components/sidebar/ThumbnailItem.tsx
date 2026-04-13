import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { clsx } from 'clsx'
import { GripVertical, Loader2 } from 'lucide-react'

interface ThumbnailItemProps {
  id: string
  pageIndex: number
  pageNumber: number
  thumbnail: string | null
  thumbnailLoading: boolean
  isActive: boolean
  isSelected: boolean
  onClick: (e: React.MouseEvent) => void
}

export function ThumbnailItem({
  id,
  pageIndex,
  pageNumber,
  thumbnail,
  thumbnailLoading,
  isActive,
  isSelected,
  onClick,
}: ThumbnailItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        'group relative flex flex-col items-center gap-1 px-2 py-2 rounded-xl cursor-pointer',
        'transition-all duration-150',
        isActive
          ? 'bg-indigo-500/15 dark:bg-indigo-500/20'
          : 'hover:bg-gray-100 dark:hover:bg-gray-800/70',
        isSelected && !isActive && 'bg-indigo-500/10 dark:bg-indigo-500/15 ring-1 ring-inset ring-indigo-400/30'
      )}
      onClick={onClick}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 start-1 opacity-0 group-hover:opacity-60 hover:opacity-100 cursor-grab active:cursor-grabbing text-gray-400 p-0.5"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </div>

      {/* Thumbnail */}
      <div
        className={clsx(
          'relative overflow-hidden rounded bg-white shadow-thumb',
          'w-full aspect-[3/4] max-w-[130px]',
          isActive && 'ring-2 ring-indigo-500',
          isSelected && !isActive && 'ring-1 ring-indigo-400'
        )}
        style={{ minHeight: 70 }}
      >
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={`Page ${pageNumber}`}
            className="absolute inset-0 w-full h-full object-contain"
            draggable={false}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            {thumbnailLoading ? (
              <Loader2 className="h-4 w-4 text-gray-300 animate-spin" />
            ) : (
              <div className="h-4 w-4 rounded bg-gray-200" />
            )}
          </div>
        )}
      </div>

      {/* Page number */}
      <span
        className={clsx(
          'text-[10px] font-medium tabular-nums',
          isActive
            ? 'text-indigo-500 dark:text-indigo-400'
            : 'text-gray-400 dark:text-gray-500'
        )}
      >
        {pageNumber}
      </span>
    </div>
  )
}
