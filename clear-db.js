#!/usr/bin/env node

/**
 * Script para limpar a base de dados de pontuações
 * Uso: node clear-db.js
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'scores.db');
const db = new Database(dbPath);

try {
    console.log('🧹 A limpar a base de dados...');
    
    // Limpar tabelas
    db.exec(`
        DELETE FROM single_scores;
        DELETE FROM multiplayer_scores;
        VACUUM;
    `);
    
    // Verificar se está vazia
    const singleCount = db.prepare('SELECT COUNT(*) as count FROM single_scores').get();
    const multiCount = db.prepare('SELECT COUNT(*) as count FROM multiplayer_scores').get();
    
    console.log('✅ Base de dados limpa com sucesso!');
    console.log(`📊 Single scores: ${singleCount.count} registos`);
    console.log(`📊 Multiplayer scores: ${multiCount.count} registos`);
    
    db.close();
    process.exit(0);
} catch (error) {
    console.error('❌ Erro ao limpar base de dados:', error);
    db.close();
    process.exit(1);
}

