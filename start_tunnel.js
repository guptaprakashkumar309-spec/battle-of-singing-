const localtunnel = require('localtunnel');
const fs = require('fs');

(async () => {
  try {
    // Start localtunnel programmatically on port 3000
    const tunnel = await localtunnel({ port: 3000 });
    
    console.log('your url is:', tunnel.url);
    
    // Write URL to a text file immediately to bypass TTY stdout buffering
    fs.writeFileSync('tunnel_url.txt', tunnel.url);
    
    tunnel.on('close', () => {
      console.log('tunnel closed');
      if (fs.existsSync('tunnel_url.txt')) {
        fs.unlinkSync('tunnel_url.txt');
      }
    });
  } catch (err) {
    console.error('tunnel startup error:', err);
    fs.writeFileSync('tunnel_url.txt', 'error: ' + err.message);
  }
})();
