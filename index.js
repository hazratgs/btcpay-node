const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const cors = require('cors')
const PayQR = require('./payqr')

const client = new PayQR()

app.use(cors())

app.use(bodyParser.json({ limit: '150kb' }))
app.use(
  bodyParser.urlencoded({
    extended: true,
    limit: '150kb'
  })
)

app.post('/tokens', async (req, res) => {
  try {
    const { code, label } = req.body
    client.label = label
    await client.createToken(code)

    res.json({ status: true })
  } catch (e) {
    res.status(500).send({
      status: false,
      description: `Error: ${e.message}`
    })
  }
})

app.post('/invoices', async (req, res) => {
  try {
    const {
      price,
      currency,
      orderId = '',
      notificationURL = '',
      redirectURL = '',
      itemDesc = ''
    } = req.body

    const data = await client.createInvoice({
      price,
      currency,
      orderId,
      notificationURL,
      redirectURL,
      itemDesc
    })

    res.json({ status: true, data: data.data.data })
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
