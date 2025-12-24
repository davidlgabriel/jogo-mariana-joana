// Conectar ao servidor Socket.io
const socket = io({
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5
});

// Verificar conexão
socket.on('connect', () => {
    console.log('✅ Conectado ao servidor! Socket ID:', socket.id);
    console.log('🔌 Transporte:', socket.io.engine.transport.name);
});

socket.on('connect_error', (error) => {
    console.error('❌ Erro ao conectar:', error);
    console.error('❌ Tipo de erro:', error.type);
    console.error('❌ Mensagem:', error.message);
        alert('Erro ao ligar ao servidor! Verifique se o servidor está a correr.');
});

socket.on('disconnect', (reason) => {
    console.log('⚠️ Desconectado do servidor. Razão:', reason);
});

socket.on('reconnect', (attemptNumber) => {
    console.log('🔄 Reconectado após', attemptNumber, 'tentativas');
});

socket.on('reconnect_error', (error) => {
    console.error('❌ Erro ao reconectar:', error);
});

socket.on('reconnect_failed', () => {
    console.error('❌ Falha ao reconectar após várias tentativas');
    alert('Não foi possível voltar a ligar ao servidor. Recarregue a página.');
});

// Listener para debug - verificar todos os eventos recebidos
socket.onAny((eventName, ...args) => {
    console.log('📨 Evento recebido do servidor:', eventName, args);
});

// Sistema de "login" com localStorage
const STORAGE_KEY = 'jogoCarros_playerName';

function savePlayerName(name) {
    if (name && name.trim()) {
        localStorage.setItem(STORAGE_KEY, name.trim());
    }
}

function loadPlayerName() {
    return localStorage.getItem(STORAGE_KEY) || '';
}

// Elementos do DOM - serão inicializados quando o DOM estiver pronto
let mainMenu, lobby, customization, gameScreen;
let playerNameInput, playerNameJoinInput;
let createRoomBtn, joinRoomBtn, singlePlayerBtn;
let mainMenuButtons, createRoomForm, joinRoomForm;
let confirmCreateBtn, cancelCreateBtn, cancelJoinBtn;
let roomCodeSection, roomCodeDisplay, copyCodeBtn;
let roomCodeInput, confirmJoinBtn;
let selectedCarColor = 'red'; // Cor padrão
let playersList, lobbyStatus, startCustomizationBtn, lobbyRoomCode;
let carPreview, carBase, emojiList, clearEmojisBtn, readyToRaceBtn;
let gameArea, road, player1Car, player2Car;
let player1Score, player2Score, player1Name, player2Name, player1Position, player2Position;
let player1Level, player2Level;
let player1Lives, player2Lives;
let gameOver, gameOverTitle, gameOverMessage, playAgainBtn;
let leaderboard, leaderboardBtn, singleLeaderboardTab, multiLeaderboardTab, leaderboardList, backToMenuBtn;

// Função para inicializar elementos DOM
function initDOMElements() {
    mainMenu = document.getElementById('mainMenu');
    lobby = document.getElementById('lobby');
    customization = document.getElementById('customization');
    gameScreen = document.getElementById('gameScreen');
    
    playerNameInput = document.getElementById('playerName');
    playerNameJoinInput = document.getElementById('playerNameJoin');
    createRoomBtn = document.getElementById('createRoomBtn');
    joinRoomBtn = document.getElementById('joinRoomBtn');
    singlePlayerBtn = document.getElementById('singlePlayerBtn');
    mainMenuButtons = document.getElementById('mainMenuButtons');
    createRoomForm = document.getElementById('createRoomForm');
    joinRoomForm = document.getElementById('joinRoomForm');
    confirmCreateBtn = document.getElementById('confirmCreateBtn');
    cancelCreateBtn = document.getElementById('cancelCreateBtn');
    cancelJoinBtn = document.getElementById('cancelJoinBtn');
    roomCodeSection = document.getElementById('roomCodeSection');
    roomCodeDisplay = document.getElementById('roomCodeDisplay');
    copyCodeBtn = document.getElementById('copyCodeBtn');
    roomCodeInput = document.getElementById('roomCodeInput');
    confirmJoinBtn = document.getElementById('confirmJoinBtn');
    playersList = document.getElementById('playersList');
    lobbyStatus = document.getElementById('lobbyStatus');
    startCustomizationBtn = document.getElementById('startCustomizationBtn');
    lobbyRoomCode = document.getElementById('lobbyRoomCode');
    
    // Personalização
    carPreview = document.getElementById('carPreview');
    carBase = document.getElementById('carBase');
    emojiList = document.getElementById('emojiList');
    clearEmojisBtn = document.getElementById('clearEmojisBtn');
    readyToRaceBtn = document.getElementById('readyToRaceBtn');
    
    // Jogo
    gameArea = document.getElementById('gameArea');
    road = document.getElementById('road');
    player1Car = document.getElementById('player1Car');
    player2Car = document.getElementById('player2Car');
    player1Score = document.getElementById('player1ScoreValue');
    player2Score = document.getElementById('player2ScoreValue');
    player1Name = document.getElementById('player1Name');
    player2Name = document.getElementById('player2Name');
    player1Level = document.getElementById('player1Level');
    player2Level = document.getElementById('player2Level');
    player1Lives = document.getElementById('player1Lives');
    player2Lives = document.getElementById('player2Lives');
    player1Position = document.getElementById('player1Position');
    player2Position = document.getElementById('player2Position');
    gameOver = document.getElementById('gameOver');
    gameOverTitle = document.getElementById('gameOverTitle');
    gameOverMessage = document.getElementById('gameOverMessage');
    playAgainBtn = document.getElementById('playAgainBtn');
    leaderboard = document.getElementById('leaderboard');
    leaderboardBtn = document.getElementById('leaderboardBtn');
    singleLeaderboardTab = document.getElementById('singleLeaderboardTab');
    multiLeaderboardTab = document.getElementById('multiLeaderboardTab');
    leaderboardList = document.getElementById('leaderboardList');
    backToMenuBtn = document.getElementById('backToMenuBtn');
}

// Estado do jogo
let myPlayerId = null;
let currentRoomCode = null;
let gameMode = 'multiplayer';
let players = {};
let candies = {};
let obstacles = {};
let gameStarted = false;
let myCar = null;
let otherCar = null;
let myCustomization = { emojis: [] };
let draggedEmoji = null;

// Configurações
const GAME_WIDTH = 400;
const CAR_WIDTH = 50;
const CAR_HEIGHT = 80;
const LEFT_LIMIT = 10;
const RIGHT_LIMIT = GAME_WIDTH - CAR_WIDTH - 10;

// Emojis disponíveis - Tema Vanellope/Sugar Rush
const availableEmojis = ['🍭', '🍬', '🍰', '🍪', '🍩', '🍫', '🍒', '🍓', '⭐', '💖', '💕', '🎀', '👑', '✨', '🌈', '🎪'];

