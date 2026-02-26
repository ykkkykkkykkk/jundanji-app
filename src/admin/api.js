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

// 출금
export const getWithdrawals = (params = {}) => {
  const q = new URLSearchParams(params).toString()
  return request(`/withdrawals?${q}`)
}
export const updateWithdrawalStatus = (id, status) =>
  request(`/withdrawals/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })

// 자영업자
export const getBusinesses = (params = {}) => {
  const q = new URLSearchParams(params).toString()
  return request(`/business?${q}`)
}
export const approveBusiness = (id, approved) =>
  request(`/business/${id}/approve`, { method: 'PATCH', body: JSON.stringify({ approved }) })
