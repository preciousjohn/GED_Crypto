import type { AssetSymbol } from './portfolio';

export type PaymentStatus = 'sent' | 'pending' | 'failed' | 'processing';

export interface PaymentInfo {
  status: PaymentStatus;
  completedAt?: number;
  transactionId?: string;
  deliveryMethod?: string;
  contact?: string;
  amountUsd?: number;
  asset?: AssetSymbol;
}

export interface Message {
  id: string;
  role: 'user' | 'copilot';
  text: string;
  detail?: ConfirmationDetail;
  paymentInfo?: PaymentInfo;
  requiresApproval?: boolean;
  approvalHandled?: boolean;
}

export interface ConfirmationDetail {
  contact: string;
  amount: string;
  asset: string;
  equivalent: string;
  networkFee: string;
  remaining: string;
  memo?: string;
}

export interface ConversationThread {
  id: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  transactionId?: string;
  paymentInfo?: PaymentInfo;
}

export type ConversationStep =
  | 'idle'
  | 'user-sent'
  | 'processing'
  | 'confirmation'
  | 'confirmed'
  | 'success'
  | 'failed'
  | 'pending';
