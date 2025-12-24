const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const Database = require('better-sqlite3');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Inicializar base de dados
const db = new Database('scores.db');

// Criar tabelas se não existirem
db.exec(`
  CREATE TABLE IF NOT EXISTS single_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_name TEXT NOT NULL,
    score INTEGER NOT NULL,
    level INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS multiplayer_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player1_name TEXT NOT NULL,
    player2_name TEXT,
    player1_score INTEGER NOT NULL,
    player2_score INTEGER,
    winner TEXT,
    game_mode TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE INDEX IF NOT EXISTS idx_single_score ON single_scores(score DESC);
  CREATE INDEX IF NOT EXISTS idx_multiplayer_date ON multiplayer_scores(created_at DESC);
`);

// Middleware para JSON
app.use(express.json());

// Função para calcular nível baseado em pontos
function calculateLevel(score) {
  if (score < 200) return 1;
  if (score < 500) return 2;
  if (score < 1000) return 3;
  if (score < 2000) return 4;
  if (score < 3500) return 5;
  if (score < 5000) return 6;
  if (score < 7500) return 7;
  if (score < 10000) return 8;
  if (score < 15000) return 9;
  return 10 + Math.floor((score - 15000) / 5000); // Nível 10+ a cada 5000 pontos
}

// Endpoints da API
// Guardar pontuação single player
app.post('/api/scores/single', (req, res) => {
  try {
    const { playerName, score } = req.body;
    const level = calculateLevel(score);
    
    const stmt = db.prepare('INSERT INTO single_scores (player_name, score, level) VALUES (?, ?, ?)');
    const result = stmt.run(playerName, score, level);
    
    res.json({ success: true, id: result.lastInsertRowid, level });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obter classificações single player
app.get('/api/scores/single', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const stmt = db.prepare('SELECT * FROM single_scores ORDER BY score DESC, created_at DESC LIMIT ?');
    const scores = stmt.all(limit);
    res.json({ success: true, scores });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Guardar pontuação multiplayer
app.post('/api/scores/multiplayer', (req, res) => {
  try {
    const { player1Name, player2Name, player1Score, player2Score, gameMode } = req.body;
    const winner = player1Score > player2Score ? player1Name : (player2Score > player1Score ? player2Name : 'Empate');
    
    const stmt = db.prepare(`
      INSERT INTO multiplayer_scores (player1_name, player2_name, player1_score, player2_score, winner, game_mode)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(player1Name, player2Name || null, player1Score, player2Score || null, winner, gameMode);
    
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obter histórico multiplayer
app.get('/api/scores/multiplayer', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const stmt = db.prepare('SELECT * FROM multiplayer_scores ORDER BY created_at DESC LIMIT ?');
    const scores = stmt.all(limit);
    res.json({ success: true, scores });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Limpar base de dados (protegido com token simples)
app.delete('/api/scores/clear', (req, res) => {
  try {
    // Proteção simples com token (podes mudar este token)
    const token = req.headers['x-clear-token'] || req.query.token;
    const SECRET_TOKEN = process.env.CLEAR_DB_TOKEN || 'change-this-token-in-production';
    
    if (token !== SECRET_TOKEN) {
      return res.status(401).json({ success: false, error: 'Token inválido' });
    }
    
    console.log('🧹 Limpando base de dados...');
    
    // Limpar tabelas
    db.exec(`
      DELETE FROM single_scores;
      DELETE FROM multiplayer_scores;
      VACUUM;
    `);
    
    // Verificar contagens
    const singleCount = db.prepare('SELECT COUNT(*) as count FROM single_scores').get();
    const multiCount = db.prepare('SELECT COUNT(*) as count FROM multiplayer_scores').get();
    
    console.log(`✅ Base de dados limpa! Single: ${singleCount.count}, Multi: ${multiCount.count}`);
    
    res.json({ 
      success: true, 
      message: 'Base de dados limpa com sucesso',
      singleCount: singleCount.count,
      multiCount: multiCount.count
    });
  } catch (error) {
    console.error('❌ Erro ao limpar base de dados:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname)));

// Rota principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'multiplayer.html'));
});

// Sistema de salas
const rooms = {};
const activeGames = {};

// Configurações do jogo
// Emojis da Vanellope/Sugar Rush (mesmos da personalização)
const VANELLOPE_EMOJIS = ['🍭', '🍬', '🍰', '🍪', '🍩', '🍫', '🍒', '🍓', '⭐', '💖', '💕', '🎀', '👑', '✨', '🌈', '🎪'];

const GAME_CONFIG = {
  maxPlayers: 2,
  candySpawnInterval: 1000, // Mais rápido
  obstacleSpawnInterval: 1500, // Mais rápido
  gameSpeed: 6, // Velocidade base aumentada (era 3)
  gameWidth: 400,
  maxSpeed: 15, // Velocidade máxima aumentada
  maxObstacleSpawnRate: 0.4, // Limite mínimo de intervalo (40% do original)
  maxCandiesOnScreen: 8, // Reduzido para melhor performance
  maxObstaclesOnScreen: 4 // Reduzido para melhor performance
};

// Gerar código de sala único
function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Criar nova sala
function createRoom(hostId, gameMode = 'multiplayer') {
  const roomCode = generateRoomCode();
  rooms[roomCode] = {
    code: roomCode,
    host: hostId,
    players: {},
    gameMode: gameMode, // 'multiplayer' ou 'single'
    gameStarted: false,
    customizationPhase: false,
    candies: [],
    obstacles: [],
    lastCandyId: 0,
    lastObstacleId: 0,
    currentSpeed: GAME_CONFIG.gameSpeed, // Velocidade dinâmica
    baseSpeed: GAME_CONFIG.gameSpeed
  };
  return roomCode;
}

// Criar novo doce com emoji da Vanellope
function createCandy(roomCode) {
  const room = rooms[roomCode];
  if (!room) return null;
  
  // Limitar número de doces na tela
  const activeCandies = room.candies.filter(c => !c.collected && c.y <= 550).length;
  if (activeCandies >= GAME_CONFIG.maxCandiesOnScreen) {
    return null; // Não criar mais doces se já há muitos na tela
  }
  
  // Escolher emoji aleatório da lista
  const emoji = VANELLOPE_EMOJIS[Math.floor(Math.random() * VANELLOPE_EMOJIS.length)];
  
  // Pontos baseados no tipo de emoji (alguns valem mais)
  const emojiIndex = VANELLOPE_EMOJIS.indexOf(emoji);
  let points = 10; // Base
  if (emojiIndex < 3) points = 20; // Primeiros 3 (🍭🍬🍰) valem mais
  else if (emojiIndex < 6) points = 15; // Próximos 3 (🍪🍩🍫)
  else if (emojiIndex < 9) points = 12; // Próximos 3 (🍒🍓⭐)
  else points = 10; // Restantes
  
  const candy = {
    id: room.lastCandyId++,
    x: Math.random() * (GAME_CONFIG.gameWidth - 50) + 10,
    y: -50,
    emoji: emoji, // Emoji em vez de type
    points: points,
    collected: false
  };
  room.candies.push(candy);
  return candy;
}

// Criar novo obstáculo
function createObstacle(roomCode) {
  const room = rooms[roomCode];
  if (!room) return null;
  
  // Limitar número de obstáculos na tela
  const activeObstacles = room.obstacles.filter(o => !o.hit && o.y <= 550).length;
  if (activeObstacles >= GAME_CONFIG.maxObstaclesOnScreen) {
    return null; // Não criar mais obstáculos se já há muitos na tela
  }
  
  // Tipo 1 = pequeno (-50 pontos), Tipo 2 = grande (-150 pontos)
  const obstacleType = Math.random() < 0.7 ? 1 : 2; // 70% pequenos, 30% grandes
  const pointsLost = obstacleType === 1 ? 50 : 150;
  
  const obstacle = {
    id: room.lastObstacleId++,
    x: Math.random() * (GAME_CONFIG.gameWidth - 50) + 10,
    y: -50,
    type: obstacleType,
    pointsLost: pointsLost,
    hit: false
  };
  room.obstacles.push(obstacle);
  return obstacle;
}

// Iniciar jogo
function startGame(roomCode) {
  const room = rooms[roomCode];
  if (!room || room.gameStarted) return;
  
  room.gameStarted = true;
  room.candies = [];
  room.obstacles = [];
  room.lastCandyId = 0;
  room.lastObstacleId = 0;
  
  // Resetar pontuação (começar com 100), vidas (3) e velocidade
  Object.keys(room.players).forEach(playerId => {
    room.players[playerId].score = 100;
    room.players[playerId].lives = 3; // Resetar para 3 vidas
    room.players[playerId].ready = false;
  });
  
  // Resetar velocidade
  room.currentSpeed = room.baseSpeed;
  
  const roomSockets = io.sockets.adapter.rooms.get(roomCode);
  if (!roomSockets) return;
  
  // Variáveis para controlar spawn dinâmico
  let lastCandySpawn = Date.now();
  let lastObstacleSpawn = Date.now();
  
  // Criar doces (todos os modos) - spawn dinâmico baseado na pontuação
  const candySpawnLoop = () => {
    if (!room.gameStarted || !rooms[roomCode]) return;
    
    const now = Date.now();
    // Usar pontuação acima de 100 (pontos ganhos) para calcular dificuldade
    const totalScore = Object.values(room.players).reduce((sum, p) => sum + Math.max(0, p.score - 100), 0);
    // Reduzir intervalo conforme pontuação aumenta (mais rápido = mais difícil) - mais conservador
    const intervalMultiplier = Math.max(0.6, 1 - (totalScore / 400) * 0.1); // Reduz 10% a cada 400 pontos ganhos
    const currentInterval = Math.max(600, GAME_CONFIG.candySpawnInterval * intervalMultiplier);
    
    if (now - lastCandySpawn >= currentInterval) {
      const candy = createCandy(roomCode);
      if (candy) {
        io.to(roomCode).emit('candySpawned', candy);
        lastCandySpawn = now;
      }
    }
    
    setTimeout(candySpawnLoop, 150); // Verificar a cada 150ms (otimizado)
  };
  candySpawnLoop();
  
  // Criar obstáculos (rochas) - todos os modos - spawn dinâmico
  const obstacleSpawnLoop = () => {
    if (!room.gameStarted || !rooms[roomCode]) return;
    
    const now = Date.now();
    // Usar pontuação acima de 100 (pontos ganhos) para calcular dificuldade
    const totalScore = Object.values(room.players).reduce((sum, p) => sum + Math.max(0, p.score - 100), 0);
    // Aumentar frequência de obstáculos conforme pontuação aumenta (com limite)
    const intervalMultiplier = Math.max(GAME_CONFIG.maxObstacleSpawnRate, 1 - (totalScore / 300) * 0.15); // Reduz 15% a cada 300 pontos ganhos, com limite
    const currentInterval = Math.max(800, GAME_CONFIG.obstacleSpawnInterval * intervalMultiplier);
    
    if (now - lastObstacleSpawn >= currentInterval) {
      const obstacle = createObstacle(roomCode);
      if (obstacle) {
        io.to(roomCode).emit('obstacleSpawned', obstacle);
        lastObstacleSpawn = now;
      }
    }
    
    setTimeout(obstacleSpawnLoop, 150); // Verificar a cada 150ms (otimizado)
  };
  obstacleSpawnLoop();
  
  // Loop principal do jogo
  const gameLoop = setInterval(() => {
    if (!room.gameStarted || !rooms[roomCode]) {
      clearInterval(gameLoop);
      return;
    }
    
    // Calcular velocidade dinâmica baseada na pontuação total
    // Usar pontuação acima de 100 (pontos ganhos) para calcular velocidade
    const totalScore = Object.values(room.players).reduce((sum, p) => sum + Math.max(0, p.score - 100), 0);
    const speedMultiplier = 1 + (totalScore / 200) * 0.1; // Aumenta 10% a cada 200 pontos ganhos (mais suave)
    room.currentSpeed = Math.min(room.baseSpeed * speedMultiplier, GAME_CONFIG.maxSpeed); // Usar maxSpeed do config
    
    // Atualizar posição dos doces
    room.candies.forEach(candy => {
      if (!candy.collected) {
        candy.y += room.currentSpeed;
      }
    });
    
    // Atualizar posição dos obstáculos
    room.obstacles.forEach(obstacle => {
      if (!obstacle.hit) {
        obstacle.y += room.currentSpeed;
      }
    });
    
    // Remover doces que saíram da tela ou foram coletados (limpeza agressiva)
    const beforeCandies = room.candies.length;
    room.candies = room.candies.filter(c => c.y <= 600 && !c.collected);
    // Limitar histórico - manter apenas últimos 50 doces
    if (room.candies.length > 50) {
      room.candies = room.candies.slice(-50);
    }
    
    // Remover obstáculos que saíram da tela ou foram atingidos (limpeza agressiva)
    room.obstacles = room.obstacles.filter(o => o.y <= 600 && !o.hit);
    // Limitar histórico - manter apenas últimos 30 obstáculos
    if (room.obstacles.length > 30) {
      room.obstacles = room.obstacles.slice(-30);
    }
    
    // Verificar se algum jogador tem pontos <= 0
    Object.keys(room.players).forEach(playerId => {
      if (room.players[playerId].score <= 0) {
        endGame(roomCode, playerId, 'Perdeste! Os teus pontos chegaram a zero ou negativo.');
      }
    });
    
    // Enviar atualização com velocidade atual (apenas elementos visíveis)
    // Filtrar apenas elementos que estão na tela para reduzir dados
    const visibleCandies = room.candies.filter(c => c.y >= -100 && c.y <= 600 && !c.collected);
    const visibleObstacles = room.obstacles.filter(o => o.y >= -100 && o.y <= 600 && !o.hit);
    
    // Só enviar update se houver mudanças significativas
    io.to(roomCode).emit('gameUpdate', {
      candies: visibleCandies,
      obstacles: visibleObstacles,
      players: room.players,
      currentSpeed: room.currentSpeed
    });
  }, 33); // ~30 FPS (reduzido para melhor performance)
}

// Finalizar jogo
function endGame(roomCode, loserId, reason) {
  const room = rooms[roomCode];
  if (!room) {
    console.warn(`⚠️ Sala ${roomCode} não encontrada para endGame`);
    return;
  }
  if (!room.gameStarted) {
    console.warn(`⚠️ Jogo na sala ${roomCode} não estava iniciado`);
    return;
  }
  
  console.log(`🎮 Finalizando jogo na sala ${roomCode}`);
  console.log(`📊 Modo: ${room.gameMode}`);
  console.log(`😢 Perdedor ID: ${loserId}`);
  console.log(`📝 Razão: ${reason}`);
  
  room.gameStarted = false;
  
  const winnerId = Object.keys(room.players).find(id => id !== loserId);
  const winner = room.players[winnerId];
  const loser = room.players[loserId];
  
  // Guardar scores na base de dados
  const playersArray = Object.values(room.players);
  
  if (room.gameMode === 'single') {
    // Single player - guardar sempre que o jogo acabar (mesmo com score baixo)
    const player = playersArray[0];
    if (player && player.name && player.score !== undefined) {
      const level = calculateLevel(player.score);
      try {
        const stmt = db.prepare('INSERT INTO single_scores (player_name, score, level) VALUES (?, ?, ?)');
        const result = stmt.run(player.name, player.score, level);
        console.log(`✅ Score SINGLE guardado: ${player.name} - ${player.score} pontos - Nível ${level} (ID: ${result.lastInsertRowid})`);
      } catch (error) {
        console.error('❌ Erro ao guardar score single:', error);
        console.error('Dados:', { name: player.name, score: player.score, level });
      }
    } else {
      console.warn('⚠️ Player inválido para guardar score single:', player);
    }
  } else {
    // Multiplayer - guardar ambos os jogadores
    if (playersArray.length >= 1) {
      const player1 = playersArray[0];
      const player2 = playersArray[1] || null;
      
      if (player1 && player1.name && player1.score !== undefined) {
        try {
          const stmt = db.prepare(`
            INSERT INTO multiplayer_scores (player1_name, player2_name, player1_score, player2_score, winner, game_mode)
            VALUES (?, ?, ?, ?, ?, ?)
          `);
          const winnerName = winner ? winner.name : (player1.score === player2?.score ? 'Empate' : (player1.score > (player2?.score || 0) ? player1.name : player2?.name));
          const result = stmt.run(
            player1.name,
            player2 ? player2.name : null,
            player1.score,
            player2 ? player2.score : null,
            winnerName || 'Empate',
            'multiplayer'
          );
          console.log(`✅ Score MULTIPLAYER guardado: ${player1.name} (${player1.score}) vs ${player2 ? player2.name + ' (' + player2.score + ')' : 'N/A'} - Vencedor: ${winnerName} (ID: ${result.lastInsertRowid})`);
        } catch (error) {
          console.error('❌ Erro ao guardar score multiplayer:', error);
          console.error('Dados:', { 
            player1: { name: player1.name, score: player1.score },
            player2: player2 ? { name: player2.name, score: player2.score } : null
          });
        }
      } else {
        console.warn('⚠️ Player1 inválido para guardar score multiplayer:', player1);
      }
    }
  }
  
  // Calcular níveis para todos os jogadores
  const levels = {};
  playersArray.forEach(player => {
    levels[player.id] = calculateLevel(player.score);
  });
  
  io.to(roomCode).emit('gameEnd', {
    winner: winner ? { id: winnerId, score: winner.score, name: winner.name } : null,
    loser: loser ? { id: loserId, score: loser.score, name: loser.name } : null,
    reason: reason,
    players: room.players,
    levels: levels
  });
  
  setTimeout(() => {
    if (rooms[roomCode]) {
      room.candies = [];
      room.obstacles = [];
      Object.keys(room.players).forEach(playerId => {
        room.players[playerId].ready = false;
      });
    }
  }, 3000);
}

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('✅ NOVA CONEXÃO - Jogador conectado:', socket.id);
  console.log('📊 Total de salas:', Object.keys(rooms).length);
  
  // Debug: verificar se eventos estão sendo registrados
  socket.onAny((eventName, ...args) => {
    console.log('📨 Evento recebido no servidor:', eventName, args);
  });
  
  // Criar sala
  socket.on('createRoom', (data) => {
    console.log('📥 Recebido createRoom do socket:', socket.id);
    console.log('📥 Dados recebidos:', JSON.stringify(data, null, 2));
    
    if (!data) {
      console.error('❌ Dados vazios!');
      socket.emit('error', 'Dados inválidos recebidos');
      return;
    }
    
    try {
      const playerName = data.playerName || 'Jogador 1';
      const gameMode = data.gameMode || 'multiplayer';
      const carColor = data.carColor || 'red';
      
      console.log('📝 Processando:', { playerName, gameMode, carColor });
      
      const roomCode = createRoom(socket.id, gameMode);
      
      if (!roomCode) {
        console.error('❌ createRoom retornou null/undefined!');
        socket.emit('error', 'Erro ao gerar código da sala');
        return;
      }
      
      console.log('✅ Sala criada:', roomCode);
      console.log('📦 Estado da sala:', rooms[roomCode]);
      
      socket.join(roomCode);
      console.log('✅ Socket entrou na sala:', roomCode);
      
      rooms[roomCode].players[socket.id] = {
        id: socket.id,
        name: playerName,
        x: 175,
        score: 100, // Começar com 100 pontos
        lives: 3, // 3 vidas
        ready: false,
        color: carColor,
        customization: { emojis: [] }
      };
      
      console.log('✅ Jogador adicionado à sala');
      
      const response = {
        roomCode: roomCode,
        playerId: socket.id,
        players: rooms[roomCode].players,
        gameMode: rooms[roomCode].gameMode
      };
      
      console.log('📤 Preparando resposta:', JSON.stringify(response, null, 2));
      console.log('📤 Socket conectado?', socket.connected);
      console.log('📤 Socket ID:', socket.id);
      
      // Enviar resposta
      socket.emit('roomCreated', response);
      
      console.log('✅ Resposta emitida com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao criar sala:', error);
      console.error('❌ Stack trace:', error.stack);
      socket.emit('error', 'Erro ao criar sala: ' + error.message);
    }
  });
  
  // Entrar em sala
  socket.on('joinRoom', (data) => {
    const roomCode = data.roomCode;
    const playerName = data.playerName || `Jogador ${Object.keys(room.players).length + 1}`;
    const carColor = data.carColor || (Object.keys(room.players).length === 0 ? 'red' : 'blue');
    
    if (!rooms[roomCode]) {
      socket.emit('error', 'Sala não encontrada!');
      return;
    }
    
    const room = rooms[roomCode];
    
    if (room.gameStarted) {
      socket.emit('error', 'Jogo já em andamento!');
      return;
    }
    
    if (room.gameMode === 'multiplayer' && Object.keys(room.players).length >= GAME_CONFIG.maxPlayers) {
      socket.emit('error', 'Sala cheia! Máximo de 2 jogadores.');
      return;
    }
    
    socket.join(roomCode);
    
    room.players[socket.id] = {
      id: socket.id,
      name: playerName,
      x: 175,
      score: 100,
      lives: 3, // 3 vidas
      ready: false,
      color: carColor,
      customization: { emojis: [] }
    };
    
    socket.emit('joinedRoom', {
      roomCode: roomCode,
      playerId: socket.id,
      players: room.players,
      gameMode: room.gameMode,
      customizationPhase: room.customizationPhase
    });
    
    io.to(roomCode).emit('playerJoined', {
      players: room.players
    });
  });
  
  // Iniciar fase de personalização
  socket.on('startCustomization', (roomCode) => {
    const room = rooms[roomCode];
    if (!room) return;
    
    // Qualquer jogador pode iniciar a personalização quando houver 2 jogadores (ou 1 no single)
    const minPlayers = room.gameMode === 'single' ? 1 : 2;
    if (Object.keys(room.players).length < minPlayers) {
      socket.emit('error', `Aguarde mais ${minPlayers - Object.keys(room.players).length} jogador(es)!`);
      return;
    }
    
    room.customizationPhase = true;
    io.to(roomCode).emit('customizationStarted');
  });
  
  // Atualizar personalização do carro
  socket.on('updateCustomization', (data) => {
    const { roomCode, customization } = data;
    const room = rooms[roomCode];
    if (!room || !room.players[socket.id]) return;
    
    room.players[socket.id].customization = customization;
    
    // Enviar para outros jogadores
    socket.to(roomCode).emit('playerCustomizationUpdated', {
      playerId: socket.id,
      customization: customization
    });
  });
  
  // Jogador pronto para começar
  socket.on('playerReady', (roomCode) => {
    const room = rooms[roomCode];
    if (!room || !room.players[socket.id]) return;
    
    room.players[socket.id].ready = true;
    
    io.to(roomCode).emit('playerReady', {
      playerId: socket.id,
      players: room.players
    });
    
    // Verificar se todos estão prontos
    const allReady = Object.keys(room.players).every(
      id => room.players[id].ready
    );
    
    const minPlayers = room.gameMode === 'single' ? 1 : 2;
    
    if (allReady && Object.keys(room.players).length >= minPlayers) {
      setTimeout(() => {
        startGame(roomCode);
        io.to(roomCode).emit('gameStart', {
          players: room.players
        });
      }, 1000);
    }
  });
  
  // Movimento do jogador
  socket.on('playerMove', (data) => {
    const { roomCode, x } = data;
    const room = rooms[roomCode];
    if (!room || !room.players[socket.id] || !room.gameStarted) return;
    
    room.players[socket.id].x = x;
    
    socket.to(roomCode).emit('playerMoved', {
      playerId: socket.id,
      x: x
    });
  });
  
  // Coleta de doce
  socket.on('candyCollected', (data) => {
    const { roomCode, candyId } = data;
    const room = rooms[roomCode];
    if (!room || !room.players[socket.id] || !room.gameStarted) return;
    
    const candy = room.candies.find(c => c.id === candyId);
    if (!candy || candy.collected) return;
    
    candy.collected = true;
    candy.collectedBy = socket.id;
    
    // Usar pontos do doce (já calculados na criação)
    const points = candy.points || 10;
    
    room.players[socket.id].score += points;
    
    io.to(roomCode).emit('candyCollected', {
      candyId: candyId,
      playerId: socket.id,
      score: room.players[socket.id].score,
      points: points // Enviar pontos ganhos para mostrar no popup
    });
  });
  
  // Colisão com obstáculo - tira uma vida
  socket.on('obstacleHit', (data) => {
    const { roomCode, obstacleId } = data;
    const room = rooms[roomCode];
    if (!room || !room.players[socket.id] || !room.gameStarted) return;
    
    const obstacle = room.obstacles.find(o => o.id === obstacleId);
    if (!obstacle || obstacle.hit) return;
    
    // Marcar obstáculo como atingido
    obstacle.hit = true;
    
    // Inicializar vidas se não existir
    if (room.players[socket.id].lives === undefined) {
      room.players[socket.id].lives = 3;
    }
    
    // Verificar se já está sem vidas ANTES de tirar
    // Se já tem 0 vidas, não deve perder mais (já perdeu o jogo)
    if (room.players[socket.id].lives <= 0) {
      return; // Já perdeu, não processar mais colisões
    }
    
    // Tirar uma vida
    room.players[socket.id].lives -= 1;
    
    // Verificar se ficou sem vidas APÓS tirar (só perde quando colide sem vidas)
    if (room.players[socket.id].lives <= 0) {
      endGame(roomCode, socket.id, `Perdeste! Ficaste sem vidas após colidir com os obstáculos.`);
    } else {
      // Notificar que perdeu uma vida
      io.to(roomCode).emit('obstacleHit', {
        playerId: socket.id,
        obstacleId: obstacleId,
        score: room.players[socket.id].score,
        lives: room.players[socket.id].lives,
        players: room.players
      });
    }
  });
  
  // Desconexão
  socket.on('disconnect', () => {
    console.log('Jogador desconectado:', socket.id);
    
    // Remover de todas as salas
    Object.keys(rooms).forEach(roomCode => {
      const room = rooms[roomCode];
      if (room.players[socket.id]) {
        delete room.players[socket.id];
        
        if (room.gameStarted) {
          if (room.gameMode === 'multiplayer') {
            endGame(roomCode, socket.id, 'Jogador desconectado');
          } else {
            room.gameStarted = false;
            room.candies = [];
            room.obstacles = [];
          }
        }
        
        // Se não há mais jogadores, deletar sala
        if (Object.keys(room.players).length === 0) {
          delete rooms[roomCode];
        } else {
          io.to(roomCode).emit('playerLeft', {
            playerId: socket.id,
            players: room.players
          });
        }
      }
    });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
  console.log('Aguardando jogadores...');
});
