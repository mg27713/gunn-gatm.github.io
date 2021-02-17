if(!settings.multipleView) settings.batchView=false;
settings.tex="pdflatex";
settings.inlinetex=true;
deletepreamble();
defaultfilename="key-5";
if(settings.render < 0) settings.render=4;
settings.outformat="";
settings.inlineimage=true;
settings.embed=true;
settings.toolbar=false;
viewportmargin=(2,2);


pair Z = (4,3);
pair O = (0,0);
pair T = (4,0);

draw((-1,0)--(5,0), Arrow);
draw((0,-1)--(0,4), Arrow);
label("$x$", (5,0), E);
label("$y$", (0,4), N);

draw(O--Z);
draw(O--T--Z, dashed);
label("$z=a+bi$", Z, NW);
label("$a$", O--T, S);
label("$b$", T--Z, E);
label(rotate(atan2(3,4) * 180 / pi)*"$\sqrt{a^2+b^2}$", O--Z, NW);

dot(Z);
size(227.62206pt,0,keepAspect=true);