// Mapeamento de cores para gradientes dos carros (sem amarelo/laranja, cores mais escuras)
const CAR_COLORS = {
    red: 'linear-gradient(135deg, #DC143C 0%, #FF1493 100%)',
    blue: 'linear-gradient(135deg, #1E90FF 0%, #4169E1 100%)',
    green: 'linear-gradient(135deg, #228B22 0%, #32CD32 100%)',
    purple: 'linear-gradient(135deg, #8B008B 0%, #9370DB 100%)',
    pink: 'linear-gradient(135deg, #C71585 0%, #FF1493 100%)',
    cyan: 'linear-gradient(135deg, #008B8B 0%, #00CED1 100%)',
    magenta: 'linear-gradient(135deg, #8B008B 0%, #FF00FF 100%)',
    teal: 'linear-gradient(135deg, #008080 0%, #20B2AA 100%)'
};

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
    return 10 + Math.floor((score - 15000) / 5000);
}

// Funções para classificações
async function loadSingleLeaderboard() {
    try {
        const response = await fetch('/api/scores/single?limit=20');
        const data = await response.json();
        if (data.success) {
            displaySingleLeaderboard(data.scores);
        }
    } catch (error) {
        console.error('Erro ao carregar classificações single:', error);
        if (leaderboardList) leaderboardList.innerHTML = '<p>Erro ao carregar classificações</p>';
    }
}

async function loadMultiLeaderboard() {
    try {
        const response = await fetch('/api/scores/multiplayer?limit=20');
        const data = await response.json();
        if (data.success) {
            displayMultiLeaderboard(data.scores);
        }
    } catch (error) {
        console.error('Erro ao carregar classificações multiplayer:', error);
        if (leaderboardList) leaderboardList.innerHTML = '<p>Erro ao carregar classificações</p>';
    }
}

function displaySingleLeaderboard(scores) {
    if (!leaderboardList) return;
    
    if (scores.length === 0) {
        leaderboardList.innerHTML = '<p>Nenhuma pontuação ainda!</p>';
        return;
    }
    
    let html = '<div class="leaderboard-table">';
    scores.forEach((score, index) => {
        html += `
            <div class="leaderboard-item">
                <span class="rank">#${index + 1}</span>
                <span class="name">${escapeHtml(score.player_name)}</span>
                <span class="score">${score.score} pts</span>
                <span class="level">Nível ${score.level}</span>
                <span class="date">${new Date(score.created_at).toLocaleDateString('pt-PT')}</span>
            </div>
        `;
    });
    html += '</div>';
    leaderboardList.innerHTML = html;
}

function displayMultiLeaderboard(scores) {
    if (!leaderboardList) return;
    
    if (scores.length === 0) {
        leaderboardList.innerHTML = '<p>Nenhum histórico ainda!</p>';
        return;
    }
    
    let html = '<div class="leaderboard-table">';
    scores.forEach((score, index) => {
        html += `
            <div class="leaderboard-item">
                <span class="rank">#${index + 1}</span>
                <span class="name">${escapeHtml(score.player1_name)} ${score.player2_name ? 'vs ' + escapeHtml(score.player2_name) : ''}</span>
                <span class="score">${score.player1_score}${score.player2_score ? ' - ' + score.player2_score : ''}</span>
                <span class="winner">🏆 ${escapeHtml(score.winner)}</span>
                <span class="date">${new Date(score.created_at).toLocaleDateString('pt-PT')}</span>
            </div>
        `;
    });
    html += '</div>';
    leaderboardList.innerHTML = html;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function editPlayerName(nameElement) {
    const oldName = nameElement.textContent;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = oldName;
    input.maxLength = 20;
    input.style.cssText = 'width: 100%; padding: 5px; font-size: inherit;';
    
    nameElement.textContent = '';
    nameElement.appendChild(input);
    input.focus();
    input.select();
    
    const finishEdit = () => {
        const newName = input.value.trim() || oldName;
        nameElement.textContent = newName;
        
        // Atualizar nome no servidor se necessário
        if (socket && currentRoomCode) {
            // Pode adicionar evento para atualizar nome no servidor
        }
    };
    
    input.addEventListener('blur', finishEdit);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            finishEdit();
        }
    });
}

// Verificar se todos os elementos foram encontrados
function verifyElements() {
    const requiredElements = [
        { id: 'createRoomBtn', name: 'createRoomBtn' },
        { id: 'joinRoomBtn', name: 'joinRoomBtn' },
        { id: 'singlePlayerBtn', name: 'singlePlayerBtn' },
        { id: 'roomCodeSection', name: 'roomCodeSection' },
        { id: 'roomCodeDisplay', name: 'roomCodeDisplay' },
        { id: 'playerName', name: 'playerNameInput' }
    ];
    
    const missing = requiredElements.filter(el => !document.getElementById(el.id));
    
    if (missing.length > 0) {
        console.error('❌ Elementos não encontrados:', missing.map(el => el.name));
        return false;
    }
    
    return true;
}

// Inicialização
function init() {
    console.log('🚀 Inicializando jogo...');
    
    // Inicializar elementos DOM primeiro
    initDOMElements();
    
    // Verificar elementos
    if (!verifyElements()) {
        console.error('❌ Alguns elementos não foram encontrados. Aguardando DOM...');
        // Tentar novamente após um pequeno delay
        setTimeout(() => {
            initDOMElements();
            if (verifyElements()) {
                console.log('✅ Elementos encontrados na segunda tentativa!');
                setupAfterInit();
            } else {
                alert('Erro: Alguns elementos da página não foram encontrados. Recarregue a página.');
            }
        }, 100);
        return;
    }
    
    setupAfterInit();
}

function setupAfterInit() {
    // Verificar conexão socket
    if (!socket) {
        console.error('❌ Socket não inicializado!');
        alert('Erro: Não foi possível conectar ao servidor. Verifique se o servidor está rodando.');
        return;
    }
    
    console.log('✅ Elementos verificados, configurando listeners...');
    createEmojiPalette();
    setupEventListeners();
    console.log('✅ Inicialização completa!');
}

