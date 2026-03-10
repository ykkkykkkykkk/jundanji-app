import { useState, useEffect, useCallback } from 'react'
import { getInquiries, answerInquiry } from '../api'
import DataTable, { Badge, Pagination } from '../components/DataTable'

const columns = [
  { key: 'id', label: 'ID', width: '50px' },
  { key: 'user', label: '유저' },
  { key: 'category', label: '유형', width: '70px' },
  { key: 'title', label: '제목' },
  { key: 'created_at', label: '등록일', width: '140px' },
  { key: 'status', label: '상태', width: '80px' },
  { key: 'actions', label: '액션', width: '80px' },
]

export default function InquiriesPage() {
  const [inquiries, setInquiries] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [filterStatus, setFilterStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [answerModal, setAnswerModal] = useState(null)
  const [answerText, setAnswerText] = useState('')
  const [answerLoading, setAnswerLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getInquiries({ page, status: filterStatus })
      setInquiries(data.inquiries)
      setTotal(data.total)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [page, filterStatus])

  useEffect(() => { load() }, [load])

  const handleAnswer = async () => {
    if (!answerText.trim()) return alert('답변 내용을 입력해주세요.')
    setAnswerLoading(true)
    try {
      await answerInquiry(answerModal.id, answerText)
      setAnswerModal(null)
      setAnswerText('')
      load()
    } catch (e) {
      alert(e.message)
    } finally {
      setAnswerLoading(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">1:1 문의 관리</h1>

      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={filterStatus}
          onChange={e => { setFilterStatus(e.target.value); setPage(1) }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white cursor-pointer"
        >
          <option value="">전체 상태</option>
          <option value="pending">대기</option>
          <option value="answered">답변완료</option>
        </select>
      </div>

      {loading ? (
        <div className="text-gray-400 text-center py-20">로딩 중...</div>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={inquiries}
            emptyText="문의가 없습니다."
            renderRow={(inq) => (
              <tr key={inq.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-gray-500">{inq.id}</td>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-800">{inq.nickname}</div>
                  <div className="text-gray-400 text-xs">{inq.email || '-'}</div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="default">{inq.category}</Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-800">
                    {inq.title.length > 25 ? inq.title.slice(0, 25) + '...' : inq.title}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">{inq.created_at}</td>
                <td className="px-4 py-3">
                  <Badge variant={inq.status === 'answered' ? 'green' : 'yellow'}>
                    {inq.status === 'answered' ? '답변완료' : '대기'}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => { setAnswerModal(inq); setAnswerText(inq.answer || '') }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                      inq.status === 'answered'
                        ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        : 'bg-brand text-white hover:bg-brand-dark'
                    }`}
                  >
                    {inq.status === 'answered' ? '보기' : '답변'}
                  </button>
                </td>
              </tr>
            )}
          />
          <Pagination page={page} total={total} limit={20} onChange={setPage} />
        </>
      )}

      {/* 답변 모달 */}
      {answerModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={(e) => { if (e.target === e.currentTarget) { setAnswerModal(null); setAnswerText('') } }}
        >
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg mx-4" style={{ maxHeight: '80vh', overflow: 'auto' }}>
            <h3 className="text-lg font-bold text-gray-900 mb-4">문의 상세</h3>

            <div className="mb-3">
              <div className="text-xs text-gray-400 mb-1">유저</div>
              <div className="text-sm text-gray-700">{answerModal.nickname} ({answerModal.email || '-'})</div>
            </div>

            <div className="mb-3">
              <div className="text-xs text-gray-400 mb-1">유형 / 등록일</div>
              <div className="text-sm text-gray-700">{answerModal.category} / {answerModal.created_at}</div>
            </div>

            <div className="mb-3">
              <div className="text-xs text-gray-400 mb-1">제목</div>
              <div className="text-sm font-semibold text-gray-900">{answerModal.title}</div>
            </div>

            <div className="mb-4 p-3 bg-gray-50 rounded-xl text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {answerModal.content}
            </div>

            <div className="mb-2">
              <div className="text-xs text-gray-400 mb-1">답변</div>
              <textarea
                value={answerText}
                onChange={e => setAnswerText(e.target.value)}
                placeholder="답변 내용을 입력하세요..."
                rows={4}
                className="w-full p-3 border border-gray-300 rounded-xl text-sm leading-relaxed resize-y"
                style={{ boxSizing: 'border-box' }}
              />
            </div>

            <div className="flex gap-2 justify-end mt-4">
              <button
                onClick={() => { setAnswerModal(null); setAnswerText('') }}
                className="px-5 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 cursor-pointer"
              >
                닫기
              </button>
              <button
                onClick={handleAnswer}
                disabled={answerLoading}
                className="px-5 py-2 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand-dark cursor-pointer"
                style={{ opacity: answerLoading ? 0.5 : 1 }}
              >
                {answerLoading ? '저장 중...' : '답변 저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
