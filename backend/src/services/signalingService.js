import { WebSocketServer, WebSocket } from 'ws';

/**
 * Lightweight, zero-cost WebSocket signaling service for WebRTC P2P transfers
 */
export function setupSignalingServer(httpServer) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const rooms = new Map(); // roomId -> Set of WebSocket clients

  wss.on('connection', (ws, req) => {
    let currentRoom = null;
    let peerId = null;

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);

        switch (data.type) {
          case 'join': {
            currentRoom = data.roomId;
            peerId = data.peerId || Math.random().toString(36).substring(7);

            if (!rooms.has(currentRoom)) {
              rooms.set(currentRoom, new Set());
            }

            const room = rooms.get(currentRoom);

            // Maximum 2 peers per transfer room for direct P2P
            if (room.size >= 2) {
              ws.send(JSON.stringify({ type: 'room-full', error: 'Transfer room is full.' }));
              return;
            }

            ws.peerId = peerId;
            ws.peerName = data.peerName || 'Remote Peer';
            room.add(ws);

            // Inform the joined client
            ws.send(JSON.stringify({
              type: 'joined',
              roomId: currentRoom,
              peerId,
              peersInRoom: room.size
            }));

            // If 2 peers are now in the room, tell the sender peer to initiate WebRTC offer
            if (room.size === 2) {
              for (const client of room) {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                  client.send(JSON.stringify({
                    type: 'peer-ready',
                    initiator: true,
                    peerName: ws.peerName
                  }));
                  ws.send(JSON.stringify({
                    type: 'peer-ready',
                    initiator: false,
                    peerName: client.peerName
                  }));
                }
              }
            }
            break;
          }

          case 'signal': {
            // Forward WebRTC SDP offer/answer or ICE candidate to the other peer in the room
            if (!currentRoom || !rooms.has(currentRoom)) return;
            const room = rooms.get(currentRoom);
            for (const client of room) {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: 'signal',
                  data: data.data,
                  fromPeerId: peerId
                }));
              }
            }
            break;
          }

          case 'leave': {
            cleanup();
            break;
          }

          default:
            break;
        }
      } catch (err) {
        console.error('[Signaling Error]:', err.message);
      }
    });

    const cleanup = () => {
      if (currentRoom && rooms.has(currentRoom)) {
        const room = rooms.get(currentRoom);
        room.delete(ws);
        for (const client of room) {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'peer-disconnected' }));
          }
        }
        if (room.size === 0) {
          rooms.delete(currentRoom);
        }
      }
    };

    ws.on('close', cleanup);
    ws.on('error', cleanup);
  });

  console.log('[Signaling] WebRTC signaling service active on /ws');
  return wss;
}
