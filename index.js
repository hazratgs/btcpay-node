const EC = require('elliptic').ec
const ec = new EC('secp256k1')
const axios = require('axios')
const crypto = require('crypto')
const bs58 = require('bs58')
const qs = require('querystring')
const fs = require('fs')

class BTCPay {
  constructor() {
    this.url = 'https://btcpay-beta.testessential.net/'
    this.key = '0c0178e575e495a07ff839dd0c2f9603cf8c2f4d1bda94895d56522077e070b0'
    this.public = '021f2652a2df3b34c736dff8b7ffe64c9b4f5833fe2415bde7bf01546e2953df91'
    this.keypar = ec.keyFromPrivate(new Buffer.from(this.key, 'hex'))
    this.storeId = '6PBx629oJDVpzPJcrkJmzsKMdqM4eLqYNtDt655PtV18'
    this.request = null
    this.token = null
    this.clientId = 'Tf3WxtCNvPR9ATBjc14Wrw6EBxBS5AWn8Li'
    this.label = 'app'
    this.facade = 'merchant'

    this.request = axios.create({
      baseURL: this.url,
      headers: {
        'Content-Type': 'application/json',
        'X-Accept-Version': '2.0.0'
      }
    })
  }

  generateKeys() {
    const keys = ec.genKeyPair()
    fs.writeFile('./data.json', JSON.stringify(keys, null, 2), 'utf-8', (err) => {
      if (err) console.log('err generateKeys:', err)
    })
  }

  loadKeys() {
    const file = fs.readFileSync('./data.json', 'utf8')
    return ec.keyFromPrivate(file)
  }

  getSinFromKey() {
    let pk = Buffer.from(this.keypar.getPublic().encodeCompressed())
    let version = this.get_version_from_compressed_key(pk)
    let checksum = this.get_checksum_from_version(version)
    return bs58.encode(Buffer.concat([version, checksum]))
  }

  get_version_from_compressed_key(pk) {
    let sh2 = crypto.createHash('sha256').update(pk).digest()
    let rp = crypto.createHash('ripemd160').update(sh2).digest()

    return Buffer.concat([Buffer.from('0F', 'hex'), Buffer.from('02', 'hex'), rp])
  }

  get_checksum_from_version(version) {
    let h1 = crypto.createHash('sha256').update(version).digest()
    let h2 = crypto.createHash('sha256').update(h1).digest()

    return h2.slice(0, 4)
  }

  sign(message) {
    let digest = crypto.createHash('sha256').update(message).digest()
    return Buffer.from(this.keypar.sign(digest).toDER())
  }

  setHeaders(uri, payload) {
    const url = this.url + uri + payload
    const headers = {
      'X-Identity': Buffer.from(this.keypar.getPublic().encodeCompressed()).toString('hex'),
      'X-Signature': this.sign(url, this.keypar).toString('hex')
    }
    return headers
  }

  async createToken(code) {
    try {
      this.keypar = this.generateKeys()
      this.clientId = this.getSinFromKey()
      const token = await this.request.post('tokens', {
        pairingCode: code,
        id: this.clientId
      })
        .then(response => {
          const [token] = response.data.data
          return token
        })

      this.token = token
    } catch (e) {
      console.log('err createToken:', e)
    }
  }

  async getToken() {
    try {
      const token = await this.request.post('tokens', {
        label: 'app',
        facade: 'merchant',
        id: this.clientId
      })
        .then(response => {
          const [token] = response.data.data
          return token
        })

      this.token = token
    } catch (e) {
      console.log('err getToken:', e)
    }
  }

  async updateToken() {
    try {
      const token = await this.request.post('tokens', {
        label: this.label,
        id: this.clientId,
        facade: this.facade
      })
        .then(response => {
          const [token] = response.data.data
          return token
        })

      this.token = token
    } catch (e) {
      console.log('err updateToken:', e)
    }
  }

  async getRates() {
    try {
      await this.updateToken()
      const payload = {
        storeId: this.storeId,
        currencyPairs: 'BTC_USD',
        token: this.token.token
      }
      const rates = await this.request.get('rates', {
        params: payload,
        headers: this.setHeaders('rates', '?' + qs.stringify(payload))
      })
      return rates
    } catch (e) {
      console.log('err getRates:', e)
    }
  }

  async createInvoice() {
    try {
      await this.updateToken()
      const payload = {
        currency: 'USD',
        price: '900',
        token: this.token.token
      }
      const invoice = await this.request.post('invoices', payload, {
        headers: this.setHeaders('invoices', JSON.stringify(payload))
      })
      return invoice
    } catch (e) {
      console.log('err createInvoice:', e)
    }
  }
}

const client = new BTCPay()