function setupEventListeners() {
    console.log('🔧 Configurando event listeners...');
    
    // Seleção de cor do carro
    document.querySelectorAll('.color-option').forEach(option => {
        option.addEventListener('click', function() {
            document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');
            selectedCarColor = this.dataset.color;
        });
    });
    
    // Selecionar primeira cor por padrão
    const firstColorOption = document.querySelector('.color-option');
    if (firstColorOption) {
        firstColorOption.classList.add('selected');
    }
    
    if (createRoomBtn) {
        createRoomBtn.addEventListener('click', () => {
            showCreateRoomForm('multiplayer');
        });
    } else {
        console.error('❌ createRoomBtn não encontrado!');
    }
    
    if (joinRoomBtn) {
        joinRoomBtn.addEventListener('click', () => {
            showJoinRoomForm();
        });
    }
    
    if (singlePlayerBtn) {
        singlePlayerBtn.addEventListener('click', () => {
            showCreateRoomForm('single');
        });
    }
    
    if (confirmCreateBtn) {
        confirmCreateBtn.addEventListener('click', () => {
            const name = playerNameInput ? playerNameInput.value.trim() : '';
            if (!name) {
                alert('Por favor, digite o teu nome!');
                return;
            }
            
            // Guardar nome
            savePlayerName(name);
            
            const gameMode = confirmCreateBtn.dataset.gameMode || 'multiplayer';
            createRoom(gameMode, name);
        });
    }
    
    if (cancelCreateBtn) {
        cancelCreateBtn.addEventListener('click', () => {
            hideCreateRoomForm();
        });
    }
    
    if (cancelJoinBtn) {
        cancelJoinBtn.addEventListener('click', () => {
            hideJoinRoomForm();
        });
    }
    
    if (confirmJoinBtn) {
        confirmJoinBtn.addEventListener('click', joinRoom);
    }
    
    if (copyCodeBtn) {
        copyCodeBtn.addEventListener('click', copyRoomCode);
    }
    
    if (startCustomizationBtn) {
        startCustomizationBtn.addEventListener('click', () => {
            console.log('🖱️ Botão Personalizar Carro clicado!');
            startCustomization();
        });
    } else {
        console.error('❌ startCustomizationBtn não encontrado!');
    }
    
    if (clearEmojisBtn) {
        clearEmojisBtn.addEventListener('click', clearEmojis);
    }
    
    if (readyToRaceBtn) {
        readyToRaceBtn.addEventListener('click', () => {
            console.log('🖱️ Botão Pronto para Correr clicado!');
            readyToRace();
        });
    } else {
        console.error('❌ readyToRaceBtn não encontrado!');
    }
    
    if (playAgainBtn) {
        playAgainBtn.addEventListener('click', () => {
            gameOver.classList.add('hidden');
            
            // Se ainda temos uma sala ativa, voltar ao lobby
            if (currentRoomCode && lobby) {
                console.log('🔄 Voltando ao lobby para jogar novamente...');
                
                // Limpar elementos do jogo
                if (player1Car) player1Car.innerHTML = '';
                if (player2Car) player2Car.innerHTML = '';
                
                // Resetar estado do jogo
                gameStarted = false;
                candies = {};
                obstacles = {};
                myCar = null;
                otherCar = null;
                
                // Mostrar lobby
                showScreen('lobby');
                
                // Atualizar lista de jogadores se ainda temos players
                if (players && Object.keys(players).length > 0) {
                    updatePlayersList(players);
                }
                
                // Mostrar botão de personalização se for single-player
                if (gameMode === 'single' && startCustomizationBtn) {
                    startCustomizationBtn.style.display = 'block';
                    startCustomizationBtn.textContent = 'Personalizar Carro';
                }
            } else {
                // Se não há sala ativa, voltar ao menu inicial
                console.log('🏠 Voltando ao menu inicial (sem sala ativa)');
                showScreen('mainMenu');
            }
        });
    }
    
    if (leaderboardBtn) {
        leaderboardBtn.addEventListener('click', () => {
            showScreen('leaderboard');
            loadSingleLeaderboard();
        });
    }
    
    if (singleLeaderboardTab) {
        singleLeaderboardTab.addEventListener('click', () => {
            singleLeaderboardTab.classList.add('active');
            multiLeaderboardTab.classList.remove('active');
            loadSingleLeaderboard();
        });
    }
    
    if (multiLeaderboardTab) {
        multiLeaderboardTab.addEventListener('click', () => {
            multiLeaderboardTab.classList.add('active');
            singleLeaderboardTab.classList.remove('active');
            loadMultiLeaderboard();
        });
    }
    
    if (backToMenuBtn) {
        backToMenuBtn.addEventListener('click', () => {
            showScreen('mainMenu');
        });
    }
    
    // Editar nome (duplo clique no nome)
    if (player1Name) {
        player1Name.addEventListener('dblclick', () => editPlayerName(player1Name));
    }
    if (player2Name) {
        player2Name.addEventListener('dblclick', () => editPlayerName(player2Name));
    }
    
    // Controles do jogo (mouse e touch)
    if (gameArea) {
        gameArea.addEventListener('mousemove', handleMouseMove);
        // Touch events para mobile/tablet
        gameArea.addEventListener('touchmove', handleTouchMove, { passive: false });
        gameArea.addEventListener('touchstart', handleTouchStart, { passive: false });
    }
    document.addEventListener('keydown', handleKeyDown);
    
    // Personalização drag and drop
    setupCustomizationDragDrop();
    
    console.log('✅ Event listeners configurados!');
}

function createEmojiPalette() {
    emojiList.innerHTML = '';
    availableEmojis.forEach(emoji => {
        const emojiItem = document.createElement('div');
        emojiItem.className = 'emoji-item';
        emojiItem.textContent = emoji;
        emojiItem.draggable = true;
        
        // Drag and drop para desktop
        emojiItem.addEventListener('dragstart', (e) => {
            draggedEmoji = emoji;
        });
        
        // Touch events para mobile/tablet - arrastar emoji para o carro
        let touchStartX, touchStartY;
        let isDraggingEmoji = false;
        let dragPreview = null;
        
        emojiItem.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const touch = e.touches[0];
            if (!touch) return;
            
            isDraggingEmoji = true;
            draggedEmoji = emoji;
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
            
            // Criar preview visual do emoji a ser arrastado
            dragPreview = document.createElement('div');
            dragPreview.textContent = emoji;
            dragPreview.style.position = 'fixed';
            dragPreview.style.fontSize = '40px';
            dragPreview.style.pointerEvents = 'none';
            dragPreview.style.zIndex = '10000';
            dragPreview.style.left = touch.clientX - 20 + 'px';
            dragPreview.style.top = touch.clientY - 20 + 'px';
            dragPreview.style.opacity = '0.8';
            document.body.appendChild(dragPreview);
        }, { passive: false });
        
        emojiItem.addEventListener('touchmove', (e) => {
            if (!isDraggingEmoji || !dragPreview) return;
            e.preventDefault();
            e.stopPropagation();
            
            const touch = e.touches[0];
            if (!touch) return;
            
            // Atualizar posição do preview
            dragPreview.style.left = touch.clientX - 20 + 'px';
            dragPreview.style.top = touch.clientY - 20 + 'px';
        }, { passive: false });
        
        emojiItem.addEventListener('touchend', (e) => {
            if (!isDraggingEmoji) return;
            e.preventDefault();
            e.stopPropagation();
            
            const touch = e.changedTouches[0];
            if (!touch) {
                cleanupDrag();
                return;
            }
            
            // Verificar se o toque terminou sobre o carPreview
            const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
            if (elementBelow && (carPreview.contains(elementBelow) || elementBelow === carPreview)) {
                const rect = carPreview.getBoundingClientRect();
                const x = touch.clientX - rect.left;
                const y = touch.clientY - rect.top;
                
                // Adicionar emoji ao carro
                if (draggedEmoji) {
                    addEmojiToCar(draggedEmoji, x, y);
                }
            }
            
            cleanupDrag();
        }, { passive: false });
        
        function cleanupDrag() {
            isDraggingEmoji = false;
            draggedEmoji = null;
            if (dragPreview) {
                dragPreview.remove();
                dragPreview = null;
            }
        }
        
        emojiList.appendChild(emojiItem);
    });
}

function setupCustomizationDragDrop() {
    // Drag and drop para desktop
    carPreview.addEventListener('dragover', (e) => {
        e.preventDefault();
    });
    
    carPreview.addEventListener('drop', (e) => {
        e.preventDefault();
        if (!draggedEmoji) return;
        
        const rect = carPreview.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        addEmojiToCar(draggedEmoji, x, y);
        draggedEmoji = null;
    });
    
    // Touch events para mobile/tablet - permitir soltar emoji no carPreview
    carPreview.addEventListener('touchmove', (e) => {
        // Permitir que o touch move funcione para arrastar emojis já no carro
        // Mas não interferir com o arrasto de novos emojis
    }, { passive: true });
    
    carPreview.addEventListener('touchend', (e) => {
        // Este evento é tratado no createEmojiPalette quando o emoji é solto
    }, { passive: true });
}

