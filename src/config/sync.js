// routes/sync.js
const express = require('express');
const router = express.Router();
const db = require('../database'); // Sua conexão MySQL

// Endpoint para baixar dados
router.get('/data', async (req, res) => {
  try {
    // Obter dados do MySQL
    const [usuarios] = await db.query('SELECT * FROM usuarios');
    const [niveis] = await db.query('SELECT * FROM niveis_usuarios');
    const [obras] = await db.query('SELECT * FROM obras');
    const [vinculos] = await db.query('SELECT * FROM usuario_vinculo');

    res.json({
      usuarios,
      niveis,
      obras,
      vinculos
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para receber alterações do app
router.post('/upload', async (req, res) => {
  const { usuarios, niveis, obras, vinculos } = req.body;

  try {
    // Processar usuários
    for (const user of usuarios) {
      await db.query(
        'INSERT INTO usuarios SET ? ON DUPLICATE KEY UPDATE ?',
        [user, user]
      );
    }

    // Processar níveis
    for (const nivel of niveis) {
      await db.query(
        'INSERT INTO niveis_usuarios SET ? ON DUPLICATE KEY UPDATE ?',
        [nivel, nivel]
      );
    }

    // Processar obras
    for (const obra of obras) {
      await db.query(
        'INSERT INTO obras SET ? ON DUPLICATE KEY UPDATE ?',
        [obra, obra]
      );
    }

    // Processar vínculos
    for (const vinculo of vinculos) {
      await db.query(
        'INSERT INTO usuario_vinculo SET ? ON DUPLICATE KEY UPDATE ?',
        [vinculo, vinculo]
      );
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;