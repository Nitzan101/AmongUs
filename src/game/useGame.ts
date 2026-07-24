import { useEffect, useState } from 'react'
import { subscribeGame, subscribePlayers, subscribeSecret } from './gameService'
import type { Game, Player, Secret } from './types'

/** Subscribe to a game document and its players in real time. */
export function useGame(pin: string | undefined) {
  const [game, setGame] = useState<Game | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    if (!pin) return
    setLoading(true)
    const unsubGame = subscribeGame(
      pin,
      (g) => {
        setGame(g)
        setLoading(false)
      },
      (e) => {
        setError(e)
        setLoading(false)
      },
    )
    const unsubPlayers = subscribePlayers(pin, setPlayers, setError)
    return () => {
      unsubGame()
      unsubPlayers()
    }
  }, [pin])

  return { game, players, loading, error }
}

/** Subscribe to the caller's own secret assignment for a game. */
export function useSecret(pin: string | undefined, uid: string | undefined) {
  const [secret, setSecret] = useState<Secret | null>(null)

  useEffect(() => {
    setSecret(null)
    if (!pin || !uid) return
    return subscribeSecret(pin, uid, setSecret)
  }, [pin, uid])

  return secret
}
