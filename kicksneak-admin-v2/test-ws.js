const WebSocket = require('ws');

const wsClient = new WebSocket('ws://localhost:3005/?role=client&sessionId=test_session_123');

wsClient.on('open', () => {
    console.log('Client connected');
    wsClient.send(JSON.stringify({ type: 'register_session', sessionId: 'test_session_123' }));
});

wsClient.on('message', (data) => {
    console.log('Client received:', data.toString());
});

const wsAdmin = new WebSocket('ws://localhost:3005/?role=admin');

wsAdmin.on('open', () => {
    console.log('Admin connected');
    setTimeout(() => {
        wsAdmin.send(JSON.stringify({
            type: 'message',
            sessionId: 'test_session_123',
            content: 'Hello from admin!',
            role: 'admin'
        }));
        console.log('Admin sent message');
    }, 1000);
});

wsAdmin.on('message', (data) => {
    console.log('Admin received:', data.toString());
});

setTimeout(() => {
    process.exit(0);
}, 3000);
