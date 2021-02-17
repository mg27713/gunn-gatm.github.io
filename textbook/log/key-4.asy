if(!settings.multipleView) settings.batchView=false;
settings.tex="pdflatex";
settings.inlinetex=true;
deletepreamble();
defaultfilename="key-4";
if(settings.render < 0) settings.render=4;
settings.outformat="";
settings.inlineimage=true;
settings.embed=true;
settings.toolbar=false;
viewportmargin=(2,2);


import graph;

real A = 195 * pi / 180;
real B = 125 * pi / 180;

draw((-1.4,0)--(1.4,0),Arrow);
draw((0,-1.4)--(0,1.4),Arrow);

draw(Circle((0,0),1,50));

pair Ap = (cos(A), sin(A));
pair Bp = (cos(B), sin(B));

real AB = A-B;
pair ABp = (cos(AB), sin(AB));

dot(Ap);
dot(Bp);
dot(ABp);

draw(ABp--(1,0));
draw(Ap--Bp);
label("$(\cos B, \sin B)$", Bp, NW);
label("$(\cos A, \sin A)$", Ap, SW);
label("$\arraycolsep=0pt \begin{array}{rl} (& \cos (A-B), \\ & \sin (A-B)) \end{array}$", ABp, NE);
label("$0^\circ$", (1,0),SE);

label("$D_1$", ABp--(1,0), .2*SW);
label("$D_2$", Ap--Bp, .2*SE);

size(227.62206pt,0,keepAspect=true);