function addEmojiToCar(emoji, x, y) {
    const emojiElement = document.createElement('div');
    emojiElement.className = 'emoji-on-car';
    emojiElement.textContent = emoji;
    emojiElement.style.left = x + 'px';
    emojiElement.style.top = y + 'px';
    
    const emojiData = {
        id: Date.now() + Math.random(),
        emoji: emoji,
        x: (x / carPreview.offsetWidth) * 100,
        y: (y / carPreview.offsetHeight) * 100
    };
    
    myCustomization.emojis.push(emojiData);
    emojiElement.dataset.id = emojiData.id;
    
    // Tornar arrastável
    makeEmojiDraggable(emojiElement);
    
    carPreview.appendChild(emojiElement);
    
    // Sincronizar com servidor
    syncCustomization();
}

function makeEmojiDraggable(element) {
    let isDragging = false;
    let startX, startY, startLeft, startTop;
    
    // Mouse events (desktop)
    element.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        startLeft = parseFloat(element.style.left) || 0;
        startTop = parseFloat(element.style.top) || 0;
        
        document.addEventListener('mousemove', doDrag);
        document.addEventListener('mouseup', stopDrag);
    });
    
    // Touch events (mobile/tablet) - para arrastar emojis já no carro
    let longPressTimer = null;
    
    element.addEventListener('touchstart', (e) => {
        // Verificar se o elemento está dentro do carPreview (já está no carro)
        if (!carPreview.contains(element)) return;
        
        e.stopPropagation(); // Evitar conflito com outros touch handlers
        isDragging = true;
        const touch = e.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
        startLeft = parseFloat(element.style.left) || 0;
        startTop = parseFloat(element.style.top) || 0;
        
        // Iniciar timer para toque longo (remover emoji)
        longPressTimer = setTimeout(() => {
            const emojiId = element.dataset.id;
            myCustomization.emojis = myCustomization.emojis.filter(e => e.id != emojiId);
            element.remove();
            syncCustomization();
            isDragging = false;
        }, 1000); // 1 segundo para toque longo
        
        document.addEventListener('touchmove', doDragTouch, { passive: false });
        document.addEventListener('touchend', stopDrag, { passive: false });
    }, { passive: false });
    
    function doDrag(e) {
        if (!isDragging) return;
        
        const rect = carPreview.getBoundingClientRect();
        const newX = startLeft + (e.clientX - startX);
        const newY = startTop + (e.clientY - startY);
        
        element.style.left = Math.max(0, Math.min(carPreview.offsetWidth - 30, newX)) + 'px';
        element.style.top = Math.max(0, Math.min(carPreview.offsetHeight - 30, newY)) + 'px';
    }
    
    function doDragTouch(e) {
        if (!isDragging) return;
        e.preventDefault();
        
        // Cancelar toque longo se estiver a arrastar
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
        
        const touch = e.touches[0];
        if (!touch) return;
        
        const rect = carPreview.getBoundingClientRect();
        const newX = startLeft + (touch.clientX - startX);
        const newY = startTop + (touch.clientY - startY);
        
        element.style.left = Math.max(0, Math.min(carPreview.offsetWidth - 30, newX)) + 'px';
        element.style.top = Math.max(0, Math.min(carPreview.offsetHeight - 30, newY)) + 'px';
    }
    
    function stopDrag() {
        if (!isDragging) return;
        isDragging = false;
        
        // Cancelar toque longo
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
        
        // Atualizar dados
        const emojiId = element.dataset.id;
        const emojiData = myCustomization.emojis.find(e => e.id == emojiId);
        if (emojiData) {
            emojiData.x = (parseFloat(element.style.left) / carPreview.offsetWidth) * 100;
            emojiData.y = (parseFloat(element.style.top) / carPreview.offsetHeight) * 100;
            syncCustomization();
        }
        
        document.removeEventListener('mousemove', doDrag);
        document.removeEventListener('mouseup', stopDrag);
        document.removeEventListener('touchmove', doDragTouch);
        document.removeEventListener('touchend', stopDrag);
    }
    
    // Remover emoji com duplo clique
    element.addEventListener('dblclick', () => {
        const emojiId = element.dataset.id;
        myCustomization.emojis = myCustomization.emojis.filter(e => e.id != emojiId);
        element.remove();
        syncCustomization();
    });
    
    // Nota: O toque longo para remover está integrado no touchstart do arrasto acima
}

function syncCustomization() {
    if (currentRoomCode) {
        socket.emit('updateCustomization', {
            roomCode: currentRoomCode,
            customization: myCustomization
        });
    }
}

function clearEmojis() {
    myCustomization.emojis = [];
    carPreview.querySelectorAll('.emoji-on-car').forEach(el => el.remove());
    syncCustomization();
}

function renderCarCustomization(carElement, customization) {
    if (!carElement) return;
    
    // Aplicar emojis se existirem
    if (customization && customization.emojis && customization.emojis.length > 0) {
        customization.emojis.forEach(emojiData => {
            const emojiEl = document.createElement('div');
            emojiEl.textContent = emojiData.emoji;
            emojiEl.style.position = 'absolute';
            emojiEl.style.fontSize = '20px';
            emojiEl.style.left = (emojiData.x / 100) * CAR_WIDTH + 'px';
            emojiEl.style.top = (emojiData.y / 100) * CAR_HEIGHT + 'px';
            emojiEl.style.pointerEvents = 'none';
            emojiEl.style.zIndex = '15';
            carElement.appendChild(emojiEl);
        });
    }
}

// Funções de navegação
// Funções para classificações
async function loadSingleLeaderboard() {
    try {
        const response = await fetch('/api/scores/single?limit=20');
        const data = await response.json();
        if (data.success) {
            displaySingleLeaderboard(data.scores);
        }
    } catch (error) {
        console.error('Erro ao carregar classificações single:', error);
        leaderboardList.innerHTML = '<p>Erro ao carregar classificações</p>';
    }
}

async function loadMultiLeaderboard() {
    try {
        const response = await fetch('/api/scores/multiplayer?limit=20');
        const data = await response.json();
        if (data.success) {
            displayMultiLeaderboard(data.scores);
        }
    } catch (error) {
        console.error('Erro ao carregar classificações multiplayer:', error);
        leaderboardList.innerHTML = '<p>Erro ao carregar classificações</p>';
    }
}

function displaySingleLeaderboard(scores) {
    if (!leaderboardList) return;
    
    if (scores.length === 0) {
        leaderboardList.innerHTML = '<p>Nenhuma pontuação ainda!</p>';
        return;
    }
    
    let html = '<div class="leaderboard-table">';
    scores.forEach((score, index) => {
        html += `
            <div class="leaderboard-item">
                <span class="rank">#${index + 1}</span>
                <span class="name">${escapeHtml(score.player_name)}</span>
                <span class="score">${score.score} pts</span>
                <span class="level">Nível ${score.level}</span>
                <span class="date">${new Date(score.created_at).toLocaleDateString('pt-PT')}</span>
            </div>
        `;
    });
    html += '</div>';
    leaderboardList.innerHTML = html;
}

