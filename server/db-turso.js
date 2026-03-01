// db-turso.js — @libsql/client를 better-sqlite3 호환 API로 래핑
// Vercel + Turso 환경에서 사용

class TursoPreparedStatement {
  constructor(client, sql) {
    this._client = client
    this._sql = sql
  }

  async get(...params) {
    const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params
    const result = await this._client.execute({ sql: this._sql, args: flatParams })
    return result.rows[0] || undefined
  }

  async all(...params) {
    const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params
    const result = await this._client.execute({ sql: this._sql, args: flatParams })
    return [...result.rows]
  }

  async run(...params) {
    const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params
    const result = await this._client.execute({ sql: this._sql, args: flatParams })
    return {
      lastInsertRowid: Number(result.lastInsertRowid) || 0,
      changes: result.rowsAffected,
    }
  }
}

class TursoDatabase {
  constructor(client) {
    this._client = client
  }

  prepare(sql) {
    return new TursoPreparedStatement(this._client, sql)
  }

  async exec(sql) {
    // 여러 문장을 ; 로 분할하여 batch 실행
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(Boolean)
    if (statements.length === 0) return
    // batch로 한 번에 실행 (원자적)
    await this._client.batch(
      statements.map(s => ({ sql: s })),
      'write'
    )
  }

  async pragma(pragmaStr) {
    try {
      await this._client.execute(`PRAGMA ${pragmaStr}`)
    } catch (_) {
      // Turso에서 지원하지 않는 PRAGMA는 무시
    }
  }

  transaction(fn) {
    const self = this
    return async function (...args) {
      const tx = await self._client.transaction('write')
      // 트랜잭션 스코프 DB 프록시 생성
      const txDb = {
        prepare(sql) {
          return new TursoPreparedStatement(tx, sql)
        },
      }
      try {
        const result = await fn(txDb, ...args)
        await tx.commit()
        return result
      } catch (e) {
        await tx.rollback()
        throw e
      }
    }
  }
}

module.exports = { TursoDatabase }
