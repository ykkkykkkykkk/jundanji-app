import { useState, useEffect, useCallback } from 'react'
import { getUsers, updateUserStatus, adjustUserPoints } from '../api'
import DataTable, { Badge, ActionButton, Pagination } from '../components/DataTable'

const columns = [
  { key: 'id', label: 'ID', width: '60px' },
  { key: 'nickname', label: '닉네임' },
  { key: 'email', label: '이메일' },
  { key: 'role', label: '역할', width: '90px' },
  { key: 'points', label: '포인트', width: '100px' },
  { key: 'created_at', label: '가입일', width: '160px' },
  { key: 'status', label: '상태', width: '80px' },
  { key: 'actions', label: '액션', width: '180px' },
]

const roleMap = {
  user: { label: '일반', variant: 'blue' },
  business: { label: '자영업자', variant: 'yellow' },
}

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [loading, setLoading] = useState(true)

  // 포인트 조정 모달 상태
  const [pointModal, setPointModal] = useState(null) // { id, nickname }
  const [pointAmount, setPointAmount] = useState('')
  const [pointReason, setPointReason] = useState('')
  const [pointLoading, setPointLoading] = useState(false)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getUsers({ page, search, role: filterRole })
      setUsers(data.users)
      setTotal(data.total)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [page, search, filterRole])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const handleStatusChange = async (id, newStatus) => {
    const action = newStatus === 'suspended' ? '정지' : '활성화'
    if (!window.confirm(`이 유저를 ${action} 처리하시겠습니까?`)) return
    try {
      await updateUserStatus(id, newStatus)
      fetchUsers()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    setPage(1)
    fetchUsers()
  }

  const openPointModal = (user) => {
    setPointModal({ id: user.id, nickname: user.nickname })
    setPointAmount('')
    setPointReason('')
  }

  const handlePointSubmit = async () => {
    const amount = Number(pointAmount)
    if (!amount || isNaN(amount)) {
      alert('유효한 금액을 입력해주세요.')
      return
    }
    if (!pointReason.trim()) {
      alert('사유를 입력해주세요.')
      return
    }
    setPointLoading(true)
    try {
      await adjustUserPoints(pointModal.id, amount, pointReason.trim())
      alert('포인트가 조정되었습니다.')
      setPointModal(null)
      fetchUsers()
    } catch (err) {
      alert(err.message)
    } finally {
      setPointLoading(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">유저 관리</h1>

      {/* 필터 */}
      <div className="flex flex-wrap gap-3 mb-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="닉네임 또는 이메일 검색..."
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent w-64"
          />
          <button type="submit" className="px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-dark cursor-pointer">
            검색
          </button>
        </form>
        <select
          value={filterRole}
          onChange={e => { setFilterRole(e.target.value); setPage(1) }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white cursor-pointer"
        >
          <option value="">전체 역할</option>
          <option value="user">일반</option>
          <option value="business">자영업자</option>
        </select>
      </div>

      {loading ? (
        <div className="text-gray-400 text-center py-20">로딩 중...</div>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={users}
            emptyText="유저가 없습니다."
            renderRow={(user) => (
              <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-gray-500">{user.id}</td>
                <td className="px-4 py-3 font-medium text-gray-800">{user.nickname}</td>
                <td className="px-4 py-3 text-gray-600">{user.email || '-'}</td>
                <td className="px-4 py-3">
                  <Badge variant={roleMap[user.role]?.variant}>
                    {roleMap[user.role]?.label || user.role}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-gray-700 font-medium">{user.points.toLocaleString()}P</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{user.created_at}</td>
                <td className="px-4 py-3">
                  <Badge variant={user.status === 'active' ? 'green' : 'red'}>
                    {user.status === 'active' ? '활성' : '정지'}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1.5">
                    <ActionButton variant="outline" onClick={() => openPointModal(user)}>
                      포인트 조정
                    </ActionButton>
                    {user.status === 'active' ? (
                      <ActionButton variant="danger" onClick={() => handleStatusChange(user.id, 'suspended')}>
                        정지
                      </ActionButton>
                    ) : (
                      <ActionButton variant="success" onClick={() => handleStatusChange(user.id, 'active')}>
                        해제
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

      {/* 포인트 조정 모달 */}
      {pointModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setPointModal(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-96 max-w-[90vw] shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              포인트 조정 - {pointModal.nickname}
            </h3>

            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                금액 (양수: 지급 / 음수: 차감)
              </label>
              <input
                type="number"
                value={pointAmount}
                onChange={e => setPointAmount(e.target.value)}
                placeholder="예: 100 또는 -50"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                사유
              </label>
              <input
                type="text"
                value={pointReason}
                onChange={e => setPointReason(e.target.value)}
                placeholder="포인트 조정 사유를 입력하세요"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setPointModal(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 cursor-pointer"
              >
                취소
              </button>
              <button
                onClick={handlePointSubmit}
                disabled={pointLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-brand rounded-lg hover:bg-brand-dark cursor-pointer disabled:opacity-50"
              >
                {pointLoading ? '처리 중...' : '확인'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
