const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const cors = require('cors')
const BTCPayClient = require('.')

const client = new BTCPayClient()

app.use(cors())

app.use(bodyParser.json({ limit: '150kb' }))
app.use(
  bodyParser.urlencoded({
    extended: true,
    limit: '150kb'
  })
)

app.post('/create', (req, res) => {
  try {
    const { domains, backup, password } = req.body
  } catch (e) {
    res.status(500).send({
      status: false,
      description: `Error: ${e.message}`
    })
  }
})

app.listen(3067, () =>
  console.log(`Express app run to port: 3067`)
)
