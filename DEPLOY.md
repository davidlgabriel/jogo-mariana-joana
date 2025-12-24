# Guia de Deploy para Produção

## Configuração da Base de Dados SQLite

### 1. Preparação Local

A base de dados SQLite é criada automaticamente quando o servidor inicia pela primeira vez. O ficheiro `scores.db` será criado no diretório raiz do projeto.

### 2. Estrutura da Base de Dados

O servidor cria automaticamente duas tabelas:

- **single_scores**: Pontuações do modo single-player
- **multiplayer_scores**: Pontuações do modo multiplayer

### 3. Deploy no Servidor de Produção

#### Opção A: Copiar o ficheiro da BD (se já existir)

```bash
# No servidor de produção
# 1. Criar diretório para o projeto
mkdir -p /var/www/jogo-carros
cd /var/www/jogo-carros

# 2. Fazer upload dos ficheiros do projeto (via SCP, FTP, ou Git)
# Incluir: server.js, multiplayer.html, multiplayer.js, multiplayer.css, package.json, etc.

# 3. Se já tens uma base de dados local com dados:
scp scores.db user@servidor:/var/www/jogo-carros/

# 4. Instalar dependências
npm install

# 5. A base de dados será criada automaticamente se não existir
# Ou usarás a que copiaste
```

#### Opção B: Deixar criar automaticamente (recomendado para novo servidor)

```bash
# No servidor de produção
# 1. Fazer upload dos ficheiros do projeto
# 2. Instalar dependências
npm install

# 3. A base de dados será criada automaticamente na primeira execução
# O ficheiro scores.db será criado no diretório do projeto
```

### 4. Configuração do Servidor Node.js

#### Usando PM2 (Recomendado)

```bash
# Instalar PM2 globalmente
npm install -g pm2

# Iniciar o servidor
pm2 start server.js --name jogo-carros

# Configurar para iniciar automaticamente no boot
pm2 startup
pm2 save

# Ver logs
pm2 logs jogo-carros

# Reiniciar
pm2 restart jogo-carros
```

#### Usando systemd (Alternativa)

Criar ficheiro `/etc/systemd/system/jogo-carros.service`:

```ini
[Unit]
Description=Jogo Carros Node.js Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/jogo-carros
Environment=NODE_ENV=production
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Ativar o serviço:
```bash
sudo systemctl enable jogo-carros
sudo systemctl start jogo-carros
sudo systemctl status jogo-carros
```

### 5. Configuração do Nginx

Criar ficheiro `/etc/nginx/sites-available/jogo-carros`:

```nginx
server {
    listen 80;
    server_name teu-dominio.com;

    # Redirecionar para HTTPS (opcional mas recomendado)
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

    # Servir ficheiros estáticos diretamente (opcional, para melhor performance)
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        root /var/www/jogo-carros;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Ativar o site:
```bash
sudo ln -s /etc/nginx/sites-available/jogo-carros /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6. Configuração HTTPS (Opcional mas Recomendado)

Usar Let's Encrypt com Certbot:

```bash
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d teu-dominio.com
```

### 7. Permissões da Base de Dados

```bash
# Garantir que o servidor tem permissões para ler/escrever na BD
sudo chown -R www-data:www-data /var/www/jogo-carros
sudo chmod 644 /var/www/jogo-carros/scores.db
sudo chmod 755 /var/www/jogo-carros
```

### 8. Backup da Base de Dados

Criar script de backup `/var/www/jogo-carros/backup-db.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/jogo-carros"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
cp /var/www/jogo-carros/scores.db $BACKUP_DIR/scores_$DATE.db
# Manter apenas os últimos 30 backups
find $BACKUP_DIR -name "scores_*.db" -mtime +30 -delete
```

Tornar executável e adicionar ao crontab:
```bash
chmod +x /var/www/jogo-carros/backup-db.sh
# Adicionar ao crontab para backup diário às 2h
crontab -e
# Adicionar linha: 0 2 * * * /var/www/jogo-carros/backup-db.sh
```

### 9. Variáveis de Ambiente (Opcional)

Criar ficheiro `.env` para configurações:

```bash
PORT=3000
NODE_ENV=production
DB_PATH=/var/www/jogo-carros/scores.db
```

Modificar `server.js` para usar variáveis de ambiente:

```javascript
const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DB_PATH || 'scores.db';
const db = new Database(DB_PATH);
```

### 10. Checklist de Deploy

- [ ] Ficheiros do projeto copiados para o servidor
- [ ] `npm install` executado
- [ ] Servidor Node.js configurado (PM2 ou systemd)
- [ ] Nginx configurado e testado
- [ ] HTTPS configurado (opcional)
- [ ] Permissões de ficheiros corretas
- [ ] Base de dados criada ou copiada
- [ ] Backup automático configurado
- [ ] Firewall configurado (porta 80/443 aberta)
- [ ] Testar o jogo em produção

### 11. Limpar Base de Dados

#### Opção A: Via API (Recomendado)

```bash
# Definir token de segurança (fazer apenas uma vez)
export CLEAR_DB_TOKEN="seu-token-secreto-aqui"

# Ou adicionar ao .env
echo "CLEAR_DB_TOKEN=seu-token-secreto-aqui" >> /var/www/jogo-carros/.env

# Limpar via API
curl -X DELETE http://localhost:3000/api/scores/clear \
  -H "x-clear-token: seu-token-secreto-aqui"

# Ou via query parameter
curl -X DELETE "http://localhost:3000/api/scores/clear?token=seu-token-secreto-aqui"
```

#### Opção B: Via SQLite direto

```bash
# No servidor
cd /var/www/jogo-carros
sqlite3 scores.db "DELETE FROM single_scores; DELETE FROM multiplayer_scores; VACUUM;"
```

#### Opção C: Usar script Node.js

```bash
# No servidor
cd /var/www/jogo-carros
node clear-db.js
```

### 12. Comandos Úteis

```bash
# Ver logs do PM2
pm2 logs jogo-carros

# Reiniciar servidor
pm2 restart jogo-carros

# Ver status
pm2 status

# Ver logs do Nginx
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# Verificar se o servidor está a correr
curl http://localhost:3000

# Verificar base de dados
sqlite3 /var/www/jogo-carros/scores.db "SELECT COUNT(*) FROM single_scores;"
sqlite3 /var/www/jogo-carros/scores.db "SELECT COUNT(*) FROM multiplayer_scores;"

# Ver top 10 scores
sqlite3 /var/www/jogo-carros/scores.db "SELECT * FROM single_scores ORDER BY score DESC LIMIT 10;"
```

### 12. Troubleshooting

**Problema: Base de dados não é criada**
- Verificar permissões do diretório
- Verificar logs do servidor
- Verificar se o diretório existe e é acessível

**Problema: Erro de permissões**
```bash
sudo chown -R www-data:www-data /var/www/jogo-carros
sudo chmod 755 /var/www/jogo-carros
```

**Problema: Servidor não inicia**
- Verificar logs: `pm2 logs` ou `journalctl -u jogo-carros`
- Verificar se a porta 3000 está livre: `netstat -tulpn | grep 3000`
- Verificar dependências: `npm install`

**Problema: Nginx não conecta ao Node.js**
- Verificar se o Node.js está a correr: `pm2 status`
- Verificar configuração do proxy no Nginx
- Verificar firewall

