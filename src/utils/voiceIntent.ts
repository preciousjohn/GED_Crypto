export type VoiceIntent = 'yes' | 'no' | 'send' | 'unknown';

const YES_PHRASES = [
  'yes',
  'yeah',
  'yep',
  'yup',
  'sure',
  'confirm',
  'confirmed',
  'go ahead',
  'do it',
  'send it',
  'ok',
  'okay',
  'absolutely',
  'correct',
  'right',
  'sounds good',
  'that works',
  'please do',
  'affirmative',
];

const NO_PHRASES = [
  'no',
  'nope',
  'nah',
  'cancel',
  'cancelled',
  'canceled',
  'stop',
  "don't",
  'dont',
  'never mind',
  'nevermind',
  'not now',
  'negative',
  'hold on',
  'wait',
];

function normalizeSpeech(text: string): string {
  return text.toLowerCase().trim().replace(/[.!?,]/g, '');
}

function matchesPhrase(normalized: string, phrase: string): boolean {
  return normalized === phrase || normalized.startsWith(`${phrase} `) || normalized.endsWith(` ${phrase}`);
}

export function parseYesNo(text: string): 'yes' | 'no' | null {
  const normalized = normalizeSpeech(text);
  if (YES_PHRASES.some((p) => matchesPhrase(normalized, p))) return 'yes';
  if (NO_PHRASES.some((p) => matchesPhrase(normalized, p))) return 'no';
  return null;
}

export function parseVoiceIntent(text: string, step: 'confirmation' | 'other'): VoiceIntent {
  if (step === 'confirmation') {
    return parseYesNo(text) ?? 'unknown';
  }

  const normalized = normalizeSpeech(text);
  if (
    normalized.includes('sarah') &&
    (normalized.includes('50') || normalized.includes('$50')) &&
    (normalized.includes('usdc') || normalized.includes('dinner') || normalized.includes('send'))
  ) {
    return 'send';
  }

  return 'unknown';
}

export function getListeningHint(step: 'confirmation' | 'idle' | 'other'): string {
  if (step === 'confirmation') {
    return 'Say "Yes" or "No"';
  }
  return 'Say "Send Sarah $50 in USDC for dinner."';
}
