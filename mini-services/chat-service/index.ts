import { createServer } from 'http'
import { Server, Socket } from 'socket.io'

// --- Type Definitions ---

interface JoinOrderPayload {
  orderId: string
  userId: string
}

interface SendMessagePayload {
  orderId: string
  senderId: string
  content: string
}

interface TypingPayload {
  orderId: string
  userId: string
}

interface OrderProgressPayload {
  orderId: string
  progress: number
}

interface ChatMessage {
  id: string
  orderId: string
  senderId: string
  content: string
  timestamp: Date
}

interface SocketData {
  userId?: string
  orderId?: string
}

// --- In-Memory Message Store ---

const messageStore = new Map<string, ChatMessage[]>()

const generateId = (): string => Math.random().toString(36).substring(2, 11)

// --- HTTP & Socket.IO Server Setup ---

const httpServer = createServer()
const io = new Server(httpServer, {
  // DO NOT change the path, it is used by Caddy to forward the request to the correct port
  path: '/',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// --- Socket Event Handlers ---

io.on('connection', (socket: Socket) => {
  console.log(`[ChatService] User connected: ${socket.id}`)

  // Initialize socket data
  ;(socket.data as SocketData).userId = undefined
  ;(socket.data as SocketData).orderId = undefined

  /**
   * join-order: Join an order chat room
   * Payload: { orderId: string, userId: string }
   */
  socket.on('join-order', (payload: JoinOrderPayload) => {
    const { orderId, userId } = payload
    const roomName = `order:${orderId}`

    // Leave previous order room if any
    const previousOrderId = (socket.data as SocketData).orderId
    if (previousOrderId) {
      const previousRoom = `order:${previousOrderId}`
      socket.leave(previousRoom)
      console.log(`[ChatService] User ${userId} left room ${previousRoom}`)
    }

    // Join the new order room
    socket.join(roomName)

    // Store user data on socket
    ;(socket.data as SocketData).userId = userId
    ;(socket.data as SocketData).orderId = orderId

    // Send existing messages from the in-memory store to the joining user
    const existingMessages = messageStore.get(orderId) || []
    socket.emit('message-history', { orderId, messages: existingMessages })

    console.log(`[ChatService] User ${userId} joined room ${roomName}`)
  })

  /**
   * send-message: Send a message to an order chat room
   * Payload: { orderId: string, senderId: string, content: string }
   */
  socket.on('send-message', (payload: SendMessagePayload) => {
    const { orderId, senderId, content } = payload
    const roomName = `order:${orderId}`

    const message: ChatMessage = {
      id: generateId(),
      orderId,
      senderId,
      content,
      timestamp: new Date(),
    }

    // Store message in memory
    if (!messageStore.has(orderId)) {
      messageStore.set(orderId, [])
    }
    messageStore.get(orderId)!.push(message)

    // Broadcast to everyone in the room (including sender for confirmation)
    io.to(roomName).emit('new-message', message)

    console.log(`[ChatService] Message in ${roomName} from ${senderId}: ${content.substring(0, 50)}`)
  })

  /**
   * typing: User is typing in an order chat room
   * Payload: { orderId: string, userId: string }
   */
  socket.on('typing', (payload: TypingPayload) => {
    const { orderId, userId } = payload
    const roomName = `order:${orderId}`

    // Broadcast to room except sender
    socket.to(roomName).emit('user-typing', { orderId, userId })

    console.log(`[ChatService] User ${userId} is typing in ${roomName}`)
  })

  /**
   * stop-typing: User stopped typing in an order chat room
   * Payload: { orderId: string, userId: string }
   */
  socket.on('stop-typing', (payload: TypingPayload) => {
    const { orderId, userId } = payload
    const roomName = `order:${orderId}`

    // Broadcast to room except sender
    socket.to(roomName).emit('user-stop-typing', { orderId, userId })

    console.log(`[ChatService] User ${userId} stopped typing in ${roomName}`)
  })

  /**
   * order-progress: Update progress for an order
   * Payload: { orderId: string, progress: number }
   */
  socket.on('order-progress', (payload: OrderProgressPayload) => {
    const { orderId, progress } = payload
    const roomName = `order:${orderId}`

    // Broadcast to everyone in the room
    io.to(roomName).emit('progress-update', { orderId, progress, timestamp: new Date() })

    console.log(`[ChatService] Progress update for ${roomName}: ${progress}%`)
  })

  /**
   * disconnect: Handle user disconnection
   */
  socket.on('disconnect', (reason) => {
    const socketData = socket.data as SocketData
    const userId = socketData?.userId || 'unknown'
    const orderId = socketData?.orderId

    if (orderId) {
      const roomName = `order:${orderId}`
      // Notify others in the room that this user stopped typing
      socket.to(roomName).emit('user-stop-typing', { orderId, userId })
    }

    console.log(`[ChatService] User disconnected: ${socket.id} (userId: ${userId}, reason: ${reason})`)
  })

  /**
   * error: Handle socket errors
   */
  socket.on('error', (error) => {
    console.error(`[ChatService] Socket error (${socket.id}):`, error)
  })
})

// --- Start Server ---

const PORT = 3003

httpServer.listen(PORT, () => {
  console.log(`[ChatService] BrawlBoost Chat Service running on port ${PORT}`)
  console.log(`[ChatService] Socket.IO path: /`)
  console.log(`[ChatService] CORS: enabled for all origins`)
})

// --- Graceful Shutdown ---

const gracefulShutdown = (signal: string) => {
  console.log(`[ChatService] Received ${signal}, shutting down server...`)

  io.disconnectSockets(true)

  httpServer.close(() => {
    console.log('[ChatService] Server closed')
    process.exit(0)
  })

  // Force close after 10 seconds
  setTimeout(() => {
    console.error('[ChatService] Forced shutdown after timeout')
    process.exit(1)
  }, 10000)
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))
