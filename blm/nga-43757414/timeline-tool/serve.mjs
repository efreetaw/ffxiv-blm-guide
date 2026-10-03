import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.BLM_TIMELINE_PORT || 8766);
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon','.txt':'text/plain; charset=utf-8'};
const server = http.createServer((req,res)=>{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
  let pathname;
  try { pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname); } catch {res.writeHead(400);res.end();return;}
  if(pathname==='/__local_health'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({application:'blm-timeline-local',port}));return;}
  const base=pathname.startsWith('/examples/')?root:path.join(root,'site');
  const relative=pathname==='/'?'index.html':pathname.replace(/^\/+/, '');
  let filename=path.resolve(base,relative);
  if(!filename.startsWith(base+path.sep)){res.writeHead(403);res.end();return;}
  if(pathname.startsWith('/manual')&&!fs.existsSync(filename))filename=path.join(base,'index.html');
  fs.stat(filename,(error,stat)=>{
    if(error||!stat.isFile()){res.writeHead(404);res.end('Not found');return;}
    res.writeHead(200,{'Content-Type':mime[path.extname(filename).toLowerCase()]||'application/octet-stream','Content-Length':stat.size,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
    if(req.method==='HEAD')res.end();else fs.createReadStream(filename).pipe(res);
  });
});
server.listen(port,'127.0.0.1',()=>console.log(`黑魔时间轴本地版：http://127.0.0.1:${port}/`));
server.on('error',error=>{console.error(error.message);process.exit(1)});
