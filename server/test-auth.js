const http = require('http')

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = 'Bearer ' + token
    const opts = { hostname: 'localhost', port: 3001, path, method, headers }
    const req = http.request(opts, res => {
      let data = ''
      res.on('data', c => (data += c))
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }))
    })
    req.on('error', reject)
    if (body) req.write(JSON.stringify(body))
    req.end()
  })
}

async function run() {
  console.log('===== JWT 인증 테스트 =====\n')

  let r = await request('POST', '/api/auth/register', {
    email: 'jwt_test@test.com', password: 'pass1234', nickname: 'JWT테스터'
  })
  console.log('[1] 회원가입:', r.status, r.body.data?.nickname || r.body.message)
  const token = r.body.data?.token

  r = await request('POST', '/api/auth/login', { email: 'jwt_test@test.com', password: 'pass1234' })
  console.log('[2] 로그인:', r.status, r.body.data?.nickname, '포인트:', r.body.data?.points)
  const loginToken = r.body.data?.token

  r = await request('POST', '/api/auth/login', { email: 'jwt_test@test.com', password: 'wrong' })
  console.log('[3] 잘못된 비밀번호:', r.status, r.body.message)

  r = await request('GET', '/api/users/me', null, loginToken)
  console.log('[4] 내 정보:', r.status, r.body.data?.nickname, r.body.data?.email)

  r = await request('PATCH', '/api/users/me', { nickname: '변경된닉네임' }, loginToken)
  console.log('[5] 닉네임 변경:', r.status, r.body.data?.nickname)

  r = await request('GET', '/api/users/me', null, loginToken)
  console.log('[6] 변경 후 확인:', r.status, r.body.data?.nickname)

  r = await request('GET', '/api/users/me', null, 'invalid.token')
  console.log('[7] 토큰 오류:', r.status, r.body.message)

  console.log('\n===== 테스트 완료 =====')
}

run().catch(console.error)
