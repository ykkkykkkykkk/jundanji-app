import { useState, useEffect, useCallback } from 'react'
import { getFlyers, updateFlyerStatus } from '../api'
import DataTable, { Badge, ActionButton, Pagination } from '../components/DataTable'

const columns = [
  { key: 'id', label: 'ID', width: '60px' },
  { key: 'store_name', label: '가게명' },
  { key: 'category', label: '카테고리', width: '100px' },
  { key: 'title', label: '제목' },
  { key: 'owner', label: '등록자', width: '100px' },
  { key: 'created_at', label: '등록일', width: '160px' },
  { key: 'status', label: '상태', width: '80px' },
  { key: 'actions', label: '액션', width: '140px' },
]

const statusMap = {
  approved: { label: '승인', variant: 'green' },
  pending: { label: '대기', variant: 'yellow' },
  blocked: { label: '차단', variant: 'red' },
}

export default function FlyersPage() {
  const [flyers, setFlyers] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchFlyers = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getFlyers({ page, search, status: filterStatus })
      setFlyers(data.flyers)
      setTotal(data.total)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [page, search, filterStatus])

  useEffect(() => { fetchFlyers() }, [fetchFlyers])

  const handleStatusChange = async (id, newStatus) => {
    try {
      await updateFlyerStatus(id, newStatus)
      fetchFlyers()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    setPage(1)
    fetchFlyers()
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">전단지 관리</h1>

      {/* 필터 */}
      <div className="flex flex-wrap gap-3 mb-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="가게명 또는 제목 검색..."
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent w-64"
          />
          <button type="submit" className="px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-dark cursor-pointer">
            검색
          </button>
        </form>
        <select
          value={filterStatus}
          onChange={e => { setFilterStatus(e.target.value); setPage(1) }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white cursor-pointer"
        >
          <option value="">전체 상태</option>
          <option value="approved">승인</option>
          <option value="pending">대기</option>
          <option value="blocked">차단</option>
        </select>
      </div>

      {loading ? (
        <div className="text-gray-400 text-center py-20">로딩 중...</div>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={flyers}
            emptyText="전단지가 없습니다."
            renderRow={(flyer) => (
              <tr key={flyer.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-gray-500">{flyer.id}</td>
                <td className="px-4 py-3 font-medium text-gray-800">{flyer.store_name}</td>
                <td className="px-4 py-3 text-gray-600">{flyer.category}</td>
                <td className="px-4 py-3 text-gray-700">{flyer.title}</td>
                <td className="px-4 py-3 text-gray-500">{flyer.owner_name || '-'}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{flyer.created_at}</td>
                <td className="px-4 py-3">
                  <Badge variant={statusMap[flyer.status]?.variant}>
                    {statusMap[flyer.status]?.label || flyer.status}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1.5">
                    {flyer.status !== 'approved' && (
                      <ActionButton variant="success" onClick={() => handleStatusChange(flyer.id, 'approved')}>
                        승인
                      </ActionButton>
                    )}
                    {flyer.status !== 'blocked' && (
                      <ActionButton variant="danger" onClick={() => handleStatusChange(flyer.id, 'blocked')}>
                        차단
                      </ActionButton>
                    )}
                  </div>
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
