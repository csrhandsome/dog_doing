import { useEffect, useState, type RefObject } from 'react'

export type ElementSize = {
  width: number
  height: number
}

export function useElementSize(targetRef: RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState<ElementSize>({ width: 1280, height: 720 })

  useEffect(() => {
    const node = targetRef.current

    if (!node) {
      return
    }

    const update = () => {
      setSize({
        width: node.clientWidth || 1280,
        height: node.clientHeight || 720,
      })
    }

    update()

    const observer = new ResizeObserver(update)
    observer.observe(node)

    return () => {
      observer.disconnect()
    }
  }, [targetRef])

  return size
}
