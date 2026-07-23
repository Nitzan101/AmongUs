import { useEffect, useState } from 'react'
import { subscribeGame, subscribePlayers } from './gameService'
import type { Game, Player } from './types'

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
