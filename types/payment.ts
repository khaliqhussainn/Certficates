// types/payment.ts - Payment-related TypeScript interfaces
export interface PaymentIntent {
  id: string
  amount: number
  currency: string
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'canceled'
  clientSecret: string
  metadata: Record<string, any>
  provider: 'moyasar' | 'tap'
  created: Date
}

export interface PaymentResult {
  id: string
  amount: number
  currency: string
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'canceled'
  metadata: Record<string, any>
  provider: 'moyasar' | 'tap'
  created: Date
  updated: Date
}

export interface PaymentProvider {
  createPaymentIntent(amount: number, currency: string, metadata: any): Promise<PaymentIntent>
  retrievePayment(paymentId: string): Promise<PaymentResult>
  generateCheckoutUrl(paymentId: string): string
}

export interface CreatePaymentRequest {
  courseId: string
  provider?: 'moyasar' | 'tap'
  returnUrl?: string
}

export interface PaymentCallback {
  paymentId: string
  status: string
  provider: 'moyasar' | 'tap'
  metadata?: Record<string, any>
}

// Moyasar specific types
export interface MoyasarPayment {
  id: string
  status: string
  amount: number
  currency: string
  description: string
  amount_format: string
  fee: number
  fee_format: string
  refunded: number
  refunded_format: string
  captured: number
  captured_format: string
  invoice_id: string
  ip: string
  callback_url: string
  created_at: string
  updated_at: string
  metadata: Record<string, any>
  source: {
    type: string
    company: string
    name: string
    number: string
    gateway_id: string
    reference_number: string
    token: string
    message: string
    transaction_url: string
  }
}

// Tap Payments specific types
export interface TapPayment {
  id: string
  object: string
  live_mode: boolean
  api_version: string
  method: string
  status: string
  amount: number
  currency: string
  description: string
  statement_descriptor: string
  reference: {
    acquirer: string
    gateway: string
    payment: string
    track: string
    transaction: string
    order: string
  }
  response: {
    code: string
    message: string
  }
  receipt: {
    id: string
    email: boolean
    sms: boolean
  }
  customer: {
    id: string
    first_name: string
    last_name: string
    email: string
    phone: {
      country_code: string
      number: string
    }
  }
  merchant: {
    id: string
  }
  transaction: {
    timezone: string
    created: string
    url: string
    expiry: {
      period: number
      type: string
    }
    asynchronous: boolean
    amount: number
    currency: string
  }
  redirect: {
    status: string
    url: string
  }
  post: {
    status: string
    url: string
  }
  source: {
    id: string
    object: string
    type: string
    payment_method: string
    payment_type: string
    channel: string
  }
  activities: Array<{
    id: string
    object: string
    created: number
    status: string
    currency: string
    amount: number
    remarks: string
  }>
  auto: {
    type: string
    time: number
  }
  card: {
    id: string
    object: string
    first_six: string
    last_four: string
    brand: string
    exp_month: number
    exp_year: number
    scheme: string
    category: string
    address: any
    fingerprint: string
    funding: string
  }
  acquirer: {
    id: string
    response: {
      code: string
      message: string
    }
  }
  gateway: {
    id: string
    response: {
      code: string
      message: string
    }
  }
  created: number
  metadata: Record<string, any>
}

// Database payment model interface
export interface DbPayment {
  id: string
  userId: string
  courseId: string
  amount: number
  currency: string
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'CANCELLED'
  provider: string
  providerPaymentId: string
  providerTransactionId?: string
  metadata?: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

// Payment status mapping
export const PAYMENT_STATUS_MAP = {
  // Moyasar statuses
  paid: 'COMPLETED',
  failed: 'FAILED',
  pending: 'PENDING',
  authorized: 'PROCESSING',
  captured: 'COMPLETED',
  refunded: 'REFUNDED',
  
  // Tap Payments statuses
  CAPTURED: 'COMPLETED',
  AUTHORIZED: 'PROCESSING',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
  PENDING: 'PENDING',
  INITIATED: 'PENDING',
  
  // Generic statuses
  succeeded: 'COMPLETED',
  processing: 'PROCESSING',
  canceled: 'CANCELLED'
} as const

export type PaymentStatusKey = keyof typeof PAYMENT_STATUS_MAP
export type PaymentStatusValue = typeof PAYMENT_STATUS_MAP[PaymentStatusKey]