const fs = require('fs')
const path = require('path')

const jsonPath = path.join(__dirname, 'serviceAccountKey.json')

const jsonData = fs.readFileSync(jsonPath)

const base64String = Buffer.from(jsonData).toString('base64')

console.log(base64String)