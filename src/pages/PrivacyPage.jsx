export default function PrivacyPage({ onBack }) {
  return (
    <div className="page legal-page">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', gap: 8 }}>
          <button className="back-btn" onClick={onBack}>←</button>
          <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)' }}>개인정보 처리방침</span>
        </div>
      </div>

      <div className="legal-content">
        <p className="legal-updated">최종 수정일: 2026년 3월 15일</p>

        <section className="legal-section">
          <h2>1. 개인정보의 수집 및 이용 목적</h2>
          <p>전단지P(이하 "서비스")는 다음의 목적으로 개인정보를 수집 및 이용합니다.</p>
          <ul>
            <li>회원 가입 및 관리: 회원 식별, 본인 확인, 서비스 이용 자격 관리</li>
            <li>서비스 제공: 전단지 열람, 포인트 적립 및 사용, 기프티콘 교환, QR 방문 인증</li>
            <li>포인트 및 보상 관리: 포인트 적립, 차감, 기프티콘 발송, 출금 처리</li>
            <li>서비스 개선: 이용 통계 분석, 서비스 품질 향상</li>
            <li>부정 이용 방지: 다중 계정 탐지, 봇 방지, 비정상 활동 모니터링</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>2. 수집하는 개인정보 항목</h2>
          <p>서비스는 다음의 개인정보를 수집합니다.</p>
          <ul>
            <li><strong>필수 항목:</strong> 이메일, 비밀번호(암호화 저장), 닉네임</li>
            <li><strong>소셜 로그인 시:</strong> 소셜 계정 식별자, 이메일, 프로필 정보</li>
            <li><strong>기프티콘 교환 시:</strong> 휴대전화 번호</li>
            <li><strong>출금 신청 시:</strong> 은행명, 계좌번호, 예금주</li>
            <li><strong>자동 수집:</strong> 기기 식별 정보(fingerprint), 서비스 이용 기록, 접속 로그</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>3. 개인정보의 보유 및 이용 기간</h2>
          <p>회원의 개인정보는 회원 탈퇴 시까지 보유하며, 탈퇴 후 지체 없이 파기합니다. 단, 관계 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다.</p>
          <ul>
            <li>전자상거래 등에서의 소비자 보호에 관한 법률: 계약 또는 청약철회 관련 기록 5년, 대금결제 및 재화 등의 공급에 관한 기록 5년</li>
            <li>통신비밀보호법: 접속 로그 기록 3개월</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>4. 개인정보의 제3자 제공</h2>
          <p>서비스는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만, 다음의 경우에는 예외로 합니다.</p>
          <ul>
            <li>이용자가 사전에 동의한 경우</li>
            <li>법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</li>
            <li>기프티콘 발송을 위한 제휴사 제공 (휴대전화 번호에 한함)</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>5. 개인정보의 파기</h2>
          <p>개인정보 보유 기간이 경과하거나 처리 목적이 달성된 경우, 지체 없이 해당 개인정보를 파기합니다.</p>
          <ul>
            <li>전자적 파일 형태: 복구 및 재생이 불가능한 방법으로 영구 삭제</li>
            <li>종이 문서: 분쇄기로 분쇄하거나 소각</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>6. 이용자의 권리 및 행사 방법</h2>
          <p>이용자는 언제든지 다음의 권리를 행사할 수 있습니다.</p>
          <ul>
            <li>개인정보 열람 요구</li>
            <li>오류 등이 있는 경우 정정 요구</li>
            <li>삭제 요구</li>
            <li>처리정지 요구</li>
          </ul>
          <p>권리 행사는 마이페이지의 1:1 문의를 통해 가능하며, 지체 없이 조치하겠습니다.</p>
        </section>

        <section className="legal-section">
          <h2>7. 개인정보 보호책임자</h2>
          <p>서비스의 개인정보 보호책임자는 다음과 같습니다.</p>
          <ul>
            <li>담당 부서: 전단지P 운영팀</li>
            <li>문의: 마이페이지 &gt; 1:1 문의</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>8. 개인정보 처리방침 변경</h2>
          <p>본 개인정보 처리방침이 변경되는 경우, 시행일 7일 전부터 서비스 내 공지사항을 통해 안내합니다.</p>
        </section>
      </div>
    </div>
  )
}
