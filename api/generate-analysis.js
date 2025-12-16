// Serverless function to proxy AI requests
// Deploy to Vercel, Netlify, or any serverless platform

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { prompt, type } = req.body

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' })
  }

  // Try Anthropic first, then OpenAI
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  const openaiKey = process.env.OPENAI_API_KEY

  if (!anthropicKey && !openaiKey) {
    return res.status(500).json({ error: 'No API keys configured on server' })
  }

  try {
    // Try Anthropic first
    if (anthropicKey) {
      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': anthropicKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 500,
            messages: [
              { role: 'user', content: prompt }
            ]
          })
        })

        if (response.ok) {
          const data = await response.json()
          return res.status(200).json({ 
            text: data.content[0]?.text || 'Failed to generate analysis.',
            provider: 'anthropic'
          })
        }
      } catch (e) {
        console.log('Anthropic failed, trying OpenAI...', e)
      }
    }

    // Fallback to OpenAI
    if (openaiKey) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: type === 'matchup' 
                ? 'You are a witty, analytical fantasy football analyst who provides detailed matchup breakdowns.'
                : 'You are an expert fantasy football analyst who provides detailed, engaging power rankings analysis.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.8,
          max_tokens: 500
        })
      })

      if (!response.ok) {
        const error = await response.text()
        console.error('OpenAI error:', error)
        throw new Error(`OpenAI API error: ${response.statusText}`)
      }

      const data = await response.json()
      return res.status(200).json({ 
        text: data.choices[0]?.message?.content || 'Failed to generate analysis.',
        provider: 'openai'
      })
    }

    return res.status(500).json({ error: 'All AI providers failed' })
  } catch (error) {
    console.error('AI generation error:', error)
    return res.status(500).json({ error: error.message || 'Failed to generate analysis' })
  }
}
