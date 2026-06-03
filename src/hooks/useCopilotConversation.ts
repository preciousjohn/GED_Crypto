import { useCallback, useEffect, useRef, useState } from 'react';
import type { PortfolioApi } from './usePortfolio';
import type { SendRequest } from '../types/portfolio';
import type {
  ConfirmationDetail,
  ConversationStep,
  ConversationThread,
  Message,
  PaymentInfo,
} from '../types/conversation';
import { formatQuantity, formatUsd, getNetworkFee, parseSendIntent } from '../utils/sendIntent';
import { loadThreads, saveThreads } from '../utils/conversationStorage';
import { formatPaymentTimestamp, PAYMENT_SETTLE_MS, processPayment } from '../utils/paymentProcessor';
import { useSpeechRecognition } from './useSpeechRecognition';

export type { ConfirmationDetail, ConversationStep, Message };

function createMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function createThreadId(): string {
  return `thread-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function getWelcomeMessage(username: string): Message {
  return {
    id: 'welcome',
    role: 'copilot',
    text: `Hey ${username}. Let's send money to someone today. Type or say "Send Sarah $50 in USDC for dinner."`,
  };
}

function makeThread(username: string): ConversationThread {
  const now = Date.now();
  return {
    id: createThreadId(),
    messages: [getWelcomeMessage(username)],
    createdAt: now,
    updatedAt: now,
  };
}

function buildSeedThreads(username: string): ConversationThread[] {
  const now = Date.now();
  return [
    {
      id: 'seed-thread-1',
      createdAt: now - 1000 * 60 * 60 * 26,
      updatedAt: now - 1000 * 60 * 60 * 26,
      transactionId: 'TX-SEED-SARAH-25',
      paymentInfo: {
        status: 'sent',
        completedAt: now - 1000 * 60 * 60 * 26,
        transactionId: 'TX-SEED-SARAH-25',
        deliveryMethod: 'Instant crypto transfer',
        contact: 'Sarah',
        amountUsd: 25,
        asset: 'USDC',
      },
      messages: [
        getWelcomeMessage(username),
        { id: 's1-u1', role: 'user', text: 'Send Sarah $25 in USDC for lunch' },
        {
          id: 's1-c1',
          role: 'copilot',
          text: 'Done. Sarah will see $25.00 in ~10 seconds.\n\nNetwork fee: $0.12.',
          paymentInfo: {
            status: 'sent',
            completedAt: now - 1000 * 60 * 60 * 26,
            transactionId: 'TX-SEED-SARAH-25',
            deliveryMethod: 'Instant crypto transfer',
            contact: 'Sarah',
            amountUsd: 25,
            asset: 'USDC',
          },
        },
      ],
    },
    {
      id: 'seed-thread-2',
      createdAt: now - 1000 * 60 * 60 * 24 * 4,
      updatedAt: now - 1000 * 60 * 60 * 24 * 4,
      transactionId: 'TX-SEED-JOHN-100',
      paymentInfo: {
        status: 'sent',
        completedAt: now - 1000 * 60 * 60 * 24 * 4,
        transactionId: 'TX-SEED-JOHN-100',
        deliveryMethod: 'Instant crypto transfer',
        contact: 'John',
        amountUsd: 100,
        asset: 'USDC',
      },
      messages: [
        getWelcomeMessage(username),
        { id: 's2-u1', role: 'user', text: 'Pay John $100 in USDC' },
        {
          id: 's2-c1',
          role: 'copilot',
          text: 'Done. John will see $100.00 in ~10 seconds.\n\nNetwork fee: $0.12.',
          paymentInfo: {
            status: 'sent',
            completedAt: now - 1000 * 60 * 60 * 24 * 4,
            transactionId: 'TX-SEED-JOHN-100',
            deliveryMethod: 'Instant crypto transfer',
            contact: 'John',
            amountUsd: 100,
            asset: 'USDC',
          },
        },
      ],
    },
    {
      id: 'seed-thread-3',
      createdAt: now - 1000 * 60 * 60 * 2,
      updatedAt: now - 1000 * 60 * 60 * 2,
      transactionId: 'TX-SEED-MIKE-75-FAIL',
      paymentInfo: {
        status: 'failed',
        transactionId: 'TX-SEED-MIKE-75-FAIL',
        deliveryMethod: 'Instant crypto transfer',
        contact: 'Mike',
        amountUsd: 75,
        asset: 'USDC',
      },
      messages: [
        getWelcomeMessage(username),
        { id: 's3-u1', role: 'user', text: 'Send Mike $75 in USDC for rent' },
        {
          id: 's3-c1',
          role: 'copilot',
          text: 'Network error during payment processing. Please try again.',
          paymentInfo: {
            status: 'failed',
            transactionId: 'TX-SEED-MIKE-75-FAIL',
            deliveryMethod: 'Instant crypto transfer',
            contact: 'Mike',
            amountUsd: 75,
            asset: 'USDC',
          },
        },
      ],
    },
    {
      id: 'seed-thread-4',
      createdAt: now - 1000 * 60 * 3,
      updatedAt: now - 1000 * 60 * 3,
      transactionId: 'TX-SEED-ALEX-40',
      paymentInfo: {
        status: 'pending',
        transactionId: 'TX-SEED-ALEX-40',
        deliveryMethod: 'Instant crypto transfer',
        contact: 'Alex',
        amountUsd: 40,
        asset: 'USDC',
      },
      messages: [
        getWelcomeMessage(username),
        { id: 's4-u1', role: 'user', text: 'Pay Alex $40 in USDC for tickets' },
        {
          id: 's4-c1',
          role: 'copilot',
          text: 'Payment submitted. Alex should receive $40.00 shortly.\n\nNetwork fee: $0.12. Status will update when delivery completes.',
          paymentInfo: {
            status: 'pending',
            transactionId: 'TX-SEED-ALEX-40',
            deliveryMethod: 'Instant crypto transfer',
            contact: 'Alex',
            amountUsd: 40,
            asset: 'USDC',
          },
        },
      ],
    },
  ];
}

