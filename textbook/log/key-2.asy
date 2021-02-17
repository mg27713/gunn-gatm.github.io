if(!settings.multipleView) settings.batchView=false;
settings.tex="pdflatex";
settings.inlinetex=true;
deletepreamble();
defaultfilename="key-2";
if(settings.render < 0) settings.render=4;
settings.outformat="";
settings.inlineimage=true;
settings.embed=true;
settings.toolbar=false;
viewportmargin=(2,2);


pair A = (0,3);
pair B = (4,0);
pair C = (0,0);
draw(A--B--C--cycle);

label("$A$", A, NW);
label("$B$", B, E);
label("$C$", C, SW);
label("$a$", B--C, S);
label("$b$", A--C, W);

path c_brace = shift(0.04*(3,4))*brace(A,B);

draw(c_brace);
label("$c$", c_brace, NE);

dot(A);
dot(B);
dot(C);

real ras = 0.3;
path ram = (0,ras)--(ras,ras)--(ras,0);

pair F = point(A--B,9/25);

draw(ram);
draw(C--F);
draw(rotate(atan2(4,3)*180/pi+90,F)*shift(F)*ram);

label("$F$", F, NE);

size(143.40028pt,0,keepAspect=true);
