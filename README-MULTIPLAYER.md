# 🏎️ Jogo de Carros - Versão Multiplayer

Versão simplificada e otimizada do jogo de carros com suporte para 2 jogadores simultâneos.

## 🎮 Características

- **Multiplayer em tempo real**: 2 jogadores competindo simultaneamente
- **Sincronização via WebSocket**: Usando Socket.io para comunicação em tempo real
- **Interface simplificada**: Versão mais rápida de desenvolver e manter
- **Sistema de pontuação**: Colete doces para ganhar pontos
- **Pronto para produção**: Configurado para rodar localmente e em servidor nginx

## 🚀 Como Rodar Localmente

### Pré-requisitos
- Node.js instalado (versão 14 ou superior)
- npm ou yarn

### Instalação e Execução

1. **Instalar dependências:**
```bash
npm install
```

2. **Iniciar o servidor:**
```bash
npm start
```

3. **Abrir no navegador:**
   - O servidor estará rodando em `http://localhost:3000`
   - Abra duas abas/janelas do navegador para testar com 2 jogadores
   - Ou compartilhe o link com outro jogador na mesma rede

4. **Jogar:**
   - Digite seu nome e clique em "Entrar no Jogo"
   - Aguarde o segundo jogador entrar
   - O jogo inicia automaticamente quando ambos estiverem prontos
   - Use o mouse ou as setas do teclado para mover o carro
   - Colete os doces que caem para ganhar pontos
   - O primeiro jogador que não coletar um doce perde!

## 🌐 Deploy no Nginx

### Opção 1: Nginx como Proxy Reverso (Recomendado)

1. **Instalar PM2 para gerenciar o processo Node.js:**
```bash
npm install -g pm2
pm2 start server.js --name jogo-carros
pm2 save
pm2 startup
```

2. **Configurar Nginx:**

Crie ou edite o arquivo de configuração do nginx (geralmente em `/etc/nginx/sites-available/jogo-carros`):

```nginx
server {
    listen 80;
    server_name seu-dominio.com;

    # Redirecionar para HTTPS (opcional)
    # return 301 https://$server_name$request_uri;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Configuração específica para WebSocket
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

3. **Habilitar o site:**
```bash
sudo ln -s /etc/nginx/sites-available/jogo-carros /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Opção 2: Nginx servindo arquivos estáticos + Node.js separado

1. **Configurar variável de ambiente:**
```bash
export PORT=3000
```

2. **Configurar Nginx para servir arquivos estáticos:**
```nginx
server {
    listen 80;
    server_name seu-dominio.com;
    root /caminho/para/jogo-carros;
    index multiplayer.html;

    location / {
        try_files $uri $uri/ /multiplayer.html;
    }

    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

## 📁 Estrutura do Projeto

```
jogo-carros/
├── server.js              # Servidor Node.js com Socket.io
├── multiplayer.html       # Interface do jogo multiplayer
├── multiplayer.css        # Estilos do jogo multiplayer
├── multiplayer.js         # Lógica do cliente multiplayer
├── index.html             # Versão single-player original
├── script.js              # Versão single-player original
├── style.css              # Estilos da versão original
├── package.json           # Dependências do projeto
└── README-MULTIPLAYER.md  # Este arquivo
```

## 🎯 Como Funciona

1. **Servidor (server.js):**
   - Gerencia conexões via Socket.io
   - Sincroniza estado do jogo entre jogadores
   - Cria e gerencia doces
   - Detecta colisões e pontuação
   - Controla início e fim do jogo

2. **Cliente (multiplayer.html/js/css):**
   - Interface de lobby para conectar jogadores
   - Renderização do jogo em tempo real
   - Controles do jogador (mouse/teclado)
   - Sincronização com outros jogadores

## 🔧 Configurações

Você pode ajustar as configurações do jogo no arquivo `server.js`:

```javascript
const GAME_CONFIG = {
  maxPlayers: 2,              // Número máximo de jogadores
  candySpawnInterval: 1000,   // Intervalo de criação de doces (ms)
  gameSpeed: 5,               // Velocidade do jogo
  gameWidth: 400              // Largura da área de jogo
};
```

## 🐛 Troubleshooting

### Porta já em uso
Se a porta 3000 estiver em uso, você pode mudar:
```bash
PORT=3001 npm start
```

E atualizar o arquivo `multiplayer.html` para conectar na porta correta, ou usar variável de ambiente no servidor.

### Problemas de conexão WebSocket
- Certifique-se de que o nginx está configurado corretamente para WebSocket
- Verifique se o firewall permite conexões na porta do servidor
- Teste a conexão localmente antes de fazer deploy

## 📝 Notas

- Esta é uma versão simplificada focada em multiplayer
- A versão original com personalização completa está em `index.html`
- O jogo suporta apenas 2 jogadores simultâneos
- Para mais jogadores, ajuste `maxPlayers` no servidor

## 🎮 Controles

- **Mouse**: Mova o mouse sobre a área de jogo para controlar o carro
- **Teclado**: Use as setas ← → para mover o carro
- **Objetivo**: Colete todos os doces que caem. Se um doce chegar ao fundo sem ser coletado, você perde!

## 📄 Licença

MIT

