import { useCallback, useRef, useState } from 'react';

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionEvent = {
  results: SpeechRecognitionResultList;
};

type SpeechRecognitionResultList = {
  length: number;
  [index: number]: SpeechRecognitionResult;
};

type SpeechRecognitionResult = {
  isFinal: boolean;
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

export function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
    setInterimTranscript('');
  }, []);

  const startListening = useCallback(
    (onResult: (text: string) => void, onUnavailable?: () => void): boolean => {
      const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognitionCtor) {
        onUnavailable?.();
        return false;
      }

      recognitionRef.current?.abort();

      const recognition = new SpeechRecognitionCtor();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setInterimTranscript('');
      };

      recognition.onresult = (event) => {
        const results = Array.from({ length: event.results.length }, (_, i) => event.results[i]);
        const text = results.map((r) => r[0].transcript).join('');
        setInterimTranscript(text);

        const last = results[results.length - 1];
        if (last?.isFinal) {
          onResult(text.trim());
          setIsListening(false);
          setInterimTranscript('');
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
        setInterimTranscript('');
        onUnavailable?.();
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
      return true;
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