function initThreads(username: string): ConversationThread[] {
  const stored = loadThreads();
  const seeds = buildSeedThreads(username);

  if (stored.length === 0) {
    saveThreads(seeds);
    return seeds;
  }

  const missingSeeds = seeds.filter((s) => !stored.some((t) => t.id === s.id));
  if (missingSeeds.length > 0) {
    const merged = [...missingSeeds, ...stored];
    saveThreads(merged);
    return merged;
  }

  return stored;
}

const FOLLOW_UP_PATTERNS: { pattern: RegExp; action: string }[] = [
  { pattern: /\b(send|email|get)\b.*\breceipt\b/i, action: 'receipt' },
  { pattern: /\b(show|view|see)\b.*\b(payment\s+)?details\b/i, action: 'details' },
  { pattern: /\bresend\b.*\bconfirmation\b/i, action: 'resend' },
  { pattern: /\b(view|check|show)\b.*\b(transaction\s+)?status\b/i, action: 'status' },
];

export function useCopilotConversation(_isOpen: boolean, portfolio: PortfolioApi, username: string) {
  const [threads, setThreads] = useState<ConversationThread[]>(() => initThreads(username));
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [step, setStep] = useState<ConversationStep>('idle');
  const [isTyping, setIsTyping] = useState(false);
  const [isSimulatingVoice, setIsSimulatingVoice] = useState(false);
  const [simulatedTranscript, setSimulatedTranscript] = useState('');
  const [pendingSend, setPendingSend] = useState<SendRequest | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const stepRef = useRef(step);
  stepRef.current = step;
  const pendingSendRef = useRef(pendingSend);
  pendingSendRef.current = pendingSend;
  const isProcessingRef = useRef(false);
  const paymentAbortRef = useRef<AbortController | null>(null);
  const settleTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const activeThreadIdRef = useRef(activeThreadId);
  activeThreadIdRef.current = activeThreadId;

  const speech = useSpeechRecognition();
  const isListening = speech.isListening || isSimulatingVoice;

  const activeThread = threads.find((t) => t.id === activeThreadId) ?? null;
  const messages = activeThread?.messages ?? [];

  const updateActiveThread = useCallback(
    (updater: (thread: ConversationThread) => ConversationThread) => {
      const id = activeThreadIdRef.current;
      if (!id) return;

      setThreads((prev) => {
        const next = prev.map((t) => (t.id === id ? updater({ ...t, updatedAt: Date.now() }) : t));
        saveThreads(next);
        return next;
      });
    },
    []
  );

  const addMessage = useCallback(
    (msg: Omit<Message, 'id'>) => {
      const id = createMessageId();
      updateActiveThread((thread) => ({
        ...thread,
        messages: [...thread.messages, { ...msg, id }],
      }));
      return id;
    },
    [updateActiveThread]
  );

  const markApprovalHandled = useCallback(() => {
    updateActiveThread((thread) => ({
      ...thread,
      messages: thread.messages.map((m) =>
        m.requiresApproval ? { ...m, requiresApproval: false, approvalHandled: true } : m
      ),
    }));
  }, [updateActiveThread]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      const timers = settleTimersRef.current;
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const settlePayment = useCallback(
    (transactionId: string, threadId: string) => {
      const completedAt = Date.now();
      portfolio.updateTransactionStatus(transactionId, 'sent');

      setThreads((prev) => {
        const next = prev.map((t) => {
          if (t.id !== threadId) return t;
          const paymentInfo = t.paymentInfo
            ? { ...t.paymentInfo, status: 'sent' as const, completedAt }
            : t.paymentInfo;
          const messages = t.messages.map((m) =>
            m.paymentInfo?.transactionId === transactionId
              ? {
                  ...m,
                  paymentInfo: m.paymentInfo
                    ? { ...m.paymentInfo, status: 'sent' as const, completedAt }
                    : m.paymentInfo,
                }
              : m
          );
          return { ...t, paymentInfo, messages, updatedAt: Date.now() };
        });
        saveThreads(next);
        return next;
      });

      if (activeThreadIdRef.current === threadId) {
        setStep('success');
      }

      settleTimersRef.current.delete(transactionId);
    },
    [portfolio]
  );

  const scheduleSettlement = useCallback(
    (transactionId: string, threadId: string) => {
      const existing = settleTimersRef.current.get(transactionId);
      if (existing) clearTimeout(existing);

      const timer = setTimeout(() => {
        settlePayment(transactionId, threadId);
      }, PAYMENT_SETTLE_MS);

      settleTimersRef.current.set(transactionId, timer);
    },
    [settlePayment]
  );

  const simulateTyping = useCallback(async (callback: () => void, delay = 1200) => {
    setIsTyping(true);
    await new Promise((r) => setTimeout(r, delay));
    setIsTyping(false);
    callback();
  }, []);

  const createNewThread = useCallback(() => {
    paymentAbortRef.current?.abort();
    paymentAbortRef.current = null;
    isProcessingRef.current = false;
    setIsProcessingPayment(false);
    setPendingSend(null);
    setPaymentError(null);
    setStep('idle');

    const thread = makeThread(username);
    setThreads((prev) => {
      const next = [thread, ...prev];
      saveThreads(next);
      return next;
    });
    setActiveThreadId(thread.id);
  }, [username]);

  const openThread = useCallback(
    (threadId: string) => {
      paymentAbortRef.current?.abort();
      paymentAbortRef.current = null;
      isProcessingRef.current = false;
      setIsProcessingPayment(false);
      setPendingSend(null);
      setPaymentError(null);

      const thread = threads.find((t) => t.id === threadId);
      if (!thread) return;

      setActiveThreadId(threadId);
      const lastMsg = thread.messages[thread.messages.length - 1];
      const status = thread.paymentInfo?.status ?? lastMsg?.paymentInfo?.status;
      if (status === 'sent') {
        setStep('success');
      } else if (status === 'failed') {
        setStep('failed');
      } else if (status === 'pending' || status === 'processing') {
        setStep('pending');
      } else {
        setStep('idle');
      }
    },
    [threads]
  );

  const handleDecline = useCallback(() => {
    if (isProcessingRef.current) return;
    setPendingSend(null);
    markApprovalHandled();
    addMessage({ role: 'user', text: 'Cancelled' });
    simulateTyping(() => {
      addMessage({
        role: 'copilot',
        text: "Payment cancelled. Say another amount or contact whenever you're ready.",
      });
      setStep('idle');
    }, 500);
  }, [addMessage, markApprovalHandled, simulateTyping]);

  const completePayment = useCallback(
    (request: SendRequest, paymentInfo: PaymentInfo) => {
      const threadId = activeThreadIdRef.current;
      const transactionId = paymentInfo.transactionId!;

      portfolio.executeSend(request, {
        transactionId,
        deliveryMethod: paymentInfo.deliveryMethod!,
        conversationId: threadId ?? undefined,
        status: paymentInfo.status,
      });

      updateActiveThread((thread) => ({
        ...thread,
        transactionId,
        paymentInfo,
      }));

      if (paymentInfo.status === 'pending' && threadId) {
        scheduleSettlement(transactionId, threadId);
      }

      markApprovalHandled();
      addMessage({
        role: 'user',
        text: `Send ${formatUsd(request.amountUsd)} ${request.asset} to ${request.contact}`,
      });

      const fee = getNetworkFee(request.asset);
      const copilotText =
        paymentInfo.status === 'pending'
          ? `Payment submitted. ${request.contact} should receive ${formatUsd(request.amountUsd)} shortly.\n\nNetwork fee: ${formatUsd(fee)}. Status will update when delivery completes.`
          : `Done. ${request.contact} will see ${formatUsd(request.amountUsd)} in ~10 seconds.\n\nNetwork fee: ${formatUsd(fee)}.`;

      simulateTyping(() => {
        addMessage({
          role: 'copilot',
          text: copilotText,
          paymentInfo,
        });
        setStep(paymentInfo.status === 'pending' ? 'pending' : 'success');
      }, 900);
    },
    [addMessage, markApprovalHandled, portfolio, scheduleSettlement, simulateTyping, updateActiveThread]
  );

  const handleApprove = useCallback(async () => {
    const request = pendingSendRef.current;
    if (!request || isProcessingRef.current) return;

    if (!navigator.onLine) {
      setPaymentError('You appear to be offline. Reconnect to send this payment.');
      return;
    }

    isProcessingRef.current = true;
    setIsProcessingPayment(true);
    setPaymentError(null);
    setStep('confirmed');

    const abortController = new AbortController();
    paymentAbortRef.current = abortController;

    const result = await processPayment(request, getNetworkFee, abortController.signal);

    if (abortController.signal.aborted) {
      isProcessingRef.current = false;
      setIsProcessingPayment(false);
      return;
    }

    isProcessingRef.current = false;
    setIsProcessingPayment(false);
    paymentAbortRef.current = null;

    if (!result.ok) {
      setPendingSend(request);
      setPaymentError(result.message);
      markApprovalHandled();

      const failedInfo: PaymentInfo = {
        status: 'failed',
        contact: request.contact,
        amountUsd: request.amountUsd,
        asset: request.asset,
        transactionId: 'partialTransactionId' in result ? result.partialTransactionId : undefined,
      };

      updateActiveThread((thread) => ({
        ...thread,
        paymentInfo: failedInfo,
      }));

      addMessage({
        role: 'copilot',
        text: result.message,
        paymentInfo: failedInfo,
      });
      setStep('failed');
      return;
    }

    setPendingSend(null);

    const paymentInfo: PaymentInfo = {
      status: 'pending',
      transactionId: result.transactionId,
      deliveryMethod: result.deliveryMethod,
      contact: request.contact,
      amountUsd: request.amountUsd,
      asset: request.asset,
    };

    completePayment(request, paymentInfo);
  }, [addMessage, completePayment, markApprovalHandled, updateActiveThread]);

  const handleRetryPayment = useCallback(() => {
    const request = pendingSendRef.current;
    if (!request) {
      const thread = threads.find((t) => t.id === activeThreadIdRef.current);
      const info = thread?.paymentInfo;
      if (info?.contact && info.amountUsd && info.asset) {
        const retryRequest: SendRequest = {
          contact: info.contact,
          amountUsd: info.amountUsd,
          asset: info.asset,
        };
        pendingSendRef.current = retryRequest;
        setPendingSend(retryRequest);
        setStep('confirmation');
        setPaymentError(null);
        addMessage({
          role: 'copilot',
          text: 'Ready to retry. Review and send this payment:',
          requiresApproval: true,
          detail: buildConfirmationDetail(
            { contact: info.contact, amountUsd: info.amountUsd, asset: info.asset },
            portfolio
          ),
        });
      }
      return;
    }
    setPaymentError(null);
    setStep('confirmation');
    void handleApprove();
  }, [addMessage, handleApprove, portfolio, threads]);

  function buildConfirmationDetail(request: SendRequest, pf: PortfolioApi): ConfirmationDetail {
    const fee = getNetworkFee(request.asset);
    const holding = pf.getHolding(request.asset)!;
    const check = pf.canSend(request);
    const remainingQty = check.ok ? check.remaining : holding.quantity;

    return {
      contact: `${request.contact} (your contact)`,
      amount: `${formatUsd(request.amountUsd)} ${request.asset}`,
      equivalent:
        request.asset === 'USDC'
          ? '≈ ' + formatUsd(request.amountUsd)
          : `≈ ${formatQuantity(request.asset, request.amountUsd / holding.priceUsd)}`,
      asset: request.asset,
      networkFee: formatUsd(fee),
      remaining: formatQuantity(request.asset, remainingQty),
      memo: request.memo,
    };
  }

  const buildConfirmation = useCallback(
    (request: SendRequest) => {
      const check = portfolio.canSend(request);
      if (!check.ok) {
        addMessage({ role: 'copilot', text: check.reason });
        setStep('idle');
        return;
      }

      setPendingSend(request);
      setPaymentError(null);
      addMessage({
        role: 'copilot',
        text: 'Review and send this payment:',
        requiresApproval: true,
        detail: buildConfirmationDetail(request, portfolio),
      });
      setStep('confirmation');
    },
    [addMessage, portfolio]
  );

  const handleFollowUp = useCallback(
    (action: string, thread: ConversationThread) => {
      const info = thread.paymentInfo ?? thread.messages.find((m) => m.paymentInfo)?.paymentInfo;
      if (!info) {
        simulateTyping(() => {
          addMessage({
            role: 'copilot',
            text: "I don't have payment details for this conversation yet. Complete a payment first, or pick a transaction from history.",
          });
        });
        return;
      }

      switch (action) {
        case 'receipt':
          simulateTyping(() => {
            if (Math.random() < 0.05) {
              addMessage({
                role: 'copilot',
                text: "Couldn't deliver your receipt right now. Tap \"Send my receipt\" to try again, or check your email in a few minutes.",
              });
            } else {
              addMessage({
                role: 'copilot',
                text: `Receipt sent for ${formatUsd(info.amountUsd ?? 0)} ${info.asset} to ${info.contact}. Check your email or download from Transaction History.`,
              });
            }
          });
          break;
        case 'details':
          simulateTyping(() => {
            addMessage({
              role: 'copilot',
              text: `Payment details:`,
              paymentInfo: info,
            });
          });
          break;
        case 'resend':
          simulateTyping(() => {
            addMessage({
              role: 'copilot',
              text: `Confirmation resent to ${info.contact} for ${formatUsd(info.amountUsd ?? 0)} ${info.asset}. They should receive it shortly.`,
            });
          });
          break;
        case 'status':
          simulateTyping(() => {
            const tx = portfolio.getTransaction(thread.transactionId ?? thread.id);
            const status = tx?.status ?? info.status;
            const refreshed: PaymentInfo = { ...info, status };
            addMessage({
              role: 'copilot',
              text:
                status === 'pending' || status === 'processing'
                  ? "Still processing — I'll refresh automatically when it completes."
                  : `Current status for this payment:`,
              paymentInfo: refreshed,
            });
            if (status === 'pending' || status === 'processing') {
              setTimeout(() => {
                portfolio.updateTransactionStatus(tx?.id ?? thread.transactionId ?? '', 'sent');
                updateActiveThread((t) => ({
                  ...t,
                  paymentInfo: t.paymentInfo ? { ...t.paymentInfo, status: 'sent', completedAt: Date.now() } : t.paymentInfo,
                }));
              }, 3000);
            }
          });
          break;
      }
    },
    [addMessage, portfolio, simulateTyping, updateActiveThread]
  );

  const handleSendIntent = useCallback(
    (text: string, parsed = parseSendIntent(text)) => {
      if (!parsed) return false;
      if (isProcessingRef.current) {
        addMessage({ role: 'copilot', text: 'A payment is already in progress. Please wait for it to finish.' });
        return true;
      }

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
      const thread = threads.find((t) => t.id === activeThreadIdRef.current);

      for (const { pattern, action } of FOLLOW_UP_PATTERNS) {
        if (pattern.test(text) && thread) {
          addMessage({ role: 'user', text });
          handleFollowUp(action, thread);
          return;
        }
      }

      if (currentStep === 'confirmation' || isProcessingRef.current) {
        addMessage({ role: 'user', text });
        simulateTyping(() => {
          addMessage({
            role: 'copilot',
            text: isProcessingRef.current
              ? 'Payment is processing — hang tight.'
              : 'Use the Send Payment button below to confirm, or tap Cancel payment.',
          });
        }, 400);
        return;
      }

      if (handleSendIntent(text)) return;

      addMessage({ role: 'user', text });
      simulateTyping(() => {
        addMessage({
          role: 'copilot',
          text: 'Try: "Send Sarah $50 in USDC for dinner" or ask "Show payment details" / "Send my receipt" for a past payment.',
        });
        setStep('idle');
      });
    },
    [addMessage, handleFollowUp, handleSendIntent, simulateTyping, threads]
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
    if (isListening || isTyping || stepRef.current === 'confirmation' || isProcessingRef.current) return;

    const fallbackText = 'Send Sarah $50 in USDC for dinner.';

    const started = speech.startListening(processUserInput, () => {
      simulateVoiceInput(fallbackText);
    });

    if (!started) {
      simulateVoiceInput(fallbackText);
    }
  }, [isListening, isTyping, processUserInput, simulateVoiceInput, speech]);

  const paymentThreads = useMemoizedPaymentThreads(threads);

  const liveTranscript = speech.interimTranscript || simulatedTranscript;
  const approvalActive = step === 'confirmation' && pendingSend !== null && !isProcessingPayment;

  return {
    step,
    messages,
    threads,
    paymentThreads,
    activeThreadId,
    isListening,
    isTyping,
    isProcessingPayment,
    isOnline,
    paymentError,
    liveTranscript,
    approvalActive,
    sendUserMessage,
    handleApprove,
    handleDecline,
    handleRetryPayment,
    startListening,
    createNewThread,
    openThread,
  };
}

function useMemoizedPaymentThreads(threads: ConversationThread[]): ConversationThread[] {
  return threads
    .filter((t) => t.paymentInfo || t.transactionId)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export { formatPaymentTimestamp };
