const { toolDeclarations, executeTool } = require('./swiftmartTools');

async function chat(message, history = []) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY not set in .env');

  const systemPrompt = [
    'You are SwiftMart AI — the intelligent assistant overseeing the SwiftMart multi-vendor marketplace and fintech platform.',
    'You help the owner/admin understand sales, vendors, products, fraud, orders, and platform health.',
    'Speak like a smart chief of staff: concise, factual, and helpful.',
    'NEVER invent numbers or data. Only report what tools give you.',
    'Amounts in the DB are in kobo (1 naira = 100 kobo). Always show money in Naira (₦) with commas.',
    'Today is ' + new Date().toISOString().split('T')[0] + '.',
    'When asked to take an action (flag/suspend), do it and confirm briefly.'
  ].join(' ');

  const tools = toolDeclarations.map(t => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    }
  }));

  const messages = [{ role: 'system', content: systemPrompt }];
  if (history && history.length) {
    for (const h of history) messages.push({ role: h.role, content: h.content });
  }
  messages.push({ role: 'user', content: message });

  const url = 'https://api.groq.com/openai/v1/chat/completions';

  for (let i = 0; i < 5; i++) {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages,
        tools,
        tool_choice: 'auto',
        temperature: 0.3,
      }),
    });

    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error?.message || 'Groq error');

    const msg = data.choices?.[0]?.message;
    if (!msg) throw new Error('No response from Groq');

    if (msg.tool_calls && msg.tool_calls.length > 0) {
      messages.push(msg);
      for (const tc of msg.tool_calls) {
        const name = tc.function.name;
        const args = JSON.parse(tc.function.arguments || '{}');
        const result = await executeTool(name, args);
        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        });
      }
      continue;
    }

    return { reply: msg.content || '(no reply)' };
  }

  return { reply: 'I needed too many steps. Try rephrasing.' };
}

module.exports = { chat };
