# zkLogin-ETH
Author: Onirique, ntc
## Notes
The version of AA contracts and bundler is v0.7

Bundler: http://IP:14337

Blockchain node: http://IP:8545

Prover server: http://IP:3000
## Prerequisites
Before running the demo application, ensure you have:
- A running Ethereum node at http://IP:8545
- A running prover service at http://IP:3000
**Important**: The demo application requires above services to be operational. Without them, the application will not function correctly.
## Demo application
Using Docker (Recommended)
1. Clone the repository:
```sh
git clone https://github.com/username/zkLogin-ETH.git
cd zkLogin-ETH
```
2. Edit the .env files with your configuration.
3. Start the application using Docker Compose:
```sh
docker-compose up
```
4. Access the application:
- Frontend: http://localhost:8080
- Backend API: http://localhost:3001