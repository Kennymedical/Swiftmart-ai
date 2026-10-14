// Gemini via plain fetch - no SDK needed.
async function generateProductDescription({ title, keywords }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { error: 'GEMINI_API_KEY not set' };

  const prompt = 'Write a short, attractive marketplace product description (max 80 words) for: ' + title + '. Keywords: ' + (keywords || 'none');

  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + key;

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  });

  const data = await resp.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return { description: text.trim() };
}

module.exports = { generateProductDescription };
