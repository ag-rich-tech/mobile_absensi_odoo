const fetch = globalThis.fetch || require('node-fetch');

async function test() {
  const res = await fetch('https://odoo14.hiddenlab.me/jsonrpc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      params: {
        service: 'object',
        method: 'execute_kw',
        args: [
          'HLB', 2, 'admin', 'resource.calendar.attendance', 'search_read',
          [],
          { fields: ['calendar_id', 'dayofweek', 'hour_from', 'hour_to', 'name', 'day_period'], limit: 15 }
        ]
      },
      id: 1
    })
  });
  const data = await res.json();
  console.log('Data:', JSON.stringify(data));
}
test();

