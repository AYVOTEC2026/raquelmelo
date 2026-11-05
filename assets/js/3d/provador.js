var re="https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.2/wasm",ie=`#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5);
  gl_Position = vec4(aPos, 0.0, 1.0);
}`,ne=`#version 300 es
precision highp float;
in vec2 vUv;
out vec4 saida;
uniform sampler2D uImg;
uniform sampler2D uMask;
uniform vec2 uEscala;
uniform vec2 uDesloc;
uniform float uEspelho;
uniform vec3 uTinta;
uniform float uAlvo;
uniform float uMedia;
uniform float uIntens;
uniform float uDivisor;
uniform float uTopo;
uniform float uBase;
uniform int uTecnica;

vec3 paraLinear(vec3 c) { return pow(c, vec3(2.2)); }
vec3 paraSrgb(vec3 c) { return pow(max(c, vec3(0.0)), vec3(1.0 / 2.2)); }
float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
float sorteio(float n) { return fract(sin(n * 12.9898) * 43758.5453); }
float ruido(float x) {
  float i = floor(x);
  return mix(sorteio(i), sorteio(i + 1.0), smoothstep(0.0, 1.0, fract(x)));
}
float sorteio2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float ruido2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(sorteio2(i), sorteio2(i + vec2(1.0, 0.0)), u.x),
             mix(sorteio2(i + vec2(0.0, 1.0)), sorteio2(i + vec2(1.0, 1.0)), u.x), u.y);
}

void main() {
  vec2 uv = vUv * uEscala + uDesloc;
  if (uEspelho > 0.5) uv.x = 1.0 - uv.x;
  vec3 original = texture(uImg, uv).rgb;
  if (vUv.x < uDivisor) { saida = vec4(original, 1.0); return; }

  vec3 l3 = paraLinear(original);
  float l = luma(l3);
  // cores claras cobrem um pouco mais a borda, para n\xE3o sobrar contorno escuro
  // (o que est\xE1 fora do cabelo continua intocado: m\xE1scara zero fica zero)
  float claro = clamp(uAlvo, 0.0, 1.0);
  float bruto = texture(uMask, uv).r;
  float m = smoothstep(0.12 - claro * 0.08, 0.7 - claro * 0.15, bruto);
  m = 1.0 - pow(1.0 - m, 1.0 + claro * 1.5);

  // t\xE9cnica: 0 cor inteira, 1 ombr\xE9 (raiz natural), 2 mechas (fios intercalados)
  float t = clamp((uv.y - uTopo) / max(0.02, uBase - uTopo), 0.0, 1.0);
  float w = 1.0;
  if (uTecnica == 1) {
    w = smoothstep(0.16, 0.6, t);
  } else if (uTecnica == 2) {
    // fios finos e irregulares, longos na vertical e quebrados ao longo do comprimento
    float onda = sin(uv.y * 14.0 + uv.x * 3.0) * 0.006 + sin(uv.y * 33.0 + uv.x * 7.0) * 0.0025;
    vec2 q = vec2((uv.x + onda) * 150.0, uv.y * 7.0);
    float n = ruido2(q) * 0.6 + ruido2(q * vec2(2.3, 1.6) + 7.0) * 0.4;
    // as luzes acompanham os fios que j\xE1 pegam luz na foto (seguem cachos e ondas)
    float fio = clamp((l / max(uMedia, 0.003) - 0.6) * 0.9, 0.0, 1.0) * smoothstep(0.55, 0.95, bruto);
    n = n * 0.64 + fio * 0.36;
    w = smoothstep(0.38, 0.58, n) * (0.8 + 0.2 * ruido(q.x * 0.37 + 5.0));
    w *= smoothstep(0.02, 0.22, t);
  }
  float a = clamp(m * w * uIntens, 0.0, 1.0);

  // a cor nova mant\xE9m a textura do fio: brilho e sombra proporcionais ao original
  float nl = uAlvo * pow(l / max(uMedia, 0.003), 0.72);
  vec3 tinta = uTinta * (nl / max(luma(uTinta), 0.003));
  tinta = tinta / (1.0 + max(0.0, luma(tinta) - 0.9));
  saida = vec4(paraSrgb(mix(l3, tinta, a)), 1.0);
}`,b=s=>Math.pow(s/255,2.2),j=(s,h,d)=>.2126*s+.7152*h+.0722*d,X=s=>new Promise((h,d)=>{let e=new Image;e.decoding="async",e.onload=()=>h(e),e.onerror=()=>d(new Error("imagem")),e.src=s});async function se(s,h){let d=h.onStatus||(()=>{}),e=s.getContext("webgl2",{antialias:!1,premultipliedAlpha:!1});if(!e)throw new Error("webgl2");let B=(t,o)=>{let i=e.createShader(t);if(e.shaderSource(i,o),e.compileShader(i),!e.getShaderParameter(i,e.COMPILE_STATUS))throw new Error(e.getShaderInfoLog(i)||"shader");return i},E=e.createProgram();if(e.attachShader(E,B(e.VERTEX_SHADER,ie)),e.attachShader(E,B(e.FRAGMENT_SHADER,ne)),e.linkProgram(E),!e.getProgramParameter(E,e.LINK_STATUS))throw new Error(e.getProgramInfoLog(E)||"programa");e.useProgram(E);let K=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,K),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),e.STATIC_DRAW);let G=e.getAttribLocation(E,"aPos");e.enableVertexAttribArray(G),e.vertexAttribPointer(G,2,e.FLOAT,!1,0,0);let u={};["uImg","uMask","uEscala","uDesloc","uEspelho","uTinta","uAlvo","uMedia","uIntens","uDivisor","uTopo","uBase","uTecnica"].forEach(t=>{u[t]=e.getUniformLocation(E,t)});let k=t=>{let o=e.createTexture();return e.activeTexture(e.TEXTURE0+t),e.bindTexture(e.TEXTURE_2D,o),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),o},J=k(0),y=k(1);e.uniform1i(u.uImg,0),e.uniform1i(u.uMask,1),e.pixelStorei(e.UNPACK_ALIGNMENT,1);let C=t=>{e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,J),e.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,e.BROWSER_DEFAULT_WEBGL),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,e.RGBA,e.UNSIGNED_BYTE,t)},Q=t=>{e.activeTexture(e.TEXTURE1),e.bindTexture(e.TEXTURE_2D,y),e.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,e.NONE),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,e.RGBA,e.UNSIGNED_BYTE,t)},x=null,q=t=>{let o=t.width,i=t.height,r=t.getAsFloat32Array();(!x||x.length!==o*i)&&(x=new Uint8ClampedArray(o*i));for(let n=0;n<r.length;n++)x[n]=r[n]*255;return e.activeTexture(e.TEXTURE1),e.bindTexture(e.TEXTURE_2D,y),e.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,e.NONE),e.texImage2D(e.TEXTURE_2D,0,e.R8,o,i,0,e.RED,e.UNSIGNED_BYTE,x),{dados:x,w:o,h:i}},Z=()=>{e.activeTexture(e.TEXTURE1),e.bindTexture(e.TEXTURE_2D,y),e.texImage2D(e.TEXTURE_2D,0,e.R8,1,1,0,e.RED,e.UNSIGNED_BYTE,new Uint8Array([0]))},a={tinta:[.8,.3,.4],alvo:.3,media:.05,intens:.85,divisor:0,topo:0,base:1,tecnica:0,espelho:0,fonte:"demo",w:1,h:1,temCabelo:!0},N=document.createElement("canvas"),_=N.getContext("2d",{willReadFrequently:!0}),L=(t,o)=>{let r=Math.max(8,Math.round(72*a.h/a.w));N.width=72,N.height=r,_.drawImage(t,0,0,72,r);let n=_.getImageData(0,0,72,r).data,f=null;if(o.dados){f=new Float32Array(72*r);for(let l=0;l<r;l++)for(let m=0;m<72;m++){let R=Math.min(o.w-1,Math.floor((m+.5)/72*o.w)),I=Math.min(o.h-1,Math.floor((l+.5)/r*o.h));f[l*72+m]=o.dados[I*o.w+R]/255}}else{_.clearRect(0,0,72,r),_.drawImage(o,0,0,72,r);let l=_.getImageData(0,0,72,r).data;f=new Float32Array(72*r);for(let m=0;m<72*r;m++)f[m]=l[m*4]/255}let v=0,p=0,w=r,A=0;for(let l=0;l<r;l++)for(let m=0;m<72;m++){let R=l*72+m,I=f[R];I>.5&&(l<w&&(w=l),l>A&&(A=l)),v+=j(b(n[R*4]),b(n[R*4+1]),b(n[R*4+2]))*I,p+=I}a.temCabelo=p>72*r*.01,a.media=p>1?Math.max(.004,v/p):.05,a.topo=w<r?w/r:0,a.base=A>0?(A+1)/r:1},$=()=>{let t=Math.min(window.devicePixelRatio||1,2),o=Math.max(1,Math.round(s.clientWidth*t)),i=Math.max(1,Math.round(s.clientHeight*t));(s.width!==o||s.height!==i)&&(s.width=o,s.height=i),e.viewport(0,0,o,i)},V=()=>{$();let t=s.width/s.height,o=a.w/a.h,i=1,r=1;o>t?i=t/o:r=o/t;let n=a.fonte==="camera"?.5:.4,f=(1-i)*.5,v=Math.min(Math.max(n-r*.5,0),1-r);e.uniform2f(u.uEscala,i,r),e.uniform2f(u.uDesloc,f,v),e.uniform1f(u.uEspelho,a.espelho),e.uniform3f(u.uTinta,a.tinta[0],a.tinta[1],a.tinta[2]),e.uniform1f(u.uAlvo,a.alvo),e.uniform1f(u.uMedia,a.media),e.uniform1f(u.uIntens,a.intens),e.uniform1f(u.uDivisor,a.divisor),e.uniform1f(u.uTopo,a.topo),e.uniform1f(u.uBase,a.base),e.uniform1i(u.uTecnica,a.tecnica),e.drawArrays(e.TRIANGLES,0,3)},O=0,g=()=>{a.fonte==="camera"||O||(O=requestAnimationFrame(()=>{O=0,V()}))};new ResizeObserver(g).observe(s);let D=null,W=null,H=async t=>{if(D)W!==t&&(await D.setOptions({runningMode:t}),W=t);else{d("Preparando a detec\xE7\xE3o do cabelo\u2026");let{FilesetResolver:o,ImageSegmenter:i}=await import("./chunk-VGRCAD56.js"),r=await o.forVisionTasks(re),n=f=>({baseOptions:{modelAssetPath:h.modelo,delegate:f},runningMode:t,outputConfidenceMasks:!0,outputCategoryMask:!1});try{D=await i.createFromOptions(r,n("GPU"))}catch{D=await i.createFromOptions(r,n("CPU"))}W=t}return D},T=null,c=null,M=0,Y=0,ee=0,U=null,P=()=>{cancelAnimationFrame(M),M=0,T&&T.getTracks().forEach(t=>t.stop()),T=null,c&&(c.srcObject=null)},[S,z]=await Promise.all([X(h.foto),X(h.mascara)]),F=()=>{P(),a.fonte="demo",a.espelho=0,a.w=S.naturalWidth,a.h=S.naturalHeight,C(S),Q(z),L(S,z),d(""),g()},te=async t=>{P(),d("Analisando a foto\u2026");let o;try{o=await createImageBitmap(t,{imageOrientation:"from-image"})}catch{o=await X(URL.createObjectURL(t))}let i=Math.max(o.width,o.height),r=Math.min(1,1280/i),n=document.createElement("canvas");n.width=Math.round(o.width*r),n.height=Math.round(o.height*r),n.getContext("2d").drawImage(o,0,0,n.width,n.height);let v=(await H("IMAGE")).segment(n),p=v.confidenceMasks||[],w=p[p.length-1];a.fonte="foto",a.espelho=0,a.w=n.width,a.h=n.height,C(n);let A=q(w);L(n,A),v.close&&v.close(),d(a.temCabelo?"":"N\xE3o encontrei cabelo nessa foto. Tente uma foto de rosto, com o cabelo aparecendo."),g()},ae=async()=>{if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)throw new Error("sem-camera");d("Abrindo a c\xE2mera\u2026"),P(),T=await navigator.mediaDevices.getUserMedia({video:{facingMode:"user",width:{ideal:960},height:{ideal:720}},audio:!1}),c||(c=document.createElement("video"),c.muted=!0,c.playsInline=!0,c.setAttribute("playsinline","")),c.srcObject=T,await c.play();let t=await H("VIDEO");if(!T)return;a.fonte="camera",a.espelho=1,a.w=c.videoWidth||960,a.h=c.videoHeight||720,U=null,Z(),d("");let o=i=>{a.fonte!=="camera"||!T||(c.readyState>=2&&(C(c),i-Y>45&&(Y=i,t.segmentForVideo(c,i,r=>{let n=r.confidenceMasks||[];n.length&&(U=q(n[n.length-1]))}),U&&ee++%12===0&&L(c,U)),V()),M=requestAnimationFrame(o))};M=requestAnimationFrame(o)};F();let oe=t=>{let o=parseInt(t.replace("#",""),16);return[b(o>>16&255),b(o>>8&255),b(o&255)]};return{cor(t){a.tinta=oe(t),a.alvo=Math.max(.004,j(a.tinta[0],a.tinta[1],a.tinta[2])),g()},tecnica(t){a.tecnica={global:0,ombre:1,mechas:2}[t]||0,g()},intensidade(t){a.intens=t,g()},divisor(t){a.divisor=t,g()},usarDemo:F,usarFoto:te,usarCamera:ae,pararCamera(){a.fonte==="camera"?F():P()},get fonte(){return a.fonte}}}export{se as iniciarProvador};
