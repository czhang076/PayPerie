/**
 * Merchant Whitelist Store - manages verified merchants
 */

import type { MerchantInfo } from '../types/index.js';

const merchantWhitelist: Map<string, MerchantInfo> = new Map();

// Initialize test merchants
[
  { address: '0xe29e9c1ea625ef783A688157Fe17b6679EEaD09c', name: 'Test Merchant Store', domain: 'localhost', verified: true, category: 'retail' },
  { address: '0x3CC1826Be670881b45b13C18bd03C280CDA585F7', name: 'Demo Shop', domain: 'demo.x402.dev', verified: true, category: 'retail' },
].forEach(m => merchantWhitelist.set(m.address.toLowerCase(), m as MerchantInfo));

export function isMerchantWhitelisted(address: `0x${string}`): boolean {
  return merchantWhitelist.has(address.toLowerCase());
}

export function getMerchantInfo(address: `0x${string}`): MerchantInfo | undefined {
  return merchantWhitelist.get(address.toLowerCase());
}

export function addMerchant(merchant: MerchantInfo): void {
  merchantWhitelist.set(merchant.address.toLowerCase(), merchant);
}

export function removeMerchant(address: `0x${string}`): boolean {
  return merchantWhitelist.delete(address.toLowerCase());
}

export function getAllMerchants(): MerchantInfo[] {
  return Array.from(merchantWhitelist.values());
}

export function getMerchantByDomain(domain: string): MerchantInfo | undefined {
  const d = domain.toLowerCase();
  for (const m of merchantWhitelist.values()) {
    if (m.domain.toLowerCase() === d) return m;
  }
  return undefined;
}
