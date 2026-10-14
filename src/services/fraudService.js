// Rule-based fraud scorer - no native deps, runs anywhere.
function scoreTransaction(tx, history = []) {
  let score = 0;
  const amount = Number(tx.amount) || 0;

  if (amount > 500000) score += 0.3;
  if (amount > 1000000) score += 0.3;
  if (amount < 50) score += 0.15;

  const oneHourAgo = Date.now() - 3600000;
  const recent = history.filter(h => new Date(h.created_at).getTime() > oneHourAgo);
  if (recent.length > 5) score += 0.2;
  if (recent.length > 10) score += 0.3;

  if (tx.isNewUser) score += 0.2;

  score = Math.min(score, 1.0);

  let action = 'ACCEPT';
  if (score >= 0.7) action = 'REJECT';
  else if (score >= 0.4) action = 'REVIEW';

  return { score: Number(score.toFixed(4)), action };
}

module.exports = { scoreTransaction };
