const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const cors = require('cors')
const axios = require('axios')
const btcpay = require('btcpay')

app.use(cors())

app.use(bodyParser.json({ limit: '150kb' }))
app.use(
  bodyParser.urlencoded({
    extended: true,
    limit: '150kb'
  })
)

// axios.defaults.headers.common['Authorization'] = `Basic ZG9SaWl5QnBrSVdpSVFRV3AweWx2aXZJUUkwMWRoUFpaVXBIa1ZSUTBvZA==` // eslint-disable-line

const url = 'https://btcpay-beta.testessential.net'
const key = 'dacb017db00532847dd972b49658469c4a4260a98c80e1d480b52a70ee81c0af'
const public = '039caa141cc7ecf63cb85a144655514df752135dceb5bdd27b769f9327a778ea09'
const storeId = '6PBx629oJDVpzPJcrkJmzsKMdqM4eLqYNtDt655PtV18'

const createToken = () => axios.post(url + '/tokens', {
  label: 'token',
  facade: 'merchant',
  id: 'Tf4nBfDuRs8cQHjDKkqXN8PAMYUrzMa354w'
})
  .then(response => {
    const [token] = response.data.data
    return token
  })

const createInvoice = ({
  token,
  price,
  orderId,
  itemDesc,
  notificationURL,
  redirectURL
}) => axios.post(url + '/invoices', {
  price: price,
  currency: 'RUB',
  orderId: orderId,
  itemDesc: itemDesc
  // notificationURL: notificationURL,
  // redirectURL: redirectURL
})

const pairCode = async (code) => {
  return client.pair_client(code)
}

const createInvoiceData = async () => {
  try {
    // const { price, orderId, itemDesc, notificationURL, redirectURL } = req.body
    const token = createToken()
    
    const data = {
      token: token.token,
      price: 900,
      orderId: 2341,
      itemDesc: 'Чуду'
    }
    // const create = await createInvoice(data)
  } catch (e) {
    console.log('ERR:', e)
  }
}

createInvoiceData()

// app.post('/create', async (req, res) => {
//   try {
//     // const { price, orderId, itemDesc, notificationURL, redirectURL } = req.body

//     const token = await createToken()
//     const data = {
//       token: token,
//       price: 900,
//       orderId: 2341,
//       itemDesc: 'Чуду'
//     }
//     const create = await createInvoice(data)
//     res.json({ status: 'ok', data: create })
//   } catch (e) {
//     console.log('ERR:', e)
//     res.status(500).send({
//       status: false
//     })
//   }
// })

// // Start server
// app.listen(3072, () =>
//   console.log(`Express app run to port: 3072`)
// )

