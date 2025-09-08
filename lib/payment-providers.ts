// lib/payment-providers.ts - Payment service integration for Saudi Arabia
import { PaymentProvider, PaymentIntent, PaymentResult } from '@/types/payment'

interface MoyasarConfig {
  apiKey: string
  publishableKey: string
  secretKey: string
  baseUrl: string
}

interface TapConfig {
  apiKey: string
  secretKey: string
  publicKey: string
  baseUrl: string
}

// Moyasar Payment Service
export class MoyasarService {
  private config: MoyasarConfig

  constructor(config: MoyasarConfig) {
    this.config = config
  }

  async createPaymentIntent(amount: number, currency: string = 'SAR', metadata: any = {}): Promise<PaymentIntent> {
    try {
      const response = await fetch(`${this.config.baseUrl}/v1/payments`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(this.config.secretKey + ':').toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Math.round(amount * 100), // Moyasar expects amount in halalas
          currency,
          description: metadata.description || 'Certificate Exam Payment',
          callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/moyasar/callback`,
          source: {
            type: 'creditcard'
          },
          metadata
        }),
      })

      if (!response.ok) {
        throw new Error(`Moyasar API error: ${response.status}`)
      }

      const data = await response.json()
      
      return {
        id: data.id,
        amount: data.amount / 100, // Convert back to SAR
        currency: data.currency,
        status: data.status,
        clientSecret: data.id, // Moyasar uses payment ID for client operations
        metadata: data.metadata,
        provider: 'moyasar',
        created: new Date(data.created_at)
      }
    } catch (error) {
      console.error('Moyasar payment creation failed:', error)
      throw error
    }
  }

  async retrievePayment(paymentId: string): Promise<PaymentResult> {
    try {
      const response = await fetch(`${this.config.baseUrl}/v1/payments/${paymentId}`, {
        headers: {
          'Authorization': `Basic ${Buffer.from(this.config.secretKey + ':').toString('base64')}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Moyasar retrieve error: ${response.status}`)
      }

      const data = await response.json()
      
      return {
        id: data.id,
        amount: data.amount / 100,
        currency: data.currency,
        status: this.mapMoyasarStatus(data.status),
        metadata: data.metadata,
        provider: 'moyasar',
        created: new Date(data.created_at),
        updated: new Date(data.updated_at)
      }
    } catch (error) {
      console.error('Moyasar payment retrieval failed:', error)
      throw error
    }
  }

  private mapMoyasarStatus(status: string): 'pending' | 'processing' | 'succeeded' | 'failed' | 'canceled' {
    switch (status) {
      case 'paid': return 'succeeded'
      case 'failed': return 'failed'
      case 'pending': return 'pending'
      case 'authorized': return 'processing'
      case 'captured': return 'succeeded'
      case 'refunded': return 'canceled'
      default: return 'pending'
    }
  }

  generateCheckoutUrl(paymentId: string): string {
    return `${this.config.baseUrl}/v1/payments/${paymentId}/checkout`
  }
}

// Tap Payments Service
export class TapPaymentsService {
  private config: TapConfig

  constructor(config: TapConfig) {
    this.config = config
  }

  async createPaymentIntent(amount: number, currency: string = 'SAR', metadata: any = {}): Promise<PaymentIntent> {
    try {
      const response = await fetch(`${this.config.baseUrl}/v2/charges`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          currency,
          description: metadata.description || 'Certificate Exam Payment',
          statement_descriptor: 'CERT_EXAM',
          reference: {
            transaction: metadata.transactionId || `tx_${Date.now()}`,
            order: metadata.orderId || `order_${Date.now()}`
          },
          receipt: {
            email: false,
            sms: false
          },
          customer: {
            first_name: metadata.customerName?.split(' ')[0] || 'Customer',
            last_name: metadata.customerName?.split(' ').slice(1).join(' ') || '',
            email: metadata.customerEmail
          },
          merchant: {
            id: metadata.merchantId || process.env.TAP_MERCHANT_ID
          },
          source: {
            id: 'src_all'
          },
          redirect: {
            url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/tap/callback`
          },
          metadata
        }),
      })

      if (!response.ok) {
        throw new Error(`Tap Payments API error: ${response.status}`)
      }

      const data = await response.json()
      
      return {
        id: data.id,
        amount: data.amount,
        currency: data.currency,
        status: this.mapTapStatus(data.status),
        clientSecret: data.id,
        metadata: data.metadata,
        provider: 'tap',
        created: new Date(data.created_at || Date.now())
      }
    } catch (error) {
      console.error('Tap Payments creation failed:', error)
      throw error
    }
  }

  async retrievePayment(paymentId: string): Promise<PaymentResult> {
    try {
      const response = await fetch(`${this.config.baseUrl}/v2/charges/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${this.config.secretKey}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Tap Payments retrieve error: ${response.status}`)
      }

      const data = await response.json()
      
      return {
        id: data.id,
        amount: data.amount,
        currency: data.currency,
        status: this.mapTapStatus(data.status),
        metadata: data.metadata,
        provider: 'tap',
        created: new Date(data.created_at),
        updated: new Date(data.updated_at || data.created_at)
      }
    } catch (error) {
      console.error('Tap Payments retrieval failed:', error)
      throw error
    }
  }

  private mapTapStatus(status: string): 'pending' | 'processing' | 'succeeded' | 'failed' | 'canceled' {
    switch (status) {
      case 'CAPTURED': return 'succeeded'
      case 'AUTHORIZED': return 'processing'
      case 'FAILED': return 'failed'
      case 'CANCELLED': return 'canceled'
      case 'PENDING': return 'pending'
      case 'INITIATED': return 'pending'
      default: return 'pending'
    }
  }

  generateCheckoutUrl(paymentId: string): string {
    return `${this.config.baseUrl}/v2/charges/${paymentId}/checkout`
  }
}

