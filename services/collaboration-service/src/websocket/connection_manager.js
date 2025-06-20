/**
 * WebSocket连接管理器
 * 管理客户端连接、消息路由和连接状态
 */

const WebSocket = require('ws');
const { EventEmitter } = require('events');

class ConnectionManager extends EventEmitter {
    constructor() {
        super();
        this.connections = new Map(); // 存储所有连接
        this.rooms = new Map(); // 存储房间信息
        this.userSessions = new Map(); // 存储用户会话
        this.server = null;
        
        console.log('✅ WebSocket连接管理器初始化完成');
    }

    /**
     * 启动WebSocket服务器
     */
    start(port = 3003) {
        this.server = new WebSocket.Server({ 
            port,
            perMessageDeflate: false
        });

        this.server.on('connection', (ws, request) => {
            this.handleConnection(ws, request);
        });

        this.server.on('error', (error) => {
            console.error('❌ WebSocket服务器错误:', error);
            this.emit('error', error);
        });

        console.log(`🚀 WebSocket服务器启动在端口 ${port}`);
        this.emit('server_started', { port });
        
        return this.server;
    }

    /**
     * 处理新连接
     */
    handleConnection(ws, request) {
        const connectionId = this.generateConnectionId();
        const clientIP = request.socket.remoteAddress;
        
        console.log(`🔗 新连接建立: ${connectionId} from ${clientIP}`);

        // 存储连接信息
        const connectionInfo = {
            id: connectionId,
            ws: ws,
            ip: clientIP,
            connectedAt: new Date(),
            userId: null,
            instanceId: null,
            rooms: new Set(),
            isAlive: true
        };

        this.connections.set(connectionId, connectionInfo);

        // 设置连接事件处理
        ws.on('message', (data) => {
            this.handleMessage(connectionId, data);
        });

        ws.on('close', (code, reason) => {
            this.handleDisconnection(connectionId, code, reason);
        });

        ws.on('error', (error) => {
            console.error(`❌ 连接 ${connectionId} 错误:`, error);
            this.handleDisconnection(connectionId, 1006, 'Connection error');
        });

        ws.on('pong', () => {
            connectionInfo.isAlive = true;
        });

        // 发送连接确认
        this.sendToConnection(connectionId, {
            type: 'connection_established',
            connectionId: connectionId,
            timestamp: new Date().toISOString()
        });

        this.emit('connection_established', { connectionId, clientIP });
    }

    /**
     * 处理消息
     */
    handleMessage(connectionId, data) {
        try {
            const message = JSON.parse(data.toString());
            const connection = this.connections.get(connectionId);
            
            if (!connection) {
                console.warn(`⚠️ 收到来自未知连接的消息: ${connectionId}`);
                return;
            }

            console.log(`📨 收到消息 from ${connectionId}:`, message.type);

            // 处理不同类型的消息
            switch (message.type) {
                case 'authenticate':
                    this.handleAuthentication(connectionId, message);
                    break;
                case 'join_instance':
                    this.handleJoinInstance(connectionId, message);
                    break;
                case 'leave_instance':
                    this.handleLeaveInstance(connectionId, message);
                    break;
                case 'instance_message':
                    this.handleInstanceMessage(connectionId, message);
                    break;
                case 'ping':
                    this.handlePing(connectionId, message);
                    break;
                default:
                    console.warn(`⚠️ 未知消息类型: ${message.type}`);
                    this.sendError(connectionId, 'unknown_message_type', `未知消息类型: ${message.type}`);
            }

            this.emit('message_received', { connectionId, message });

        } catch (error) {
            console.error(`❌ 解析消息失败 from ${connectionId}:`, error);
            this.sendError(connectionId, 'invalid_message', '消息格式无效');
        }
    }