function displayMultiLeaderboard(scores) {
    if (!leaderboardList) return;
    
    if (scores.length === 0) {
        leaderboardList.innerHTML = '<p>Nenhum histórico ainda!</p>';
        return;
    }
    
    let html = '<div class="leaderboard-table">';
    scores.forEach((score, index) => {
        html += `
            <div class="leaderboard-item">
                <span class="rank">#${index + 1}</span>
                <span class="name">${escapeHtml(score.player1_name)} ${score.player2_name ? 'vs ' + escapeHtml(score.player2_name) : ''}</span>
                <span class="score">${score.player1_score}${score.player2_score ? ' - ' + score.player2_score : ''}</span>
                <span class="winner">🏆 ${escapeHtml(score.winner)}</span>
                <span class="date">${new Date(score.created_at).toLocaleDateString('pt-PT')}</span>
            </div>
        `;
    });
    html += '</div>';
    leaderboardList.innerHTML = html;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function editPlayerName(nameElement) {
    const oldName = nameElement.textContent;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = oldName;
    input.maxLength = 20;
    input.style.cssText = 'width: 100%; padding: 5px; font-size: inherit;';
    
    nameElement.textContent = '';
    nameElement.appendChild(input);
    input.focus();
    input.select();
    
    const finishEdit = () => {
        const newName = input.value.trim() || oldName;
        nameElement.textContent = newName;
        
        // Atualizar nome no servidor se necessário
        if (socket && currentRoomCode) {
            // Pode adicionar evento para atualizar nome no servidor
        }
    };
    
    input.addEventListener('blur', finishEdit);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            finishEdit();
        }
    });
}

function showScreen(screenName) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenName).classList.add('active');
}

// Funções para mostrar/esconder formulários
function showCreateRoomForm(mode) {
    if (mainMenuButtons) mainMenuButtons.classList.add('hidden');
    if (joinRoomForm) joinRoomForm.classList.add('hidden');
    if (createRoomForm) {
        createRoomForm.classList.remove('hidden');
        if (confirmCreateBtn) confirmCreateBtn.dataset.gameMode = mode;
        if (playerNameInput) playerNameInput.focus();
    }
}

function hideCreateRoomForm() {
    if (createRoomForm) createRoomForm.classList.add('hidden');
    if (mainMenuButtons) mainMenuButtons.classList.remove('hidden');
    if (playerNameInput) playerNameInput.value = '';
}

function showJoinRoomForm() {
    if (mainMenuButtons) mainMenuButtons.classList.add('hidden');
    if (createRoomForm) createRoomForm.classList.add('hidden');
    if (joinRoomForm) {
        joinRoomForm.classList.remove('hidden');
        if (playerNameJoinInput) playerNameJoinInput.focus();
    }
}

function hideJoinRoomForm() {
    if (joinRoomForm) joinRoomForm.classList.add('hidden');
    if (mainMenuButtons) mainMenuButtons.classList.remove('hidden');
    if (playerNameJoinInput) playerNameJoinInput.value = '';
    if (roomCodeInput) roomCodeInput.value = '';
}

function createRoom(mode, name) {
    console.log('🎮 Criando sala...', mode, name);
    
    if (!socket || !socket.connected) {
        console.error('❌ Socket não conectado!');
        alert('Não ligado ao servidor! Aguarde a ligação...');
        return;
    }
    
    if (!name || name.trim() === '') {
        alert('Por favor, digite o teu nome!');
        return;
    }
    
    // Guardar nome
    savePlayerName(name);
    
    gameMode = mode;
    
    console.log('📤 Enviando createRoom:', { playerName: name, gameMode: mode, carColor: selectedCarColor });
    
    // Mostrar loading
    if (confirmCreateBtn) {
        confirmCreateBtn.disabled = true;
        confirmCreateBtn.textContent = 'A criar...';
    }
    
    // Timeout para detectar se não receber resposta
    const timeout = setTimeout(() => {
        console.error('⏱️ Timeout: Não recebeu resposta do servidor em 5 segundos!');
        if (confirmCreateBtn) {
            confirmCreateBtn.disabled = false;
            confirmCreateBtn.textContent = 'Confirmar';
        }
        alert('Erro: O servidor não respondeu. Verifique se o servidor está a correr correctamente.');
    }, 5000);
    
    // Listener temporário para limpar timeout quando receber resposta
    const responseHandler = (data) => {
        clearTimeout(timeout);
        socket.off('roomCreated', responseHandler);
        if (confirmCreateBtn) {
            confirmCreateBtn.disabled = false;
            confirmCreateBtn.textContent = 'Confirmar';
        }
        hideCreateRoomForm();
    };
    socket.once('roomCreated', responseHandler);
    
    socket.emit('createRoom', { playerName: name, gameMode: mode, carColor: selectedCarColor });
}

function joinRoom() {
    const code = roomCodeInput ? roomCodeInput.value.trim().toUpperCase() : '';
    const name = playerNameJoinInput ? playerNameJoinInput.value.trim() : '';
    
    if (!name || name.trim() === '') {
        alert('Por favor, digite o teu nome!');
        return;
    }
    
    // Guardar nome
    savePlayerName(name);
    
    if (code.length !== 6) {
        alert('Código deve ter 6 caracteres!');
        return;
    }
    
    if (confirmJoinBtn) {
        confirmJoinBtn.disabled = true;
        confirmJoinBtn.textContent = 'A entrar...';
    }
    
    socket.emit('joinRoom', { roomCode: code, playerName: name, carColor: selectedCarColor });
    
    setTimeout(() => {
        if (confirmJoinBtn) {
            confirmJoinBtn.disabled = false;
            confirmJoinBtn.textContent = 'Entrar';
        }
    }, 5000);
}

function copyRoomCode() {
    navigator.clipboard.writeText(roomCodeDisplay.textContent).then(() => {
        copyCodeBtn.textContent = '✓';
        setTimeout(() => {
            copyCodeBtn.textContent = '📋';
        }, 2000);
    });
}

function startCustomization() {
    console.log('🎨 Iniciando personalização...');
    if (currentRoomCode) {
        console.log('📤 Enviando startCustomization para sala:', currentRoomCode);
        socket.emit('startCustomization', currentRoomCode);
    } else {
        console.error('❌ currentRoomCode não definido!');
    }
}

function readyToRace() {
    console.log('🏁 Pronto para correr!');
    if (currentRoomCode) {
        console.log('📤 Enviando playerReady para sala:', currentRoomCode);
        socket.emit('playerReady', currentRoomCode);
    } else {
        console.error('❌ currentRoomCode não definido!');
    }
}

function updatePlayersList(playersData) {
    if (!playersList) return;
    
    playersList.innerHTML = '';
    
    Object.values(playersData).forEach(player => {
        const item = document.createElement('div');
        item.className = `player-item ${player.ready ? 'ready' : ''}`;
        item.innerHTML = `
            <span>${player.name}</span>
            <span class="ready-indicator">${player.ready ? '✓ Pronto' : 'À espera...'}</span>
        `;
        playersList.appendChild(item);
    });
    
    const totalPlayers = Object.keys(playersData).length;
    const readyPlayers = Object.values(playersData).filter(p => p.ready).length;
    const minPlayers = gameMode === 'single' ? 1 : 2;
    
    // Mostrar/ocultar botão de personalização
    if (startCustomizationBtn) {
        if (totalPlayers >= minPlayers) {
            startCustomizationBtn.style.display = 'block';
        } else {
            startCustomizationBtn.style.display = 'none';
        }
    }
    
    if (lobbyStatus) {
        if (totalPlayers < minPlayers) {
            lobbyStatus.textContent = `À espera de mais ${minPlayers - totalPlayers} jogador(es)...`;
        } else if (readyPlayers < totalPlayers) {
            lobbyStatus.textContent = `${readyPlayers}/${totalPlayers} jogadores prontos`;
        } else {
            lobbyStatus.textContent = 'Todos prontos!';
        }
    }
}

