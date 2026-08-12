import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from './ui/Button'
import { Dialog } from './ui/Dialog'
import { IdentityFields } from './IdentityFields'
import { updatePlayerIdentity } from '../game/gameService'
import { joinErrorKey } from '../game/joinErrors'
import type { Player } from '../game/types'

/**
 * Change your own name and character from the lobby.
 *
 * Mainly for the host, who is never asked: creating a room takes one tap and
 * fills their name from their account with a random character, so this is
 * where they make it theirs. Anyone who mistyped at join time can use it too.
 */
export function EditIdentityDialog({
  pin,
  me,
  onClose,
}: {
  pin: string
  me: Player
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [nickname, setNickname] = useState(me.name)
  const [character, setCharacter] = useState(me.character)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setBusy(true)
    setError(null)
    try {
      await updatePlayerIdentity(pin, me.id, nickname, character)
      onClose()
    } catch (err) {
      setError(t(joinErrorKey(err)))
      setBusy(false)
    }
  }

  return (
    <Dialog title={t('lobby.editIdentity')} onDismiss={onClose}>
      <div className="mt-4">
        <IdentityFields
          nickname={nickname}
          onNicknameChange={setNickname}
          character={character}
          onCharacterChange={setCharacter}
        />
      </div>

      {error && (
        <p className="mt-3 rounded-xl bg-accent-500/10 px-3 py-2 text-sm font-medium text-accent-600">
          {error}
        </p>
      )}

      <div className="mt-5 flex gap-2">
        <Button variant="secondary" fullWidth onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button
          fullWidth
          disabled={nickname.trim().length === 0 || busy}
          onClick={handleSave}
        >
          {busy ? t('sets.saving') : t('common.save')}
        </Button>
      </div>
    </Dialog>
  )
}
