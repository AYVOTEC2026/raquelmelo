var _e="https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.2/wasm",F=[.004,.008,.014,.024,.04,.065,.1,.15,.23,.33],pe=l=>{if(l<=F[0])return 1;for(let f=1;f<F.length;f++)if(l<=F[f]){let x=Math.log(F[f-1]),M=Math.log(F[f]);return f+(Math.log(l)-x)/(M-x)}return 10},Ce=`#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5);
  gl_Position = vec4(aPos, 0.0, 1.0);
}`,Se=`#version 300 es
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
uniform vec3 uCroma;
uniform float uIntens;
uniform float uDivisor;
uniform float uTopo;
uniform float uBase;
uniform int uTecnica;
uniform float uSemClarear;
uniform float uMostrarArea;

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
  vec3 l3 = paraLinear(original);
  float l = luma(l3);
  float bruto = texture(uMask, uv).r;

  // refino autom\xE1tico da borda: na faixa de d\xFAvida, o que tem cor de cabelo entra e o resto sai
  vec3 croma = l3 / max(l3.r + l3.g + l3.b, 0.0005);
  float dc = length(croma - uCroma) / 0.05;
  float dl = log(max(l, 0.0005) / max(uMedia, 0.0005)) / 1.1;
  float pareceCabelo = exp(-0.5 * (dc * dc + dl * dl));
  float faixa = 1.0 - abs(bruto * 2.0 - 1.0);
  bruto = clamp(bruto + (pareceCabelo - 0.5) * 0.8 * faixa, 0.0, 1.0);

  if (uMostrarArea < 0.5 && vUv.x < uDivisor) { saida = vec4(original, 1.0); return; }

  // cores claras cobrem um pouco mais a borda (sem contorno escuro); fora do cabelo continua intocado
  float claro = clamp(uAlvo, 0.0, 1.0);
  float m = smoothstep(0.12 - claro * 0.08, 0.7 - claro * 0.15, bruto);
  m = 1.0 - pow(1.0 - m, 1.0 + claro * 1.5);

  // t\xE9cnica: 0 cor inteira, 1 ombr\xE9 (raiz natural), 2 mechas (fios intercalados)
  float t = clamp((uv.y - uTopo) / max(0.02, uBase - uTopo), 0.0, 1.0);
  float w = 1.0;
  if (uTecnica == 1) {
    w = smoothstep(0.16, 0.6, t);
  } else if (uTecnica == 2) {
    float onda = sin(uv.y * 14.0 + uv.x * 3.0) * 0.006 + sin(uv.y * 33.0 + uv.x * 7.0) * 0.0025;
    vec2 q = vec2((uv.x + onda) * 150.0, uv.y * 7.0);
    float n = ruido2(q) * 0.6 + ruido2(q * vec2(2.3, 1.6) + 7.0) * 0.4;
    float fio = clamp((l / max(uMedia, 0.003) - 0.6) * 0.9, 0.0, 1.0) * smoothstep(0.55, 0.95, bruto);
    n = n * 0.64 + fio * 0.36;
    w = smoothstep(0.38, 0.58, n) * (0.8 + 0.2 * ruido(q.x * 0.37 + 5.0));
    w *= smoothstep(0.02, 0.22, t);
  }
  float a = clamp(m * w * uIntens, 0.0, 1.0);

  // "s\xF3 tinta": sem clarear antes, a tinta sobe no m\xE1ximo ~2 tons e aparece menos sobre fio escuro
  float alvo = uAlvo;
  float cobertura = 1.0;
  if (uSemClarear > 0.5) {
    alvo = min(uAlvo, uMedia * 2.4);
    cobertura = clamp(alvo / max(uAlvo, 0.003), 0.3, 1.0);
  }

  // a cor nova mant\xE9m a textura do fio: brilho e sombra proporcionais ao original.
  // O brilho acima da m\xE9dia \xE9 comprimido: o reflexo do fio continua, mas o que \xE9 claro
  // demais para ser cabelo (camisa, parede entre as mechas) n\xE3o vira um contorno aceso.
  float r = pow(l / max(uMedia, 0.003), 0.72);
  float nl = alvo * (r <= 1.0 ? r : 1.0 + (r - 1.0) / (1.0 + (r - 1.0) * 0.35));
  vec3 tinta = uTinta * (nl / max(luma(uTinta), 0.003));
  tinta = tinta / (1.0 + max(0.0, luma(tinta) - 0.9));
  tinta = mix(l3 * (nl / max(l, 0.0005)), tinta, cobertura);
  vec3 resultado = mix(l3, tinta, a);

  // modo de ajuste: a \xE1rea que recebe cor aparece em dourado
  if (uMostrarArea > 0.5) resultado = mix(resultado, vec3(0.9, 0.6, 0.16), smoothstep(0.3, 0.7, bruto) * 0.5);

  saida = vec4(paraSrgb(resultado), 1.0);
}`,P=l=>Math.pow(l/255,2.2),te=(l,f,x)=>.2126*l+.7152*f+.0722*x,ae=l=>new Promise((f,x)=>{let M=new Image;M.onload=()=>{M.decode?M.decode().then(()=>f(M),()=>f(M)):f(M)},M.onerror=()=>x(new Error("imagem")),M.src=l});async function De(l,f){let x=f.onStatus||(()=>{}),M=f.onDiagnostico||(()=>{}),e=l.getContext("webgl2",{antialias:!1,premultipliedAlpha:!1});if(!e)throw new Error("webgl2");let oe=(t,o)=>{let r=e.createShader(t);if(e.shaderSource(r,o),e.compileShader(r),!e.getShaderParameter(r,e.COMPILE_STATUS))throw new Error(e.getShaderInfoLog(r)||"shader");return r},b=e.createProgram();if(e.attachShader(b,oe(e.VERTEX_SHADER,Ce)),e.attachShader(b,oe(e.FRAGMENT_SHADER,Se)),e.linkProgram(b),!e.getProgramParameter(b,e.LINK_STATUS))throw new Error(e.getProgramInfoLog(b)||"programa");e.useProgram(b);let Ee=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,Ee),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),e.STATIC_DRAW);let re=e.getAttribLocation(b,"aPos");e.enableVertexAttribArray(re),e.vertexAttribPointer(re,2,e.FLOAT,!1,0,0);let g={};["uImg","uMask","uEscala","uDesloc","uEspelho","uTinta","uAlvo","uMedia","uCroma","uIntens","uDivisor","uTopo","uBase","uTecnica","uSemClarear","uMostrarArea"].forEach(t=>{g[t]=e.getUniformLocation(b,t)});let ie=t=>{let o=e.createTexture();return e.activeTexture(e.TEXTURE0+t),e.bindTexture(e.TEXTURE_2D,o),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),o},xe=ie(0),ne=ie(1);e.uniform1i(g.uImg,0),e.uniform1i(g.uMask,1),e.pixelStorei(e.UNPACK_ALIGNMENT,1);let a={tinta:[.8,.3,.4],alvo:.3,media:.05,croma:[.4,.33,.27],intens:.85,divisor:0,topo:0,base:1,tecnica:0,espelho:0,fonte:"demo",w:1,h:1,temCabelo:!0,semClarear:0,mostrarArea:0,nivel:0,ex:1,ey:1,dx:0,dy:0},s=null,B=null,R=[],X=t=>{e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,xe),e.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,e.BROWSER_DEFAULT_WEBGL),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,e.RGBA,e.UNSIGNED_BYTE,t)},y=()=>{e.activeTexture(e.TEXTURE1),e.bindTexture(e.TEXTURE_2D,ne),e.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,e.NONE),e.texImage2D(e.TEXTURE_2D,0,e.R8,s.w,s.h,0,e.RED,e.UNSIGNED_BYTE,s.dados)},se=(t,o,r,n)=>{r<t||n<o||(e.activeTexture(e.TEXTURE1),e.bindTexture(e.TEXTURE_2D,ne),e.pixelStorei(e.UNPACK_ROW_LENGTH,s.w),e.pixelStorei(e.UNPACK_SKIP_PIXELS,t),e.pixelStorei(e.UNPACK_SKIP_ROWS,o),e.texSubImage2D(e.TEXTURE_2D,0,t,o,r-t+1,n-o+1,e.RED,e.UNSIGNED_BYTE,s.dados),e.pixelStorei(e.UNPACK_ROW_LENGTH,0),e.pixelStorei(e.UNPACK_SKIP_PIXELS,0),e.pixelStorei(e.UNPACK_SKIP_ROWS,0))},G=(t,o,r)=>{s={dados:t,w:o,h:r},B=t.slice(),R.length=0,y()},K=document.createElement("canvas"),ce=K.getContext("2d",{willReadFrequently:!0}),le=0,I=t=>{if(!s)return;let o=72,r=Math.max(8,Math.round(o*a.h/a.w));K.width=o,K.height=r,ce.drawImage(t,0,0,o,r);let n=ce.getImageData(0,0,o,r).data,i=0,c=0,h=0,d=0,u=0,T=r,E=0;for(let p=0;p<r;p++){let U=Math.min(s.h-1,Math.floor((p+.5)/r*s.h));for(let C=0;C<o;C++){let D=Math.min(s.w-1,Math.floor((C+.5)/o*s.w)),S=s.dados[U*s.w+D]/255;if(S>.5&&(p<T&&(T=p),p>E&&(E=p)),S<.6)continue;let J=(p*o+C)*4,Q=P(n[J]),Z=P(n[J+1]),$=P(n[J+2]),ee=Q+Z+$+1e-4;i+=te(Q,Z,$)*S,h+=Q/ee*S,d+=Z/ee*S,u+=$/ee*S,c+=S}}a.temCabelo=c>o*r*.01,a.media=c>1?Math.max(.004,i/c):.05,c>1&&(a.croma=[h/c,d/c,u/c]),a.topo=T<r?T/r:0,a.base=E>0?(E+1)/r:1,a.nivel=a.temCabelo?pe(a.media):0,Math.abs(a.nivel-le)>.25&&(le=a.nivel,M(a.nivel))},we=()=>{let t=Math.min(window.devicePixelRatio||1,2),o=Math.max(1,Math.round(l.clientWidth*t)),r=Math.max(1,Math.round(l.clientHeight*t));(l.width!==o||l.height!==r)&&(l.width=o,l.height=r),e.viewport(0,0,o,r)},ue=()=>{we();let t=l.width/l.height,o=a.w/a.h;a.ex=1,a.ey=1,o>t?a.ex=t/o:a.ey=o/t;let r=a.fonte==="camera"?.5:.4;a.dx=(1-a.ex)*.5,a.dy=Math.min(Math.max(r-a.ey*.5,0),1-a.ey),e.uniform2f(g.uEscala,a.ex,a.ey),e.uniform2f(g.uDesloc,a.dx,a.dy),e.uniform1f(g.uEspelho,a.espelho),e.uniform3f(g.uTinta,a.tinta[0],a.tinta[1],a.tinta[2]),e.uniform1f(g.uAlvo,a.alvo),e.uniform1f(g.uMedia,a.media),e.uniform3f(g.uCroma,a.croma[0],a.croma[1],a.croma[2]),e.uniform1f(g.uIntens,a.intens),e.uniform1f(g.uDivisor,a.divisor),e.uniform1f(g.uTopo,a.topo),e.uniform1f(g.uBase,a.base),e.uniform1i(g.uTecnica,a.tecnica),e.uniform1f(g.uSemClarear,a.semClarear),e.uniform1f(g.uMostrarArea,a.mostrarArea),e.drawArrays(e.TRIANGLES,0,3)},k=0,v=()=>{a.fonte==="camera"||k||(k=requestAnimationFrame(()=>{k=0,ue()}))};new ResizeObserver(v).observe(l);let N=null,q=null,me=async t=>{if(N)q!==t&&(await N.setOptions({runningMode:t}),q=t);else{x("Preparando a detec\xE7\xE3o do cabelo\u2026");let{FilesetResolver:o,ImageSegmenter:r}=await import("./chunk-VGRCAD56.js"),n=await o.forVisionTasks(_e),i=c=>({baseOptions:{modelAssetPath:f.modelo,delegate:c},runningMode:t,outputConfidenceMasks:!0,outputCategoryMask:!1});try{N=await r.createFromOptions(n,i("GPU"))}catch{N=await r.createFromOptions(n,i("CPU"))}q=t}return N},Te=t=>{let o=t.getAsFloat32Array(),r=new Uint8ClampedArray(o.length);for(let n=0;n<o.length;n++)r[n]=o[n]*255;return r},_=null,m=null,W=0,de=0,Me=0,A=null,L=()=>{cancelAnimationFrame(W),W=0,_&&_.getTracks().forEach(t=>t.stop()),_=null,m&&(m.srcObject=null)},[O,H]=await Promise.all([ae(f.foto),ae(f.mascara)]),V=(()=>{let t=document.createElement("canvas");t.width=H.naturalWidth,t.height=H.naturalHeight;let o=t.getContext("2d",{willReadFrequently:!0});o.drawImage(H,0,0);let r=o.getImageData(0,0,t.width,t.height).data,n=new Uint8ClampedArray(t.width*t.height);for(let i=0;i<n.length;i++)n[i]=r[i*4];return{dados:n,w:t.width,h:t.height}})(),Y=()=>{L(),a.fonte="demo",a.espelho=0,a.w=O.naturalWidth,a.h=O.naturalHeight,X(O),G(V.dados.slice(),V.w,V.h),I(O),x(""),v()},j=null,Ae=async t=>{L(),x("Analisando a foto\u2026");let o;try{o=await createImageBitmap(t,{imageOrientation:"from-image"})}catch{o=await ae(URL.createObjectURL(t))}let r=Math.max(o.width,o.height),n=Math.min(1,1280/r),i=document.createElement("canvas");i.width=Math.round(o.width*n),i.height=Math.round(o.height*n),i.getContext("2d").drawImage(o,0,0,i.width,i.height);let h=(await me("IMAGE")).segment(i),d=h.confidenceMasks||[],u=d[d.length-1],T=Te(u),E=u.width,p=u.height;h.close&&h.close(),a.fonte="foto",a.espelho=0,a.w=i.width,a.h=i.height,j=i,X(i),G(T,E,p),I(i),x(a.temCabelo?"":"N\xE3o encontrei cabelo nessa foto. Tente uma foto de rosto, com o cabelo aparecendo."),v()},be=async()=>{if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){let r=new Error("sem-camera");throw r.name="NotSupportedError",r}x("Abrindo a c\xE2mera\u2026"),L(),_=await navigator.mediaDevices.getUserMedia({video:{facingMode:"user",width:{ideal:960},height:{ideal:720}},audio:!1}),m||(m=document.createElement("video"),m.muted=!0,m.playsInline=!0,m.setAttribute("playsinline","")),m.srcObject=_,await m.play();let t=await me("VIDEO");if(!_)return;a.fonte="camera",a.espelho=1,a.w=m.videoWidth||960,a.h=m.videoHeight||720,A=null,s={dados:new Uint8ClampedArray(1),w:1,h:1},y(),x("");let o=r=>{a.fonte!=="camera"||!_||(m.readyState>=2&&(X(m),r-de>45&&(de=r,t.segmentForVideo(m,r,n=>{let i=n.confidenceMasks||[];if(!i.length)return;let c=i[i.length-1],h=c.getAsFloat32Array();if(!A||A.w!==c.width||A.h!==c.height){A={dados:new Uint8ClampedArray(h.length),w:c.width,h:c.height};for(let d=0;d<h.length;d++)A.dados[d]=h[d]*255}else{let d=A.dados;for(let u=0;u<h.length;u++)d[u]=d[u]*.35+h[u]*165.75}s=A,y()}),A&&Me++%12===0&&I(m)),ue()),W=requestAnimationFrame(o))};W=requestAnimationFrame(o)},Re=()=>{if(a.fonte!=="camera"||!m||!A)return!1;let t=document.createElement("canvas");t.width=m.videoWidth,t.height=m.videoHeight,t.getContext("2d").drawImage(m,0,0,t.width,t.height);let o=A.dados.slice(),{w:r,h:n}=A;return L(),a.fonte="foto",a.espelho=1,a.w=t.width,a.h=t.height,j=t,X(t),G(o,r,n),I(t),v(),!0},w={ativo:!1,modo:"add",raio:20,ult:null},z=()=>a.fonte==="demo"?O:j,fe=(t,o)=>{let r=l.clientWidth||1,n=l.clientHeight||1,i=t/r*a.ex+a.dx,c=o/n*a.ey+a.dy;return a.espelho>.5&&(i=1-i),[i*s.w,c*s.h]},he=()=>Math.max(2,w.raio/(l.clientWidth||1)*a.ex*s.w),ge=(t,o,r,n)=>{let i=s.dados,c=s.w,h=Math.max(0,Math.floor(t-r)),d=Math.min(c-1,Math.ceil(t+r)),u=Math.max(0,Math.floor(o-r)),T=Math.min(s.h-1,Math.ceil(o+r));for(let E=u;E<=T;E++)for(let p=h;p<=d;p++){let U=Math.hypot(p-t,E-o)/r;if(U>=1)continue;let C=U<.55?1:1-(U-.55)/.45,D=E*c+p;w.modo==="add"?i[D]=Math.max(i[D],255*C):i[D]=Math.min(i[D],255*(1-C))}n[0]=Math.min(n[0],h),n[1]=Math.min(n[1],u),n[2]=Math.max(n[2],d),n[3]=Math.max(n[3],T)},Ie={inicio(t,o,r,n){if(!s||a.fonte==="camera")return!1;R.push(s.dados.slice()),R.length>8&&R.shift(),w.ativo=!0,w.modo=r,w.raio=n,w.ult=fe(t,o);let i=[1/0,1/0,-1,-1];return ge(w.ult[0],w.ult[1],he(),i),se(i[0],i[1],i[2],i[3]),v(),!0},mover(t,o){if(!w.ativo)return;let[r,n]=fe(t,o),[i,c]=w.ult,h=he(),d=Math.max(1,Math.ceil(Math.hypot(r-i,n-c)/(h*.35))),u=[1/0,1/0,-1,-1];for(let T=1;T<=d;T++){let E=T/d;ge(i+(r-i)*E,c+(n-c)*E,h,u)}w.ult=[r,n],se(u[0],u[1],u[2],u[3]),v()},fim(){if(!w.ativo)return;w.ativo=!1;let t=z();t&&I(t),v()}};Y();let ve=t=>{let o=parseInt(t.replace("#",""),16);return[P(o>>16&255),P(o>>8&255),P(o&255)]};return{cor(t){a.tinta=ve(t),a.alvo=Math.max(.004,te(a.tinta[0],a.tinta[1],a.tinta[2])),v()},tecnica(t){a.tecnica={global:0,ombre:1,mechas:2}[t]||0,v()},intensidade(t){a.intens=t,v()},divisor(t){a.divisor=t,v()},semClarear(t){a.semClarear=t?1:0,v()},mostrarArea(t){a.mostrarArea=t?1:0,v()},pincel:Ie,desfazer(){let t=R.pop();if(t&&s){s.dados.set(t),y();let o=z();o&&I(o),v()}return R.length>0},restaurar(){if(!s||!B||a.fonte==="camera")return;R.push(s.dados.slice()),s.dados.set(B),y();let t=z();t&&I(t),v()},get podeDesfazer(){return R.length>0},capturar:Re,usarDemo:Y,usarFoto:Ae,usarCamera:be,pararCamera(){a.fonte==="camera"?Y():L()},get fonte(){return a.fonte},get nivel(){return a.nivel},nivelDaCor:t=>{let o=ve(t);return pe(te(o[0],o[1],o[2]))}}}export{De as iniciarProvador};
