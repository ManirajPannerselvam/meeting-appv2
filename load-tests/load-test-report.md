# Load Test Report

This is a placeholder load test report. To generate real results:

1. Install k6: https://k6.io/
2. Configure environment: set BASE_URL to target server.
3. Run: `k6 run load-tests/k6-script.js`

Planned scenarios (not executed here):
- 100,000 simulated users (requires distributed k6 or cloud)
- 10,000 groups
- 1,000,000 messages

Metrics to collect:
- API latency
- DB latency
- WS latency
- Memory
- CPU

Notes:
- Running these at scale requires a distributed load-test environment and staging infra.
