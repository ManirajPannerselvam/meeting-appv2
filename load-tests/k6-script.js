import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '1m', target: 100 },
    { duration: '3m', target: 100 },
    { duration: '1m', target: 0 }
  ],
  thresholds: {
    http_req_duration: ['p(95)<500']
  }
};

export default function () {
  const url = __ENV.BASE_URL || 'http://localhost:5173';
  // lightweight health check
  const res = http.get(url + '/api/health');
  check(res, { 'status 200': (r) => r.status === 200 });
  sleep(1);
}
