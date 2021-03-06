/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const loadFixture = require('aegir/fixtures')
const Ctl = require('ipfsd-ctl')
const CID = require('cids')
const mh = require('multihashes')
const all = require('it-all')

const ipfsResolver = require('../src/resolver')

const factory = Ctl.createFactory({
  test: true,
  type: 'proc',
  ipfsModule: {
    ref: require('ipfs'),
    path: require.resolve('ipfs')
  }
})

describe('resolve file (CIDv0)', function () {
  let ipfs = null
  let ipfsd = null

  const file = {
    cid: 'Qma4hjFTnCasJ8PVp3mZbZK5g2vGDT4LByLJ7m8ciyRFZP',
    data: loadFixture('test/fixtures/testfile.txt')
  }

  before(async function () {
    this.timeout(20 * 1000)

    ipfsd = await factory.spawn()
    ipfs = ipfsd.api

    const filesAdded = await all(ipfs.add(file.data, { cidVersion: 0 }))
    expect(filesAdded).to.have.length(1)

    const retrievedFile = filesAdded[0]
    expect(retrievedFile.cid).to.deep.equal(new CID(file.cid))
  })

  it('should resolve a multihash', async () => {
    const res = await ipfsResolver.multihash(ipfs, `/ipfs/${file.cid}`)

    expect(res).to.exist()
    const expectedCid = new CID(file.cid)
    expect(res).to.deep.include({
      multihash: mh.toB58String(expectedCid.multihash)
    })
  })

  it('should resolve a cid', async () => {
    const res = await ipfsResolver.cid(ipfs, `/ipfs/${file.cid}`)

    expect(res).to.exist()
    const expectedCid = new CID(file.cid)
    expect(res).to.deep.include({
      cid: expectedCid
    })
  })
})

describe('resolve file (CIDv1)', function () {
  let ipfs = null
  let ipfsd = null

  const file = {
    cid: 'bafkreidffqfydlguosmmyebv5rp72m45tbpbq6segnkosa45kjfnduix6u',
    data: loadFixture('test/fixtures/testfile.txt')
  }

  before(async function () {
    this.timeout(20 * 1000)

    ipfsd = await factory.spawn()
    ipfs = ipfsd.api

    const filesAdded = await all(ipfs.add(file.data, { cidVersion: 1 }))
    expect(filesAdded).to.have.length(1)
    // console.log('ipfs.files.add result', filesAdded)
    const retrievedFile = filesAdded[0]
    expect(retrievedFile.cid).to.deep.equal(new CID(file.cid))
    // expect(retrievedFile.size, 'ipfs.files.add result size should not be smaller than input buffer').greaterThan(file.data.length)
  })

  it('should resolve a multihash', async () => {
    const res = await ipfsResolver.multihash(ipfs, `/ipfs/${file.cid}`)

    expect(res).to.exist()
    const expectedCid = new CID(file.cid)
    expect(res).to.deep.include({
      multihash: mh.toB58String(expectedCid.multihash)
    })
  })

  it('should resolve a cid', async () => {
    const res = await ipfsResolver.cid(ipfs, `/ipfs/${file.cid}`)

    expect(res).to.exist()
    const expectedCid = new CID(file.cid)
    expect(res).to.deep.include({
      cid: expectedCid
    })
  })
})

describe('resolve directory (CIDv0)', function () {
  let ipfs = null
  let ipfsd = null

  const directory = {
    cid: 'QmU1aW5x8tXfbRpJ71zoEVwxrRDHybC2iTVacCMabCUniZ',
    files: {
      'pp.txt': loadFixture('test/fixtures/test-folder/pp.txt'),
      'holmes.txt': loadFixture('test/fixtures/test-folder/holmes.txt')
    }
  }

  before(async function () {
    this.timeout(20 * 1000)

    ipfsd = await factory.spawn()
    ipfs = ipfsd.api

    const content = (name) => ({
      path: `test-folder/${name}`,
      content: directory.files[name]
    })

    const dirs = [
      content('pp.txt'),
      content('holmes.txt')
    ]

    const res = await all(ipfs.add(dirs, { cidVersion: 0 }))
    const root = res[res.length - 1]

    expect(root.path).to.equal('test-folder')
    expect(root.cid).to.deep.equal(new CID(directory.cid))
  })

  it('should throw an error when trying to fetch a directory', async () => {
    try {
      const res = await ipfsResolver.cid(ipfs, `/ipfs/${directory.cid}`)

      expect(res).to.not.exist()
    } catch (err) {
      expect(err.toString()).to.equal('Error: This dag node is a directory')
    }
  })

  it('should return HTML listing of files of a directory', async () => {
    const res = await ipfsResolver.directory(ipfs, `/ipfs/${directory.cid}`, directory.cid)

    expect(res).to.exist()
    expect(res).to.include('</html>')
  })
})

