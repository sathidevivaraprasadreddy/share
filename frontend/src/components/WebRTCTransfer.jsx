import React, { useState, useEffect, useRef } from 'react';
import { Wifi, ArrowUpDown, CheckCircle, AlertTriangle, XCircle, RefreshCw, Smartphone, Laptop, Zap, Shield } from 'lucide-react';
import { formatBytes } from '../utils/format';

const CHUNK_SIZE = 16384; // 16KB per data channel chunk

export default function WebRTCTransfer({ onSwitchToStandardUpload }) {
  const [mode, setMode] = useState('choose'); // 'choose', 'host', 'join'
  const [roomId, setRoomId] = useState('');
  const [inputRoomId, setInputRoomId] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('idle'); // idle, connecting, waiting, connected, sending, receiving, completed, error
  const [remotePeerName, setRemotePeerName] = useState(null);
  const [transferProgress, setTransferProgress] = useState(0);
  const [transferSpeed, setTransferSpeed] = useState('');
  const [receivedFile, setReceivedFile] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const wsRef = useRef(null);
  const pcRef = useRef(null);
  const dataChannelRef = useRef(null);
  const receivedChunksRef = useRef([]);
  const receivedSizeRef = useRef(0);
  const expectedFileMetaRef = useRef(null);
  const transferStartRef = useRef(0);
  const candidateQueueRef = useRef([]);

  // Generate 6-letter room code
  const generateRoomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const getWsUrl = () => {
    if (import.meta.env.VITE_WS_URL) {
      return import.meta.env.VITE_WS_URL;
    }
    if (import.meta.env.VITE_API_URL) {
      try {
        const u = new URL(import.meta.env.VITE_API_URL);
        const protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${protocol}//${u.host}/ws`;
      } catch {}
    }
    const loc = window.location;
    const protocol = loc.protocol === 'https:' ? 'wss:' : 'ws:';
    // If backend is running on port 5050 in dev
    const port = loc.port === '5173' || loc.port === '5180' ? '5050' : loc.port;
    return `${protocol}//${loc.hostname}:${port}/ws`;
  };

  const cleanupConnections = () => {
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  useEffect(() => {
    return () => cleanupConnections();
  }, []);

  const createPeerConnection = () => {
    const config = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };

    const pc = new RTCPeerConnection(config);

    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current) {
        wsRef.current.send(JSON.stringify({
          type: 'signal',
          data: { candidate: event.candidate }
        }));
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setConnectionStatus('connected');
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        setConnectionStatus('error');
        setErrorMessage('Direct peer connection interrupted or blocked by NAT/Firewall.');
      }
    };

    return pc;
  };

  const startHosting = (file) => {
    setSelectedFile(file);
    const code = generateRoomCode();
    setRoomId(code);
    setMode('host');
    setConnectionStatus('waiting');
    setErrorMessage(null);

    connectSignaling(code, true);
  };

  const joinTransfer = () => {
    const clean = inputRoomId.trim().toUpperCase();
    if (clean.length < 4) return;
    setRoomId(clean);
    setMode('join');
    setConnectionStatus('connecting');
    setErrorMessage(null);

    connectSignaling(clean, false);
  };

  const connectSignaling = (roomCode, isHost) => {
    try {
      const ws = new WebSocket(getWsUrl());
      wsRef.current = ws;

      ws.onopen = () => {
        const myName = navigator.userAgent.includes('Mobile') ? 'Mobile Device' : 'Desktop Browser';
        ws.send(JSON.stringify({
          type: 'join',
          roomId: roomCode,
          peerName: myName
        }));
      };

      ws.onmessage = async (event) => {
        const message = JSON.parse(event.data);

        if (message.type === 'peer-ready') {
          setRemotePeerName(message.peerName);
          const pc = createPeerConnection();
          pcRef.current = pc;

          if (message.initiator) {
            // Create data channel as initiator
            const dc = pc.createDataChannel('fileTransfer', { ordered: true });
            setupDataChannel(dc, true);
            dataChannelRef.current = dc;

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            ws.send(JSON.stringify({ type: 'signal', data: { sdp: offer } }));
          } else {
            // Receiver listens for data channel
            pc.ondatachannel = (e) => {
              setupDataChannel(e.channel, false);
              dataChannelRef.current = e.channel;
            };
          }
        } else if (message.type === 'signal') {
          const pc = pcRef.current;
          if (!pc) return;

          if (message.data.sdp) {
            await pc.setRemoteDescription(new RTCSessionDescription(message.data.sdp));
            // Flush any ICE candidates that arrived early
            if (candidateQueueRef.current.length > 0) {
              for (const c of candidateQueueRef.current) {
                try {
                  await pc.addIceCandidate(new RTCIceCandidate(c));
                } catch (e) {}
              }
              candidateQueueRef.current = [];
            }

            if (message.data.sdp.type === 'offer') {
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              ws.send(JSON.stringify({ type: 'signal', data: { sdp: answer } }));
            }
          } else if (message.data.candidate) {
            if (pc.remoteDescription && pc.remoteDescription.type) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(message.data.candidate));
              } catch (e) {}
            } else {
              candidateQueueRef.current.push(message.data.candidate);
            }
          }
        } else if (message.type === 'room-full') {
          setConnectionStatus('error');
          setErrorMessage('Transfer room is full or expired.');
        } else if (message.type === 'peer-disconnected') {
          setConnectionStatus('error');
          setErrorMessage('Remote peer disconnected.');
        }
      };

      ws.onerror = () => {
        setConnectionStatus('error');
        setErrorMessage('Could not connect to signaling service.');
      };
    } catch (err) {
      setConnectionStatus('error');
      setErrorMessage(err.message);
    }
  };

  const setupDataChannel = (dc, isSender) => {
    dc.binaryType = 'arraybuffer';

    dc.onopen = () => {
      setConnectionStatus('connected');
      if (isSender && selectedFile) {
        sendFileOverDataChannel(dc, selectedFile);
      }
    };

    dc.onmessage = (event) => {
      if (typeof event.data === 'string') {
        const msg = JSON.parse(event.data);
        if (msg.type === 'file-meta') {
          expectedFileMetaRef.current = msg;
          receivedChunksRef.current = [];
          receivedSizeRef.current = 0;
          setConnectionStatus('receiving');
          transferStartRef.current = Date.now();
        } else if (msg.type === 'transfer-complete') {
          const blob = new Blob(receivedChunksRef.current, { type: expectedFileMetaRef.current.mimeType });
          setReceivedFile({
            name: expectedFileMetaRef.current.name,
            size: expectedFileMetaRef.current.size,
            url: URL.createObjectURL(blob)
          });
          setConnectionStatus('completed');
          setTransferProgress(100);
        }
      } else {
        // Binary chunk received
        receivedChunksRef.current.push(event.data);
        receivedSizeRef.current += event.data.byteLength;
        const total = expectedFileMetaRef.current?.size || 1;
        const percent = Math.min(100, Math.round((receivedSizeRef.current / total) * 100));
        setTransferProgress(percent);

        const elapsedSec = (Date.now() - transferStartRef.current) / 1000;
        if (elapsedSec > 0.5) {
          const speedBps = receivedSizeRef.current / elapsedSec;
          setTransferSpeed(`${(speedBps / (1024 * 1024)).toFixed(1)} MB/s`);
        }
      }
    };
  };

  const sendFileOverDataChannel = async (dc, file) => {
    setConnectionStatus('sending');
    transferStartRef.current = Date.now();

    // Send metadata first
    dc.send(JSON.stringify({
      type: 'file-meta',
      name: file.name,
      size: file.size,
      mimeType: file.type || 'application/octet-stream'
    }));

    const reader = file.stream().getReader();
    let offset = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // Slice into 16KB chunks
      for (let i = 0; i < value.byteLength; i += CHUNK_SIZE) {
        const chunk = value.slice(i, i + CHUNK_SIZE);
        while (dc.bufferedAmount > 4 * 1024 * 1024) {
          await new Promise((r) => setTimeout(r, 20));
        }
        dc.send(chunk);
        offset += chunk.byteLength;
        const percent = Math.min(100, Math.round((offset / file.size) * 100));
        setTransferProgress(percent);

        const elapsed = (Date.now() - transferStartRef.current) / 1000;
        if (elapsed > 0.5) {
          const speed = offset / elapsed;
          setTransferSpeed(`${(speed / (1024 * 1024)).toFixed(1)} MB/s`);
        }
      }
    }

    dc.send(JSON.stringify({ type: 'transfer-complete' }));
    setConnectionStatus('completed');
    setTransferProgress(100);
  };

  const handleReset = () => {
    cleanupConnections();
    setMode('choose');
    setRoomId('');
    setInputRoomId('');
    setSelectedFile(null);
    setConnectionStatus('idle');
    setRemotePeerName(null);
    setTransferProgress(0);
    setReceivedFile(null);
    setErrorMessage(null);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-100 dark:border-slate-800 max-w-xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
          <Wifi className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            Direct Device-to-Device Send
            <span className="text-[10px] uppercase font-bold bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full">
              Live Direct
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Send files straight between phone and PC without saving to any server.
          </p>
        </div>
      </div>

      {/* Error Banner with fallback button */}
      {errorMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs sm:text-sm">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{errorMessage}</div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleReset}
              className="py-1.5 px-3 bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-lg text-xs font-semibold hover:bg-rose-100 dark:hover:bg-rose-900/40"
            >
              Try Again
            </button>
            <button
              onClick={onSwitchToStandardUpload}
              className="py-1.5 px-3 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 flex items-center gap-1"
            >
              <Zap className="w-3.5 h-3.5" />
              Use Standard Link Share
            </button>
          </div>
        </div>
      )}

      {/* Screen 1: Choose Role (Send or Receive) */}
      {mode === 'choose' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Send File Card */}
            <label className="p-5 rounded-2xl border-2 border-dashed border-indigo-200 dark:border-indigo-900/60 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/30 cursor-pointer transition-all flex flex-col items-center text-center group">
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files[0]) startHosting(e.target.files[0]);
                }}
              />
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Laptop className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">Send from this Device</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Pick a file to send live to another screen</p>
            </label>

            {/* Receive File Card */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center mb-3 mx-auto">
                  <Smartphone className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white text-center">Receive on this Device</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 text-center mb-3">Enter the 6-letter room code from the sender</p>
              </div>

              <div className="space-y-2">
                <input
                  type="text"
                  maxLength={6}
                  placeholder="ROOM CODE"
                  value={inputRoomId}
                  onChange={(e) => setInputRoomId(e.target.value.toUpperCase())}
                  className="w-full text-center tracking-widest font-mono font-bold py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-sm uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <button
                  onClick={joinTransfer}
                  disabled={inputRoomId.length < 4}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-all disabled:opacity-50"
                >
                  Connect & Receive
                </button>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-2">
            <Shield className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
            <span>
              Sends any file directly from device to device. Both screens must keep this page open until the transfer finishes.
            </span>
          </div>
        </div>
      )}

      {/* Screen 2: Host Room (Waiting for Peer) */}
      {mode === 'host' && connectionStatus === 'waiting' && (
        <div className="text-center py-6 space-y-4">
          <div className="inline-block p-4 rounded-3xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 animate-pulse">
            <Wifi className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Waiting for receiver to connect...</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Ask the receiver to open QuickShare on their phone/PC and enter this room code:
            </p>
          </div>

          <div className="py-3 px-6 bg-indigo-50 dark:bg-indigo-950/50 border-2 border-indigo-200 dark:border-indigo-800 rounded-2xl inline-block">
            <span className="text-3xl font-mono font-extrabold tracking-widest text-indigo-700 dark:text-indigo-300">
              {roomId}
            </span>
          </div>

          <div className="text-xs text-slate-600 dark:text-slate-300 font-medium">
            File prepared: <span className="font-bold text-slate-900 dark:text-white">{selectedFile?.name}</span> ({formatBytes(selectedFile?.size || 0)})
          </div>

          <div>
            <button
              onClick={handleReset}
              className="text-xs font-semibold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              Cancel Transfer
            </button>
          </div>
        </div>
      )}

      {/* Screen 3: Transferring Progress (Sending or Receiving) */}
      {(connectionStatus === 'sending' || connectionStatus === 'receiving') && (
        <div className="py-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
              <span className="text-xs font-bold text-slate-800 dark:text-white">
                {connectionStatus === 'sending' ? 'Streaming to receiver...' : 'Receiving file chunks...'}
              </span>
            </div>
            {transferSpeed && (
              <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-md">
                {transferSpeed}
              </span>
            )}
          </div>

          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
            <div
              className="bg-indigo-600 h-3 rounded-full transition-all duration-200"
              style={{ width: `${transferProgress}%` }}
            ></div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>
              {connectionStatus === 'sending' ? selectedFile?.name : expectedFileMetaRef.current?.name}
            </span>
            <span className="font-bold text-slate-800 dark:text-white">{transferProgress}%</span>
          </div>

          <p className="text-[11px] text-center text-slate-400">
            Keep this tab active until the progress bar reaches 100%.
          </p>
        </div>
      )}

      {/* Screen 4: Transfer Completed */}
      {connectionStatus === 'completed' && (
        <div className="text-center py-6 space-y-4">
          <div className="inline-block p-4 rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="w-10 h-10" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Transfer Completed Successfully!</h3>

          {receivedFile ? (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 space-y-3">
              <div className="text-xs text-slate-700 dark:text-slate-200 font-semibold truncate">
                {receivedFile.name} ({formatBytes(receivedFile.size)})
              </div>
              <a
                href={receivedFile.url}
                download={receivedFile.name}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all inline-block shadow-md"
              >
                Save Downloaded File
              </a>
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              The file was streamed directly to the receiver.
            </p>
          )}

          <div>
            <button
              onClick={handleReset}
              className="py-2 px-5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl"
            >
              Start Another Transfer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
