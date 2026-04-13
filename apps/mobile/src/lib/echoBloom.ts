// Echo Bloom — dev-only event log.
//
// The backend has no analytics pipeline, so we do not fabricate one.
// Callsites are instrumented anyway: when a real event sink is wired up
// later (a /events endpoint, Segment, Mixpanel, etc.), only this module
// needs to change.
export type BloomEventKind =
  | 'center'
  | 'echo'
  | 'your_echo'
  | 'prompt_sibling';

export type BloomEventAction =
  | 'reveal'
  | 'tap'
  | 'dismiss'
  | 'continue'
  | 'open';

export function logBloomEvent(
  kind: BloomEventKind,
  action: BloomEventAction,
): void {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('[EchoBloom]', kind, action);
  }
}
