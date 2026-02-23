// 서버 API 통합 테스트 (node test.js 로 실행)
const http = require('http')

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'localhost',
      port: 3001,
      path,
      method,
      headers: { 'Content-Type': 'application/json' },
    }
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
  console.log('========== API 테스트 시작 ==========\n')

  // 1. 헬스 체크
  let r = await request('GET', '/api/health')
  console.log('[1] 헬스 체크:', r.body.message)

  // 2. 전체 전단지 목록
  r = await request('GET', '/api/flyers')
  console.log(`[2] 전체 전단지: ${r.body.data.length}개`)

  // 3. 카테고리 필터
  r = await request('GET', '/api/flyers?category=%EB%A7%88%ED%8A%B8')  // 마트
  console.log(`[3] 마트 카테고리: ${r.body.data.length}개 →`, r.body.data.map(f => f.storeName).join(', '))

  // 4. 전단지 상세
  r = await request('GET', '/api/flyers/1')
  console.log(`[4] 상세(id=1): ${r.body.data.storeName} / 상품 ${r.body.data.items.length}개`)

  // 5. 공유 처리 (첫 번째)
  r = await request('POST', '/api/share', { userId: 1, flyerId: 1 })
  console.log(`[5] 공유 처리: ${r.status === 200 ? '성공' : '실패'} → 적립 ${r.body.data?.earnedPoints}P, 총 ${r.body.data?.totalPoints}P`)

  // 6. 중복 공유 방지
  r = await request('POST', '/api/share', { userId: 1, flyerId: 1 })
  console.log(`[6] 중복 공유 방지: ${r.status} - ${r.body.message}`)

  // 7. 포인트 조회
  r = await request('GET', '/api/users/1/points')
  console.log(`[7] 포인트 조회: ${r.body.data.nickname} - ${r.body.data.points}P`)

  // 8. 공유 내역 조회
  r = await request('GET', '/api/users/1/share-history')
  console.log(`[8] 공유 내역: ${r.body.data.length}건`)
  r.body.data.forEach(h => console.log(`   - ${h.storeName} ${h.title} +${h.points}P`))

  console.log('\n========== 테스트 완료 ==========')
}

run().catch(console.error)
