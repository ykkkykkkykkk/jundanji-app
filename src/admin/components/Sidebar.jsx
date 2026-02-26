const menuItems = [
  { key: 'dashboard', label: '대시보드', icon: '📊' },
  { key: 'flyers', label: '전단지 관리', icon: '📋' },
  { key: 'users', label: '유저 관리', icon: '👥' },
  { key: 'points', label: '포인트 정산', icon: '💰' },
  { key: 'business', label: '자영업자 관리', icon: '🏪' },
]

export default function Sidebar({ current, onChange, onLogout }) {
  return (
    <aside className="w-60 bg-white border-r border-gray-200 flex flex-col h-full shrink-0">
      {/* 로고 */}
      <div className="h-16 flex items-center px-6 border-b border-gray-200">
        <span className="text-xl font-bold text-brand">전단지</span>
        <span className="ml-1.5 text-xs bg-brand text-white px-1.5 py-0.5 rounded font-medium">Admin</span>
      </div>

      {/* 메뉴 */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {menuItems.map(item => {
          const active = current === item.key
          return (
            <button
              key={item.key}
              onClick={() => onChange(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                active
                  ? 'bg-brand-light text-brand'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* 로그아웃 */}
      <div className="p-3 border-t border-gray-200">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer"
        >
          <span className="text-lg">🚪</span>
          로그아웃
        </button>
      </div>
    </aside>
  )
}
