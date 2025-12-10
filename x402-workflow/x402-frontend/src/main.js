import { createWalletClient, createPublicClient, http, formatUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { avalancheFuji } from 'viem/chains';

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

const state = {
  account: null,
  walletClient: null,
  publicClient: null,
  products: [],
  currentBook: null,
  currentPage: 1,
  totalPages: 0,
};

const $ = (id) => document.getElementById(id);

const el = {
  statusMerchant: $('status-merchant'),
  statusFacilitator: $('status-facilitator'),
  privateKey: $('privateKey'),
  connectBtn: $('connectBtn'),
  walletInfo: $('walletInfo'),
  walletAddress: $('walletAddress'),
  usdcBalance: $('usdcBalance'),
  uploadForm: $('uploadForm'),
  uploadFile: $('uploadFile'),
  uploadTitle: $('uploadTitle'),
  uploadPrice: $('uploadPrice'),
  uploadAuthor: $('uploadAuthor'),
  uploadStatus: $('uploadStatus'),
  refreshLibrary: $('refreshLibrary'),
  libraryList: $('libraryList'),
  readerTitle: $('readerTitle'),
  readerStatus: $('readerStatus'),
  readerPage: $('readerPage'),
  prevPage: $('prevPage'),
  nextPage: $('nextPage'),
  pdfViewer: $('pdfViewer'),
  viewerPlaceholder: $('viewerPlaceholder'),
};

window.addEventListener('DOMContentLoaded', () => {
  el.connectBtn.addEventListener('click', connectWallet);
  el.uploadForm.addEventListener('submit', handleUpload);
  el.refreshLibrary.addEventListener('click', fetchLibrary);
  el.prevPage.addEventListener('click', () => changePage(-1));
  el.nextPage.addEventListener('click', () => changePage(1));

  const savedKey = localStorage.getItem('x402_privateKey');
  if (savedKey) el.privateKey.value = savedKey;
  checkServices();
  setInterval(checkServices, 10000);
});

async function checkServices() {
  const ping = async (url, target) => {
    try {
      const res = await fetch(url);
      target.classList.toggle('online', res.ok);
    } catch {
      target.classList.remove('online');
    }
  };
  ping(`${CONFIG.MERCHANT_URL}/health`, el.statusMerchant);
  ping(`${CONFIG.FACILITATOR_URL}/health`, el.statusFacilitator);
}

async function connectWallet() {
  const pk = el.privateKey.value.trim();
  if (!pk.match(/^0x[a-fA-F0-9]{64}$/)) {
    return setStatus(el.uploadStatus, '私钥格式错误 (0x + 64 hex)', true);
  }
  try {
    state.account = privateKeyToAccount(pk);
    state.publicClient = createPublicClient({ chain: avalancheFuji, transport: http() });
    state.walletClient = createWalletClient({ account: state.account, chain: avalancheFuji, transport: http() });
    localStorage.setItem('x402_privateKey', pk);

    el.walletInfo.classList.remove('hidden');
    el.walletAddress.textContent = shorten(state.account.address);
    await fetchUSDCBalance();
    el.connectBtn.textContent = '已连接';
    el.connectBtn.disabled = true;
    el.uploadAuthor.value = state.account.address;
    fetchLibrary();
  } catch (error) {
    setStatus(el.uploadStatus, `连接失败: ${error.message}`, true);
  }
}

async function fetchUSDCBalance() {
  if (!state.publicClient || !state.account) return;
  try {
    const bal = await state.publicClient.readContract({
      address: CONFIG.USDC_ADDRESS,
      abi: USDC_ABI,
      functionName: 'balanceOf',
      args: [state.account.address],
    });
    el.usdcBalance.textContent = `${formatUnits(bal, CONFIG.USDC_DECIMALS)} USDC`;
  } catch {
    el.usdcBalance.textContent = '余额获取失败';
  }
}

function setStatus(target, msg, isError = false) {
  if (!target) return;
  target.textContent = msg;
  target.style.color = isError ? '#f45d48' : '#8a93a5';
}

async function handleUpload(e) {
  e.preventDefault();
  if (!state.account) {
    setStatus(el.uploadStatus, '请先连接钱包', true);
    return;
  }
  const file = el.uploadFile.files?.[0];
  const title = el.uploadTitle.value.trim();
  const price = el.uploadPrice.value.trim();
  const author = el.uploadAuthor.value.trim();
  if (!file || !title || !price || !author) {
    setStatus(el.uploadStatus, '请填写完整信息', true);
    return;
  }
  const form = new FormData();
  form.append('file', file);
  form.append('title', title);
  form.append('price', price);
  form.append('authorAddress', author);

  setStatus(el.uploadStatus, '上传中...');
  try {
    const res = await fetch(`${CONFIG.MERCHANT_URL}/api/author/upload`, { method: 'POST', body: form });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    setStatus(el.uploadStatus, `已发布：${data.bookId} (${data.totalPages} 页)`);
    await fetchLibrary();
  } catch (error) {
    setStatus(el.uploadStatus, `上传失败: ${error.message}`, true);
  }
}

async function fetchLibrary() {
  el.libraryList.innerHTML = '<p class="muted">加载中...</p>';
  try {
    const res = await fetch(`${CONFIG.MERCHANT_URL}/api/products`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    state.products = data.data || data.products || (Array.isArray(data) ? data : []);
    renderLibrary();
  } catch (error) {
    el.libraryList.innerHTML = `<p class="muted">无法获取书库: ${error.message}</p>`;
  }
}

function renderLibrary() {
  if (!state.products.length) {
    el.libraryList.innerHTML = '<p class="muted">暂无书籍，先上传一本试试</p>';
    return;
  }
  el.libraryList.innerHTML = state.products.map((p) => {
    const price = p.priceInBaseUnits || p.price || '0';
    const priceFmt = formatUnits(BigInt(price), CONFIG.USDC_DECIMALS);
    const author = p.authorAddress ? shorten(p.authorAddress) : '未知作者';
    const desc = p.description || '';
    return `<div class="book-card" data-id="${p.id}">
      <div class="book-title">${p.name}</div>
      <div class="book-meta">
        <span>${priceFmt} USDC / 页</span>
        <span>${author}</span>
      </div>
      <div class="muted">${desc}</div>
    </div>`;
  }).join('');
  el.libraryList.querySelectorAll('.book-card').forEach((card) => {
    card.addEventListener('click', () => selectBook(card.dataset.id));
  });
}

function selectBook(bookId) {
  const book = state.products.find((p) => p.id === bookId);
  if (!book) return;
  state.currentBook = book;
  state.currentPage = 1;
  el.readerTitle.textContent = book.name;
  updatePageStatus();
  loadPage(book.id, state.currentPage);
}

function updatePageStatus(locked = true, page = state.currentPage, total = state.totalPages) {
  el.readerStatus.textContent = locked ? 'Payment Status: Locked' : 'Payment Status: Unlocked';
  el.readerPage.textContent = total ? `Page ${page} / ${total}` : `Page ${page}`;
  el.prevPage.disabled = page <= 1;
  el.nextPage.disabled = total ? page >= total : false;
}

async function changePage(delta) {
  if (!state.currentBook) return;
  const next = Math.max(1, state.currentPage + delta);
  state.currentPage = next;
  updatePageStatus();
  await loadPage(state.currentBook.id, next);
}

async function loadPage(bookId, pageNum) {
  if (!state.account) {
    setStatus(el.uploadStatus, '请先连接钱包', true);
    return;
  }
  updatePageStatus(true, pageNum, state.totalPages);
  el.viewerPlaceholder.textContent = '加载中...';
  el.viewerPlaceholder.classList.remove('hidden');
  el.pdfViewer.src = '';

  try {
    const blob = await fetchPageWithPaywall(bookId, pageNum);
    const url = URL.createObjectURL(blob);
    el.pdfViewer.src = url;
    el.viewerPlaceholder.classList.add('hidden');
    updatePageStatus(false, pageNum, state.totalPages);
  } catch (error) {
    el.viewerPlaceholder.textContent = `加载失败: ${error.message}`;
  }
}

async function fetchPageWithPaywall(bookId, pageNum) {
  let res = await fetch(`${CONFIG.MERCHANT_URL}/api/read/${bookId}/${pageNum}`);
  if (res.ok) {
    const total = res.headers.get('x-total-pages');
    if (total) state.totalPages = Number(total);
    return await res.blob();
  }

  if (res.status !== 402) {
    const err = await safeJson(res);
    throw new Error(err?.error || `HTTP ${res.status}`);
  }

  const challenge = await res.json();
  const option = challenge.accepts?.[0] || challenge;
  const payload = await signChallenge(option);
  const header = btoa(JSON.stringify(payload));

  res = await fetch(`${CONFIG.MERCHANT_URL}/api/read/${bookId}/${pageNum}`, {
    headers: { 'X-PAYMENT': header },
  });

  if (!res.ok) {
    const err = await safeJson(res);
    throw new Error(err?.error || `支付失败 (HTTP ${res.status})`);
  }

  const total = res.headers.get('x-total-pages');
  if (total) state.totalPages = Number(total);
  return await res.blob();
}

async function signChallenge(challenge) {
  const now = Math.floor(Date.now() / 1000);
  const validAfter = BigInt(now - 60);
  const validBefore = BigInt(now + (challenge.maxTimeoutSeconds || 3600));
  const nonce = '0x' + Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, '0')).join('');

  const message = {
    from: state.account.address,
    to: challenge.payTo,
    value: BigInt(challenge.maxAmountRequired),
    validAfter,
    validBefore,
    nonce,
  };

  const signature = await state.walletClient.signTypedData({
    domain: { name: 'USD Coin', version: '2', chainId: CONFIG.CHAIN_ID, verifyingContract: CONFIG.USDC_ADDRESS },
    types: EIP712_TYPES,
    primaryType: 'TransferWithAuthorization',
    message,
  });

  return {
    x402Version: challenge.x402Version || 1,
    scheme: challenge.scheme || 'exact',
    network: challenge.network || 'avalanche-fuji',
    payload: {
      signature,
      authorization: {
        from: state.account.address,
        to: challenge.payTo,
        value: message.value.toString(),
        validAfter: validAfter.toString(),
        validBefore: validBefore.toString(),
        nonce,
      },
    },
  };
}

function shorten(addr) {
  if (!addr) return '';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

async function safeJson(res) {
  try { return await res.json(); } catch { return null; }
}
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
