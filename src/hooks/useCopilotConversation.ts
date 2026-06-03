import { useCallback, useRef, useState } from 'react';
import type { PortfolioApi } from './usePortfolio';
import type { SendRequest } from '../types/portfolio';
import { formatQuantity, formatUsd, getNetworkFee, parseSendIntent } from '../utils/sendIntent';
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
  requiresApproval?: boolean;
}

export interface ConfirmationDetail {
  contact: string;
  amount: string;
  asset: string;
  equivalent: string;
  networkFee: string;
  remaining: string;
  taxImpact: string;
  memo?: string;
}

function getInitialMessages(username: string): Message[] {
  return [
    {
      id: 'welcome',
      role: 'copilot',
      text: `Hey ${username}. Tell me who to pay and how much — e.g. "Send Sarah $50 in USDC for dinner."`,
    },
  ];
}

export function useCopilotConversation(_isOpen: boolean, portfolio: PortfolioApi, username: string) {
  const [step, setStep] = useState<ConversationStep>('idle');
  const [messages, setMessages] = useState(() => getInitialMessages(username));
  const [isTyping, setIsTyping] = useState(false);
  const [isSimulatingVoice, setIsSimulatingVoice] = useState(false);
  const [simulatedTranscript, setSimulatedTranscript] = useState('');
  const [pendingSend, setPendingSend] = useState<SendRequest | null>(null);
  const stepRef = useRef(step);
  stepRef.current = step;
  const pendingSendRef = useRef(pendingSend);
  pendingSendRef.current = pendingSend;

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

  const handleDecline = useCallback(() => {
    setPendingSend(null);
    addMessage({ role: 'user', text: 'Cancelled' });
    simulateTyping(() => {
      addMessage({ role: 'copilot', text: 'Payment cancelled. Say another amount or contact whenever you\'re ready.' });
      setStep('idle');
    }, 500);
  }, [addMessage, simulateTyping]);

  const handleApprove = useCallback(() => {
    const request = pendingSendRef.current;
    if (!request || stepRef.current !== 'confirmation') return;

    const fee = portfolio.executeSend(request);
    setPendingSend(null);
    setStep('confirmed');

    addMessage({ role: 'user', text: `Approved — send ${formatUsd(request.amountUsd)} ${request.asset} to ${request.contact}` });

    simulateTyping(() => {
      addMessage({
        role: 'copilot',
        text: `Done. ${request.contact} will see ${formatUsd(request.amountUsd)} in ~10 seconds.\n\nNetwork fee: ${formatUsd(fee)}. Receipt saved for TurboTax.`,
      });
      setStep('success');
    }, 900);
  }, [addMessage, portfolio, simulateTyping]);

  const buildConfirmation = useCallback(
    (request: SendRequest) => {
      const fee = getNetworkFee(request.asset);
      const check = portfolio.canSend(request);
      if (!check.ok) {
        addMessage({ role: 'copilot', text: check.reason });
        setStep('idle');
        return;
      }

      const holding = portfolio.getHolding(request.asset)!;
      const remainingQty = check.remaining;
      const taxImpact =
        request.asset === 'USDC'
          ? '$0 (stablecoin, no gain/loss)'
          : 'Estimated — cost basis applied on send';

      setPendingSend(request);
      addMessage({
        role: 'copilot',
        text: 'Review and approve this payment:',
        requiresApproval: true,
        detail: {
          contact: `${request.contact} (your contact)`,
          amount: `${formatUsd(request.amountUsd)} ${request.asset}`,
          equivalent: request.asset === 'USDC' ? '≈ ' + formatUsd(request.amountUsd) : `≈ ${formatQuantity(request.asset, request.amountUsd / holding.priceUsd)}`,
          asset: request.asset,
          networkFee: formatUsd(fee),
          remaining: formatQuantity(request.asset, remainingQty),
          taxImpact,
          memo: request.memo,
        },
      });
      setStep('confirmation');
    },
    [addMessage, portfolio]
  );

  const handleSendIntent = useCallback(
    (text: string, parsed = parseSendIntent(text)) => {
      if (!parsed) return false;

      addMessage({ role: 'user', text });
      setStep('processing');

      simulateTyping(() => {
        buildConfirmation(parsed);
      }, 1200);

      return true;
    },
    [addMessage, buildConfirmation, simulateTyping]
  );

  const processUserInput = useCallback(
    (text: string) => {
      const currentStep = stepRef.current;

      if (currentStep === 'confirmation') {
        addMessage({ role: 'user', text });
        simulateTyping(() => {
          addMessage({
            role: 'copilot',
            text: 'Use the slide control below to approve, or tap Cancel payment.',
          });
        }, 400);
        return;
      }

      if (handleSendIntent(text)) return;

      addMessage({ role: 'user', text });
      simulateTyping(() => {
        addMessage({
          role: 'copilot',
          text: 'Try: "Send Sarah $50 in USDC for dinner" or "Pay John $25 in ETH for tickets."',
        });
        setStep('idle');
      });
    },
    [addMessage, handleSendIntent, simulateTyping]
  );

  const sendUserMessage = useCallback(
    (text: string) => {
      processUserInput(text);
    },
    [processUserInput]
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
            processUserInput(text);
          }, 400);
        }
      }, 180);
    },
    [processUserInput]
  );

  const startListening = useCallback(() => {
    if (isListening || isTyping || stepRef.current === 'confirmation') return;

    const fallbackText = 'Send Sarah $50 in USDC for dinner.';

    const started = speech.startListening(processUserInput, () => {
      simulateVoiceInput(fallbackText);
    });

    if (!started) {
      simulateVoiceInput(fallbackText);
    }
  }, [isListening, isTyping, processUserInput, simulateVoiceInput, speech]);

  const reset = useCallback(() => {
    setStep('idle');
    setMessages(getInitialMessages(username));
    setPendingSend(null);
    setIsSimulatingVoice(false);
    setSimulatedTranscript('');
    setIsTyping(false);
    speech.stopListening();
  }, [speech, username]);

  const liveTranscript = speech.interimTranscript || simulatedTranscript;
  const approvalActive = step === 'confirmation' && pendingSend !== null;

  return {
    step,
    messages,
    isListening,
    isTyping,
    liveTranscript,
    approvalActive,
    sendUserMessage,
    handleApprove,
    handleDecline,
    startListening,
    reset,
  };
}
