// Cloudflare Worker - NVIDIA API CORS Proxy
// 部署方法：
// 1. 打开 https://dash.cloudflare.com/ ，创建一个 Worker
// 2. 将此代码粘贴到 Worker 编辑器中
// 3. 保存并部署，复制 Worker 的 URL（如 https://your-worker.workers.dev）
// 4. 在英语学习助手的设置 → CORS 代理中填入该 URL

const UPSTREAM = 'https://integrate.api.nvidia.com'

export default {
  async fetch(request, env, ctx) {
    // 只允许 POST 请求
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // 只允许我们的站点来源（可选，提高安全性）
    // const allowedOrigins = ['https://n5897156.github.io', 'http://localhost:4173', 'http://localhost:5173']
    // const origin = request.headers.get('Origin') || ''
    // if (!allowedOrigins.includes(origin)) {
    //   return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
    // }

    // 构造目标 URL
    const url = new URL(request.url)
    const targetPath = url.pathname.replace(/^\/proxy/, '') || '/v1/chat/completions'
    const targetUrl = UPSTREAM + targetPath

    // 转发请求
    const newRequest = new Request(targetUrl, {
      method: 'POST',
      headers: request.headers,
      body: request.body
    })

    // 移除可能导致问题的头
    newRequest.headers.delete('host')
    newRequest.headers.delete('cf-connecting-ip')

    try {
      const response = await fetch(newRequest)
      const responseBody = await response.text()

      // 构造带 CORS 的响应
      return new Response(responseBody, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          'Content-Type': response.headers.get('Content-Type') || 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Authorization, Content-Type',
          'Access-Control-Max-Age': '86400'
        }
      })
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Upstream error: ' + err.message }), {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      })
    }
  }
}
