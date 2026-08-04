// Vercel Serverless Function - NVIDIA API CORS Proxy
export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
    res.setHeader('Access-Control-Max-Age', '86400')
    return res.status(204).end()
  }

  if (req.method !== 'POST') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const targetUrl = 'https://integrate.api.nvidia.com/v1/chat/completions'

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Authorization': req.headers['authorization'] || '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body)
    })

    const data = await response.text()

    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/json')
    return res.status(response.status).send(data)
  } catch (err) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    return res.status(502).json({ error: 'Upstream error: ' + err.message })
  }
}
