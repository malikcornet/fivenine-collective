import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { useQueryClient } from '@tanstack/react-query'
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr'
import { env } from '../../../lib/env'
import { studioKeys } from '../data/useStudio'
import type { Studio } from '../api/client'
import type { Widget } from '../model/widget'

export interface PeerCursor {
  x: number
  y: number
  name?: string | null
}

export interface UseStudioHubOptions {
  /** Caller's profile id — used to ignore echoed broadcasts of their own
   *  profile saves. Shared-container writes (projects) aren't echo-suppressed
   *  because there's no way to know whether a given broadcast came from this
   *  client or another collaborator; we accept the round-trip overwrite. */
  currentProfileId: string | null
  /**
   * Apply remote widget changes for a single container to local StudioPage
   * state. Called for any container except the caller's own profile.
   */
  onRemoteWidgets: (canvasItemId: string, widgets: Widget[]) => void
  /**
   * Merge a single remotely-created (or updated) widget into local state.
   * Called for widgets in containers other than the caller's own profile.
   */
  onRemoteUpsert: (widget: Widget) => void
}

/**
 * Connects to /hubs/studio and exposes peer cursor state + a throttled
 * cursor sender. Widget broadcasts patch both the React Query cache and
 * the StudioPage's local widget state via {@link UseStudioHubOptions.onRemoteWidgets}.
 */
export function useStudioHub({
  currentProfileId,
  onRemoteWidgets,
  onRemoteUpsert,
}: UseStudioHubOptions) {
  const { isAuthenticated, getAccessTokenSilently } = useAuth0()
  const qc = useQueryClient()
  const connRef = useRef<HubConnection | null>(null)
  const [peers, setPeers] = useState<Record<string, PeerCursor>>({})
  const onRemoteRef = useRef(onRemoteWidgets)
  onRemoteRef.current = onRemoteWidgets
  const onUpsertRef = useRef(onRemoteUpsert)
  onUpsertRef.current = onRemoteUpsert
  const ownProfileRef = useRef(currentProfileId)
  ownProfileRef.current = currentProfileId

  useEffect(() => {
    let cancelled = false
    const url = `${env.apiUrl}/hubs/studio`
    const conn = new HubConnectionBuilder()
      .withUrl(url, {
        accessTokenFactory: isAuthenticated
          ? () => getAccessTokenSilently()
          : undefined,
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build()

    conn.on('PeerJoined', (peerId: string, name: string | null) => {
      setPeers(prev => ({ ...prev, [peerId]: { x: 0, y: 0, name } }))
    })
    conn.on('PeerLeft', (peerId: string) => {
      setPeers(prev => {
        if (!(peerId in prev)) return prev
        const next = { ...prev }
        delete next[peerId]
        return next
      })
    })
    conn.on('CursorMoved', (peerId: string, pos: { x: number; y: number }) => {
      setPeers(prev => ({
        ...prev,
        [peerId]: { ...prev[peerId], x: pos.x, y: pos.y },
      }))
    })
    conn.on('WidgetsChanged', (canvasItemId: string, widgets: Widget[]) => {
      // Suppress echoes of our own profile writes — local state already has
      // them. Shared-container writes always apply.
      if (canvasItemId === ownProfileRef.current) return
      onRemoteRef.current(canvasItemId, widgets)
      qc.setQueryData<Studio>(studioKeys.current(), prev => {
        if (!prev) return prev
        const others = prev.widgets.filter(w => w.canvasItemId !== canvasItemId)
        return { ...prev, widgets: [...others, ...widgets] }
      })
    })
    conn.on('WidgetUpserted', (widget: Widget) => {
      // Suppress echoes only for widgets in our own profile container.
      if (widget.canvasItemId === ownProfileRef.current) return
      onUpsertRef.current(widget)
      qc.setQueryData<Studio>(studioKeys.current(), prev => {
        if (!prev) return prev
        const without = prev.widgets.filter(w => w.id !== widget.id)
        return { ...prev, widgets: [...without, widget] }
      })
    })

    conn.start().catch(err => {
      if (!cancelled) console.warn('[studio hub] start failed', err)
    })
    connRef.current = conn

    return () => {
      cancelled = true
      connRef.current = null
      conn.stop().catch(() => {})
    }
  }, [isAuthenticated, getAccessTokenSilently, qc])

  // ~30 Hz throttle. mousemove fires far more often than that and we don't
  // need sub-frame fidelity for a cursor dot.
  const lastSentRef = useRef(0)
  const sendCursor = useCallback((x: number, y: number) => {
    const conn = connRef.current
    if (!conn || conn.state !== HubConnectionState.Connected) return
    const now = performance.now()
    if (now - lastSentRef.current < 33) return
    lastSentRef.current = now
    conn.invoke('Cursor', { x, y }).catch(() => {})
  }, [])

  return { peers, sendCursor }
}
