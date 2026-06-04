const fs = require('fs');
let serverFile = fs.readFileSync('server.js', 'utf8');

// Fix jwt.sign in login
serverFile = serverFile.replace(
    "const token = jwt.sign({ id: user.id, username: user.username, is_admin: Boolean(user.is_admin) }, JWT_SECRET, { expiresIn: '7d' });",
    "const token = jwt.sign({ id: user.id, username: user.username, parent_id: user.parent_id, is_admin: Boolean(user.is_admin) }, JWT_SECRET, { expiresIn: '7d' });"
);
serverFile = serverFile.replace(
    "const token = jwt.sign({ id: user.id, username: user.username, is_admin: Boolean(user.is_admin) }, JWT_SECRET, { expiresIn: '7d' });",
    "const token = jwt.sign({ id: user.id, username: user.username, parent_id: user.parent_id, is_admin: Boolean(user.is_admin) }, JWT_SECRET, { expiresIn: '7d' });"
);

// We should also return parent_id in the user object
serverFile = serverFile.replace(
    "res.json({ token, user: { id: user.id, username: user.username, email: user.email, is_admin: Boolean(user.is_admin), has_seen_onboarding: Boolean(user.has_seen_onboarding) } });",
    "res.json({ token, user: { id: user.id, username: user.username, parent_id: user.parent_id, email: user.email, is_admin: Boolean(user.is_admin), has_seen_onboarding: Boolean(user.has_seen_onboarding) } });"
);
serverFile = serverFile.replace(
    "res.json({ token, user: { id: user.id, username: user.username, email: user.email, is_admin: Boolean(user.is_admin), has_seen_onboarding: Boolean(user.has_seen_onboarding) } });",
    "res.json({ token, user: { id: user.id, username: user.username, parent_id: user.parent_id, email: user.email, is_admin: Boolean(user.is_admin), has_seen_onboarding: Boolean(user.has_seen_onboarding) } });"
);

fs.writeFileSync('server.js', serverFile);
console.log('Fixed JWT payload');
