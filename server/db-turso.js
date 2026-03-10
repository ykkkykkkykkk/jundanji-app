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
    // 여러 문장을 ; 로 분할하여 순차 실행
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(Boolean)
    if (statements.length === 0) return
    for (const stmt of statements) {
      await this._client.execute({ sql: stmt, args: [] })
    }
  }

  async pragma(pragmaStr) {
    try {
      await this._client.execute(`PRAGMA ${pragmaStr}`)
    } catch (_) {
      // Turso에서 지원하지 않는 PRAGMA는 무시
    }
  }

  // batch: 여러 SQL을 단일 HTTP 요청으로 트랜잭션 실행 (서버리스 환경에 안정적)
  async batch(statements) {
    const stmts = statements.map(s => ({ sql: s.sql, args: s.args || [] }))
    const results = await this._client.batch(stmts, 'write')
    return results.map(r => ({
      lastInsertRowid: Number(r.lastInsertRowid) || 0,
      changes: r.rowsAffected,
    }))
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
        try { await tx.rollback() } catch (_) {}
        throw e
      }
    }
  }
}

module.exports = { TursoDatabase }
