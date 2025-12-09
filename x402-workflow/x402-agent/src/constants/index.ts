/**
 * Agent Constants
 */

export const NETWORKS = {
  AVALANCHE_FUJI: 'avalanche-fuji',
} as const;

export const CHAIN_IDS: Record<string, number> = {
  [NETWORKS.AVALANCHE_FUJI]: 43113,
};

export const USDC_ADDRESSES: Record<string, `0x${string}`> = {
  [NETWORKS.AVALANCHE_FUJI]: '0x5425890298aed601595a70AB815c96711a31Bc65',
};

// EIP-712 domain for USDC
export const getEIP712Domain = (chainId: number, usdcAddress: `0x${string}`) => ({
  name: 'USD Coin',
  version: '2',
  chainId: BigInt(chainId),
  verifyingContract: usdcAddress,
});

export const TRANSFER_WITH_AUTHORIZATION_TYPES = {
  TransferWithAuthorization: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'validAfter', type: 'uint256' },
    { name: 'validBefore', type: 'uint256' },
    { name: 'nonce', type: 'bytes32' },
  ],
} as const;
