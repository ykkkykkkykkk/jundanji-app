export default function BottomNav({ currentPage, onNavigate }) {
  const items = [
    { id: 'main', icon: '🏠', label: '홈' },
    { id: 'mypage', icon: '👤', label: '마이' },
    { id: 'admin', icon: '⚙️', label: '관리' },
  ]

  return (
    <nav className="bottom-nav">
      {items.map((item) => (
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
