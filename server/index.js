require('dotenv').config()
const express = require('express')
const cors = require('cors')
const authRoutes = require('./routes/auth')

const app = express()
const PORT = process.env.PORT || 5000

const allowedOrigins = [
  'http://localhost:3000',
  'https://sahara-seven-virid.vercel.app',
]
console.log('Allowed origins:', allowedOrigins)

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) return callback(null, true)
    return callback(new Error('CORS not allowed for: ' + origin))
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}))

app.options('*', cors())
app.use(express.json())
app.use('/api/auth', authRoutes)

app.get('/api/health', (req, res) => {
  res.json({ status: 'Sahara server running', port: PORT })
})

app.listen(PORT, () => {
  console.log(`Sahara server running on http://localhost:${PORT}`)
})
