// db-compat.js — sql.js를 better-sqlite3 API와 호환되도록 래핑
// Vercel 서버리스 환경에서 사용 (better-sqlite3는 네이티브 애드온이라 Vercel 불가)

class PreparedStatement {
  constructor(database, sql) {
    this._db = database
    this._sql = sql
  }

  get(...params) {
    const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params
    const stmt = this._db.prepare(this._sql)
    try {
      if (flatParams.length > 0) stmt.bind(flatParams)
      if (stmt.step()) {
        return stmt.getAsObject()
      }
      return undefined
    } finally {
      stmt.free()
    }
  }

  all(...params) {
    const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params
    const results = []
    const stmt = this._db.prepare(this._sql)
    try {
      if (flatParams.length > 0) stmt.bind(flatParams)
      while (stmt.step()) {
        results.push(stmt.getAsObject())
      }
    } finally {
      stmt.free()
    }
    return results
  }

  run(...params) {
    const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params
    if (flatParams.length > 0) {
      this._db.run(this._sql, flatParams)
    } else {
      this._db.run(this._sql)
    }
    const lastId = this._db.exec("SELECT last_insert_rowid() as id")
    const changes = this._db.getRowsModified()
    return {
      lastInsertRowid: lastId.length > 0 ? lastId[0].values[0][0] : 0,
      changes,
    }
  }
}

class DatabaseWrapper {
  constructor(sqlJsDb) {
    this._db = sqlJsDb
  }

  prepare(sql) {
    return new PreparedStatement(this._db, sql)
  }

  exec(sql) {
    this._db.run(sql)
  }

  pragma(pragmaStr) {
    this._db.run(`PRAGMA ${pragmaStr}`)
  }

  transaction(fn) {
    const self = this
    return function (...args) {
      self._db.run('BEGIN')
      try {
        const result = fn(...args)
        self._db.run('COMMIT')
        return result
      } catch (e) {
        self._db.run('ROLLBACK')
        throw e
      }
    }
  }
}

module.exports = { DatabaseWrapper }
