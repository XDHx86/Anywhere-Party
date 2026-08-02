#!/usr/bin/env node

/**
 * Simple test script for the local WebSocket relay server
 * Tests basic room creation, joining, and message relay functionality
 */

const WebSocket = require('ws');

class RelayTester {
  constructor(serverUrl = 'ws://localhost:8080') {
    this.serverUrl = serverUrl;
    this.clients = [];
  }

  async runTests() {
    console.log('🧪 Starting Local WebSocket Relay Tests...\n');

    try {
      await this.testBasicConnection();
      await this.testRoomCreation();
      await this.testRoomJoining();
      await this.testSyncMessages();
      await this.testChatMessages();
      await this.testDisconnection();
      
      console.log('✅ All tests passed!');
    } catch (error) {
      console.error('❌ Test failed:', error);
      process.exit(1);
    } finally {
      this.cleanup();
    }
  }

  async testBasicConnection() {
    console.log('📡 Testing basic connection...');
    
    const client = await this.createClient('test-user-1');
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 5000);

      client.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'WELCOME') {
          clearTimeout(timeout);
          console.log('   ✓ Connection established and welcome received');
          resolve();
        }
      });
    });
  }

  async testRoomCreation() {
    console.log('🏠 Testing room creation...');
    
    const client = this.clients[0];
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Room creation timeout'));
      }, 5000);

      client.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'ROOM_CREATED') {
          clearTimeout(timeout);
          this.testRoomId = message.roomId;
          console.log(`   ✓ Room created with ID: ${message.roomId}`);
          console.log(`   ✓ Host ID: ${message.hostId}`);
          resolve();
        }
      });

      client.send(JSON.stringify({
        type: 'CREATE_ROOM',
        userId: 'test-user-1',
        roomOptions: {}
      }));
    });
  }

  async testRoomJoining() {
    console.log('👤 Testing room joining...');
    
    const client2 = await this.createClient('test-user-2');
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Room joining timeout'));
      }, 5000);

      let joinedReceived = false;
      let participantJoinedReceived = false;

      const checkComplete = () => {
        if (joinedReceived && participantJoinedReceived) {
          clearTimeout(timeout);
          console.log('   ✓ User 2 joined room successfully');
          console.log('   ✓ User 1 received participant joined notification');
          resolve();
        }
      };

      // Listen for join confirmation on client 2
      client2.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'ROOM_JOINED') {
          joinedReceived = true;
          checkComplete();
        }
      });

      // Listen for participant joined notification on client 1
      this.clients[0].on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'PARTICIPANT_JOINED' && message.userId === 'test-user-2') {
          participantJoinedReceived = true;
          checkComplete();
        }
      });

      client2.send(JSON.stringify({
        type: 'JOIN_ROOM',
        userId: 'test-user-2',
        roomId: this.testRoomId
      }));
    });
  }

  async testSyncMessages() {
    console.log('🔄 Testing sync messages...');
    
    const hostClient = this.clients[0];
    const participantClient = this.clients[1];
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Sync message timeout'));
      }, 5000);

      participantClient.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'SYNC_UPDATE' && message.fromUserId === 'test-user-1') {
          clearTimeout(timeout);
          console.log('   ✓ Sync state broadcasted to participants');
          console.log(`   ✓ Current time: ${message.state.currentTime}s`);
          resolve();
        }
      });

      hostClient.send(JSON.stringify({
        type: 'SYNC_STATE',
        userId: 'test-user-1',
        state: {
          currentTime: 42.5,
          paused: false,
          playbackRate: 1,
          videoUrl: 'https://example.com/video.mp4'
        }
      }));
    });
  }

  async testChatMessages() {
    console.log('💬 Testing chat messages...');
    
    const senderClient = this.clients[1];
    const receiverClient = this.clients[0];
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Chat message timeout'));
      }, 5000);

      receiverClient.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'CHAT_MESSAGE' && message.userId === 'test-user-2') {
          clearTimeout(timeout);
          console.log('   ✓ Chat message broadcasted successfully');
          console.log(`   ✓ Message: "${message.message}"`);
          resolve();
        }
      });

      senderClient.send(JSON.stringify({
        type: 'CHAT_MESSAGE',
        userId: 'test-user-2',
        message: 'Hello from the test suite!'
      }));
    });
  }

  async testDisconnection() {
    console.log('🔌 Testing disconnection handling...');
    
    const hostClient = this.clients[0];
    const participantClient = this.clients[1];
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Disconnection handling timeout'));
      }, 5000);

      hostClient.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'PARTICIPANT_LEFT' && message.userId === 'test-user-2') {
          clearTimeout(timeout);
          console.log('   ✓ Participant disconnection handled');
          console.log('   ✓ Remaining participants notified');
          resolve();
        }
      });

      // Disconnect participant
      participantClient.close();
    });
  }

  async createClient(userId) {
    return new Promise((resolve, reject) => {
      const client = new WebSocket(this.serverUrl);
      
      client.on('open', () => {
        this.clients.push(client);
        resolve(client);
      });

      client.on('error', (error) => {
        reject(error);
      });
    });
  }

  cleanup() {
    console.log('\n🧹 Cleaning up test clients...');
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.close();
      }
    });
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const tester = new RelayTester();
  
  console.log('⚠️  Make sure the local relay server is running on port 8080');
  console.log('   Run: node local-relay.js\n');
  
  // Give user time to start server
  setTimeout(() => {
    tester.runTests().catch(console.error);
  }, 2000);
}

module.exports = RelayTester;