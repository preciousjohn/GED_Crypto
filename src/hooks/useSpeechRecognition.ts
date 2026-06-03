import { useCallback, useRef, useState } from 'react';

export type VoiceInputError =
  | 'unsupported'
  | 'permission-denied'
  | 'no-speech'
  | 'network'
  | 'aborted'
  | 'start-failed'
  | 'unknown';

export interface VoiceInputErrorInfo {
  code: VoiceInputError;
  message: string;
}

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionEvent = {
  resultIndex: number;
  results: SpeechRecognitionResultList;
};

type SpeechRecognitionErrorEvent = {
  error: string;
  message?: string;
};

type SpeechRecognitionResultList = {
  length: number;
  [index: number]: SpeechRecognitionResult;
};

type SpeechRecognitionResult = {
  isFinal: boolean;
  length: number;
  [index: number]: { transcript: string };
};

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

export function isSpeechRecognitionSupported(): boolean {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function getVoiceInputErrorMessage(code: VoiceInputError): string {
  switch (code) {
    case 'unsupported':
      return 'Voice input is not supported in this browser. Try Chrome or Safari, or type your request.';
    case 'permission-denied':
      return 'Microphone access was denied. Allow microphone permission in your browser settings and try again.';
    case 'no-speech':
      return "I didn't catch that. Tap the mic and speak again.";
    case 'network':
      return 'Voice input needs a network connection. Check your connection and try again.';
    case 'aborted':
      return '';
    case 'start-failed':
      return 'Could not start the microphone. Try again or type your request.';
    default:
      return 'Voice input failed. Try again or type your request.';
  }
}

function mapRecognitionError(error: string): VoiceInputError {
  switch (error) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'permission-denied';
    case 'no-speech':
      return 'no-speech';
    case 'network':
      return 'network';
    case 'aborted':
      return 'aborted';
    default:
      return 'unknown';
  }
}

async function ensureMicrophonePermission(): Promise<'granted' | 'denied' | 'unsupported'> {
  if (!navigator.mediaDevices?.getUserMedia) {
    return isSpeechRecognitionSupported() ? 'granted' : 'unsupported';
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    return 'granted';
  } catch (err) {
    const name = err instanceof DOMException ? err.name : '';
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      return 'denied';
    }
    return 'denied';
  }
}

export interface StartListeningOptions {
  onResult: (text: string) => void;
  onError?: (error: VoiceInputErrorInfo) => void;
}

export function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const transcriptRef = useRef('');
  const deliveredRef = useRef(false);

  const stopListening = useCallback(() => {
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    setIsListening(false);
    setInterimTranscript('');
    transcriptRef.current = '';
    deliveredRef.current = false;
  }, []);

  const startListening = useCallback(
    async ({ onResult, onError }: StartListeningOptions): Promise<boolean> => {
      const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognitionCtor) {
        onError?.({
          code: 'unsupported',
          message: getVoiceInputErrorMessage('unsupported'),
        });
        return false;
      }

      const permission = await ensureMicrophonePermission();
      if (permission === 'denied') {
        onError?.({
          code: 'permission-denied',
          message: getVoiceInputErrorMessage('permission-denied'),
        });
        return false;
      }

      recognitionRef.current?.abort();
      deliveredRef.current = false;
      transcriptRef.current = '';

      const recognition = new SpeechRecognitionCtor();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setInterimTranscript('');
      };

      recognition.onresult = (event) => {
        let interim = '';
        let finalText = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const chunk = result[0]?.transcript ?? '';
          if (result.isFinal) {
            finalText += chunk;
          } else {
            interim += chunk;
          }
        }

        const combined = (transcriptRef.current + finalText + interim).trim();
        if (finalText) {
          transcriptRef.current = (transcriptRef.current + finalText).trim();
        }
        setInterimTranscript(combined);

        if (finalText.trim() && !deliveredRef.current) {
          deliveredRef.current = true;
          const text = (transcriptRef.current || finalText).trim();
          onResult(text);
          setIsListening(false);
          setInterimTranscript('');
          transcriptRef.current = '';
        }
      };

      recognition.onerror = (event) => {
        const code = mapRecognitionError(event.error);
        setIsListening(false);
        setInterimTranscript('');

        if (code !== 'aborted' && code !== 'no-speech') {
          onError?.({ code, message: getVoiceInputErrorMessage(code) });
        } else if (code === 'no-speech') {
          onError?.({ code, message: getVoiceInputErrorMessage('no-speech') });
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript('');

        const leftover = transcriptRef.current.trim();
        if (leftover && !deliveredRef.current) {
          deliveredRef.current = true;
          onResult(leftover);
        }

        transcriptRef.current = '';
        recognitionRef.current = null;
      };

      recognitionRef.current = recognition;

      try {
        recognition.start();
        return true;
      } catch {
        recognitionRef.current = null;
        onError?.({
          code: 'start-failed',
          message: getVoiceInputErrorMessage('start-failed'),
        });
        return false;
      }
    },
    []
  );

  return {
    isListening,
    interimTranscript,
    startListening,
    stopListening,
    isSupported: isSpeechRecognitionSupported(),
  };
}
