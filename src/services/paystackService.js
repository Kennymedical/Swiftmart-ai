async function initializeTransaction({ email, amountKobo, reference }) {
  const resp = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + process.env.PAYSTACK_SECRET_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, amount: amountKobo, reference }),
  });
  return resp.json();
}

async function verifyTransaction(reference) {
  const resp = await fetch('https://api.paystack.co/transaction/verify/' + reference, {
    headers: { Authorization: 'Bearer ' + process.env.PAYSTACK_SECRET_KEY },
  });
  return resp.json();
}

module.exports = { initializeTransaction, verifyTransaction };
