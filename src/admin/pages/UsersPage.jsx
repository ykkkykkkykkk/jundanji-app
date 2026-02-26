import { useState, useEffect, useCallback } from 'react'
import { getUsers, updateUserStatus } from '../api'
import DataTable, { Badge, ActionButton, Pagination } from '../components/DataTable'

const columns = [
  { key: 'id', label: 'ID', width: '60px' },
  { key: 'nickname', label: '닉네임' },
  { key: 'email', label: '이메일' },
  { key: 'role', label: '역할', width: '90px' },
  { key: 'points', label: '포인트', width: '100px' },
  { key: 'created_at', label: '가입일', width: '160px' },
  { key: 'status', label: '상태', width: '80px' },
  { key: 'actions', label: '액션', width: '120px' },
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
                  {user.status === 'active' ? (
                    <ActionButton variant="danger" onClick={() => handleStatusChange(user.id, 'suspended')}>
                      정지
                    </ActionButton>
                  ) : (
                    <ActionButton variant="success" onClick={() => handleStatusChange(user.id, 'active')}>
                      해제
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
