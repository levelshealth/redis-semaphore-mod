/* global expect client */
const Promise = require('bluebird')

const { acquire, refresh, release } = require('../../../lib/semaphore')

describe('semaphore', () => {
  describe('acquire', () => {
    it('should return identifier on success acquire', async () => {
      const id = await acquire(client, 'key', 3, 100, 50, 10)
      expect(id).to.be.ok
      expect(await client.zrangeAsync('semaphore:key', 0, -1)).to.be.eql([id])
    })
    it('should acquire maximum LIMIT times', async () => {
      const pr1 = Promise.all([
        acquire(client, 'key', 3, 30, 50, 10),
        acquire(client, 'key', 3, 30, 50, 10),
        acquire(client, 'key', 3, 30, 50, 10)
      ])
      await Promise.delay(5)
      const pr2 = Promise.all([
        acquire(client, 'key', 3, 30, 50, 10),
        acquire(client, 'key', 3, 30, 50, 10),
        acquire(client, 'key', 3, 30, 50, 10)
      ])
      await pr1
      const ids1 = await client.zrangeAsync('semaphore:key', 0, -1)
      expect(ids1.length).to.be.eql(3)
      await pr2
      const ids2 = await client.zrangeAsync('semaphore:key', 0, -1)
      expect(ids2.length).to.be.eql(3)
      expect(ids2)
        .to.not.include(ids1[0])
        .and.not.include(ids1[1])
        .and.not.include(ids1[2])
    })
  })
  describe('refresh', () => {
    it('should refresh entry', async () => {
      const id1 = await acquire(client, 'key', 2, 50, 50, 10)
      await Promise.delay(5)
      const id2 = await acquire(client, 'key', 2, 50, 50, 10)
      expect(await client.zrangeAsync('semaphore:key', 0, -1)).to.be.eql([
        id1,
        id2
      ])
      await refresh(client, 'key', id1)
      expect(await client.zrangeAsync('semaphore:key', 0, -1)).to.be.eql([
        id2,
        id1
      ])
    })
  })
  describe('release', () => {
    it('should release acquired resource', async () => {
      const identifier = await acquire(client, 'key', 3, 50, 50, 10)
      expect(await client.zcardAsync('semaphore:key')).to.be.eql(1)
      await release(client, 'key', identifier)
      expect(await client.zcardAsync('semaphore:key')).to.be.eql(0)
    })
  })
})
