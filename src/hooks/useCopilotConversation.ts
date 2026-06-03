import { useCallback, useEffect, useRef, useState } from 'react';
import { getListeningHint, parseVoiceIntent } from '../utils/voiceIntent';
import { useSpeechRecognition } from './useSpeechRecognition';

export type ConversationStep =
  | 'idle'
  | 'user-sent'
  | 'processing'
  | 'confirmation'
  | 'confirmed'
  | 'success';

export interface Message {
  id: string;
  role: 'user' | 'copilot';
  text: string;
  detail?: ConfirmationDetail;
  actions?: { label: string; value: string }[];
}

export interface ConfirmationDetail {
  contact: string;
  amount: string;
  asset: string;
  equivalent: string;
  networkFee: string;
  remaining: string;
  taxImpact: string;
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: 'welcome',
    role: 'copilot',
    text: "Hi! I'm Crypto Copilot. Tell me who to pay and how much — I'll handle the rest.",
  },
];

export function useCopilotConversation(isOpen = false) {
  const [step, setStep] = useState<ConversationStep>('idle');
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [isTyping, setIsTyping] = useState(false);
  const [isSimulatingVoice, setIsSimulatingVoice] = useState(false);
  const [simulatedTranscript, setSimulatedTranscript] = useState('');
  const stepRef = useRef(step);
  stepRef.current = step;
  const confirmationListenRef = useRef(false);
  const startListeningRef = useRef<() => void>(() => {});

  const speech = useSpeechRecognition();
  const isListening = speech.isListening || isSimulatingVoice;

  const addMessage = useCallback((msg: Omit<Message, 'id'>) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setMessages((prev) => [...prev, { ...msg, id }]);
    return id;
  }, []);

  const simulateTyping = useCallback(async (callback: () => void, delay = 1200) => {
    setIsTyping(true);
    await new Promise((r) => setTimeout(r, delay));
    setIsTyping(false);
    callback();
  }, []);

  const handleConfirmation = useCallback(
    (decision: 'yes' | 'no', spokenText?: string) => {
      if (decision === 'yes') {
        setStep('confirmed');
        if (spokenText) {
          addMessage({ role: 'user', text: spokenText });
        } else {
          addMessage({ role: 'user', text: 'Yes' });
        }
        simulateTyping(() => {
          addMessage({
            role: 'copilot',
            text: "Done. Sarah will see it in ~10 seconds.\n\nReceipt saved. I'll auto-categorize this in your TurboTax.",
          });
          setStep('success');
        }, 800);
        return;
      }

      addMessage({ role: 'user', text: spokenText ?? 'No' });
      simulateTyping(() => {
        addMessage({ role: 'copilot', text: 'No problem — send cancelled. Let me know if you want to try again.' });
        setStep('idle');
      });
    },
    [addMessage, simulateTyping]
  );

  const handleSendIntent = useCallback(
    (spokenText?: string) => {
      if (spokenText) {
        addMessage({ role: 'user', text: spokenText });
      } else {
        addMessage({ role: 'user', text: 'Send Sarah $50 in USDC for dinner.' });
      }
      setStep('processing');
      simulateTyping(() => {
        addMessage({
          role: 'copilot',
          text: 'Confirm send?',
          detail: {
            contact: 'Sarah Chen (your contact)',
            amount: '$50.00 USDC',
            equivalent: '≈ $50.00',
            asset: 'USDC',
            networkFee: '$0.12',
            remaining: '$1,247.88',
            taxImpact: '$0 (USDC stablecoin, no gain/loss)',
          },
          actions: [
            { label: 'Yes', value: 'yes' },
            { label: 'No', value: 'no' },
          ],
        });
        setStep('confirmation');
      }, 1500);
    },
    [addMessage, simulateTyping]
  );

  const processVoiceInput = useCallback(
    (text: string) => {
      const currentStep = stepRef.current;
      const intentStep = currentStep === 'confirmation' ? 'confirmation' : 'other';
      const intent = parseVoiceIntent(text, intentStep);

      if (currentStep === 'confirmation') {
        if (intent === 'yes') {
          handleConfirmation('yes', text);
          return;
        }
        if (intent === 'no') {
          handleConfirmation('no', text);
          return;
        }
        addMessage({ role: 'user', text });
        simulateTyping(() => {
          addMessage({
            role: 'copilot',
            text: 'I didn\'t catch that. Say "Yes" to send, or "No" to cancel.',
          });
          setTimeout(() => startListeningRef.current(), 500);
        }, 600);
        return;
      }

      if (intent === 'send') {
        handleSendIntent(text);
        return;
      }

      addMessage({ role: 'user', text });
      simulateTyping(() => {
        addMessage({
          role: 'copilot',
          text: 'Try saying: "Send Sarah $50 in USDC for dinner."',
        });
        setStep('idle');
      });
    },
    [addMessage, handleConfirmation, handleSendIntent, simulateTyping]
  );

  const sendUserMessage = useCallback(
    (text: string) => {
      processVoiceInput(text);
    },
    [processVoiceInput]
  );

  const simulateVoiceInput = useCallback(
    (text: string) => {
      setIsSimulatingVoice(true);
      setSimulatedTranscript('');

      const words = text.split(' ');
      let index = 0;

      const interval = setInterval(() => {
        index += 1;
        setSimulatedTranscript(words.slice(0, index).join(' '));
        if (index >= words.length) {
          clearInterval(interval);
          setTimeout(() => {
            setIsSimulatingVoice(false);
            setSimulatedTranscript('');
            processVoiceInput(text);
          }, 400);
        }
      }, 180);
    },
    [processVoiceInput]
  );

  const startListening = useCallback(() => {
    if (isListening || isTyping) return;

    const currentStep = stepRef.current;
    const fallbackText =
      currentStep === 'confirmation' ? 'Yes' : 'Send Sarah $50 in USDC for dinner.';

    const started = speech.startListening(processVoiceInput, () => {
      simulateVoiceInput(fallbackText);
    });

    if (!started) {
      simulateVoiceInput(fallbackText);
    }
  }, [isListening, isTyping, processVoiceInput, simulateVoiceInput, speech]);

  startListeningRef.current = startListening;

  const handleAction = useCallback(
    (value: string) => {
      if (stepRef.current === 'confirmation') {
        handleConfirmation(value === 'yes' ? 'yes' : 'no');
        return;
      }
      sendUserMessage(value === 'yes' ? 'Yes' : 'No');
    },
    [handleConfirmation, sendUserMessage]
  );

  useEffect(() => {
    if (step !== 'confirmation') {
      confirmationListenRef.current = false;
    }
  }, [step]);

  useEffect(() => {
    if (step === 'confirmation' && isOpen && !isListening && !isTyping && !confirmationListenRef.current) {
      confirmationListenRef.current = true;
      const timer = setTimeout(() => startListening(), 700);
      return () => clearTimeout(timer);
    }
  }, [step, isOpen, isListening, isTyping, startListening]);

  const reset = useCallback(() => {
    setStep('idle');
    setMessages(INITIAL_MESSAGES);
    setIsSimulatingVoice(false);
    setSimulatedTranscript('');
    setIsTyping(false);
    speech.stopListening();
  }, [speech]);

  const listeningHint = getListeningHint(step === 'confirmation' ? 'confirmation' : 'idle');
  const liveTranscript = speech.interimTranscript || simulatedTranscript;

  return {
    step,
    messages,
    isListening,
    isTyping,
    liveTranscript,
    listeningHint,
    sendUserMessage,
    handleAction,
    startListening,
    reset,
  };
}
