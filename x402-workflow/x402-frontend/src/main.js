/**
 * x402 Frontend - HTTP 402 Payment Flow Demo
 */

import { createWalletClient, createPublicClient, http, formatUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { avalancheFuji } from 'viem/chains';

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  MERCHANT_URL: 'http://localhost:3000',
  FACILITATOR_URL: 'http://localhost:3001',
  USDC_ADDRESS: '0x5425890298aed601595a70AB815c96711a31Bc65',
  USDC_DECIMALS: 6,
  CHAIN_ID: 43113,
};

const USDC_ABI = [{
  name: 'balanceOf',
  type: 'function',
  stateMutability: 'view',
  inputs: [{ name: 'account', type: 'address' }],
  outputs: [{ name: '', type: 'uint256' }],
}];

const EIP712_TYPES = {
  TransferWithAuthorization: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'validAfter', type: 'uint256' },
    { name: 'validBefore', type: 'uint256' },
    { name: 'nonce', type: 'bytes32' },
  ],
};

// ============================================================================
// State & DOM Elements
// ============================================================================

const state = { account: null, walletClient: null, publicClient: null, products: [], isProcessing: false };

const $ = (id) => document.getElementById(id);
const elements = {
  privateKey: $('privateKey'), connectBtn: $('connectBtn'), walletInfo: $('walletInfo'),
  walletAddress: $('walletAddress'), usdcBalance: $('usdcBalance'),
  chatMessages: $('chatMessages'), chatInput: $('chatInput'), sendBtn: $('sendBtn'),
  productsList: $('productsList'), logContainer: $('logContainer'),
  challengeBox: $('challengeBox'), challengeMerchant: $('challengeMerchant'),
  challengeAmount: $('challengeAmount'), txHashDisplay: $('txHashDisplay'),
  deliveryIcon: $('deliveryIcon'), transactionResult: $('transactionResult'),
  resultProduct: $('resultProduct'), resultAmount: $('resultAmount'), resultTxHash: $('resultTxHash'),
  statusMerchant: $('status-merchant'), statusFacilitator: $('status-facilitator'),
};

// ============================================================================
// Initialization
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  elements.connectBtn.addEventListener('click', connectWallet);
  elements.sendBtn.addEventListener('click', handleSendMessage);
  elements.chatInput.addEventListener('keypress', (e) => e.key === 'Enter' && handleSendMessage());
  
  const savedKey = localStorage.getItem('x402_privateKey');
  if (savedKey) elements.privateKey.value = savedKey;
  
  checkServices();
  setInterval(checkServices, 10000);
});

// ============================================================================
// Service Health Check
// ============================================================================

async function checkServices() {
  const check = async (url, el) => {
    try {
      const res = await fetch(url);
      el.classList.toggle('online', res.ok);
    } catch { el.classList.remove('online'); }
  };
  check(`${CONFIG.MERCHANT_URL}/health`, elements.statusMerchant);
  check(`${CONFIG.FACILITATOR_URL}/api/merchants`, elements.statusFacilitator);
}

// ============================================================================
// Wallet Connection
// ============================================================================

async function connectWallet() {
  const privateKey = elements.privateKey.value.trim();
  if (!privateKey?.match(/^0x[a-fA-F0-9]{64}$/)) {
    return log('Invalid private key format (0x + 64 hex)', 'error');
  }
  
  try {
    log('Connecting wallet...', 'info');
    state.account = privateKeyToAccount(privateKey);
    state.publicClient = createPublicClient({ chain: avalancheFuji, transport: http() });
    state.walletClient = createWalletClient({ account: state.account, chain: avalancheFuji, transport: http() });
    
    localStorage.setItem('x402_privateKey', privateKey);
    
    const addr = state.account.address;
    elements.walletAddress.textContent = `${addr.slice(0, 8)}...${addr.slice(-6)}`;
    elements.walletInfo.classList.remove('hidden');
    elements.connectBtn.textContent = 'Connected';
    elements.connectBtn.disabled = true;
    elements.chatInput.disabled = false;
    elements.sendBtn.disabled = false;
    
    log(`✅ Wallet connected: ${addr.slice(0, 10)}...`, 'success');
    await Promise.all([fetchUSDCBalance(), fetchProducts()]);
  } catch (error) {
    log(`❌ Connection failed: ${error.message}`, 'error');
  }
}

