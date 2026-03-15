#!/bin/bash

# E2E 테스트 실행 스크립트
# 사용법: ./run-tests.sh [옵션]

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo "=================================================="
echo "전단지P E2E 테스트 실행"
echo "=================================================="
echo ""

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 옵션 파싱
HEADED=""
DEBUG=""
WORKERS=""
FILE_FILTER=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --headed)
      HEADED="--headed"
      echo -e "${BLUE}헤드리스 모드 비활성화: 브라우저 화면 표시${NC}"
      shift
      ;;
    --debug)
      DEBUG="--debug"
      echo -e "${BLUE}디버그 모드 활성화${NC}"
      shift
      ;;
    --workers)
      WORKERS="--workers=$2"
      echo -e "${BLUE}워커 수 설정: $2${NC}"
      shift 2
      ;;
    -f)
      FILE_FILTER=$2
      echo -e "${BLUE}파일 필터: $FILE_FILTER${NC}"
      shift 2
      ;;
    -g)
      GREP_FILTER=$2
      echo -e "${BLUE}테스트명 필터: $GREP_FILTER${NC}"
      shift 2
      ;;
    -h|--help)
      echo "사용법: ./run-tests.sh [옵션]"
      echo ""
      echo "옵션:"
      echo "  --headed          브라우저 화면 표시"
      echo "  --debug           디버그 모드 실행"
      echo "  --workers N       워커 수 설정 (기본: 병렬)"
      echo "  -f <파일>         특정 테스트 파일만 실행 (예: main-page)"
      echo "  -g <이름>         테스트명으로 필터 (예: 'should load')"
      echo "  -h, --help        이 메시지 표시"
      echo ""
      echo "예제:"
      echo "  ./run-tests.sh                          # 모든 테스트 실행"
      echo "  ./run-tests.sh --headed                 # 브라우저 표시"
      echo "  ./run-tests.sh -f main-page             # main-page 테스트만"
      echo "  ./run-tests.sh -g 'should navigate'     # 이름 필터"
      exit 0
      ;;
    *)
      echo -e "${RED}알 수 없는 옵션: $1${NC}"
      exit 1
      ;;
  esac
done

echo ""

# 개발 서버 확인
echo -e "${YELLOW}개발 서버 상태 확인...${NC}"
if curl -s http://localhost:5173/ > /dev/null 2>&1; then
  echo -e "${GREEN}✓ 개발 서버가 실행 중입니다 (localhost:5173)${NC}"
else
  echo -e "${YELLOW}⚠ 개발 서버가 실행되지 않음 (자동 시작 시도)${NC}"
  echo "  터미널을 열고 다음을 실행하세요:"
  echo "  cd \"$PROJECT_DIR\" && npm run dev"
  echo ""
fi

echo ""
echo "=================================================="
echo "테스트 파일 목록"
echo "=================================================="

ls -lh "$PROJECT_DIR/tests/"*.spec.ts 2>/dev/null | awk '{print "  " $NF}' || echo "  테스트 파일을 찾을 수 없습니다"

echo ""
echo "=================================================="
echo "테스트 실행 시작"
echo "=================================================="
echo ""

# 테스트 명령어 구성
TEST_CMD="npx playwright test"

if [ -n "$FILE_FILTER" ]; then
  TEST_CMD="$TEST_CMD tests/${FILE_FILTER}.spec.ts"
elif [ -n "$GREP_FILTER" ]; then
  TEST_CMD="$TEST_CMD -g \"$GREP_FILTER\""
fi

if [ -n "$HEADED" ]; then
  TEST_CMD="$TEST_CMD $HEADED"
fi

if [ -n "$DEBUG" ]; then
  TEST_CMD="$TEST_CMD $DEBUG"
fi

if [ -n "$WORKERS" ]; then
  TEST_CMD="$TEST_CMD $WORKERS"
fi

echo -e "${BLUE}실행: $TEST_CMD${NC}"
echo ""

# 테스트 실행
eval $TEST_CMD
TEST_RESULT=$?

echo ""
echo "=================================================="

if [ $TEST_RESULT -eq 0 ]; then
  echo -e "${GREEN}✓ 모든 테스트 통과!${NC}"
else
  echo -e "${RED}✗ 일부 테스트 실패${NC}"
fi

echo "=================================================="
echo ""

# 리포트 생성 제안
echo -e "${BLUE}테스트 리포트를 보시겠습니까?${NC}"
echo "  npx playwright show-report"
echo ""

exit $TEST_RESULT
