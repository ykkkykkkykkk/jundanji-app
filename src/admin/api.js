const BASE = '/api/admin'

function getToken() {
  return sessionStorage.getItem('admin_token')
}

async function request(url, options = {}) {
  const token = getToken()
  const res = await fetch(`${BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-admin-token': token || '',
      ...options.headers,
    },
  })
  const data = await res.json()
  if (res.status === 401) {
    sessionStorage.removeItem('admin_token')
    window.location.reload()
    throw new Error('세션 만료 - 다시 로그인합니다.')
  }
  if (!res.ok) throw new Error(data.message || '요청 실패')
  return data
}

export async function login(password) {
  const data = await request('/login', {
    method: 'POST',
    body: JSON.stringify({ password }),
  })
  sessionStorage.setItem('admin_token', data.token)
  return data
}

export function logout() {
  sessionStorage.removeItem('admin_token')
}

export function isLoggedIn() {
  return !!getToken()
}

// 대시보드
export const getDashboard = () => request('/dashboard')

// 전단지
export const getFlyers = (params = {}) => {
  const q = new URLSearchParams(params).toString()
  return request(`/flyers?${q}`)
}
export const updateFlyerStatus = (id, status) =>
  request(`/flyers/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })

// 유저
export const getUsers = (params = {}) => {
  const q = new URLSearchParams(params).toString()
  return request(`/users?${q}`)
}
export const updateUserStatus = (id, status) =>
  request(`/users/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })

// 기프티콘 주문
export const getGiftOrders = (params = {}) => {
  const q = new URLSearchParams(params).toString()
  return request(`/gift-orders?${q}`)
}
export const updateGiftOrderStatus = (id, status) =>
  request(`/gift-orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })

// 자영업자
export const getBusinesses = (params = {}) => {
  const q = new URLSearchParams(params).toString()
  return request(`/business?${q}`)
}
export const approveBusiness = (id, approved) =>
  request(`/business/${id}/approve`, { method: 'PATCH', body: JSON.stringify({ approved }) })

// 카테고리
export const getCategories = () => request('/categories')
export const addCategory = (name) =>
  request('/categories', { method: 'POST', body: JSON.stringify({ name }) })
export const updateCategory = (id, data) =>
  request(`/categories/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
export const deleteCategory = (id) =>
  request(`/categories/${id}`, { method: 'DELETE' })

// 1:1 문의
export const getInquiries = (params = {}) => {
  const q = new URLSearchParams(params).toString()
  return request(`/inquiries?${q}`)
}
export const answerInquiry = (id, answer) =>
  request(`/inquiries/${id}/answer`, { method: 'PATCH', body: JSON.stringify({ answer }) })
