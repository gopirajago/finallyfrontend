import express from 'express'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { createReadStream, existsSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3000
const DIST = join(__dirname, 'dist')

// Cache assets
app.use('/assets', (req, res, next) => {
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
  next()
})

// Serve static files from dist
app.use(express.static(DIST))

// SPA fallback — all routes serve index.html
app.get('*', (req, res) => {
  const index = join(DIST, 'index.html')
  if (existsSync(index)) {
    res.sendFile(index)
  } else {
    res.status(404).send('App not built. Run npm run build first.')
  }
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
