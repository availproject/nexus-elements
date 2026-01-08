import type { Token } from "../types";

/**
 * Main tokens - selected by default in "All tokens" filter
 */
export const TOKENS: Token[] = [
  {
    id: "usdc",
    symbol: "USDC",
    chainsLabel: "3 Chains",
    usdValue: "$1,550",
    amount: "1550 USDC",
    logo: "https://coin-images.coingecko.com/coins/images/6319/small/usdc.png",
    category: "stablecoin",
    chains: [
      {
        id: "usdc-eth",
        name: "Ethereum",
        usdValue: "$500",
        amount: "500 USDC",
      },
      {
        id: "usdc-polygon",
        name: "Polygon",
        usdValue: "$250",
        amount: "250 USDC",
      },
      {
        id: "usdc-solana",
        name: "Solana",
        usdValue: "$800",
        amount: "800 USDC",
      },
    ],
  },
  {
    id: "eth",
    symbol: "ETH",
    chainsLabel: "2 Chains",
    usdValue: "$1,302",
    amount: "0.435 ETH",
    logo: "https://coin-images.coingecko.com/coins/images/279/small/ethereum.png",
    category: "native",
    chains: [
      {
        id: "eth-mainnet",
        name: "Ethereum",
        usdValue: "$1,000",
        amount: "0.33 ETH",
      },
      {
        id: "eth-arbitrum",
        name: "Arbitrum",
        usdValue: "$302",
        amount: "0.105 ETH",
      },
    ],
  },
  {
    id: "sol",
    symbol: "SOL",
    chainsLabel: "Solana",
    usdValue: "$1,500",
    amount: "10 SOL",
    logo: "https://coin-images.coingecko.com/coins/images/4128/small/solana.png",
    category: "native",
    chains: [
      {
        id: "sol-mainnet",
        name: "Solana",
        usdValue: "$1,500",
        amount: "10 SOL",
      },
    ],
  },
  {
    id: "usdt",
    symbol: "USDT",
    chainsLabel: "Solana",
    usdValue: "$267.89",
    amount: "267.89 USDT",
    logo: "https://coin-images.coingecko.com/coins/images/325/small/Tether.png",
    category: "stablecoin",
    chains: [
      {
        id: "usdt-solana",
        name: "Solana",
        usdValue: "$267.89",
        amount: "267.89 USDT",
      },
    ],
  },
];

/**
 * Low balance memecoins - shown in "Others" section, not selected by default
 */
export const MEMECOINS: Token[] = [
  {
    id: "pepe",
    symbol: "PEPE",
    chainsLabel: "Ethereum",
    usdValue: "$12.45",
    amount: "1.2M PEPE",
    logo: "https://coin-images.coingecko.com/coins/images/29850/small/pepe-token.jpeg",
    category: "memecoin",
    chains: [
      {
        id: "pepe-eth",
        name: "Ethereum",
        usdValue: "$12.45",
        amount: "1.2M PEPE",
      },
    ],
  },
  {
    id: "doge",
    symbol: "DOGE",
    chainsLabel: "Ethereum",
    usdValue: "$8.32",
    amount: "52 DOGE",
    logo: "https://coin-images.coingecko.com/coins/images/5/small/dogecoin.png",
    category: "memecoin",
    chains: [
      {
        id: "doge-eth",
        name: "Ethereum",
        usdValue: "$8.32",
        amount: "52 DOGE",
      },
    ],
  },
  {
    id: "shib",
    symbol: "SHIB",
    chainsLabel: "Ethereum",
    usdValue: "$5.67",
    amount: "450K SHIB",
    logo: "https://coin-images.coingecko.com/coins/images/11939/small/shiba.png",
    category: "memecoin",
    chains: [
      {
        id: "shib-eth",
        name: "Ethereum",
        usdValue: "$5.67",
        amount: "450K SHIB",
      },
    ],
  },
  {
    id: "bonk",
    symbol: "BONK",
    chainsLabel: "Solana",
    usdValue: "$3.21",
    amount: "120K BONK",
    logo: "https://coin-images.coingecko.com/coins/images/28600/small/bonk.jpg",
    category: "memecoin",
    chains: [
      {
        id: "bonk-solana",
        name: "Solana",
        usdValue: "$3.21",
        amount: "120K BONK",
      },
    ],
  },
  {
    id: "wif",
    symbol: "WIF",
    chainsLabel: "Solana",
    usdValue: "$2.15",
    amount: "1.2 WIF",
    logo: "https://coin-images.coingecko.com/coins/images/33566/small/dogwifhat.jpg",
    category: "memecoin",
    chains: [
      {
        id: "wif-solana",
        name: "Solana",
        usdValue: "$2.15",
        amount: "1.2 WIF",
      },
    ],
  },
];

/**
 * Combined list of all tokens
 */
export const ALL_TOKENS: Token[] = [...TOKENS, ...MEMECOINS];

