import { useState, useEffect, useCallback } from 'react'
import { getWithdrawals, updateWithdrawalStatus } from '../api'
import DataTable, { Badge, ActionButton, Pagination } from '../components/DataTable'

const columns = [
  { key: 'id', label: 'ID', width: '60px' },
  { key: 'user', label: '유저' },
  { key: 'amount', label: '금액', width: '110px' },
  { key: 'bank', label: '은행', width: '100px' },
  { key: 'account', label: '계좌번호' },
  { key: 'holder', label: '예금주', width: '100px' },
  { key: 'created_at', label: '신청일', width: '160px' },
  { key: 'status', label: '상태', width: '80px' },
  { key: 'actions', label: '액션', width: '160px' },
]

const statusMap = {
  pending: { label: '대기', variant: 'yellow' },
  approved: { label: '승인', variant: 'green' },
  rejected: { label: '거절', variant: 'red' },
}

export default function PointsPage() {
  const [withdrawals, setWithdrawals] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [filterStatus, setFilterStatus] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchWithdrawals = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getWithdrawals({ page, status: filterStatus })
      setWithdrawals(data.withdrawals)
      setTotal(data.total)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [page, filterStatus])

  useEffect(() => { fetchWithdrawals() }, [fetchWithdrawals])

  const handleStatusChange = async (id, newStatus) => {
    if (!confirm(`정말 이 출금 신청을 ${newStatus === 'approved' ? '승인' : '거절'}하시겠습니까?`)) return
    try {
      await updateWithdrawalStatus(id, newStatus)
      fetchWithdrawals()
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">포인트 정산</h1>

      {/* 필터 */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={filterStatus}
          onChange={e => { setFilterStatus(e.target.value); setPage(1) }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white cursor-pointer"
        >
          <option value="">전체 상태</option>
          <option value="pending">대기</option>
          <option value="approved">승인</option>
          <option value="rejected">거절</option>
        </select>
      </div>

      {loading ? (
        <div className="text-gray-400 text-center py-20">로딩 중...</div>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={withdrawals}
            emptyText="출금 신청이 없습니다."
            renderRow={(w) => (
              <tr key={w.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-gray-500">{w.id}</td>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-800">{w.nickname}</div>
                  <div className="text-gray-400 text-xs">{w.email || '-'}</div>
                </td>
                <td className="px-4 py-3 font-bold text-brand">{w.amount.toLocaleString()}P</td>
                <td className="px-4 py-3 text-gray-600">{w.bank_name || '-'}</td>
                <td className="px-4 py-3 text-gray-600">{w.account_number || '-'}</td>
                <td className="px-4 py-3 text-gray-600">{w.account_holder || '-'}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{w.created_at}</td>
                <td className="px-4 py-3">
                  <Badge variant={statusMap[w.status]?.variant}>
                    {statusMap[w.status]?.label || w.status}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  {w.status === 'pending' && (
                    <div className="flex gap-1.5">
                      <ActionButton variant="success" onClick={() => handleStatusChange(w.id, 'approved')}>
                        승인
                      </ActionButton>
                      <ActionButton variant="danger" onClick={() => handleStatusChange(w.id, 'rejected')}>
                        거절
                      </ActionButton>
                    </div>
                  )}
                  {w.status !== 'pending' && (
                    <span className="text-xs text-gray-400">{w.processed_at}</span>
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
