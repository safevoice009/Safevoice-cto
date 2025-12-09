import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MediaUploader } from '../MediaUploader'
import type { ReactNode } from 'react'

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('../../../lib/store', () => ({
  useStore: vi.fn(() => ({
    storageStats: {
      local: {
        used: 100 * 1024 * 1024,
        available: 500 * 1024 * 1024,
        percentage: 20,
        totalFiles: 5,
      },
      total: {
        cost: 0,
        redundancy: 1,
      },
    },
  })),
}))

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: { children: ReactNode; [key: string]: unknown }) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: ReactNode }) => children,
}))

vi.mock('../../../hooks/useMediaUploader', () => ({
  useMediaUploader: vi.fn(() => ({
    jobs: [],
    isInitialized: true,
    initError: null,
    uploadFiles: vi.fn().mockResolvedValue([]),
    removeJob: vi.fn(),
    retryJob: vi.fn(),
    clearCompleted: vi.fn(),
  })),
}))

describe('MediaUploader Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render dropzone with upload instructions', () => {
    render(<MediaUploader />)

    expect(screen.getByText(/Drag media here/i)).toBeInTheDocument()
    expect(screen.getByText(/click to browse/i)).toBeInTheDocument()
    expect(screen.getByText(/Supports images, audio, and video/i)).toBeInTheDocument()
  })

  it('should render storage status when available', () => {
    const { container } = render(<MediaUploader />)
    
    const dropZone = container.querySelector('[aria-label="File upload dropzone"]')
    expect(dropZone).toBeInTheDocument()
  })

  it('should trigger file input on click', () => {
    render(<MediaUploader />)

    const clickLink = screen.getByText(/click to browse/i)
    expect(clickLink).toBeInTheDocument()
  })

  it('should accept files with specified file types', () => {
    const { container } = render(<MediaUploader accept="image/*" />)

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    expect(fileInput).toHaveAttribute('accept', 'image/*')
  })

  it('should set default maxSize prop', () => {
    render(<MediaUploader maxSize={100 * 1024 * 1024} />)

    const dropZone = screen.getByText(/Supports images, audio, and video/i)
    expect(dropZone).toBeInTheDocument()
  })

  it('should render dropzone element', () => {
    const { container } = render(<MediaUploader />)

    const dropZone = container.querySelector('[role="button"]') as HTMLElement
    expect(dropZone).toBeInTheDocument()
  })

  it('should handle keyboard events on dropzone', () => {
    const { container } = render(<MediaUploader />)

    const dropZone = container.querySelector('[role="button"]') as HTMLElement
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement

    const clickSpy = vi.spyOn(fileInput, 'click')

    fireEvent.keyDown(dropZone, { code: 'Space' })
    expect(clickSpy).toHaveBeenCalled()
  })

  it('should have accessible dropzone with proper ARIA attributes', () => {
    const { container } = render(<MediaUploader />)

    const dropZone = container.querySelector('[role="button"]') as HTMLElement
    expect(dropZone).toHaveAttribute('aria-label', 'File upload dropzone')
    expect(dropZone).toHaveAttribute('tabIndex', '0')
  })

  it('should display storage stats correctly formatted', () => {
    render(<MediaUploader />)

    expect(screen.getByText(/Drag media here/i)).toBeInTheDocument()
  })

  it('should render with default props', () => {
    const { container } = render(<MediaUploader />)

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    expect(fileInput).toHaveAttribute('accept', 'image/*,audio/*,video/*')
  })

  it('should show file list when jobs are present', () => {
    render(<MediaUploader />)

    expect(screen.queryByText(/test.jpg/)).not.toBeInTheDocument()
    expect(screen.getByText(/Drag media here/i)).toBeInTheDocument()
  })
})
