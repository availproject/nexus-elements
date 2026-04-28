/**
 * Meld sandbox configuration and types for fiat on-ramp POC.
 */

export const MELD_CONFIG = {
  baseUrl: "/api/meld",
  quoteRefreshIntervalMs: 30_000,
  statusPollIntervalMs: 10_000,
  providerPopupWidth: 450,
  providerPopupHeight: 700,
} as const;

/**
 * Map EVM chainId → Meld network suffix.
 * Meld encodes the network into destinationCurrencyCode, e.g. "USDC_BASE".
 * Native tokens (ETH, MATIC, etc.) don't need a suffix on their home chain.
 */
export const CHAIN_ID_TO_MELD_NETWORK: Record<number, string> = {
  1: "ETH",           // Ethereum
  8453: "BASE",        // Base
  42161: "ARBITRUM",   // Arbitrum One
  10: "OPTIMISM",      // Optimism
  137: "POLYGON",      // Polygon
  43114: "AVAX",       // Avalanche
  56: "BSC",           // BNB Smart Chain
};

/** Human-readable chain names for display in buy-crypto screens. */
export const CHAIN_ID_TO_NAME: Record<number, string> = {
  1: "Ethereum",
  8453: "Base",
  42161: "Arbitrum",
  10: "Optimism",
  137: "Polygon",
  43114: "Avalanche",
  56: "BNB Chain",
};

/**
 * Build the Meld `destinationCurrencyCode` for a token on a specific chain.
 * e.g. ("USDC", 8453) → "USDC_BASE", ("ETH", 1) → "ETH"
 */
export function getMeldCurrencyCode(tokenSymbol: string, chainId: number): string {
  const network = CHAIN_ID_TO_MELD_NETWORK[chainId];
  if (!network) return tokenSymbol;
  // Native tokens on their home chain don't need a suffix
  const nativeOnHome =
    (tokenSymbol === "ETH" && chainId === 1) ||
    (tokenSymbol === "MATIC" && chainId === 137) ||
    (tokenSymbol === "AVAX" && chainId === 43114) ||
    (tokenSymbol === "BNB" && chainId === 56);
  if (nativeOnHome) return tokenSymbol;
  return `${tokenSymbol}_${network}`;
}

// --- API Request Types ---

export interface MeldQuoteRequest {
  sourceAmount: number;
  sourceCurrencyCode: string;
  destinationCurrencyCode: string;
  countryCode: string;
  paymentMethodType?: string;
}

export interface MeldSessionData {
  sourceAmount: string;
  sourceCurrencyCode: string;
  destinationCurrencyCode: string;
  walletAddress: string;
  countryCode: string;
  serviceProvider: string;
  paymentMethodType?: string;
  redirectUrl?: string;
  refundWalletAddress?: string;
  walletTag?: string;
  clientIpAddress?: string;
  lockFields?: string[];
}

export interface MeldSessionRequest {
  sessionType: "BUY" | "SELL" | "TRANSFER";
  sessionData: MeldSessionData;
  externalCustomerId?: string;
  externalSessionId?: string;
  bypassKyc?: boolean;
  customerId?: string;
}

// --- API Response Types ---

export interface MeldQuote {
  serviceProvider: string;
  serviceProviderName: string;
  rampScore: number;
  sourceAmount: number;
  sourceCurrencyCode: string;
  destinationAmount: number;
  destinationAmountWithoutFees: number;
  destinationCurrencyCode: string;
  exchangeRate: number;
  totalFee: number;
  networkFee: number;
  transactionFee: number;
  estimatedSettlementSeconds: number;
  paymentMethodType: string;
}

export interface MeldQuoteResponse {
  quotes: MeldQuote[];
  message?: string;
  error?: string;
}

export interface MeldSessionResponse {
  id: string;
  serviceProviderWidgetUrl: string;
  widgetUrl: string;
  token: string;
  externalSessionId?: string;
}

export type MeldTransactionStatus =
  | "INITIATED"
  | "PENDING"
  | "SETTLING"
  | "SETTLED"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export interface MeldTransaction {
  id: string;
  status: MeldTransactionStatus;
  sourceAmount: number;
  sourceCurrencyCode: string;
  destinationAmount: number;
  destinationCurrencyCode: string;
  serviceProvider: string;
  walletAddress: string;
  transactionHash?: string;
  externalCustomerId?: string;
  externalSessionId?: string;
}

// --- Service Provider Types ---

export interface MeldCountryDefaults {
  countryCode: string;
  defaultCurrencyCode: string;
  defaultPaymentMethods: string[];
}

export interface MeldFiatCurrency {
  currencyCode: string;
  currencyName: string;
  symbolImageUrl?: string;
}

export interface MeldPaymentMethod {
  paymentMethod: string;
  paymentMethodName: string;
  logos?: string[];
}

export interface MeldCryptoCurrency {
  currencyCode: string;
  currencyName: string;
  networkCode: string;
  networkName: string;
}

export interface MeldPurchaseLimits {
  minSourceAmount: number;
  maxSourceAmount: number;
}

// --- Meld state for widget ---

export interface MeldState {
  quote: MeldQuote | null;
  allQuotes: MeldQuote[];
  sessionId: string | null;
  transactionId: string | null;
  providerWidgetUrl: string | null;
  transaction: MeldTransaction | null;
  isLoadingQuote: boolean;
  isLoadingSession: boolean;
  error: string | null;
  // Service provider data
  fiatCurrencies: MeldFiatCurrency[];
  paymentMethods: MeldPaymentMethod[];
  countryDefaults: MeldCountryDefaults | null;
  limits: MeldPurchaseLimits | null;
  selectedCurrency: string;
  selectedPaymentMethod: string;
  isLoadingConfig: boolean;
}

export const INITIAL_MELD_STATE: MeldState = {
  quote: null,
  allQuotes: [],
  sessionId: null,
  transactionId: null,
  providerWidgetUrl: null,
  transaction: null,
  isLoadingQuote: false,
  isLoadingSession: false,
  error: null,
  fiatCurrencies: [],
  paymentMethods: [],
  countryDefaults: null,
  limits: null,
  selectedCurrency: "",
  selectedPaymentMethod: "",
  isLoadingConfig: false,
};
