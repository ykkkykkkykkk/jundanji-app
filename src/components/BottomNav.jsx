export default function BottomNav({ currentPage, onNavigate, isLoggedIn, userRole }) {
  const items = [
    { id: 'main', icon: '🏠', label: '홈', show: true },
    { id: 'mypage', icon: '👤', label: '마이', show: true },
    { id: 'scan', icon: '📷', label: 'QR스캔', show: !!isLoggedIn },
    { id: 'admin', icon: '🏢', label: '사업자', show: userRole === 'business' },
  ]

  const visibleItems = items.filter(i => i.show)

  return (
    <nav className="bottom-nav">
      {visibleItems.map((item) => (
        <button
          key={item.id}
          className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
          onClick={() => onNavigate(item.id)}
        >
          <span className="nav-icon">{item.icon}</span>
          <span className="nav-label">{item.label}</span>
        </button>
      ))}
    </nav>
  )
}
