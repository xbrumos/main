const STORAGE_KEY = 'churro-tycoon-save';
const TICK_MS = 500;

const baseConfig = {
  fryer: { base: 25, scale: 1.18, rate: 0.75 },
  seller: { base: 35, scale: 1.18, rate: 0.8 },
  marketing: { base: 60, scale: 1.25, priceBonus: 0.35 },
  manual: { base: 45, scale: 1.22, bonus: 0.9 },
  fryerBoost: { base: 80, scale: 1.28, bonus: 0.18 },
};

let state = {
  cash: 0,
  churros: 0,
  fryerCount: 0,
  sellerCount: 0,
  marketingLevel: 0,
  manualLevel: 0,
  fryerBoostLevel: 0,
  reputation: 0,
  lastTick: Date.now(),
};

const elements = {
  cash: document.getElementById('cash'),
  churros: document.getElementById('churros'),
  production: document.getElementById('production'),
  sales: document.getElementById('sales'),
  price: document.getElementById('price'),
  reputation: document.getElementById('reputation'),
  fryerRate: document.getElementById('fryer-rate'),
  fryerCount: document.getElementById('fryer-count'),
  fryerCost: document.getElementById('fryer-cost'),
  sellerRate: document.getElementById('seller-rate'),
  sellerCount: document.getElementById('seller-count'),
  sellerCost: document.getElementById('seller-cost'),
  marketingBonus: document.getElementById('marketing-bonus'),
  marketingLevel: document.getElementById('marketing-level'),
  marketingCost: document.getElementById('marketing-cost'),
  manualBonus: document.getElementById('manual-bonus'),
  manualLevel: document.getElementById('manual-level'),
  manualCost: document.getElementById('manual-cost'),
  fryerBonus: document.getElementById('fryer-bonus'),
  fryerLevel: document.getElementById('fryer-level'),
  fryerUpgradeCost: document.getElementById('fryer-upgrade-cost'),
  fryButton: document.getElementById('fry-button'),
  resetButton: document.getElementById('reset-button'),
  offlineNote: document.getElementById('offline-note'),
  buyFryer: document.getElementById('buy-fryer'),
  buySeller: document.getElementById('buy-seller'),
  buyMarketing: document.getElementById('buy-marketing'),
  buyManual: document.getElementById('buy-manual'),
  buyFryerBoost: document.getElementById('buy-fryer-boost'),
};

function formatNumber(value) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return value.toFixed(0);
}

function formatMoney(value) {
  return `$${value.toFixed(2)}`;
}

function getCost(type, count) {
  const config = baseConfig[type];
  return Math.ceil(config.base * config.scale ** count);
}

function getPricePerChurro() {
  return 1 + state.marketingLevel * baseConfig.marketing.priceBonus;
}

function getManualYield() {
  return 1 + state.manualLevel * baseConfig.manual.bonus;
}

function getFryerMultiplier() {
  return 1 + state.fryerBoostLevel * baseConfig.fryerBoost.bonus;
}

function getProductionPerSecond() {
  return state.fryerCount * baseConfig.fryer.rate * getFryerMultiplier();
}

function getSaleCapacityPerSecond() {
  return state.sellerCount * baseConfig.seller.rate;
}

function tick(elapsedSeconds) {
  if (elapsedSeconds <= 0) return;

  const produced = getProductionPerSecond() * elapsedSeconds;
  state.churros += produced;

  const saleCapacity = getSaleCapacityPerSecond() * elapsedSeconds;
  const churrosToSell = Math.min(state.churros, saleCapacity);
  state.churros -= churrosToSell;
  state.cash += churrosToSell * getPricePerChurro();
  state.reputation += produced * 0.002;
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function load() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return;
  try {
    const parsed = JSON.parse(saved);
    state = { ...state, ...parsed };
  } catch (error) {
    console.warn('No se pudo cargar la partida', error);
  }
}

function resetGame() {
  state = {
    cash: 0,
    churros: 0,
    fryerCount: 0,
    sellerCount: 0,
    marketingLevel: 0,
    manualLevel: 0,
    fryerBoostLevel: 0,
    reputation: 0,
    lastTick: Date.now(),
  };
  elements.offlineNote.textContent = '';
  updateUI();
  save();
}

