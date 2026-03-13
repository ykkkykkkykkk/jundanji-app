import { useState, useEffect, useCallback } from 'react'
import { getGiftOrders, updateGiftOrderStatus } from '../api'
import DataTable, { Badge, ActionButton, Pagination } from '../components/DataTable'

const columns = [
  { key: 'id', label: 'ID', width: '60px' },
  { key: 'user', label: '유저 (카카오계정)' },
  { key: 'gift', label: '기프티콘' },
  { key: 'amount', label: '포인트', width: '100px' },
  { key: 'phone', label: '전화번호', width: '150px' },
  { key: 'created_at', label: '신청일', width: '160px' },
  { key: 'status', label: '상태', width: '90px' },
  { key: 'actions', label: '액션', width: '220px' },
]

const statusMap = {
  pending: { label: '대기', variant: 'yellow' },
  sent: { label: '발송완료', variant: 'green' },
  failed: { label: '실패', variant: 'red' },
}

function maskPhone(phone) {
  if (!phone) return '-'
  const parts = phone.split('-')
  if (parts.length === 3) return `${parts[0]}-****-${parts[2]}`
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1-****-$2')
}

function PhoneCell({ phone }) {
  const [visible, setVisible] = useState(false)
  if (!phone) return <span className="text-gray-400">-</span>
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-sm text-gray-700 font-mono">
        {visible ? phone : maskPhone(phone)}
      </span>
      <button
        onClick={() => setVisible(v => !v)}
        className="text-gray-400 hover:text-gray-600 transition-colors p-0.5"
        title={visible ? '숨기기' : '전체 보기'}
      >
        {visible ? '🙈' : '👁️'}
      </button>
    </div>
  )
}

export default function PointsPage() {
  const [orders, setOrders] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [filterStatus, setFilterStatus] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getGiftOrders({ page, status: filterStatus })
      setOrders(data.orders || [])
      setTotal(data.total || 0)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [page, filterStatus])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  const handleStatusChange = async (id, newStatus) => {
    const label = newStatus === 'sent' ? '발송 완료' : '실패'
    if (!confirm(`정말 이 기프티콘을 '${label}' 처리하시겠습니까?`)) return
    try {
      await updateGiftOrderStatus(id, newStatus)
      fetchOrders()
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">기프티콘 관리</h1>
        <a
          href="https://www.giftielbiz.co.kr/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-500 text-white text-sm font-semibold rounded-lg hover:bg-indigo-600 transition-colors"
        >
          🎁 기프티쇼 바로가기 ↗
        </a>
      </div>

      {/* 필터 */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={filterStatus}
          onChange={e => { setFilterStatus(e.target.value); setPage(1) }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white cursor-pointer"
        >
          <option value="">전체 상태</option>
          <option value="pending">대기</option>
          <option value="sent">발송완료</option>
          <option value="failed">실패</option>
        </select>
      </div>

      {loading ? (
        <div className="text-gray-400 text-center py-20">로딩 중...</div>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={orders}
            emptyText="기프티콘 주문이 없습니다."
            renderRow={(o) => (
              <tr key={o.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-gray-500">{o.id}</td>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-800">{o.nickname}</div>
                  <div className="text-gray-400 text-xs">{o.email || '-'}</div>
                  {o.provider && <div className="text-xs mt-0.5" style={{ color: o.provider === 'kakao' ? '#3A1D1D' : '#4285F4' }}>{o.provider === 'kakao' ? '🟡 카카오' : '🔵 구글'}{o.provider_id ? ` (${o.provider_id})` : ''}</div>}
                </td>
                <td className="px-4 py-3 text-gray-700">{o.gift_name}</td>
                <td className="px-4 py-3 font-bold text-brand">{o.amount.toLocaleString()}P</td>
                <td className="px-4 py-3">
                  <PhoneCell phone={o.phone} />
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">{o.created_at}</td>
                <td className="px-4 py-3">
                  <Badge variant={statusMap[o.status]?.variant}>
                    {statusMap[o.status]?.label || o.status}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  {o.status === 'pending' && (
                    <div className="flex gap-1.5">
                      <ActionButton variant="success" onClick={() => handleStatusChange(o.id, 'sent')}>
                        발송완료
                      </ActionButton>
                      <ActionButton variant="danger" onClick={() => handleStatusChange(o.id, 'failed')}>
                        실패
                      </ActionButton>
                    </div>
                  )}
                  {o.status !== 'pending' && (
                    <span className="text-xs text-gray-400">{o.sent_at}</span>
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
