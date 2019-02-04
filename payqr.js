const EC = require('elliptic').ec
const ec = new EC('secp256k1')
const axios = require('axios')
const crypto = require('crypto')
const bs58 = require('bs58')
const qs = require('querystring')
const fs = require('fs')

class PayQR {
  constructor() {
    this.url = 'https://payqr-beta.testessential.net/'
    this.keypar = null
    this.storeId = '3VwtZEmGpkCeiLnmU9SvT3pAKWHEgzPyp5VAY4WDZkTf'
    this.request = null
    this.token = null
    this.clientId = ''
    this.label = 'token'
    this.facade = 'merchant'

    this.request = axios.create({
      baseURL: this.url,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Accept-Version': '2.0.0'
      }
    })

    try {
      const hasKey = fs.lstatSync('./key.json').isFile()
      if (hasKey) {
        this.loadKeys()
        this.clientId = this.getSinFromKey()
        this.createInvoice({ currency: 'RUB', price: 900 })
      }
    } catch (e) {
      console.log('not file key')
    }
  }

  generateKeys() {
    const keys = ec.genKeyPair()
    return keys
  }

  saveKeys() {
    const data = {
      key: this.keypar.priv,
      token: this.token
    }

    fs.writeFile('./key.json', JSON.stringify(data), 'utf-8', (err) => {
      if (err) console.log('err generateKeys:', err)
    })
  }

  loadKeys() {
    const file = fs.readFileSync('./key.json', 'utf8')
    const data = JSON.parse(file)
    this.keypar = ec.keyFromPrivate(Buffer.from(data.key, 'hex'))
    this.token = data.token
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
      'X-Signature': this.sign(url).toString('hex')
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

      this.token = token.token
      this.saveKeys()
    } catch (e) {
      console.log('err createToken:', e)
      return e
    }
  }

  async createInvoice(payload) {
    try {
      if (!this.token) throw new Error('createInvoice: Токен не найден!')
      payload.token = this.token
      const headers = this.setHeaders('invoices', JSON.stringify(payload))
      const invoice = await this.request.post('invoices', payload, {
        headers
      })
      return invoice
    } catch (e) {
      console.log('createInvoice:', e)
      return e
    }
  }
}

module.exports = PayQR