function purchase(type) {
  const countKey = {
    fryer: 'fryerCount',
    seller: 'sellerCount',
    marketing: 'marketingLevel',
    manual: 'manualLevel',
    fryerBoost: 'fryerBoostLevel',
  }[type];

  const current = state[countKey];
  const cost = getCost(type, current);
  if (state.cash < cost) return;

  state.cash -= cost;
  state[countKey] += 1;
  updateUI();
  save();
}

function updateButtons() {
  elements.buyFryer.disabled = state.cash < getCost('fryer', state.fryerCount);
  elements.buySeller.disabled = state.cash < getCost('seller', state.sellerCount);
  elements.buyMarketing.disabled = state.cash < getCost('marketing', state.marketingLevel);
  elements.buyManual.disabled = state.cash < getCost('manual', state.manualLevel);
  elements.buyFryerBoost.disabled = state.cash < getCost('fryerBoost', state.fryerBoostLevel);
}

function updateUI() {
  elements.cash.textContent = formatMoney(state.cash);
  elements.churros.textContent = formatNumber(state.churros);
  elements.reputation.textContent = formatNumber(state.reputation);
  elements.price.textContent = formatMoney(getPricePerChurro());

  const production = getProductionPerSecond();
  const sales = Math.min(getSaleCapacityPerSecond(), production + getManualYield());
  elements.production.textContent = `${production.toFixed(2)} /s`;
  elements.sales.textContent = `${sales.toFixed(2)} /s`;

  elements.fryerRate.textContent = production.toFixed(2);
  elements.sellerRate.textContent = getSaleCapacityPerSecond().toFixed(2);
  elements.fryerCount.textContent = state.fryerCount;
  elements.sellerCount.textContent = state.sellerCount;
  elements.marketingLevel.textContent = state.marketingLevel;
  elements.manualLevel.textContent = state.manualLevel;
  elements.fryerLevel.textContent = state.fryerBoostLevel;

  elements.marketingBonus.textContent = `${(state.marketingLevel * baseConfig.marketing.priceBonus * 100).toFixed(0)}%`;
  elements.manualBonus.textContent = getManualYield().toFixed(1);
  elements.fryerBonus.textContent = `${(getFryerMultiplier() * 100 - 100).toFixed(0)}%`;

  elements.fryerCost.textContent = formatMoney(getCost('fryer', state.fryerCount));
  elements.sellerCost.textContent = formatMoney(getCost('seller', state.sellerCount));
  elements.marketingCost.textContent = formatMoney(getCost('marketing', state.marketingLevel));
  elements.manualCost.textContent = formatMoney(getCost('manual', state.manualLevel));
  elements.fryerUpgradeCost.textContent = formatMoney(getCost('fryerBoost', state.fryerBoostLevel));

  updateButtons();
}

function handleManualFry() {
  tick(getElapsedSeconds());
  state.churros += getManualYield();
  state.lastTick = Date.now();
  updateUI();
  save();
}

function getElapsedSeconds() {
  const now = Date.now();
  const elapsed = (now - state.lastTick) / 1000;
  state.lastTick = now;
  return elapsed;
}

function attachEvents() {
  elements.fryButton.addEventListener('click', handleManualFry);
  elements.resetButton.addEventListener('click', () => {
    if (confirm('¿Seguro que quieres reiniciar la partida?')) {
      resetGame();
    }
  });

  elements.buyFryer.addEventListener('click', () => purchase('fryer'));
  elements.buySeller.addEventListener('click', () => purchase('seller'));
  elements.buyMarketing.addEventListener('click', () => purchase('marketing'));
  elements.buyManual.addEventListener('click', () => purchase('manual'));
  elements.buyFryerBoost.addEventListener('click', () => purchase('fryerBoost'));
}

function startLoop() {
  setInterval(() => {
    const elapsed = getElapsedSeconds();
    tick(elapsed);
    updateUI();
    save();
  }, TICK_MS);
}

function announceOfflineProgress(seconds) {
  if (seconds < 10) return;
  const minutes = Math.floor(seconds / 60);
  const timeLabel = minutes > 0 ? `${minutes} min` : `${Math.floor(seconds)} seg`;
  elements.offlineNote.textContent = `Progreso offline: +${formatNumber(Math.floor(seconds))} seg de fritura (${timeLabel}).`;
}

function init() {
  load();
  const now = Date.now();
  const elapsed = (now - state.lastTick) / 1000;
  state.lastTick = now;
  if (elapsed > 0) {
    tick(elapsed);
    announceOfflineProgress(elapsed);
  }
  updateUI();
  attachEvents();
  startLoop();
}

init();
