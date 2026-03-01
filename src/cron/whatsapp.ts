import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  type WASocket,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';

// Baileys requires a pino-compatible logger — use a minimal silent one
const silentLogger = {
  level: 'silent' as const,
  trace: () => {},
  debug: () => {},
  info: (msg: unknown) => { if (typeof msg === 'string' && msg.includes('QR')) console.log('[WhatsApp]', msg); },
  warn: () => {},
  error: (data: unknown) => console.error('[WhatsApp error]', data),
  fatal: (data: unknown) => console.error('[WhatsApp fatal]', data),
  child: function() { return this; },
};

const AUTH_DIR = join(process.cwd(), 'data', 'wa-auth');

// Simple rate limiter: 1 message per second
class RateLimiter {
  private lastSent = 0;
  private readonly minInterval = 1100; // ms

  async wait(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastSent;
    if (elapsed < this.minInterval) {
      await new Promise((r) => setTimeout(r, this.minInterval - elapsed));
    }
    this.lastSent = Date.now();
  }
}

export class WhatsAppSender {
  private socket: WASocket | null = null;
  private connected = false;
  private reconnectAttempts = 0;
  private readonly maxReconnects = 10;
  private readonly rateLimiter = new RateLimiter();
  private readonly ownerJid: string;

  constructor() {
    const jid = process.env.WHATSAPP_OWNER_JID;
    if (!jid) throw new Error('WHATSAPP_OWNER_JID environment variable is required');
    this.ownerJid = jid;
  }

  async start(): Promise<void> {
    mkdirSync(AUTH_DIR, { recursive: true });
    await this.connect();
    // Wait up to 60s for connection
    await this.waitConnected(60000);
  }

  private async connect(): Promise<void> {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

    const sock = makeWASocket({
      auth: state,
      logger: silentLogger as never,
      printQRInTerminal: true,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect } = update;

      if (connection === 'close') {
        this.connected = false;
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;

        if (statusCode === DisconnectReason.loggedOut) {
          console.error('[WhatsApp] Logged out. Delete data/wa-auth/ and restart to re-pair.');
          return;
        }

        if (this.reconnectAttempts < this.maxReconnects) {
          this.reconnectAttempts++;
          const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 60000);
          console.log(`[WhatsApp] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})...`);
          setTimeout(() => this.connect(), delay);
        }
      }

      if (connection === 'open') {
        this.connected = true;
        this.reconnectAttempts = 0;
        console.log('[WhatsApp] Connected');
      }
    });

    this.socket = sock;
  }

  private waitConnected(timeoutMs: number): Promise<void> {
    if (this.connected) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const check = () => {
        if (this.connected) return resolve();
        if (Date.now() - start > timeoutMs) return reject(new Error('WhatsApp connection timeout'));
        setTimeout(check, 500);
      };
      check();
    });
  }

  async send(text: string): Promise<void> {
    if (!this.socket || !this.connected) {
      throw new Error('WhatsApp not connected');
    }
    await this.rateLimiter.wait();
    await this.socket.sendMessage(this.ownerJid, { text });
  }

  async stop(): Promise<void> {
    if (this.socket) {
      this.socket.end(undefined);
      this.socket = null;
      this.connected = false;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }
}
