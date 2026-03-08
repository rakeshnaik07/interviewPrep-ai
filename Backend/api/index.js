require('dotenv').config()
const app = require('../src/app')
const connectToDB = require('../src/config/database')

let dbReadyPromise

module.exports = async (req, res) => {
    try {
        if (!dbReadyPromise) {
            dbReadyPromise = connectToDB()
        }
        await dbReadyPromise
        return app(req, res)
    } catch (error) {
        return res.status(500).json({
            message: 'Database connection failed',
            error: error.message
        })
    }
}