// Controles do jogo - Movimento mais rápido e responsivo
let lastMoveTime = 0;
const MOVE_THROTTLE = 8; // ms entre movimentos

function handleMouseMove(e) {
    if (!gameStarted || !myCar) return;
    
    const now = Date.now();
    if (now - lastMoveTime < MOVE_THROTTLE) return;
    lastMoveTime = now;
    
    const rect = gameArea.getBoundingClientRect();
    let mouseX = e.clientX - rect.left;
    mouseX = Math.max(LEFT_LIMIT, Math.min(RIGHT_LIMIT, mouseX - CAR_WIDTH / 2));
    
    // Atualização direta sem transição
    myCar.style.transition = 'none';
    myCar.style.left = mouseX + 'px';
    socket.emit('playerMove', { roomCode: currentRoomCode, x: mouseX });
}

// Touch events para mobile/tablet
function handleTouchStart(e) {
    if (!gameStarted || !myCar) return;
    e.preventDefault();
    handleTouchMove(e);
}

function handleTouchMove(e) {
    if (!gameStarted || !myCar) return;
    e.preventDefault();
    
    const now = Date.now();
    if (now - lastMoveTime < MOVE_THROTTLE) return;
    lastMoveTime = now;
    
    const touch = e.touches[0] || e.changedTouches[0];
    if (!touch) return;
    
    const rect = gameArea.getBoundingClientRect();
    let touchX = touch.clientX - rect.left;
    touchX = Math.max(LEFT_LIMIT, Math.min(RIGHT_LIMIT, touchX - CAR_WIDTH / 2));
    
    // Atualização direta sem transição
    myCar.style.transition = 'none';
    myCar.style.left = touchX + 'px';
    socket.emit('playerMove', { roomCode: currentRoomCode, x: touchX });
}

function handleKeyDown(e) {
    if (!gameStarted || !myCar) return;
    
    let newX = parseFloat(myCar.style.left) || 175;
    const moveSpeed = 50; // Aumentado para 50 para movimento mais rápido
    
    if (e.key === 'ArrowLeft') {
        newX = Math.max(LEFT_LIMIT, newX - moveSpeed);
    } else if (e.key === 'ArrowRight') {
        newX = Math.min(RIGHT_LIMIT, newX + moveSpeed);
    }
    
    // Atualização direta sem transição
    myCar.style.transition = 'none';
    myCar.style.left = newX + 'px';
    socket.emit('playerMove', { roomCode: currentRoomCode, x: newX });
}

// Verificar colisão
function checkCollision(car, item) {
    const carRect = car.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    
    return (
        carRect.left < itemRect.right &&
        carRect.right > itemRect.left &&
        carRect.top < itemRect.bottom &&
        carRect.bottom > itemRect.top
    );
}

// Socket.io event handlers
socket.on('roomCreated', (data) => {
    console.log('✅ EVENTO roomCreated RECEBIDO!', data);
    
    if (!data) {
        console.error('❌ Dados vazios recebidos!');
        return;
    }
    
    myPlayerId = data.playerId;
    currentRoomCode = data.roomCode;
    players = data.players;
    gameMode = data.gameMode;
    
    console.log('📝 Dados processados:', {
        myPlayerId,
        currentRoomCode,
        playersCount: Object.keys(players).length,
        gameMode
    });
    
    // Para modo single-player, esconder seção de código (não precisa compartilhar)
    if (gameMode === 'single') {
        if (roomCodeSection) {
            roomCodeSection.classList.add('hidden');
        }
        // Ir direto para personalização ou lobby
        console.log('🎮 Modo single-player - indo para lobby');
    } else {
        // Atualizar código na tela inicial (multiplayer)
        if (roomCodeDisplay) {
            roomCodeDisplay.textContent = data.roomCode;
            console.log('✅ Código atualizado na tela:', data.roomCode);
        }
        if (roomCodeSection) {
            roomCodeSection.classList.remove('hidden');
            console.log('✅ Seção de código mostrada');
        }
    }
    
    // Mudar para tela de lobby
    showScreen('lobby');
    console.log('✅ Tela mudada para lobby');
    
    if (lobbyRoomCode) {
        lobbyRoomCode.textContent = data.roomCode;
    }
    
    updatePlayersList(players);
    
    // Restaurar botão
    if (createRoomBtn) {
        createRoomBtn.disabled = false;
        createRoomBtn.textContent = 'Criar Corrida';
        console.log('✅ Botão restaurado');
    }
    
    // Para single-player, mostrar botão de personalização imediatamente
    if (gameMode === 'single') {
        console.log('🎮 Modo single-player detectado');
        if (startCustomizationBtn) {
            startCustomizationBtn.style.display = 'block';
            startCustomizationBtn.textContent = 'Personalizar Carro';
            console.log('✅ Botão de personalização mostrado para single-player');
        } else {
            console.error('❌ startCustomizationBtn não encontrado!');
        }
        
        // Atualizar status do lobby para single-player
        if (lobbyStatus) {
            lobbyStatus.textContent = 'Modo Jogador Único - Pronto para personalizar!';
        }
    }
    
    console.log('✅ Processamento completo!');
});

socket.on('joinedRoom', (data) => {
    myPlayerId = data.playerId;
    currentRoomCode = data.roomCode;
    players = data.players;
    gameMode = data.gameMode;
    
    if (data.customizationPhase) {
        showScreen('customization');
    } else {
        showScreen('lobby');
    }
    lobbyRoomCode.textContent = data.roomCode;
    updatePlayersList(players);
});

socket.on('playerJoined', (data) => {
    players = data.players;
    updatePlayersList(players);
});

socket.on('customizationStarted', () => {
    console.log('✅ Personalização iniciada!');
    showScreen('customization');
});

socket.on('playerCustomizationUpdated', (data) => {
    // Atualizar visualização do outro jogador (opcional)
});

socket.on('playerReady', (data) => {
    players = data.players;
    updatePlayersList(players);
});

