const mongoose = require('mongoose')

let isConnected = false

async function connecToDB() {
    if (isConnected) {
        return mongoose.connection
    }

    try{
        await mongoose.connect(process.env.MONGO_URI)
        isConnected = true
        console.log('Connected to database')
        return mongoose.connection
    } catch(err){
        console.log(err);
        throw err
    }
}

module.exports = connecToDB
