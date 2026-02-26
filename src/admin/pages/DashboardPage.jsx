import { useState, useEffect } from 'react'
import { getDashboard } from '../api'
import StatsCard from '../components/StatsCard'

export default function DashboardPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDashboard()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="text-gray-400 text-center py-20">로딩 중...</div>
  }

  if (!data) {
    return <div className="text-red-400 text-center py-20">데이터를 불러올 수 없습니다.</div>
  }

  const { stats, recentUsers, recentFlyers } = data

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">대시보드</h1>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard icon="👥" label="총 유저 수" value={stats.totalUsers.toLocaleString()} />
        <StatsCard icon="📋" label="총 전단지 수" value={stats.totalFlyers.toLocaleString()} />
        <StatsCard icon="💰" label="총 포인트 지급" value={stats.totalPoints.toLocaleString() + 'P'} />
        <StatsCard icon="✋" label="총 긁기 수" value={stats.totalScratches.toLocaleString()} />
      </div>

      {/* 최근 활동 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 최근 유저 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-4">최근 가입 유저</h2>
          <div className="space-y-3">
            {recentUsers.map(user => (
              <div key={user.id} className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium text-gray-800">{user.nickname}</span>
                  <span className="text-gray-400 ml-2">{user.email || '-'}</span>
                </div>
                <span className="text-gray-400 text-xs">{user.created_at}</span>
              </div>
            ))}
            {recentUsers.length === 0 && (
              <p className="text-gray-400 text-sm">가입한 유저가 없습니다.</p>
            )}
          </div>
        </div>

        {/* 최근 전단지 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-4">최근 등록 전단지</h2>
          <div className="space-y-3">
            {recentFlyers.map(flyer => (
              <div key={flyer.id} className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium text-gray-800">{flyer.store_name}</span>
                  <span className="text-gray-400 ml-2">{flyer.title}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  flyer.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                  flyer.status === 'blocked' ? 'bg-red-100 text-red-700' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {flyer.status === 'approved' ? '승인' : flyer.status === 'blocked' ? '차단' : '대기'}
                </span>
              </div>
            ))}
            {recentFlyers.length === 0 && (
              <p className="text-gray-400 text-sm">등록된 전단지가 없습니다.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
