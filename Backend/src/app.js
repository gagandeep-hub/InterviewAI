const express = require("express")
const cookieParser = require("cookie-parser")
const cors = require("cors")
 
const app = express()
 
app.use(express.json())
app.use(cookieParser())
app.use(cors({
    origin: [
        process.env.FRONTEND_URL,
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    credentials: true
}))
 
/* ── Routes ── */
const authRouter = require("./routes/auth.routes")
const interviewRouter = require("./routes/interview.routes")
 
app.use("/api/auth", authRouter)
app.use("/api/interview", interviewRouter)
 
/* ── Global error handler (catches anything unhandled above) ── */
app.use((err, req, res, next) => {
    console.error("Unhandled error:", err)
    res.status(500).json({
        message: "Something went wrong.",
        error: err.message
    })
})
 
module.exports = app