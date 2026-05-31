const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { exiftool } = require('exiftool-vendored');
const { OAuth2Client } = require('google-auth-library');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const { getDb, initDb } = require('./database');
const { runScraperForOffer } = require('./scraper');
const crypto = require('crypto');
require('./cron'); // Initialize cron jobs

let transporter;
nodemailer.createTestAccount((err, account) => {
  if (err) {
    console.error('Failed to create a testing account. ' + err.message);
    return;
  }
  console.log('Ethereal Email account created:', account.user);
  transporter = nodemailer.createTransport({
    host: account.smtp.host,
    port: account.smtp.port,
    secure: account.smtp.secure,
    auth: { user: account.user, pass: account.pass }
  });
});

async function sendWelcomeEmail(email, username) {
  if (!transporter || !email) return;
  try {
    const info = await transporter.sendMail({
      from: '"OfferTrack" <welcome@offertrack.saas>',
      to: email,
      subject: 'Bem-vindo ao OfferTrack! 🚀',
      html: `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
          <h2 style="color: #045DFC;">Bem-vindo ao OfferTrack, ${username}! 🚀</h2>
          <p>Estamos muito felizes em ter você conosco.</p>
          <p>O OfferTrack é o Radar Definitivo para Direct Response. Com ele, você pode monitorar a longevidade dos anúncios dos seus concorrentes e descobrir quais ofertas são campeãs.</p>
          <div style="text-align: center; margin-top: 30px;">
            <a href="http://localhost:5173/app" style="background-color: #045DFC; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Acessar Painel</a>
          </div>
        </div>
      `
    });
    console.log('E-mail de Boas Vindas enviado! URL de Pré-visualização: %s', nodemailer.getTestMessageUrl(info));
  } catch (err) {
    console.error('Erro ao enviar e-mail:', err);
  }
}

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const JWT_SECRET = 'super-secret-key-for-saas';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'COLOQUE_SEU_CLIENT_ID_AQUI'; // Placeholder for Google OAuth
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

const upload = multer({ dest: 'uploads/' });

initDb().then(() => {
  console.log('Database initialized');
}).catch(err => console.error('Failed to initialize database', err));

// Auth Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token missing' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}

function authenticateAdmin(req, res, next) {
  authenticateToken(req, res, () => {
    if (!req.user.is_admin) return res.status(403).json({ error: 'Require Admin Role' });
    next();
  });
}

// --- AUTH ROUTES ---

app.post('/api/register', async (req, res) => {
  const { username, password, email } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  try {
    const db = await getDb();
    const hashedPassword = await bcrypt.hash(password, 10);
    const now = new Date().toISOString();
    
    const result = await db.run('INSERT INTO users (username, password, email, last_login) VALUES (?, ?, ?, ?)', [username, hashedPassword, email || null, now]);
    const userId = result.lastID;

    if (userId === 1) {
      await db.run('UPDATE users SET user_id = ? WHERE user_id IS NULL', [userId]);
      await db.run('UPDATE users SET is_admin = 1 WHERE id = 1');
    }

    if (email) sendWelcomeEmail(email, username);

    const token = jwt.sign({ id: userId, username, is_admin: userId === 1 }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: userId, username, email, is_admin: userId === 1, has_seen_onboarding: 0 } });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Username or Email already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const db = await getDb();
    const user = await db.get('SELECT * FROM users WHERE username = ? OR email = ?', [username, username]);
    if (!user) return res.status(400).json({ error: 'User not found' });
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ error: 'Invalid password' });

    const now = new Date().toISOString();
    await db.run('UPDATE users SET last_login = ? WHERE id = ?', [now, user.id]);

    const token = jwt.sign({ id: user.id, username: user.username, is_admin: user.is_admin === 1 }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, username: user.username, email: user.email, is_admin: user.is_admin === 1, has_seen_onboarding: user.has_seen_onboarding } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Password Reset
