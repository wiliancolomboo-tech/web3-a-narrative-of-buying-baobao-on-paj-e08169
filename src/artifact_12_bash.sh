# 1. Clone repository & install dependencies
git clone https://github.com/sponsor/baobao-paj-engine.git
cd baobao-paj-engine
npm install

# 2. Compile Anchor Program
anchor build
anchor deploy --provider.cluster mainnet

# 3. Configure runtime credentials
cp .env.example .env
nano .env

# 4. Execute unit test harness
npm run test

# 5. Launch the autonomous trading container via Docker Compose
docker compose up -d --build