    /**
     * 处理用户认证
     */
    handleAuthentication(connectionId, message) {
        const connection = this.connections.get(connectionId);
        const { userId, token } = message.data || {};

        if (!userId) {
            this.sendError(connectionId, 'auth_failed', '缺少用户ID');
            return;
        }

        // 简单的认证逻辑（生产环境需要验证token）
        connection.userId = userId;
        this.userSessions.set(userId, connectionId);

        this.sendToConnection(connectionId, {
            type: 'authenticated',
            data: { userId },
            timestamp: new Date().toISOString()
        });

        console.log(`✅ 用户认证成功: ${userId} (${connectionId})`);
        this.emit('user_authenticated', { connectionId, userId });
    }

    /**
     * 处理加入实例
     */
    handleJoinInstance(connectionId, message) {
        const connection = this.connections.get(connectionId);
        const { instanceId } = message.data || {};

        if (!instanceId) {
            this.sendError(connectionId, 'join_failed', '缺少实例ID');
            return;
        }

        if (!connection.userId) {
            this.sendError(connectionId, 'join_failed', '请先进行身份认证');
            return;
        }

        // 加入实例房间
        const roomId = `instance_${instanceId}`;
        this.joinRoom(connectionId, roomId);
        connection.instanceId = instanceId;

        this.sendToConnection(connectionId, {
            type: 'joined_instance',
            data: { instanceId, roomId },
            timestamp: new Date().toISOString()
        });

        // 通知房间内其他用户
        this.broadcastToRoom(roomId, {
            type: 'user_joined',
            data: { 
                userId: connection.userId, 
                instanceId,
                joinedAt: new Date().toISOString()
            }
        }, connectionId);

        console.log(`✅ 用户 ${connection.userId} 加入实例 ${instanceId}`);
        this.emit('user_joined_instance', { connectionId, userId: connection.userId, instanceId });
    }

    /**
     * 处理离开实例
     */
    handleLeaveInstance(connectionId, message) {
        const connection = this.connections.get(connectionId);
        const { instanceId } = message.data || {};

        if (!instanceId || connection.instanceId !== instanceId) {
            this.sendError(connectionId, 'leave_failed', '实例ID不匹配');
            return;
        }

        const roomId = `instance_${instanceId}`;
        this.leaveRoom(connectionId, roomId);
        connection.instanceId = null;

        this.sendToConnection(connectionId, {
            type: 'left_instance',
            data: { instanceId },
            timestamp: new Date().toISOString()
        });

        // 通知房间内其他用户
        this.broadcastToRoom(roomId, {
            type: 'user_left',
            data: { 
                userId: connection.userId, 
                instanceId,
                leftAt: new Date().toISOString()
            }
        });

        console.log(`✅ 用户 ${connection.userId} 离开实例 ${instanceId}`);
        this.emit('user_left_instance', { connectionId, userId: connection.userId, instanceId });
    }

    /**
     * 处理实例消息
     */
    handleInstanceMessage(connectionId, message) {
        const connection = this.connections.get(connectionId);
        const { instanceId, content } = message.data || {};

        if (!instanceId || connection.instanceId !== instanceId) {
            this.sendError(connectionId, 'message_failed', '实例ID不匹配');
            return;
        }

        const roomId = `instance_${instanceId}`;
        
        // 广播消息到房间内所有用户
        this.broadcastToRoom(roomId, {
            type: 'instance_message',
            data: {
                from: connection.userId,
                instanceId,
                content,
                timestamp: new Date().toISOString()
            }
        });

        console.log(`📢 实例消息广播: ${connection.userId} -> ${instanceId}`);
        this.emit('instance_message_sent', { connectionId, userId: connection.userId, instanceId, content });
    }

    /**
     * 处理ping消息
     */
    handlePing(connectionId, message) {
        this.sendToConnection(connectionId, {
            type: 'pong',
            data: { timestamp: new Date().toISOString() }
        });
    }

