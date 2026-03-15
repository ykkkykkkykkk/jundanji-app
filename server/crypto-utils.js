/**
 * AES-256-GCM 암호화/복호화 유틸
 *
 * 환경변수 ENCRYPTION_KEY: 64자리 hex 문자열 (32바이트 키)
 * 생성 방법: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * 저장 형식: "<iv_hex>:<authTag_hex>:<ciphertext_hex>"
 * - iv: 16바이트 랜덤 (GCM 권장 12바이트를 보수적으로 16바이트 사용)
 * - authTag: 16바이트 GCM 인증 태그 (무결성 검증)
 * - ciphertext: 암호문
 *
 * 기존 평문 데이터 처리: isEncrypted() 로 판별 후 평문이면 그대로 반환
 */

'use strict'

const crypto = require('crypto')

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16
const SEPARATOR = ':'

function getKey() {
  const keyHex = process.env.ENCRYPTION_KEY
  if (!keyHex || keyHex.length !== 64) {
    throw new Error('ENCRYPTION_KEY 환경변수가 설정되지 않았거나 올바르지 않습니다. (64자리 hex 필요)')
  }
  return Buffer.from(keyHex, 'hex')
}

/**
 * 평문 문자열을 AES-256-GCM으로 암호화
 * @param {string} plaintext
 * @returns {string} "<iv_hex>:<authTag_hex>:<ciphertext_hex>"
 */
function encrypt(plaintext) {
  if (plaintext == null) return plaintext
  const key = getKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return [iv.toString('hex'), authTag.toString('hex'), encrypted.toString('hex')].join(SEPARATOR)
}

/**
 * 암호화된 문자열을 복호화
 * 기존 평문 데이터(하위 호환)는 그대로 반환
 * @param {string} ciphertext
 * @returns {string}
 */
function decrypt(ciphertext) {
  if (ciphertext == null) return ciphertext
  if (!isEncrypted(ciphertext)) {
    // 기존 평문 데이터 — 그대로 반환 (마이그레이션 전 호환)
    return ciphertext
  }
  const key = getKey()
  const parts = ciphertext.split(SEPARATOR)
  if (parts.length !== 3) throw new Error('잘못된 암호문 형식')
  const [ivHex, authTagHex, encryptedHex] = parts
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const encrypted = Buffer.from(encryptedHex, 'hex')
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}

/**
 * 저장된 값이 이 유틸로 암호화된 형식인지 판별
 * 형식: "<32+자 hex>:<32자 hex>:<1자 이상 hex>" — 3개 세그먼트
 * @param {string} value
 * @returns {boolean}
 */
function isEncrypted(value) {
  if (typeof value !== 'string') return false
  const parts = value.split(SEPARATOR)
  if (parts.length !== 3) return false
  const [ivHex, authTagHex, cipherHex] = parts
  // iv=32자, authTag=32자, cipher=최소 2자(hex)
  return /^[0-9a-f]{32}$/i.test(ivHex) &&
         /^[0-9a-f]{32}$/i.test(authTagHex) &&
         /^[0-9a-f]{2,}$/i.test(cipherHex)
}

module.exports = { encrypt, decrypt, isEncrypted }
