const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

// 1. Update JWT payload in Register
code = code.replace(
  `const token = jwt.sign({ id: userId, username, is_admin: userId === 1 }, JWT_SECRET, { expiresIn: '7d' });\n    res.status(201).json({ token, user: { id: userId, username, email, is_admin: userId === 1, has_seen_onboarding: 0 } });`,
  `const token = jwt.sign({ id: userId, username, is_admin: userId === 1, parent_id: null }, JWT_SECRET, { expiresIn: '7d' });\n    res.status(201).json({ token, user: { id: userId, username, email, is_admin: userId === 1, has_seen_onboarding: 0, parent_id: null } });`
);

// 2. Update JWT payload in Login
code = code.replace(
  `const token = jwt.sign({ id: user.id, username: user.username, is_admin: Boolean(user.is_admin) }, JWT_SECRET, { expiresIn: '7d' });\n    res.json({ token, user: { id: user.id, username: user.username, email: user.email, is_admin: Boolean(user.is_admin), has_seen_onboarding: Boolean(user.has_seen_onboarding) } });`,
  `const token = jwt.sign({ id: user.id, username: user.username, is_admin: Boolean(user.is_admin), parent_id: user.parent_id }, JWT_SECRET, { expiresIn: '7d' });\n    res.json({ token, user: { id: user.id, username: user.username, email: user.email, is_admin: Boolean(user.is_admin), has_seen_onboarding: Boolean(user.has_seen_onboarding), parent_id: user.parent_id } });`
);

// 3. Update /api/offers GET
code = code.replace(
  `    const rows = await db.all(\`\n      SELECT o.*, \n             (SELECT count FROM daily_counts WHERE offer_id = o.id ORDER BY date DESC LIMIT 1) as latest_count,\n             (SELECT count FROM daily_counts WHERE offer_id = o.id ORDER BY date DESC LIMIT 1 OFFSET 1) as previous_count\n      FROM offers o\n      WHERE o.user_id = ?\n      ORDER BY o.created_at DESC\n    \`, [req.user.id]);`,
  `    const effectiveUserId = req.user.parent_id || req.user.id;\n    const rows = await db.all(\`\n      SELECT o.*, \n             (SELECT count FROM daily_counts WHERE offer_id = o.id ORDER BY date DESC LIMIT 1) as latest_count,\n             (SELECT count FROM daily_counts WHERE offer_id = o.id ORDER BY date DESC LIMIT 1 OFFSET 1) as previous_count\n      FROM offers o\n      WHERE o.user_id = ?\n      ORDER BY o.created_at DESC\n    \`, [effectiveUserId]);`
);

// 4. Update /api/offers POST
code = code.replace(
  `      'INSERT INTO offers (name, url, user_id, site_url, checkout_url, tags, idiomas) VALUES (?, ?, ?, ?, ?, ?, ?)', \n      [name, url, req.user.id, site_url || null, checkout_url || null, JSON.stringify(tags || []), JSON.stringify(idiomas || [])]\n    );\n    const newOffer = { id: result.lastID, name, url, user_id: req.user.id };`,
  `      'INSERT INTO offers (name, url, user_id, site_url, checkout_url, tags, idiomas) VALUES (?, ?, ?, ?, ?, ?, ?)', \n      [name, url, req.user.parent_id || req.user.id, site_url || null, checkout_url || null, JSON.stringify(tags || []), JSON.stringify(idiomas || [])]\n    );\n    const newOffer = { id: result.lastID, name, url, user_id: req.user.parent_id || req.user.id };`
);

// 5. Update /api/offers/:id PUT
code = code.replace(
  `    const offer = await db.get('SELECT id FROM offers WHERE id = ? AND user_id = ?', [id, req.user.id]);`,
  `    const effectiveUserId = req.user.parent_id || req.user.id;\n    const offer = await db.get('SELECT id FROM offers WHERE id = ? AND user_id = ?', [id, effectiveUserId]);`
);

// 6. Update /api/offers/:id/history GET
code = code.replace(
  `    const offer = await db.get('SELECT id FROM offers WHERE id = ? AND user_id = ?', [id, req.user.id]);`,
  `    const effectiveUserId = req.user.parent_id || req.user.id;\n    const offer = await db.get('SELECT id FROM offers WHERE id = ? AND user_id = ?', [id, effectiveUserId]);`
);