    /**
     * 处理连接断开
     */
    handleDisconnection(connectionId, code, reason) {
        const connection = this.connections.get(connectionId);
        
        if (!connection) {
            return;
        }

        console.log(`🔌 连接断开: ${connectionId} (${code}: ${reason})`);

        // 清理用户会话
        if (connection.userId) {
            this.userSessions.delete(connection.userId);
        }

        // 离开所有房间
        connection.rooms.forEach(roomId => {
            this.leaveRoom(connectionId, roomId);
        });

        // 删除连接
        this.connections.delete(connectionId);

        this.emit('connection_closed', { connectionId, code, reason });
    }

    /**
     * 加入房间
     */
    joinRoom(connectionId, roomId) {
        const connection = this.connections.get(connectionId);
        if (!connection) return;

        if (!this.rooms.has(roomId)) {
            this.rooms.set(roomId, new Set());
        }

        this.rooms.get(roomId).add(connectionId);
        connection.rooms.add(roomId);

        console.log(`🏠 连接 ${connectionId} 加入房间 ${roomId}`);
    }

    /**
     * 离开房间
     */
    leaveRoom(connectionId, roomId) {
        const connection = this.connections.get(connectionId);
        if (!connection) return;

        if (this.rooms.has(roomId)) {
            this.rooms.get(roomId).delete(connectionId);
            
            // 如果房间为空，删除房间
            if (this.rooms.get(roomId).size === 0) {
                this.rooms.delete(roomId);
            }
        }

        connection.rooms.delete(roomId);
        console.log(`🚪 连接 ${connectionId} 离开房间 ${roomId}`);
    }

    /**
     * 向指定连接发送消息
     */
    sendToConnection(connectionId, message) {
        const connection = this.connections.get(connectionId);
        
        if (!connection || connection.ws.readyState !== WebSocket.OPEN) {
            console.warn(`⚠️ 无法发送消息到连接 ${connectionId}: 连接不可用`);
            return false;
        }

        try {
            connection.ws.send(JSON.stringify(message));
            return true;
        } catch (error) {
            console.error(`❌ 发送消息失败到 ${connectionId}:`, error);
            return false;
        }
    }

    /**
     * 向房间内所有连接广播消息
     */
    broadcastToRoom(roomId, message, excludeConnectionId = null) {
        const room = this.rooms.get(roomId);
        if (!room) return 0;

        let sentCount = 0;
        room.forEach(connectionId => {
            if (connectionId !== excludeConnectionId) {
                if (this.sendToConnection(connectionId, message)) {
                    sentCount++;
                }
            }
        });

        return sentCount;
    }

    /**
     * 发送错误消息
     */
    sendError(connectionId, errorCode, errorMessage) {
        this.sendToConnection(connectionId, {
            type: 'error',
            error: {
                code: errorCode,
                message: errorMessage
            },
            timestamp: new Date().toISOString()
        });
    }

    /**
     * 生成连接ID
     */
    generateConnectionId() {
        return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 获取连接统计信息
     */
    getStats() {
        return {
            totalConnections: this.connections.size,
            totalRooms: this.rooms.size,
            totalUsers: this.userSessions.size,
            connections: Array.from(this.connections.values()).map(conn => ({
                id: conn.id,
                userId: conn.userId,
                instanceId: conn.instanceId,
                connectedAt: conn.connectedAt,
                rooms: Array.from(conn.rooms)
            }))
        };
    }

    /**
     * 健康检查
     */
    startHealthCheck() {
        const interval = setInterval(() => {
            this.connections.forEach((connection, connectionId) => {
                if (!connection.isAlive) {
                    console.log(`💀 连接 ${connectionId} 无响应，终止连接`);
                    connection.ws.terminate();
                    return;
                }

                connection.isAlive = false;
                connection.ws.ping();
            });
        }, 30000); // 30秒检查一次

        return interval;
    }

    /**
     * 停止服务器
     */
    stop() {
        if (this.server) {
            this.server.close(() => {
                console.log('🛑 WebSocket服务器已停止');
                this.emit('server_stopped');
            });
        }
    }
}

module.exports = ConnectionManager;
