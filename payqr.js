const EC = require('elliptic').ec
const ec = new EC('secp256k1')
const axios = require('axios')
const crypto = require('crypto')
const bs58 = require('bs58')
const qs = require('querystring')
const fs = require('fs')

class PayQR {
  constructor() {
    this.url = 'https://btcpay-beta.testessential.net/'
    this.keypar = null
    this.storeId = '6PBx629oJDVpzPJcrkJmzsKMdqM4eLqYNtDt655PtV18'
    this.request = null
    this.token = null
    this.clientId = ''
    this.label = ''
    this.facade = 'merchant'

    this.request = axios.create({
      baseURL: this.url,
      headers: {
        'Content-Type': 'application/json',
        'X-Accept-Version': '2.0.0'
      }
    })

    // try {
    //   const hasKey = fs.lstatSync('./key').isFile()
    //   if (hasKey) {
    //     this.loadKeys()
    //     this.clientId = this.getSinFromKey()
    //   }
    // } catch (e) {
    //   console.log('not file key')
    // }
  }

  generateKeys() {
    const keys = ec.genKeyPair()
    fs.writeFile('./key', JSON.stringify(keys.priv), 'utf-8', (err) => {
      if (err) console.log('err generateKeys:', err)
    })
    return keys
  }

  loadKeys() {
    const file = fs.readFileSync('./key', 'utf8')
    this.keypar = ec.keyFromPrivate(Buffer.from(JSON.parse(file), 'hex'))
    return this.keypar
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
      return e
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

  async createInvoice(payload) {
    try {
      payload.token = this.token.token
      const headers = this.setHeaders('invoices', JSON.stringify(payload))
      const invoice = await this.request.post('invoices', payload, {
        headers
      })
      return invoice
    } catch (e) {
      console.log('err createInvoice:', e)
      return e
    }
  }
}

module.exports = PayQR
