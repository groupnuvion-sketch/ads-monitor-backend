const fs = require('fs');

let serverFile = fs.readFileSync('server.js', 'utf8');

if (!serverFile.includes('const frontendUrl = process.env.FRONTEND_URL')) {
    serverFile = serverFile.replace(
        "const express = require('express');",
        "const frontendUrl = process.env.FRONTEND_URL || 'https://offertrack.com.br';\nconst express = require('express');"
    );
}

serverFile = serverFile.replace(
    'href="http://localhost:5173/app"',
    'href="${frontendUrl}/app"'
);

serverFile = serverFile.replace(
    'const resetLink = `http://localhost:5173/reset-password?token=${token}`;',
    'const resetLink = `${frontendUrl}/reset-password?token=${token}`;'
);

serverFile = serverFile.replace(
    '<a href="http://localhost:5173/login">',
    '<a href="\' + frontendUrl + \'/login">'
);

serverFile = serverFile.replace(
    '      WHERE o.user_id = ?\n      ORDER BY o.created_at DESC\n    `, [req.user.id]);',
    '      WHERE o.user_id = ?\n      ORDER BY o.created_at DESC\n    `, [req.user.parent_id || req.user.id]);'
);

fs.writeFileSync('server.js', serverFile);
console.log('Fixed server.js');