socket.on('gameStart', (data) => {
    if (data && data.players) {
        players = data.players;
    }
    gameStarted = true;
    showScreen('gameScreen');
    gameOver.classList.add('hidden');
    
    // Limpar carros antes de aplicar personalização
    player1Car.innerHTML = '';
    player2Car.innerHTML = '';
    
    // Configurar carros com cores dinâmicas
    const playerArray = Object.values(players);
    const myPlayer = players[myPlayerId];
    
    // Primeiro jogador = player1, segundo = player2
    playerArray.forEach((player, index) => {
        const isFirstPlayer = index === 0;
        const targetCar = isFirstPlayer ? player1Car : player2Car;
        const targetName = isFirstPlayer ? player1Name : player2Name;
        const targetScore = isFirstPlayer ? player1Score.parentElement : player2Score.parentElement;
        
        if (targetCar && CAR_COLORS[player.color]) {
            // Aplicar cor do carro
            targetCar.style.background = CAR_COLORS[player.color];
        }
        
        // Aplicar personalização
        renderCarCustomization(targetCar, player.customization || { emojis: [] });
        
        // Atualizar nome
        if (targetName) {
            targetName.textContent = player.name;
        }
        
        // Adicionar classe de jogador
        if (targetScore) {
            if (index === 0) {
                targetScore.classList.add('player1');
                targetScore.classList.remove('player2');
            } else {
                targetScore.classList.add('player2');
                targetScore.classList.remove('player1');
            }
        }
        
        // Definir qual é o meu carro e marcar o score como "my-score"
        if (player.id === myPlayerId) {
            myCar = targetCar;
            otherCar = index === 0 ? player2Car : player1Car;
            // Adicionar classe para mostrar no mobile
            const targetScoreElement = isFirstPlayer ? player1Score.parentElement : player2Score.parentElement;
            if (targetScoreElement) {
                targetScoreElement.classList.add('my-score');
            }
        } else {
            // Remover classe do outro jogador
            const targetScoreElement = isFirstPlayer ? player1Score.parentElement : player2Score.parentElement;
            if (targetScoreElement) {
                targetScoreElement.classList.remove('my-score');
            }
        }
    });
    
    // Esconder segundo carro se single-player
    if (gameMode === 'single') {
        player2Car.style.display = 'none';
        player2Score.parentElement.style.display = 'none';
    } else {
        player2Car.style.display = 'block';
        player2Score.parentElement.style.display = 'flex';
    }
    
    // Inicializar pontuação em 100 e vidas em 3 para todos os jogadores
    Object.values(players).forEach(player => {
        const lives = player.lives !== undefined ? player.lives : 3;
        const livesDisplay = '❤️'.repeat(Math.max(0, lives)) + '🖤'.repeat(Math.max(0, 3 - lives));
        
        if (player.color === 'red') {
            player1Score.textContent = '100';
            if (player1Lives) player1Lives.textContent = livesDisplay;
        } else {
            player2Score.textContent = '100';
            if (player2Lives) player2Lives.textContent = livesDisplay;
        }
    });
});

socket.on('playerMoved', (data) => {
    if (otherCar && data.playerId !== myPlayerId) {
        otherCar.style.left = data.x + 'px';
    }
});

// Atualizar cores quando receber atualizações de jogadores
socket.on('playerJoined', (data) => {
    if (data.players) {
        Object.values(data.players).forEach((player, index) => {
            const targetCar = index === 0 ? player1Car : player2Car;
            if (targetCar && CAR_COLORS[player.color]) {
                targetCar.style.background = CAR_COLORS[player.color];
            }
        });
    }
});

socket.on('candySpawned', (candyData) => {
    const candy = document.createElement('div');
    candy.className = 'candy';
    candy.id = `candy-${candyData.id}`;
    candy.style.left = candyData.x + 'px';
    candy.style.top = candyData.y + 'px';
    candy.textContent = candyData.emoji || '🍭'; // Usar emoji em vez de tipo
    candy.style.fontSize = '30px';
    candy.style.textAlign = 'center';
    candy.style.lineHeight = '30px';
    road.appendChild(candy);
    candies[candyData.id] = candy;
});

socket.on('obstacleSpawned', (obstacleData) => {
    const obstacle = document.createElement('div');
    obstacle.className = `obstacle type${obstacleData.type}`;
    obstacle.id = `obstacle-${obstacleData.id}`;
    obstacle.style.left = obstacleData.x + 'px';
    obstacle.style.top = obstacleData.y + 'px';
    road.appendChild(obstacle);
    obstacles[obstacleData.id] = obstacle;
});

// Throttle para colisões (evitar múltiplas detecções)
let lastCollisionCheck = 0;
const COLLISION_THROTTLE = 100; // Verificar colisões a cada 100ms (reduzido para melhor performance)

socket.on('gameUpdate', (data) => {
    const now = Date.now();
    const shouldCheckCollision = now - lastCollisionCheck >= COLLISION_THROTTLE;
    
    // Atualizar doces (otimizado - apenas criar/atualizar necessários)
    if (data.candies) {
        data.candies.forEach(candyData => {
            let candy = candies[candyData.id];
            
            if (!candy && !candyData.collected) {
                // Criar novo doce apenas se não existe
                candy = document.createElement('div');
                candy.className = 'candy';
                candy.id = `candy-${candyData.id}`;
                candy.textContent = candyData.emoji || '🍭';
                candy.style.cssText = `
                    font-size: 30px;
                    text-align: center;
                    line-height: 30px;
                    position: absolute;
                    left: ${candyData.x}px;
                    top: ${candyData.y}px;
                `;
                road.appendChild(candy);
                candies[candyData.id] = candy;
            } else if (candy && !candyData.collected) {
                // Atualizar posição (usar transform para melhor performance)
                candy.style.top = candyData.y + 'px';
                
                // Verificar colisão apenas se passou o throttle
                if (shouldCheckCollision && myCar && checkCollision(myCar, candy)) {
                    lastCollisionCheck = now;
                    socket.emit('candyCollected', { roomCode: currentRoomCode, candyId: candyData.id });
                }
            } else if (candy && candyData.collected) {
                // Remover doce coletado
                if (candy.parentNode) candy.remove();
                delete candies[candyData.id];
            }
        });
    }
    
    // Atualizar obstáculos (otimizado)
    if (data.obstacles) {
        data.obstacles.forEach(obstacleData => {
            let obstacle = obstacles[obstacleData.id];
            
            if (!obstacle && !obstacleData.hit) {
                // Criar novo obstáculo apenas se não existe
                obstacle = document.createElement('div');
                obstacle.className = `obstacle type${obstacleData.type}`;
                obstacle.id = `obstacle-${obstacleData.id}`;
                obstacle.style.cssText = `
                    position: absolute;
                    left: ${obstacleData.x}px;
                    top: ${obstacleData.y}px;
                `;
                road.appendChild(obstacle);
                obstacles[obstacleData.id] = obstacle;
            } else if (obstacle && !obstacleData.hit) {
                // Atualizar posição
                obstacle.style.top = obstacleData.y + 'px';
                
                // Verificar colisão apenas se passou o throttle
                if (shouldCheckCollision && myCar && checkCollision(myCar, obstacle)) {
                    lastCollisionCheck = now;
                    socket.emit('obstacleHit', { 
                        roomCode: currentRoomCode, 
                        obstacleId: obstacleData.id 
                    });
                }
            } else if (obstacle && obstacleData.hit) {
                // Remover obstáculo atingido
                if (obstacle.parentNode) obstacle.remove();
                delete obstacles[obstacleData.id];
            }
        });
    }
    
    if (shouldCheckCollision) {
        lastCollisionCheck = now;
    }
    
    // Atualizar pontuações, níveis e vidas
    if (data.players) {
        const playersArray = Object.values(data.players);
        
        // Ordenar por pontuação para determinar posição
        playersArray.sort((a, b) => (b.score || 0) - (a.score || 0));
        
        // Determinar posição de cada jogador
        const playerPositions = {};
        playersArray.forEach((player, index) => {
            playerPositions[player.id] = index + 1;
        });
        
        // Atualizar cada jogador baseado na ordem (primeiro = player1, segundo = player2)
        const sortedByOrder = Object.values(data.players).sort((a, b) => {
            // Manter ordem original (primeiro jogador = player1)
            return 0;
        });
        
        sortedByOrder.forEach((player, index) => {
            const isFirstPlayer = index === 0;
            const scoreText = player.score <= 0 ? '0' : player.score.toString();
            const level = calculateLevel(player.score);
            const lives = player.lives !== undefined ? player.lives : 3;
            const livesDisplay = '❤️'.repeat(Math.max(0, lives)) + '🖤'.repeat(Math.max(0, 3 - lives));
            const position = playerPositions[player.id];
            
            const targetScore = isFirstPlayer ? player1Score : player2Score;
            const targetName = isFirstPlayer ? player1Name : player2Name;
            const targetLevel = isFirstPlayer ? player1Level : player2Level;
            const targetLives = isFirstPlayer ? player1Lives : player2Lives;
            const targetPosition = isFirstPlayer ? player1Position : player2Position;
            
            if (targetScore) targetScore.textContent = scoreText;
            if (targetName) targetName.textContent = player.name;
            if (targetLevel) targetLevel.textContent = `Nível ${level}`;
            if (targetLives) targetLives.textContent = livesDisplay;
            
            // Mostrar posição (1º ou 2º) - especialmente importante no mobile
            if (targetPosition) {
                if (gameMode === 'single') {
                    targetPosition.textContent = '';
                } else {
                    targetPosition.textContent = position === 1 ? '🥇 1º' : '🥈 2º';
                }
            }
            
            // Mudar cor se pontos baixos
            if (targetScore) {
                if (player.score <= 20) {
                    targetScore.style.color = '#f44336';
                } else {
                    targetScore.style.color = '';
                }
            }
        });
    }
});

