import { useEffect, useState } from 'react'

import { EMPTY_INPUT, type InputButtons } from '../game/protocol'

const KEY_BINDINGS: Record<string, keyof InputButtons> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  KeyW: 'up',
  KeyS: 'down',
  KeyA: 'left',
  KeyD: 'right',
  KeyJ: 'attack',
  KeyK: 'block',
}

function createResetInput() {
  return { ...EMPTY_INPUT }
}

function isEditableTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable)
  )
}

export function useKeyboardInput(enabled: boolean, canBlock = true) {
  const [input, setInput] = useState<InputButtons>(createResetInput)

  useEffect(() => {
    if (!canBlock) {
      setInput((previous) =>
        previous.block
          ? {
              ...previous,
              block: false,
            }
          : previous,
      )
    }
  }, [canBlock])

  useEffect(() => {
    if (!enabled) {
      return
    }

    const setKeyState = (event: KeyboardEvent, pressed: boolean) => {
      const binding = KEY_BINDINGS[event.code]

      if (!binding || isEditableTarget(event.target)) {
        return
      }

      if (binding === 'block' && !canBlock) {
        return
      }

      event.preventDefault()

      setInput((previous) => {
        if (previous[binding] === pressed) {
          return previous
        }

        return {
          ...previous,
          [binding]: pressed,
        }
      })
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      setKeyState(event, true)
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      setKeyState(event, false)
    }

    const handleBlur = () => {
      setInput(createResetInput())
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', handleBlur)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', handleBlur)
    }
  }, [canBlock, enabled])

  return enabled ? input : EMPTY_INPUT
}
