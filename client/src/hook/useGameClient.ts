import { startTransition, useEffect, useRef, useState } from 'react'

import {
  DEFAULT_WORLD,
  type ClientJoinPayload,
  type InputButtons,
  type ServerMessage,
  type SnapshotPayload,
  type WorldConfig,
} from '../game/protocol'

type ClientStatus = 'idle' | 'connecting' | 'playing' | 'error'

type ConnectionMeta = {
  tickRate: number
  world: WorldConfig
}

function getServerUrl() {
  const explicit = import.meta.env.VITE_SERVER_URL

  if (explicit) {
    return explicit
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'

  return `${protocol}//${window.location.host}/ws`
}

function safeParseMessage(raw: string) {
  try {
    return JSON.parse(raw) as ServerMessage
  } catch {
    return null
  }
}

export function useGameClient(input: InputButtons) {
  const [status, setStatus] = useState<ClientStatus>('idle')
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [snapshot, setSnapshot] = useState<SnapshotPayload | null>(null)
  const [connection, setConnection] = useState<ConnectionMeta>({
    tickRate: 20,
    world: DEFAULT_WORLD,
  })
  const [systemMessage, setSystemMessage] = useState<string>('offline')
  const [error, setError] = useState<string | null>(null)

  const socketRef = useRef<WebSocket | null>(null)
  const inputRef = useRef(input)
  const seqRef = useRef(0)
  const lastSentRef = useRef('')
  const lastSentAtRef = useRef(0)
  const manualCloseRef = useRef(false)

  useEffect(() => {
    inputRef.current = input
  }, [input])

  const disconnect = (reason?: string) => {
    manualCloseRef.current = true
    const socket = socketRef.current
    socketRef.current = null
    socket?.close()
    setStatus(reason ? 'error' : 'idle')
    setPlayerId(null)
    setSnapshot(null)
    setSystemMessage(reason ?? 'offline')
    setError(reason ?? null)
    seqRef.current = 0
    lastSentRef.current = ''
    lastSentAtRef.current = 0
  }

  const connect = (payload: ClientJoinPayload) => {
    manualCloseRef.current = true
    const previousSocket = socketRef.current
    socketRef.current = null
    previousSocket?.close()
    manualCloseRef.current = false
    setStatus('connecting')
    setPlayerId(null)
    setSnapshot(null)
    setSystemMessage('dialing /ws')
    setError(null)
    seqRef.current = 0
    lastSentRef.current = ''
    lastSentAtRef.current = 0

    const socket = new WebSocket(getServerUrl())

    socket.addEventListener('open', () => {
      if (socket !== socketRef.current) {
        return
      }

      setSystemMessage('joining room')
      socket.send(
        JSON.stringify({
          type: 'join',
          payload,
        }),
      )
    })

    socket.addEventListener('message', (event) => {
      if (socket !== socketRef.current) {
        return
      }

      const parsed = safeParseMessage(event.data)

      if (!parsed) {
        return
      }

      if (parsed.type === 'joined') {
        setStatus('playing')
        setPlayerId(parsed.payload.playerId)
        setConnection({
          tickRate: parsed.payload.tickRate,
          world: parsed.payload.world,
        })
        setSystemMessage('arena synced')
        setError(null)
        return
      }

      if (parsed.type === 'snapshot') {
        startTransition(() => {
          setSnapshot(parsed.payload)
        })
        return
      }

      setSystemMessage(parsed.payload.message)

      if (parsed.payload.level === 'warn') {
        setError(parsed.payload.message)
      }
    })

    socket.addEventListener('error', () => {
      if (socket !== socketRef.current) {
        return
      }

      setStatus('error')
      setError('websocket error')
      setSystemMessage('transport fault')
    })

    socket.addEventListener('close', () => {
      if (socket !== socketRef.current) {
        return
      }

      socketRef.current = null

      if (manualCloseRef.current) {
        return
      }

      setStatus('error')
      setPlayerId(null)
      setSnapshot(null)
      setError('connection closed')
      setSystemMessage('link dropped')
    })

    socketRef.current = socket
  }

  useEffect(() => {
    if (status !== 'connecting' && status !== 'playing') {
      return
    }

    const interval = window.setInterval(() => {
      const socket = socketRef.current

      if (!socket || socket.readyState !== WebSocket.OPEN) {
        return
      }

      const payload = {
        ...inputRef.current,
        seq: ++seqRef.current,
      }
      const encoded = JSON.stringify({
        type: 'input',
        payload,
      })
      const now = window.performance.now()
      const changed = encoded !== lastSentRef.current
      const stale = now - lastSentAtRef.current > 240

      if (!changed && !stale) {
        return
      }

      socket.send(encoded)
      lastSentRef.current = encoded
      lastSentAtRef.current = now
    }, 50)

    return () => {
      window.clearInterval(interval)
    }
  }, [status])

  useEffect(() => {
    return () => {
      manualCloseRef.current = true
      socketRef.current?.close()
      socketRef.current = null
    }
  }, [])

  return {
    connect,
    connection,
    disconnect,
    error,
    playerId,
    snapshot,
    status,
    systemMessage,
  }
}
