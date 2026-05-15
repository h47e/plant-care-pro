const http = require('http');
const fs = require('fs');
const path = require('path');

const port = process.env.PORT || 3000;
const rootDir = __dirname;
const viewsDir = path.join(rootDir, 'src', 'views');
const publicDir = path.join(rootDir, 'public');
const imagesDir = path.join(rootDir, 'images');

const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

function readView(relativePath) {
    return fs.readFileSync(path.join(viewsDir, relativePath), 'utf8');
}

function renderView(relativePath) {
    const template = readView(relativePath);
    return template.replace(/<%-\s*include\('([^']+)'\)\s*%>/g, (_, includePath) => {
        const normalizedPath = `${includePath}.ejs`;
        return renderView(normalizedPath);
    });
}

function send(res, statusCode, body, contentType = 'text/html; charset=utf-8') {
    res.writeHead(statusCode, {
        'Content-Type': contentType,
        'Cache-Control': 'no-store'
    });
    res.end(body);
}

function safeStaticPath(baseDir, urlPath) {
    const decodedPath = decodeURIComponent(urlPath.split('?')[0]);
    const normalizedPath = path.normalize(decodedPath).replace(/^([/\\])+/, '');
    const filePath = path.join(baseDir, normalizedPath);
    return filePath.startsWith(baseDir) ? filePath : null;
}

function serveStatic(req, res, baseDir, prefix) {
    const relativeUrl = req.url.slice(prefix.length);
    const filePath = safeStaticPath(baseDir, relativeUrl);

    if (!filePath || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        return false;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
        'Content-Type': mimeTypes[ext] || 'application/octet-stream',
        'Cache-Control': 'public, max-age=3600'
    });
    fs.createReadStream(filePath).pipe(res);
    return true;
}

function renderApp(res, statusCode = 200) {
    try {
        send(res, statusCode, renderView('index.ejs'));
    } catch (error) {
        console.error('Template render error:', error);
        send(res, 500, 'Template render error', 'text/plain; charset=utf-8');
    }
}

const server = http.createServer((req, res) => {
    if (req.url === '/health') {
        send(res, 200, JSON.stringify({ status: 'ok', app: 'plant-care-pro' }), 'application/json; charset=utf-8');
        return;
    }

    if (req.url.startsWith('/images/')) {
        if (serveStatic(req, res, imagesDir, '/images/')) return;
    }

    if (serveStatic(req, res, publicDir, '/')) return;

    if (req.url === '/' || req.url.startsWith('/?')) {
        renderApp(res);
        return;
    }

    renderApp(res, 404);
});

server.listen(port, () => {
    console.log(`Plant Care Pro is running at http://localhost:${port}`);
});