// 7. Update /api/offers/:id DELETE
code = code.replace(
  `    const offer = await db.get('SELECT id FROM offers WHERE id = ? AND user_id = ?', [id, req.user.id]);`,
  `    const effectiveUserId = req.user.parent_id || req.user.id;\n    const offer = await db.get('SELECT id FROM offers WHERE id = ? AND user_id = ?', [id, effectiveUserId]);`
);

// 8. Update /api/reports GET
code = code.replace(
  `    const offers = await db.all('SELECT * FROM offers WHERE user_id = ?', [req.user.id]);`,
  `    const effectiveUserId = req.user.parent_id || req.user.id;\n    const offers = await db.all('SELECT * FROM offers WHERE user_id = ?', [effectiveUserId]);`
);


// 9. Append /api/team routes
const teamRoutes = " " +
"// --- TEAM ROUTES ---\n" +
"\n" +
"app.post('/api/team/invite', authenticateToken, async (req, res) => {\n" +
"  if (req.user.parent_id) return res.status(403).json({ error: 'Convidados não podem convidar outras pessoas.' });\n" +
"  \n" +
"  const { email } = req.body;\n" +
"  if (!email) return res.status(400).json({ error: 'E-mail é obrigatório' });\n" +
"\n" +
"  try {\n" +
"    const db = await getDb();\n" +
"    \n" +
"    const existing = await db.get('SELECT id FROM users WHERE email = ?', [email]);\n" +
"    if (existing) return res.status(400).json({ error: 'E-mail já está em uso.' });\n" +
"\n" +
"    const username = email.split('@')[0] + Math.floor(Math.random() * 1000);\n" +
"    const hashedPassword = await bcrypt.hash('offer12345', 10);\n" +
"    const now = new Date().toISOString();\n" +
"    \n" +
"    await db.run(\n" +
"      'INSERT INTO users (username, password, email, parent_id, created_at) VALUES (?, ?, ?, ?, ?)', \n" +
"      [username, hashedPassword, email, req.user.id, now]\n" +
"    );\n" +
"\n" +
"    if (transporter) {\n" +
"      await transporter.sendMail({\n" +
"        from: '\"OfferTrack\" <offertrack.sistema@gmail.com>',\n" +
"        to: email,\n" +
"        subject: 'Convite de Acesso - OfferTrack',\n" +
"        html: '<p>Você foi convidado para acessar uma conta no OfferTrack.</p><p>Seu login: <b>' + email + '</b></p><p>Sua senha: <b>offer12345</b></p><p><a href=\"http://localhost:5173/login\">Clique aqui para acessar o painel</a></p>'\n" +
"      });\n" +
"    }\n" +
"\n" +
"    res.json({ success: true, message: 'Convite enviado com sucesso!' });\n" +
"  } catch (error) {\n" +
"    res.status(500).json({ error: error.message });\n" +
"  }\n" +
"});\n" +
"\n" +
"app.get('/api/team', authenticateToken, async (req, res) => {\n" +
"  if (req.user.parent_id) return res.status(403).json({ error: 'Apenas o dono pode ver a equipe.' });\n" +
"  \n" +
"  try {\n" +
"    const db = await getDb();\n" +
"    const members = await db.all('SELECT id, email, created_at FROM users WHERE parent_id = ? ORDER BY created_at DESC', [req.user.id]);\n" +
"    res.json(members);\n" +
"  } catch (error) {\n" +
"    res.status(500).json({ error: error.message });\n" +
"  }\n" +
"});\n" +
"\n" +
"app.delete('/api/team/:id', authenticateToken, async (req, res) => {\n" +
"  if (req.user.parent_id) return res.status(403).json({ error: 'Apenas o dono pode remover membros.' });\n" +
"  \n" +
"  try {\n" +
"    const db = await getDb();\n" +
"    await db.run('DELETE FROM users WHERE id = ? AND parent_id = ?', [req.params.id, req.user.id]);\n" +
"    res.json({ success: true });\n" +
"  } catch (error) {\n" +
"    res.status(500).json({ error: error.message });\n" +
"  }\n" +
"});\n";

code = code.replace("app.listen(PORT", teamRoutes + "\napp.listen(PORT");

fs.writeFileSync('server.js', code);
console.log('server.js patched successfully');
