import { useState, useEffect, useCallback } from 'react'
import { getCategories, addCategory, updateCategory, deleteCategory } from '../api'
import DataTable, { ActionButton } from '../components/DataTable'

const columns = [
  { key: 'id', label: 'ID', width: '60px' },
  { key: 'name', label: '카테고리명' },
  { key: 'sort_order', label: '정렬순서', width: '100px' },
  { key: 'actions', label: '액션', width: '200px' },
]

export default function CategoriesPage() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editOrder, setEditOrder] = useState(0)

  const fetchCategories = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getCategories()
      setCategories(data.categories)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchCategories() }, [fetchCategories])

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    try {
      await addCategory(newName.trim())
      setNewName('')
      fetchCategories()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('정말 삭제하시겠습니까?')) return
    try {
      await deleteCategory(id)
      fetchCategories()
    } catch (err) {
      alert(err.message)
    }
  }

  const startEdit = (cat) => {
    setEditingId(cat.id)
    setEditName(cat.name)
    setEditOrder(cat.sort_order)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
    setEditOrder(0)
  }

  const handleUpdate = async () => {
    if (!editName.trim()) return
    try {
      await updateCategory(editingId, { name: editName.trim(), sortOrder: editOrder })
      cancelEdit()
      fetchCategories()
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">카테고리 관리</h1>

      {/* 추가 폼 */}
      <form onSubmit={handleAdd} className="flex gap-2 mb-4">
        <input
          type="text"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="새 카테고리 이름..."
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent w-64"
        />
        <button type="submit" className="px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-dark cursor-pointer">
          추가
        </button>
      </form>

      {loading ? (
        <div className="text-gray-400 text-center py-20">로딩 중...</div>
      ) : (
        <DataTable
          columns={columns}
          data={categories}
          emptyText="카테고리가 없습니다."
          renderRow={(cat) => (
            <tr key={cat.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 text-gray-500">{cat.id}</td>
              <td className="px-4 py-3 font-medium text-gray-800">
                {editingId === cat.id ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-brand w-40"
                  />
                ) : (
                  cat.name
                )}
              </td>
              <td className="px-4 py-3 text-gray-600">
                {editingId === cat.id ? (
                  <input
                    type="number"
                    value={editOrder}
                    onChange={e => setEditOrder(Number(e.target.value))}
                    className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-brand w-20"
                  />
                ) : (
                  cat.sort_order
                )}
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-1.5">
                  {editingId === cat.id ? (
                    <>
                      <ActionButton variant="success" onClick={handleUpdate}>저장</ActionButton>
                      <ActionButton variant="outline" onClick={cancelEdit}>취소</ActionButton>
                    </>
                  ) : (
                    <>
                      <ActionButton variant="primary" onClick={() => startEdit(cat)}>수정</ActionButton>
                      <ActionButton variant="danger" onClick={() => handleDelete(cat.id)}>삭제</ActionButton>
                    </>
                  )}
                </div>
              </td>
            </tr>
          )}
        />
      )}
    </div>
  )
}
