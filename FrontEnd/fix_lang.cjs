const fs = require('fs');
const p = 'src/pages/Game.jsx';
let c = fs.readFileSync(p, 'utf8');
c = c.replace(/battleChat:\s*"[^"]+"/g, 'battleChat: "Chat"');
c = c.replace(/eventLog:\s*"[^"]+"/g, 'eventLog: "Nhật Ký"');
c = c.replace(/emotionsTab:\s*"[^"]+"/g, 'emotionsTab: "Biểu cảm"');
fs.writeFileSync(p, c, 'utf8');
