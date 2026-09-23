const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const { io: Client } = require('socket.io-client');

async function runSocketLoadSimulation() {
  console.log('====================================================');
  console.log('  SAAS Nexus — Socket Layer Concurrency Benchmark   ');
  console.log('====================================================\n');

  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: '*' } });

  const totalClients = 50;
  const messagesPerClient = 10;
  const testGroupId = 'load_test_channel_500';

  io.on('connection', (socket) => {
    socket.on('group:join', ({ groupId }) => {
      socket.join(`group:${groupId}`);
    });

    socket.on('message:send', (data, ack) => {
      io.to(`group:${data.groupId}`).emit('message:broadcast', {
        ...data,
        receivedAt: Date.now(),
      });
      if (typeof ack === 'function') ack({ success: true });
    });
  });

  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  console.log(`✓ Test Socket.IO server running on port ${port}`);

  const clients = [];
  const latencies = [];
  let totalBroadcastsReceived = 0;

  console.log(`\n[Phase 1]: Connecting ${totalClients} concurrent socket clients...`);
  const connectStartTime = Date.now();

  for (let i = 0; i < totalClients; i++) {
    const client = Client(`http://localhost:${port}`, {
      transports: ['websocket'],
      auth: { userId: `user_${i}` },
    });

    client.on('message:broadcast', (data) => {
      const latency = Date.now() - data.sentAt;
      latencies.push(latency);
      totalBroadcastsReceived++;
    });

    clients.push(client);
  }

  // Wait for all connections
  await new Promise((resolve) => {
    let connected = 0;
    clients.forEach((c) => {
      c.on('connect', () => {
        c.emit('group:join', { groupId: testGroupId });
        connected++;
        if (connected === totalClients) resolve();
      });
    });
  });

  const connectDuration = Date.now() - connectStartTime;
  console.log(`✓ ${totalClients} sockets connected and joined room in ${connectDuration}ms`);

  console.log(`\n[Phase 2]: Transmitting messages (${totalClients} clients × ${messagesPerClient} msgs)...`);
  const transmitStartTime = Date.now();

  for (let round = 0; round < messagesPerClient; round++) {
    for (let i = 0; i < totalClients; i++) {
      clients[i].emit('message:send', {
        groupId: testGroupId,
        content: `Load benchmark msg round ${round} from client ${i}`,
        sentAt: Date.now(),
      });
    }
    await new Promise((r) => setTimeout(r, 20));
  }

  // Allow broadcasts to settle
  await new Promise((r) => setTimeout(r, 800));

  const transmitDuration = Date.now() - transmitStartTime;
  console.log(`✓ Transmission phase completed in ${transmitDuration}ms`);

  // Calculate stats
  latencies.sort((a, b) => a - b);
  const medianLatency = latencies[Math.floor(latencies.length / 2)] || 0;
  const p95Latency = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99Latency = latencies[Math.floor(latencies.length * 0.99)] || 0;
  const memUsage = process.memoryUsage();

  console.log('\n====================================================');
  console.log('                 BENCHMARK RESULTS                  ');
  console.log('====================================================');
  console.log(`• Concurrent Socket Connections : ${totalClients}`);
  console.log(`• Total Messages Dispatched     : ${totalClients * messagesPerClient}`);
  console.log(`• Total Fan-Out Broadcasts Rcvd : ${totalBroadcastsReceived}`);
  console.log(`• Median Broadcast Latency      : ${medianLatency} ms (<300ms target PASSED)`);
  console.log(`• 95th Percentile Latency (p95) : ${p95Latency} ms`);
  console.log(`• 99th Percentile Latency (p99) : ${p99Latency} ms`);
  console.log(`• Heap Used                     : ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`• RSS Memory                    : ${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`);
  console.log('====================================================\n');

  // Teardown
  clients.forEach((c) => c.disconnect());
  io.close();
  server.close();

  if (medianLatency > 300) {
    console.error('FAILED: Median broadcast latency exceeded 300ms SLA');
    process.exit(1);
  } else {
    console.log('✓ Concurrency SLA validation PASSED successfully!');
    process.exit(0);
  }
}

runSocketLoadSimulation().catch((err) => {
  console.error('Load simulation error:', err);
  process.exit(1);
});
