export default function TermsPage({ onBack }) {
  return (
    <div className="page legal-page">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', gap: 8 }}>
          <button className="back-btn" onClick={onBack}>←</button>
          <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)' }}>이용약관</span>
        </div>
      </div>

      <div className="legal-content">
        <p className="legal-updated">최종 수정일: 2026년 3월 15일</p>

        <section className="legal-section">
          <h2>제1조 (목적)</h2>
          <p>본 약관은 전단지P(이하 "서비스")의 이용에 관한 조건 및 절차, 회사와 회원 간의 권리와 의무, 기타 필요한 사항을 규정함을 목적으로 합니다.</p>
        </section>

        <section className="legal-section">
          <h2>제2조 (용어의 정의)</h2>
          <ul>
            <li><strong>"회원"</strong>이란 서비스에 가입하여 이용 계약을 체결한 자를 말합니다.</li>
            <li><strong>"포인트"</strong>란 서비스 내에서 전단지 공유, 퀴즈 참여, 방문 인증 등의 활동으로 적립되며, 기프티콘 교환 등에 사용할 수 있는 가상의 보상 단위를 말합니다.</li>
            <li><strong>"전단지"</strong>란 자영업자가 서비스에 등록한 상품 홍보 콘텐츠를 말합니다.</li>
            <li><strong>"자영업자 회원"</strong>이란 전단지를 등록하고 관리하는 사업자 회원을 말합니다.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>제3조 (약관의 효력 및 변경)</h2>
          <ul>
            <li>본 약관은 서비스 내에 게시하거나 기타의 방법으로 회원에게 공지함으로써 효력이 발생합니다.</li>
            <li>회사는 관련 법령에 위배되지 않는 범위에서 약관을 개정할 수 있으며, 개정 시 시행일 7일 전부터 공지합니다.</li>
            <li>변경된 약관에 동의하지 않을 경우 회원은 탈퇴할 수 있으며, 시행일 이후에도 서비스를 계속 이용하는 경우 약관 변경에 동의한 것으로 간주합니다.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>제4조 (회원 가입)</h2>
          <ul>
            <li>회원 가입은 이메일/비밀번호 또는 소셜 로그인(카카오, 구글)으로 가능합니다.</li>
            <li>회원 가입 시 본 약관 및 개인정보 처리방침에 동의해야 합니다.</li>
            <li>허위 정보를 기재하거나 타인의 정보를 도용한 경우 서비스 이용이 제한될 수 있습니다.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>제5조 (서비스의 내용)</h2>
          <p>서비스가 제공하는 주요 기능은 다음과 같습니다.</p>
          <ul>
            <li>전단지 열람 및 공유 (포인트 적립)</li>
            <li>퀴즈 참여 (포인트 적립)</li>
            <li>QR 코드를 통한 매장 방문 인증 (포인트 적립)</li>
            <li>포인트를 활용한 기프티콘 교환</li>
            <li>자영업자의 전단지 등록 및 관리</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>제6조 (포인트 정책)</h2>
          <ul>
            <li>포인트는 전단지 공유, 퀴즈 정답, QR 방문 인증 등의 활동을 통해 적립됩니다.</li>
            <li>적립된 포인트는 기프티콘 교환에 사용할 수 있습니다.</li>
            <li>포인트는 현금이 아니며, 타인에게 양도하거나 매매할 수 없습니다.</li>
            <li>부정한 방법으로 포인트를 적립한 경우, 해당 포인트는 차감되며 서비스 이용이 제한될 수 있습니다.</li>
            <li>서비스 종료 시 미사용 포인트에 대해 사전 안내 후 정산 절차를 진행합니다.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>제7조 (회원의 의무)</h2>
          <ul>
            <li>회원은 서비스 이용 시 관련 법령 및 본 약관을 준수해야 합니다.</li>
            <li>다중 계정 생성, 봇 사용, 자동화 프로그램을 통한 부정 이용을 금지합니다.</li>
            <li>타인의 개인정보를 도용하거나 서비스를 부정하게 이용해서는 안 됩니다.</li>
            <li>서비스의 안정적 운영을 방해하는 행위를 해서는 안 됩니다.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>제8조 (이용 제한)</h2>
          <p>다음의 경우 서비스 이용을 제한하거나 회원 자격을 정지할 수 있습니다.</p>
          <ul>
            <li>본 약관을 위반한 경우</li>
            <li>부정한 방법으로 포인트를 적립하거나 사용한 경우</li>
            <li>다중 계정을 이용한 경우</li>
            <li>비정상적인 긁기 행위(봇) 등이 탐지된 경우</li>
            <li>기타 서비스의 정상적인 운영을 방해한 경우</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>제9조 (서비스의 중단)</h2>
          <ul>
            <li>회사는 시스템 점검, 장비 교체, 고장 등 부득이한 사유가 있는 경우 서비스의 전부 또는 일부를 일시 중단할 수 있습니다.</li>
            <li>서비스 중단 시 사전에 공지하며, 불가피한 경우 사후 공지할 수 있습니다.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>제10조 (면책 조항)</h2>
          <ul>
            <li>회사는 천재지변, 불가항력 등으로 서비스를 제공할 수 없는 경우 책임이 면제됩니다.</li>
            <li>회원의 귀책 사유로 인한 서비스 이용 장애에 대해 회사는 책임을 지지 않습니다.</li>
            <li>회사는 회원이 서비스를 이용하여 기대하는 수익을 얻지 못하거나 상실한 것에 대해 책임을 지지 않습니다.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>제11조 (분쟁 해결)</h2>
          <p>서비스 이용과 관련하여 분쟁이 발생한 경우, 쌍방 간 협의를 통해 해결하며, 협의가 이루어지지 않는 경우 관할 법원에 소를 제기할 수 있습니다.</p>
        </section>

        <section className="legal-section">
          <h2>부칙</h2>
          <p>본 약관은 2026년 3월 15일부터 시행합니다.</p>
        </section>
      </div>
    </div>
  )
}