describe('resolve directory (CIDv1)', function () {
  let ipfs = null
  let ipfsd = null

  const directory = {
    cid: 'bafybeifhimn7nu6dgmdvj6o63zegwro3yznnpfqib6kkjnagc54h46ox5q',
    files: {
      'pp.txt': loadFixture('test/fixtures/test-folder/pp.txt'),
      'holmes.txt': loadFixture('test/fixtures/test-folder/holmes.txt')
    }
  }

  before(async function () {
    this.timeout(20 * 1000)

    ipfsd = await factory.spawn()
    ipfs = ipfsd.api

    const content = (name) => ({
      path: `test-folder/${name}`,
      content: directory.files[name]
    })

    const dirs = [
      content('pp.txt'),
      content('holmes.txt')
    ]

    const res = await all(ipfs.add(dirs, { cidVersion: 1 }))
    const root = res[res.length - 1]
    // console.log('ipfs.files.add result', res)
    expect(root.path).to.equal('test-folder')
    // expect(res[0].size, 'ipfs.files.add 1st result size should not be smaller than 1st input buffer').greaterThan(dirs[0].content.length)
    // expect(res[1].size, 'ipfs.files.add 2nd result size should not be smaller than 2nd input buffer').greaterThan(dirs[1].content.length)
    expect(root.cid).to.deep.equal(new CID(directory.cid))
  })

  it('should throw an error when trying to fetch a directory', async () => {
    try {
      const res = await ipfsResolver.cid(ipfs, `/ipfs/${directory.cid}`)

      expect(res).to.not.exist()
    } catch (err) {
      expect(err.toString()).to.equal('Error: This dag node is a directory')
    }
  })

  it('should return HTML listing of files of a directory', async () => {
    const res = await ipfsResolver.directory(ipfs, `/ipfs/${directory.cid}`, directory.cid)
    expect(res).to.exist()
    expect(res).to.include('pp.txt')
    expect(res).to.include('holmes.txt')
    expect(res).to.include('</html>')
  })
})

describe('resolve web page (CIDv0)', function () {
  let ipfs = null
  let ipfsd = null

  const webpage = {
    cid: 'QmR3fdaM5B3LZog6TqpuHvoHYWQpRoaYwFTZ5YmdzGX5U5',
    files: {
      'pp.txt': loadFixture('test/fixtures/test-site/pp.txt'),
      'holmes.txt': loadFixture('test/fixtures/test-site/holmes.txt'),
      'index.html': loadFixture('test/fixtures/test-site/index.html')
    }
  }

  before(async function () {
    this.timeout(20 * 1000)

    ipfsd = await factory.spawn()
    ipfs = ipfsd.api

    const content = (name) => ({
      path: `test-site/${name}`,
      content: webpage.files[name]
    })

    const dirs = [
      content('pp.txt'),
      content('holmes.txt'),
      content('index.html')
    ]

    const res = await all(ipfs.add(dirs, { cidVersion: 0 }))
    const root = res[res.length - 1]

    expect(root.path).to.equal('test-site')
    expect(root.cid).to.deep.equal(new CID(webpage.cid))
  })

  it('should throw an error when trying to fetch a directory containing a web page', async () => {
    try {
      const res = await ipfsResolver.cid(ipfs, `/ipfs/${webpage.cid}`)

      expect(res).to.not.exist()
    } catch (err) {
      expect(err.toString()).to.equal('Error: This dag node is a directory')
    }
  })

  it('should return the entry point of a web page when a trying to fetch a directory containing a web page', async () => {
    const res = await ipfsResolver.directory(ipfs, `/ipfs/${webpage.cid}`, webpage.cid)

    expect(res).to.exist()
    expect(res[0]).to.deep.include({
      Name: 'index.html'
    })
  })
})

describe('resolve web page (CIDv1)', function () {
  let ipfs = null
  let ipfsd = null

  const webpage = {
    cid: 'bafybeibpkvlqjkwl73yam6ffsbrlgbwiffnehajc6qvnrhai5bve6jnawi',
    files: {
      'pp.txt': loadFixture('test/fixtures/test-site/pp.txt'),
      'holmes.txt': loadFixture('test/fixtures/test-site/holmes.txt'),
      'index.html': loadFixture('test/fixtures/test-site/index.html')
    }
  }

  before(async function () {
    this.timeout(20 * 1000)

    ipfsd = await factory.spawn()
    ipfs = ipfsd.api

    const content = (name) => ({
      path: `test-site/${name}`,
      content: webpage.files[name]
    })

    const dirs = [
      content('pp.txt'),
      content('holmes.txt'),
      content('index.html')
    ]

    const res = await all(ipfs.add(dirs, { cidVersion: 1 }))
    // console.log(res)
    const root = res[res.length - 1]
    expect(root.path).to.equal('test-site')
    expect(root.cid).to.deep.equal(new CID(webpage.cid))
  })

  it('should throw an error when trying to fetch a directory containing a web page', async () => {
    try {
      const res = await ipfsResolver.cid(ipfs, `/ipfs/${webpage.cid}`)

      expect(res).to.not.exist()
    } catch (err) {
      expect(err.toString()).to.equal('Error: This dag node is a directory')
    }
  })

  it('should return the entry point of a web page when a trying to fetch a directory containing a web page', async () => {
    const res = await ipfsResolver.directory(ipfs, `/ipfs/${webpage.cid}`, webpage.cid)

    expect(res).to.exist()
    expect(res[0]).to.deep.include({
      Name: 'index.html'
    })
  })
})
