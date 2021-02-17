if(!settings.multipleView) settings.batchView=false;
settings.tex="pdflatex";
settings.inlinetex=true;
deletepreamble();
defaultfilename="key-3";
if(settings.render < 0) settings.render=4;
settings.outformat="";
settings.inlineimage=true;
settings.embed=true;
settings.toolbar=false;
viewportmargin=(2,2);


real angle = 60 * pi / 180;

pair O = (0,0);
pair P = (cos(angle), sin(angle));
pair A = (cos(angle), 0);

draw(circle((0,0), 1));

draw(O--A--P--cycle);

dot(O);
dot(P);
dot(A);

label("$O$", O, SW);
label("$A$", A, SE);
label("$P$", P, E+NE);

draw(arc(O, point(O--A,0.25), P));
label("$\theta$", O, 3*(cos(angle/2), sin(angle/2)));

real protrude = 2.5;

draw((-protrude/2,0)--(protrude,0),Arrow);
draw((0,-protrude/2)--(0,protrude/1.5),Arrow);

label("$x$", (protrude,0), E);
label("$y$", (0,protrude/1.5), N);

path cos_brace = shift(0,-0.05)*brace(A, O);
draw(cos_brace);
label("$\sin\theta$", A--P, SE);
label("$\cos\theta$", cos_brace, S);

label("$1$", O--P, NW);

pair T = (2,0);

draw(P--T);

dot(T);
label("$T$", T, S);

real ras = 0.1;

draw(shift(P)*rotate(-120)*((0,ras)--(ras,ras)--(ras,0)));
draw("$\tan\theta$", P--T, ENE);

pair S = 2*P;
pair K = (1,0);

draw(P--S);
draw(S--K,dashed);

path sec_brace = shift(rotate(90)*(S-O)/10)*brace(O,S);
draw(sec_brace);

label("$\tan\theta$", S--K, E);
label("$\sec\theta$", sec_brace, 2*W+NW);

dot(S);
label("$S$", S, NE);

dot(K);
label("$K$", K, SE);


size(273.14923pt,0,keepAspect=true);
