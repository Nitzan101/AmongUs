/**
 * Attach to a promise fired from a click, so a rejection is never silent.
 *
 * Almost every button in the game hands a promise to `onClick` and walks away.
 * When one of those rejects — a rule refusing a write, a room closed a second
 * ago, a phone with no signal — nothing happens at all: no error, no console
 * entry, just a button that does not work. That is the hardest kind of bug to
 * be told about, because the only symptom anyone can report is "it didn't do
 * anything".
 *
 * This does not put the failure in front of the player; the game carries on
 * from whatever the room says, and most of these actions are retryable by
 * pressing again. It puts it somewhere a developer can find.
 *
 *     onClick={() => startGame(pin).catch(report('start the game'))}
 */
export function report(what: string) {
  return (error: unknown) => {
    console.error(`Could not ${what}`, error)
  }
}
