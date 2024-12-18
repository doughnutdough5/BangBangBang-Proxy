# 우분투 베이스 이미지 사용
FROM ubuntu:22.04

# 기본적인 패키지 업데이트 및 필수 패키지 설치
RUN apt-get update && \
    apt-get install -y \
    curl \
    gnupg2 \
    lsb-release \
    ca-certificates

# Node.js 설치 (NodeSource에서 최신 LTS 버전 설치)
RUN curl -sL https://deb.nodesource.com/setup_20.x | bash && \
    apt-get install -y nodejs

# 작업 디렉토리 설정
WORKDIR /bangbangbang-proxy

# package.json과 package-lock.json 파일을 컨테이너에 복사
COPY package*.json /bangbangbang-proxy/

# 의존성 설치
RUN npm install

# 애플리케이션 소스 파일 복사
COPY . /bangbangbang-proxy/

# 애플리케이션 포트 노출
EXPOSE 8000

# 앱 실행
CMD ["npm", "start"]