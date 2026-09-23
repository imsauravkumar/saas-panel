const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const { io: Client } = require('socket.io-client');
const jwt = require('jsonwebtoken');

describe('Socket Test: Concurrency & Real-Time Event Harness', () => {
  let io, server, serverPort;
  let clientSocketAdmin, clientSocketUser;

  const mockAdminToken = jwt.sign({ id: 'mock_admin_1', role: 'admin' }, 'test_secret');
  const mockUserToken = jwt.sign({ id: 'mock_user_1', role: 'user' }, 'test_secret');

  beforeAll((done) => {
    const app = express();
    server = http.createServer(app);
    io = new Server(server, { cors: { origin: '*' } });

    io.on('connection', (socket) => {
      socket.on('group:join', ({ groupId }) => {
        socket.join(`group:${groupId}`);
      });

      socket.on('message:send', (data, ack) => {
        io.to(`group:${data.groupId}`).emit('message:new', {
          ...data,
          senderId: socket.handshake.auth?.userId || 'test_user',
          createdAt: new Date(),
        });
        if (typeof ack === 'function') ack({ success: true });
      });

      socket.on('typing:start', ({ groupId, userName }) => {
        socket.to(`group:${groupId}`).emit('typing:update', { groupId, userName, isTyping: true });
      });
    });

    server.listen(() => {
      serverPort = server.address().port;

      clientSocketAdmin = Client(`http://localhost:${serverPort}`, {
        auth: { token: mockAdminToken, userId: 'mock_admin_1' },
        transports: ['websocket'],
      });

      clientSocketUser = Client(`http://localhost:${serverPort}`, {
        auth: { token: mockUserToken, userId: 'mock_user_1' },
        transports: ['websocket'],
      });

      let connects = 0;
      const onConnect = () => {
        connects++;
        if (connects === 2) done();
      };

      clientSocketAdmin.on('connect', onConnect);
      clientSocketUser.on('connect', onConnect);
    });
  });

  afterAll(() => {
    clientSocketAdmin.disconnect();
    clientSocketUser.disconnect();
    io.close();
    server.close();
  });

  test('Both Admin and User sockets connect successfully to server', () => {
    expect(clientSocketAdmin.connected).toBe(true);
    expect(clientSocketUser.connected).toBe(true);
  });

  test('Message sent by Admin is received by User in the same channel room', (done) => {
    const testGroupId = 'channel_general_123';

    clientSocketAdmin.emit('group:join', { groupId: testGroupId });
    clientSocketUser.emit('group:join', { groupId: testGroupId });

    clientSocketUser.on('message:new', (msg) => {
      try {
        expect(msg.groupId).toBe(testGroupId);
        expect(msg.content).toBe('Hello from Admin via live socket!');
        done();
      } catch (err) {
        done(err);
      }
    });

    setTimeout(() => {
      clientSocketAdmin.emit('message:send', {
        groupId: testGroupId,
        type: 'text',
        content: 'Hello from Admin via live socket!',
      });
    }, 50);
  });

  test('Typing indicator updates broadcast to other room members', (done) => {
    const testGroupId = 'channel_general_123';

    clientSocketUser.on('typing:update', (data) => {
      try {
        expect(data.isTyping).toBe(true);
        expect(data.userName).toBe('Admin User');
        done();
      } catch (err) {
        done(err);
      }
    });

    clientSocketAdmin.emit('typing:start', { groupId: testGroupId, userName: 'Admin User' });
  });
});