// Payment Provider Factory
export class PaymentProviderFactory {
  static createProvider(provider: 'moyasar' | 'tap'): MoyasarService | TapPaymentsService {
    switch (provider) {
      case 'moyasar':
        return new MoyasarService({
          apiKey: process.env.MOYASAR_API_KEY!,
          publishableKey: process.env.MOYASAR_PUBLISHABLE_KEY!,
          secretKey: process.env.MOYASAR_SECRET_KEY!,
          baseUrl: process.env.MOYASAR_BASE_URL || 'https://api.moyasar.com'
        })
      case 'tap':
        return new TapPaymentsService({
          apiKey: process.env.TAP_API_KEY!,
          secretKey: process.env.TAP_SECRET_KEY!,
          publicKey: process.env.TAP_PUBLIC_KEY!,
          baseUrl: process.env.TAP_BASE_URL || 'https://api.tap.company'
        })
      default:
        throw new Error(`Unsupported payment provider: ${provider}`)
    }
  }
}

// Main Payment Service
export class PaymentService {
  private defaultProvider: 'moyasar' | 'tap'

  constructor(defaultProvider: 'moyasar' | 'tap' = 'moyasar') {
    this.defaultProvider = defaultProvider
  }

  async createPayment(
    amount: number,
    courseId: string,
    userId: string,
    provider?: 'moyasar' | 'tap'
  ): Promise<PaymentIntent> {
    const selectedProvider = provider || this.defaultProvider
    const service = PaymentProviderFactory.createProvider(selectedProvider)
    
    const metadata = {
      courseId,
      userId,
      type: 'certificate_exam',
      description: `Certificate Exam Payment for Course ${courseId}`,
      transactionId: `tx_${courseId}_${userId}_${Date.now()}`,
      orderId: `order_${Date.now()}`
    }

    return await service.createPaymentIntent(amount, 'SAR', metadata)
  }

  async retrievePayment(paymentId: string, provider: 'moyasar' | 'tap'): Promise<PaymentResult> {
    const service = PaymentProviderFactory.createProvider(provider)
    return await service.retrievePayment(paymentId)
  }

  async generateCheckoutUrl(paymentId: string, provider: 'moyasar' | 'tap'): Promise<string> {
    const service = PaymentProviderFactory.createProvider(provider)
    return service.generateCheckoutUrl(paymentId)
  }
}