// db-local.js — better-sqlite3를 async-compatible API로 래핑
// 로컬 개발 환경에서 사용 (await 호환 — sync 값도 await 가능)

class LocalPreparedStatement {
  constructor(db, sql) {
    this._db = db
    this._sql = sql
  }

  get(...params) {
    const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params
    const stmt = this._db.prepare(this._sql)
    return stmt.get(...flatParams)
  }

  all(...params) {
    const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params
    const stmt = this._db.prepare(this._sql)
    return stmt.all(...flatParams)
  }

  run(...params) {
    const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params
    const stmt = this._db.prepare(this._sql)
    const result = stmt.run(...flatParams)
    return {
      lastInsertRowid: Number(result.lastInsertRowid),
      changes: result.changes,
    }
  }
}

class LocalDatabase {
  constructor(betterSqliteDb) {
    this._db = betterSqliteDb
  }

  prepare(sql) {
    return new LocalPreparedStatement(this._db, sql)
  }

  exec(sql) {
    this._db.exec(sql)
  }

  pragma(pragmaStr) {
    this._db.pragma(pragmaStr)
  }

  // batch: 여러 SQL을 하나의 트랜잭션으로 실행
  batch(statements) {
    this._db.exec('BEGIN')
    try {
      const results = statements.map(s => {
        const stmt = this._db.prepare(s.sql)
        const result = stmt.run(...(s.args || []))
        return {
          lastInsertRowid: Number(result.lastInsertRowid),
          changes: result.changes,
        }
      })
      this._db.exec('COMMIT')
      return results
    } catch (e) {
      this._db.exec('ROLLBACK')
      throw e
    }
  }

  transaction(fn) {
    const self = this
    return async function (...args) {
      self._db.exec('BEGIN')
      try {
        // fn(self) — 트랜잭션 내에서 self(= db)를 사용
        // better-sqlite3는 커넥션 단위 트랜잭션이므로 self 전달이 올바름
        const result = await fn(self, ...args)
        self._db.exec('COMMIT')
        return result
      } catch (e) {
        self._db.exec('ROLLBACK')
        throw e
      }
    }
  }
}

module.exports = { LocalDatabase }