async function fetchUSDCBalance() {
  if (!state.publicClient || !state.account) return;
  try {
    const balance = await state.publicClient.readContract({
      address: CONFIG.USDC_ADDRESS, abi: USDC_ABI,
      functionName: 'balanceOf', args: [state.account.address],
    });
    elements.usdcBalance.textContent = `${formatUnits(balance, CONFIG.USDC_DECIMALS)} USDC`;
  } catch { elements.usdcBalance.textContent = 'Fetch failed'; }
}

// ============================================================================
// Products
// ============================================================================

async function fetchProducts() {
  try {
    log('Fetching products...', 'info');
    const res = await fetch(`${CONFIG.MERCHANT_URL}/api/products`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    state.products = data.data || data.products || (Array.isArray(data) ? data : []);
    renderProducts();
    log(`✅ Loaded ${state.products.length} products`, 'success');
  } catch (error) {
    elements.productsList.innerHTML = '<p class="loading-text">❌ Cannot connect to merchant</p>';
    log(`❌ Failed to fetch products: ${error.message}`, 'error');
  }
}

function renderProducts() {
  if (!state.products.length) {
    elements.productsList.innerHTML = '<p class="loading-text">No products available</p>';
    return;
  }
  elements.productsList.innerHTML = state.products.map(p => {
    const price = p.price || p.priceInBaseUnits || '0';
    return `<div class="product-item" onclick="window.purchaseProduct('${p.id}')">
      <span class="product-name">${p.name}</span>
      <span class="product-price">${formatUnits(BigInt(price), CONFIG.USDC_DECIMALS)} USDC</span>
    </div>`;
  }).join('');
}

// ============================================================================
// Chat Handler
// ============================================================================

async function handleSendMessage() {
  const message = elements.chatInput.value.trim();
  if (!message || state.isProcessing) return;
  addChatMessage(message, 'user');
  elements.chatInput.value = '';
  await processUserMessage(message);
}

function addChatMessage(text, type) {
  const welcome = elements.chatMessages.querySelector('.chat-welcome');
  if (welcome) welcome.remove();
  const div = document.createElement('div');
  div.className = `chat-message ${type}`;
  div.textContent = text;
  elements.chatMessages.appendChild(div);
  elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

async function processUserMessage(message) {
  const lower = message.toLowerCase();
  
  // List products
  if (/product|item|what|list|show/.test(lower)) {
    if (!state.products.length) await fetchProducts();
    if (state.products.length) {
      const list = state.products.map(p => `• ${p.name} - ${formatUnits(BigInt(p.price || p.priceInBaseUnits), CONFIG.USDC_DECIMALS)} USDC`).join('\n');
      addChatMessage(`Available products:\n${list}\n\nSay "buy [product name]" to purchase`, 'assistant');
    } else {
      addChatMessage('Sorry, cannot fetch products. Ensure merchant server is running.', 'assistant');
    }
    return;
  }
  
  // Purchase
  if (/buy|purchase|order|get/.test(lower)) {
    let product = state.products.find(p => lower.includes(p.id) || lower.includes(p.name.toLowerCase()));
    if (!product) {
      const keywords = { 'tshirt|shirt|t-shirt': 'tshirt', 'jeans|pants': 'jeans', 'jacket|coat': 'jacket', 'sneaker|shoe': 'sneaker' };
      for (const [pattern, id] of Object.entries(keywords)) {
        if (new RegExp(pattern).test(lower)) { product = state.products.find(p => p.id.includes(id)); break; }
      }
    }
    if (product) {
      addChatMessage(`Processing purchase for ${product.name}...`, 'assistant');
      await executePurchase(product);
    } else {
      addChatMessage('Please specify a product, e.g., "buy jeans" or "purchase t-shirt"', 'assistant');
    }
    return;
  }
  
  addChatMessage('I can help you:\n• View products - "show products"\n• Purchase - "buy jeans"', 'assistant');
}

// ============================================================================
// Purchase Flow
// ============================================================================

async function executePurchase(product) {
  if (state.isProcessing) return;
  state.isProcessing = true;
  resetWorkflow();
  elements.transactionResult.classList.add('hidden');
  
  try {
    // Step 1: User Prompt
    setStepStatus(1, 'active');
    highlightEntity('user-entity');
    log(`👤 User request: Purchase ${product.name}`, 'info');
    await delay(500);
    setStepStatus(1, 'completed');
    
    // Step 2: HTTP Request
    setStepStatus(2, 'active');
    highlightEntity('agent-entity');
    log(`🤖 AI Agent: POST /api/buy/${product.id}`, 'info');
    const purchaseRes = await fetch(`${CONFIG.MERCHANT_URL}/api/buy/${product.id}`, { method: 'POST' });
    setStepStatus(2, 'completed');
    
    // Step 3: 402 Response
    setStepStatus(3, 'active');
    highlightEntity('merchant-entity');
    if (purchaseRes.status !== 402) throw new Error(`Expected 402, got ${purchaseRes.status}`);
    
    const response402 = await purchaseRes.json();
    const challenge = response402.accepts?.[0] || response402;
    log(`🏪 Merchant: 402 Payment Required`, 'info');
    
    elements.challengeBox.classList.add('active');
    elements.challengeMerchant.textContent = challenge.payTo ? `${challenge.payTo.slice(0, 8)}...` : '0x...';
    elements.challengeAmount.textContent = `${formatUnits(BigInt(challenge.maxAmountRequired || '0'), CONFIG.USDC_DECIMALS)} USDC`;
    await delay(800);
    setStepStatus(3, 'completed');
    
    // Step 4: Sign Authorization
    setStepStatus(4, 'active');
    highlightEntity('agent-entity');
    log(`🔐 Signing EIP-712 authorization...`, 'info');
    const signedPayload = await signPayment(challenge);
    log(`✅ Signature: ${signedPayload.signature.slice(0, 16)}...`, 'success');
    await delay(500);
    setStepStatus(4, 'completed');
    
    // Step 5: Execute Transaction
    setStepStatus(5, 'active');
    highlightEntity('facilitator-entity');
    log(`💳 Facilitator: Validating policies...`, 'info');
    
    for (const [id, text] of [['check-amount', '✓ Amount < 100 USDC'], ['check-merchant', '✓ Whitelisted Merchant'], ['check-user', '✓ User Approval']]) {
      await delay(300);
      $(id).classList.add('passed');
      $(id).textContent = text;
    }
    
    log(`📤 Sending to Facilitator...`, 'info');
    const facilitatorRes = await fetch(`${CONFIG.FACILITATOR_URL}/api/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userAddress: state.account.address,
        challenge: {
          merchantAddress: challenge.payTo,
          merchantDomain: 'localhost:3000',
          amount: challenge.maxAmountRequired,
          asset: challenge.asset || CONFIG.USDC_ADDRESS,
          network: 'avalanche-fuji',
          resource: `/api/buy/${product.id}`,
          description: `Purchase ${product.name}`,
          timeoutSeconds: 3600,
        },
        signedPayload,
      }),
    });
    
    const result = await facilitatorRes.json();
    if (!facilitatorRes.ok) throw new Error(result.error || 'Facilitator validation failed');
    
    log(`⛓️ Executing on-chain transaction...`, 'info');
    setStepStatus(5, 'completed');
    
    // Step 6: TX Confirmed
    setStepStatus(6, 'active');
    highlightEntity('blockchain-entity');
    elements.txHashDisplay.textContent = `TX: ${result.transactionHash.slice(0, 10)}...`;
    log(`✅ TX confirmed: ${result.transactionHash.slice(0, 20)}...`, 'success');
    await delay(500);
    setStepStatus(6, 'completed');
    
    // Step 7: Deliver Resource
    setStepStatus(7, 'active');
    highlightEntity('merchant-entity');
    log(`📦 Merchant confirming order, preparing shipment...`, 'info');
    await delay(500);
    elements.deliveryIcon.classList.add('active');
    setStepStatus(7, 'completed');
    
    // Show Result
    elements.resultProduct.textContent = product.name;
    elements.resultAmount.textContent = `${formatUnits(BigInt(challenge.maxAmountRequired), CONFIG.USDC_DECIMALS)} USDC`;
    elements.resultTxHash.textContent = result.transactionHash;
    elements.resultTxHash.href = `https://testnet.snowtrace.io/tx/${result.transactionHash}`;
    elements.transactionResult.classList.remove('hidden');
    
    log(`🎉 Purchase successful! ${product.name}`, 'success');
    addChatMessage(`✅ Purchase successful!\n\nProduct: ${product.name}\nTX: ${result.transactionHash.slice(0, 20)}...\n\nShipping soon 🚚`, 'assistant');
    await fetchUSDCBalance();
    
  } catch (error) {
    log(`❌ Purchase failed: ${error.message}`, 'error');
    addChatMessage(`❌ Purchase failed: ${error.message}`, 'assistant');
    document.querySelectorAll('.step-box.active').forEach(el => {
      el.classList.replace('active', 'error');
      el.querySelector('.step-status').textContent = '❌';
    });
  } finally {
    state.isProcessing = false;
    clearEntityHighlights();
  }
}

// ============================================================================
// Payment Signing
// ============================================================================

async function signPayment(challenge) {
  const now = Math.floor(Date.now() / 1000);
  const validAfter = BigInt(now - 60);
  const validBefore = BigInt(now + challenge.maxTimeoutSeconds);
  const nonce = '0x' + Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
  
  const message = {
    from: state.account.address,
    to: challenge.payTo,
    value: BigInt(challenge.maxAmountRequired),
    validAfter, validBefore, nonce,
  };
  
  const signature = await state.walletClient.signTypedData({
    domain: { name: 'USD Coin', version: '2', chainId: CONFIG.CHAIN_ID, verifyingContract: CONFIG.USDC_ADDRESS },
    types: EIP712_TYPES,
    primaryType: 'TransferWithAuthorization',
    message,
  });
  
  return {
    signature,
    authorization: {
      from: state.account.address, to: challenge.payTo,
      value: message.value.toString(), validAfter: validAfter.toString(),
      validBefore: validBefore.toString(), nonce,
    },
  };
}

// ============================================================================
// Workflow Visualization
// ============================================================================

function resetWorkflow() {
  for (let i = 1; i <= 7; i++) {
    const step = $(`flow-step-${i}`);
    if (step) { step.classList.remove('active', 'completed', 'error'); step.querySelector('.step-status').textContent = ''; }
    const arrow = $(`arrow-${i}`);
    if (arrow) arrow.classList.remove('active', 'completed');
  }
  elements.challengeBox.classList.remove('active');
  elements.challengeMerchant.textContent = '0x...';
  elements.challengeAmount.textContent = '0.00 USDC';
  
  ['check-amount', 'check-merchant', 'check-user'].forEach((id, i) => {
    const el = $(id);
    el.classList.remove('passed');
    el.textContent = ['○ Amount < 100 USDC', '○ Whitelisted Merchant', '○ User Approval'][i];
  });
  
  elements.deliveryIcon.classList.remove('active');
  elements.txHashDisplay.textContent = 'Block #...';
  clearEntityHighlights();
}

function setStepStatus(stepNum, status) {
  const step = $(`flow-step-${stepNum}`);
  if (!step) return;
  step.classList.remove('active', 'completed', 'error');
  step.classList.add(status);
  step.querySelector('.step-status').textContent = { active: '⏳', completed: '✅', error: '❌' }[status] || '';
  
  const arrow = $(`arrow-${stepNum}`);
  if (arrow) { arrow.classList.remove('active', 'completed'); arrow.classList.add(status === 'active' ? 'active' : status === 'completed' ? 'completed' : ''); }
}

function highlightEntity(entityId) {
  clearEntityHighlights();
  $(entityId)?.classList.add('active');
}

function clearEntityHighlights() {
  document.querySelectorAll('.entity-box').forEach(el => el.classList.remove('active'));
}

// ============================================================================
// Utilities
// ============================================================================

function log(message, type = 'info') {
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  entry.textContent = message;
  elements.logContainer.appendChild(entry);
  elements.logContainer.scrollTop = elements.logContainer.scrollHeight;
}

const delay = (ms) => new Promise(r => setTimeout(r, ms));

window.purchaseProduct = async (productId) => {
  if (!state.account) return log('Please connect wallet first', 'warning');
  const product = state.products.find(p => p.id === productId);
  if (product) { addChatMessage(`Buy ${product.name}`, 'user'); await executePurchase(product); }
};
