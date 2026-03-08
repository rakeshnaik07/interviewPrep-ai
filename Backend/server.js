require('dotenv').config()
const app = require('./src/app')
const connectToDB = require('./src/config/database')
const PORT = process.env.PORT || 3000

connectToDB()


app.listen(PORT, ()=> {
    console.log(`server is running on port ${PORT}`)
})
