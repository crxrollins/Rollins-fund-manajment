export function money(n, currency = 'USD') {
  const value = Number(n || 0);
  const symbol = currency === 'BDT' ? '৳' : '$';
  return symbol + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Convert an amount to USD using the saved rate (rate = BDT per 1 USD)
export function toUSD(tx, fallbackRate = 120) {
  const amount = Number(tx.amount || 0);
  if (tx.currency === 'USD') return amount;
  const rate = Number(tx.usd_rate) || fallbackRate;
  return amount / rate;
}

export const TX_TYPES = {
  deposit: 'Deposit (invest)',
  withdraw: 'Withdraw',
  payment_received: 'Payment received',
  savings: 'Savings',
  expense: 'Expense',
  income: 'Income',
};

// Which types add money to your pocket vs. send money out
export const INFLOW = ['withdraw', 'payment_received', 'income'];
export const OUTFLOW = ['deposit', 'expense', 'savings'];
