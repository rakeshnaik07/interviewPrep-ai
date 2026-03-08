const express = require('express')
const cors = require('cors')
const app = express()
const cookieParser = require('cookie-parser')
app.use(express.json())
app.use(cookieParser())

const allowedOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173'

app.use(cors({
    origin: allowedOrigin,
    credentials: true
}))

//require all the routes here
const authRouter = require('./routes/auth.routes')
const interviewRouter = require("./routes/interview.routes")

// using all the routes here
app.use('/api/auth', authRouter)
app.use('/api/interview', interviewRouter)





module.exports = app