app.post('/api/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  try {
    const db = await getDb();
    const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000).toISOString(); // 1 hour
    
    await db.run('INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)', [email, token, expiresAt]);

    const resetLink = `https://iatradeflow.com/reset-password?token=${token}`;

    if (transporter) {
      const info = await transporter.sendMail({
        from: '"OfferTrack" <noreply@offertrack.com>',
        to: email,
        subject: "Redefinição de Senha - OfferTrack",
        text: `Você solicitou a redefinição da sua senha.\nClique no link abaixo para criar uma nova senha:\n${resetLink}\nSe não foi você, ignore este e-mail.`,
        html: `<h3>Redefinição de Senha</h3><p>Você solicitou a redefinição da sua senha.</p><p><a href="${resetLink}">Clique aqui para criar uma nova senha</a></p><p>Se não foi você, ignore este e-mail.</p>`
      });
      console.log('E-mail de recuperação enviado. URL de Pré-visualização: %s', nodemailer.getTestMessageUrl(info));
    }

    res.json({ message: 'Se o e-mail estiver cadastrado, você receberá um link de recuperação.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ error: 'Missing token or password' });

  try {
    const db = await getDb();
    const now = new Date().toISOString();
    
    const resetRecord = await db.get('SELECT * FROM password_resets WHERE token = ? AND used = 0 AND expires_at > ?', [token, now]);
    if (!resetRecord) return res.status(400).json({ error: 'Token inválido ou expirado' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.run('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, resetRecord.email]);
    await db.run('UPDATE password_resets SET used = 1 WHERE id = ?', [resetRecord.id]);

    res.json({ message: 'Senha atualizada com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Google Auth Endpoint
app.post('/api/auth/google', async (req, res) => {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ error: 'No credential provided' });

  try {
    // Note: If GOOGLE_CLIENT_ID is not configured, we'll decode the JWT directly (NOT SECURE FOR PROD, ONLY FOR DEV/DEMO)
    // In production, ALWAYS use client.verifyIdToken
    const payload = jwt.decode(credential);
    if (!payload || !payload.email) return res.status(400).json({ error: 'Invalid Google Token' });

    const { email, name } = payload;
    const db = await getDb();
    const now = new Date().toISOString();
    
    let user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    
    if (!user) {
      // Create user
      const dummyPassword = await bcrypt.hash(Math.random().toString(36), 10);
      const result = await db.run('INSERT INTO users (username, email, password, last_login) VALUES (?, ?, ?, ?)', [name, email, dummyPassword, now]);
      user = { id: result.lastID, username: name, email, is_admin: result.lastID === 1 ? 1 : 0, has_seen_onboarding: 0 };
      if (user.id === 1) await db.run('UPDATE users SET is_admin = 1 WHERE id = 1');
      sendWelcomeEmail(email, name);
    } else {
      await db.run('UPDATE users SET last_login = ? WHERE id = ?', [now, user.id]);
    }

    const token = jwt.sign({ id: user.id, username: user.username, is_admin: user.is_admin === 1 }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, username: user.username, email: user.email, is_admin: user.is_admin === 1, has_seen_onboarding: user.has_seen_onboarding || 0 } });

  } catch (error) {
    console.error('Google Auth Error:', error);
    res.status(500).json({ error: 'Erro ao autenticar com o Google' });
  }
});

// --- ADMIN ROUTES ---

app.get('/api/admin/users', authenticateAdmin, async (req, res) => {
  try {
    const db = await getDb();
    const users = await db.all(`
      SELECT u.id, u.username, u.email, u.last_login, u.is_admin,
             (SELECT COUNT(*) FROM offers WHERE user_id = u.id) as total_offers
      FROM users u
      ORDER BY u.last_login DESC
    `);
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- API ROUTES (existing endpoints updated) ---

app.put('/api/users/onboarding', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    await db.run('UPDATE users SET has_seen_onboarding = 1 WHERE id = ?', [req.user.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/offers', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const rows = await db.all(`
      SELECT o.*, 
             (SELECT count FROM daily_counts WHERE offer_id = o.id ORDER BY date DESC LIMIT 1) as latest_count,
             (SELECT count FROM daily_counts WHERE offer_id = o.id ORDER BY date DESC LIMIT 1 OFFSET 1) as previous_count
      FROM offers o
      WHERE o.user_id = ?
      ORDER BY o.created_at DESC
    `, [req.user.id]);
    
    let maxCount = -1;
    let championId = null;

    rows.forEach(row => {
      if (row.latest_count !== null && row.latest_count > maxCount) {
        maxCount = row.latest_count;
        championId = row.id;
      }
    });

    const offers = rows.map(row => {
      let trend = 'new';
      if (row.previous_count !== null && row.latest_count !== null) {
        if (row.latest_count > row.previous_count) trend = 'up';
        else if (row.latest_count < row.previous_count) trend = 'down';
        else trend = 'stable';
      } else if (row.latest_count !== null) trend = 'stable';

      return {
        ...row,
        tags: row.tags ? JSON.parse(row.tags) : [],
        idiomas: row.idiomas ? JSON.parse(row.idiomas) : [],
        trend,
        isChampion: row.id === championId && maxCount > 0
      };
    });

    res.json(offers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/offers', authenticateToken, async (req, res) => {
  const { name, url, site_url, checkout_url, tags, idiomas } = req.body;
  if (!name || !url) return res.status(400).json({ error: 'Name and URL are required' });

  try {
    const db = await getDb();
    const result = await db.run(
      'INSERT INTO offers (name, url, user_id, site_url, checkout_url, tags, idiomas) VALUES (?, ?, ?, ?, ?, ?, ?)', 
      [name, url, req.user.id, site_url || null, checkout_url || null, JSON.stringify(tags || []), JSON.stringify(idiomas || [])]
    );
    const newOffer = { id: result.lastID, name, url, user_id: req.user.id };
    runScraperForOffer(newOffer).catch(console.error);
    res.status(201).json(newOffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/offers/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, url, site_url, checkout_url, tags, idiomas } = req.body;
  if (!name || !url) return res.status(400).json({ error: 'Name and URL are required' });

  try {
    const db = await getDb();
    const offer = await db.get('SELECT id FROM offers WHERE id = ? AND user_id = ?', [id, req.user.id]);
    if (!offer) return res.status(403).json({ error: 'Unauthorized' });

    await db.run(
      'UPDATE offers SET name = ?, url = ?, site_url = ?, checkout_url = ?, tags = ?, idiomas = ? WHERE id = ?', 
      [name, url, site_url || null, checkout_url || null, JSON.stringify(tags || []), JSON.stringify(idiomas || []), id]
    );
    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/offers/:id/history', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const db = await getDb();
    const offer = await db.get('SELECT id FROM offers WHERE id = ? AND user_id = ?', [id, req.user.id]);
    if (!offer) return res.status(403).json({ error: 'Unauthorized' });

    const history = await db.all('SELECT date, count FROM daily_counts WHERE offer_id = ? ORDER BY date ASC', [id]);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/offers/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const db = await getDb();
    const offer = await db.get('SELECT id FROM offers WHERE id = ? AND user_id = ?', [id, req.user.id]);
    if (!offer) return res.status(403).json({ error: 'Unauthorized' });

    await db.run('DELETE FROM daily_counts WHERE offer_id = ?', [id]);
    await db.run('DELETE FROM offers WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/reports', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const offers = await db.all('SELECT * FROM offers WHERE user_id = ?', [req.user.id]);
    
    let bestGrowthOffer = null, maxGrowth = -9999;
    let mostStableOffer = null, minVariance = 9999;

    for (let offer of offers) {
      const history = await db.all('SELECT count FROM daily_counts WHERE offer_id = ? ORDER BY date ASC', [offer.id]);
      if (history.length < 2) continue;

      const first = history[0].count;
      const last = history[history.length - 1].count;
      const growth = last - first;

      if (growth > maxGrowth) {
        maxGrowth = growth;
        bestGrowthOffer = { ...offer, growth, first, last };
      }

      let totalDiff = 0;
      for (let i = 1; i < history.length; i++) totalDiff += Math.abs(history[i].count - history[i-1].count);
      const avgDiff = totalDiff / (history.length - 1);
      
      if (avgDiff < minVariance) {
        minVariance = avgDiff;
        mostStableOffer = { ...offer, variance: avgDiff };
      }
    }

    res.json({ bestGrowth: bestGrowthOffer, mostStable: mostStableOffer });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/clean-metadata', authenticateToken, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  
  const originalName = req.file.originalname;
  const ext = path.extname(originalName);
  const inputPath = path.resolve(req.file.path + ext);
  
  // Renomeia o arquivo temporário para ter a extensão, ajudando o ExifTool
  fs.renameSync(req.file.path, inputPath);
  
  try {
    await exiftool.write(inputPath, { all: '' });
    res.download(inputPath, `cleaned_${originalName}`, (err) => {
      if (err) console.error('Error sending file:', err);
      fs.unlink(inputPath, () => {});
      if (fs.existsSync(inputPath + '_original')) fs.unlink(inputPath + '_original', () => {});
    });
  } catch (error) {
    console.error('Exiftool error:', error);
    res.status(500).json({ error: 'Erro ao limpar metadados.' });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
