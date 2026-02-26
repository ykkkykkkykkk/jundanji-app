import { useState, useEffect, useCallback } from 'react'
import { getBusinesses, approveBusiness } from '../api'
import DataTable, { Badge, ActionButton, Pagination } from '../components/DataTable'

const columns = [
  { key: 'id', label: 'ID', width: '60px' },
  { key: 'nickname', label: '닉네임' },
  { key: 'email', label: '이메일' },
  { key: 'points', label: '포인트', width: '100px' },
  { key: 'created_at', label: '가입일', width: '160px' },
  { key: 'status', label: '계정 상태', width: '100px' },
  { key: 'approved', label: '승인 여부', width: '100px' },
  { key: 'actions', label: '액션', width: '160px' },
]

export default function BusinessPage() {
  const [businesses, setBusinesses] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [filterApproved, setFilterApproved] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchBusinesses = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getBusinesses({ page, approved: filterApproved })
      setBusinesses(data.businesses)
      setTotal(data.total)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [page, filterApproved])

  useEffect(() => { fetchBusinesses() }, [fetchBusinesses])

  const handleApprove = async (id, approved) => {
    try {
      await approveBusiness(id, approved)
      fetchBusinesses()
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">자영업자 관리</h1>

      {/* 필터 */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={filterApproved}
          onChange={e => { setFilterApproved(e.target.value); setPage(1) }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white cursor-pointer"
        >
          <option value="">전체</option>
          <option value="0">승인 대기</option>
          <option value="1">승인 완료</option>
        </select>
      </div>

      {loading ? (
        <div className="text-gray-400 text-center py-20">로딩 중...</div>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={businesses}
            emptyText="자영업자가 없습니다."
            renderRow={(biz) => (
              <tr key={biz.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-gray-500">{biz.id}</td>
                <td className="px-4 py-3 font-medium text-gray-800">{biz.nickname}</td>
                <td className="px-4 py-3 text-gray-600">{biz.email || '-'}</td>
                <td className="px-4 py-3 text-gray-700 font-medium">{biz.points.toLocaleString()}P</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{biz.created_at}</td>
                <td className="px-4 py-3">
                  <Badge variant={biz.status === 'active' ? 'green' : 'red'}>
                    {biz.status === 'active' ? '활성' : '정지'}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={biz.business_approved ? 'green' : 'yellow'}>
                    {biz.business_approved ? '승인' : '대기'}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  {!biz.business_approved ? (
                    <div className="flex gap-1.5">
                      <ActionButton variant="success" onClick={() => handleApprove(biz.id, true)}>
                        승인
                      </ActionButton>
                      <ActionButton variant="danger" onClick={() => handleApprove(biz.id, false)}>
                        거절
                      </ActionButton>
                    </div>
                  ) : (
                    <ActionButton variant="outline" onClick={() => handleApprove(biz.id, false)}>
                      승인 취소
                    </ActionButton>
                  )}
                </td>
              </tr>
            )}
          />
          <Pagination page={page} total={total} limit={20} onChange={setPage} />
        </>
      )}
    </div>
  )
}