socket.on('obstacleHit', (data) => {
    console.log('💥 Colisão com rocha!', data);
    
    const obstacle = obstacles[data.obstacleId];
    if (obstacle) {
        const rect = obstacle.getBoundingClientRect();
        const gameRect = gameArea.getBoundingClientRect();
        const x = rect.left - gameRect.left + rect.width / 2;
        const y = rect.top - gameRect.top + rect.height / 2;
        
        if (data.playerId === myPlayerId) {
            // Mostrar popup de vida perdida
            showScorePopup(x, y, '💔 Vida Perdida!', true);
        }
        
        // Animação de colisão
        obstacle.style.transition = 'all 0.3s';
        obstacle.style.transform = 'scale(1.5) rotate(360deg)';
        obstacle.style.opacity = '0.5';
        
        setTimeout(() => {
            if (obstacle.parentNode) {
                obstacle.remove();
                delete obstacles[data.obstacleId];
            }
        }, 300);
    }
    
    // Atualizar pontuação e vidas
    if (data.players) {
        Object.values(data.players).forEach(player => {
            const scoreText = player.score <= 0 ? '0' : player.score.toString();
            const lives = player.lives !== undefined ? player.lives : 3;
            const livesDisplay = '❤️'.repeat(Math.max(0, lives)) + '🖤'.repeat(Math.max(0, 3 - lives));
            
            if (player.color === 'red') {
                player1Score.textContent = scoreText;
                if (player1Lives) player1Lives.textContent = livesDisplay;
                if (player.score <= 20) {
                    player1Score.style.color = '#f44336';
                    player1Score.style.fontWeight = 'bold';
                } else {
                    player1Score.style.color = '';
                    player1Score.style.fontWeight = '';
                }
            } else {
                player2Score.textContent = scoreText;
                if (player2Lives) player2Lives.textContent = livesDisplay;
                if (player.score <= 20) {
                    player2Score.style.color = '#f44336';
                    player2Score.style.fontWeight = 'bold';
                } else {
                    player2Score.style.color = '';
                    player2Score.style.fontWeight = '';
                }
            }
        });
    }
});

socket.on('candyCollected', (data) => {
    const candy = candies[data.candyId];
    if (candy) {
        const rect = candy.getBoundingClientRect();
        const gameRect = gameArea.getBoundingClientRect();
        const x = rect.left - gameRect.left + rect.width / 2;
        const y = rect.top - gameRect.top + rect.height / 2;
        
        // Usar pontos do servidor (já calculados)
        const points = data.points || 10;
        
        if (data.playerId === myPlayerId) {
            showScorePopup(x, y, points);
        }
        
        candy.style.transition = 'all 0.3s';
        candy.style.transform = 'scale(2)';
        candy.style.opacity = '0';
        
        setTimeout(() => {
            if (candy.parentNode) candy.remove();
            delete candies[data.candyId];
        }, 300);
    }
});

socket.on('gameEnd', (data) => {
    gameStarted = false;
    
    console.log('🎮 Game End recebido:', data);
    console.log('📊 Players:', data.players);
    console.log('🏆 Winner:', data.winner);
    console.log('😢 Loser:', data.loser);
    
    let message = '';
    if (data.winner && data.winner.id === myPlayerId) {
        gameOverTitle.textContent = '🎉 Ganhaste!';
        message = `Parabéns! Venceste com ${data.winner.score} pontos!`;
    } else if (data.loser && data.loser.id === myPlayerId) {
        gameOverTitle.textContent = '😢 Perdeste!';
        message = `Perdeste com ${data.loser.score} pontos. ${data.reason || ''}`;
    } else {
        gameOverTitle.textContent = 'Fim de Jogo';
        message = data.reason || 'O jogo terminou.';
    }
    
    gameOverMessage.textContent = message;
    gameOver.classList.remove('hidden');
    
    // Recarregar leaderboards após guardar
    setTimeout(() => {
        if (leaderboard && !leaderboard.classList.contains('hidden')) {
            if (singleLeaderboardTab && singleLeaderboardTab.classList.contains('active')) {
                loadSingleLeaderboard();
            } else if (multiLeaderboardTab && multiLeaderboardTab.classList.contains('active')) {
                loadMultiLeaderboard();
            }
        }
    }, 1000);
});

socket.on('playerLeft', (data) => {
    players = data.players;
    updatePlayersList(players);
});

socket.on('error', (message) => {
    console.error('❌ Erro:', message);
    alert(message);
    
    // Restaurar botão em caso de erro
    if (createRoomBtn) {
        createRoomBtn.disabled = false;
        createRoomBtn.textContent = 'Criar Corrida';
    }
});

function showScorePopup(x, y, points, isNegative = false) {
    const popup = document.createElement('div');
    popup.className = `score-popup ${isNegative ? 'negative' : 'positive'}`;
    // Aceitar tanto números quanto texto
    if (typeof points === 'string') {
        popup.textContent = points;
    } else {
        popup.textContent = `${isNegative ? '' : '+'}${points}`;
    }
    popup.style.left = x + 'px';
    popup.style.top = y + 'px';
    gameArea.appendChild(popup);
    
    setTimeout(() => {
        popup.remove();
    }, 1000);
}

// Limpar itens que saíram da tela
setInterval(() => {
    if (!gameStarted) return;
    
    Object.keys(candies).forEach(candyId => {
        const candy = candies[candyId];
        if (candy) {
            const top = parseFloat(candy.style.top) || 0;
            if (top > 550) {
                candy.remove();
                delete candies[candyId];
            }
        }
    });
    
    Object.keys(obstacles).forEach(obstacleId => {
        const obstacle = obstacles[obstacleId];
        if (obstacle) {
            const top = parseFloat(obstacle.style.top) || 0;
            if (top > 550) {
                obstacle.remove();
                delete obstacles[obstacleId];
            }
        }
    });
}, 100);

// Inicializar quando a página carregar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    // DOM já está carregado, mas dar um pequeno delay para garantir
    setTimeout(init, 50);
}
