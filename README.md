# Pool Shield
Free Solana token risk checker. No dependencies. Needs Node 18+.

## Easiest: double-click start.bat
First run asks for your RPC URL and saves it in rpc.txt. Delete rpc.txt to change it. Never upload rpc.txt to GitHub or Vercel.

## Or run by hand
    node server.js
Open http://localhost:3000

If you get RPC errors, get a free key at helius.dev, then:
    set RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY   (Windows cmd)
    node server.js

## Deploy free
Push this folder to GitHub, import it on vercel.com, add RPC_URL as an environment variable. Share links like yoursite.com/?mint=TOKEN_ADDRESS

## v1 limits
Liquidity lock is not verified yet. That is the first thing to add in v2.

## Tests
    node tests/unit.js          offline checks, run before every upload
    node tests/live.js --save   save a baseline from the real chain (needs RPC_URL)
    node tests/live.js          compare today's results with the baseline
