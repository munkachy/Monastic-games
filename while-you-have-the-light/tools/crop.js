const { chromium } = require('playwright'); const fs = require('fs');
(async () => { const [f,x0,y0,x1,y1,out]=process.argv.slice(2);
 const b=await chromium.launch(); const pg=await b.newPage();
 const b64=fs.readFileSync(f).toString('base64');
 const d=await pg.evaluate(async({b64,x0,y0,x1,y1})=>{const im=new Image();im.src='data:image/png;base64,'+b64;await im.decode();
 const c=document.createElement('canvas');c.width=(x1-x0);c.height=(y1-y0);const g=c.getContext('2d');g.drawImage(im,-x0,-y0);
 g.strokeStyle='red';for(let x=0;x<c.width;x+=20){g.globalAlpha=.3;g.beginPath();g.moveTo(x,0);g.lineTo(x,c.height);g.stroke();}
 for(let y=0;y<c.height;y+=20){g.beginPath();g.moveTo(0,y);g.lineTo(c.width,y);g.stroke();}
 return c.toDataURL();},{b64,x0:+x0,y0:+y0,x1:+x1,y1:+y1});
 fs.writeFileSync(out,Buffer.from(d.split(',')[1],'base64'));await b.close();})();
