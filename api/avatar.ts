import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query
  
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Missing avatar id' })
  }
  
  // Validate the ID to prevent abuse (should be alphanumeric)
  if (!/^[a-zA-Z0-9]+$/.test(id)) {
    return res.status(400).json({ error: 'Invalid avatar id' })
  }
  
  try {
    const imageUrl = `https://sleepercdn.com/avatars/thumbs/${id}`
    
    const response = await fetch(imageUrl)
    
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch avatar' })
    }
    
    const buffer = await response.arrayBuffer()
    const contentType = response.headers.get('content-type') || 'image/png'
    
    // Set CORS headers to allow our domain
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET')
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400') // Cache for 24 hours
    res.setHeader('Content-Type', contentType)
    
    return res.send(Buffer.from(buffer))
  } catch (error) {
    console.error('Error fetching avatar:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
