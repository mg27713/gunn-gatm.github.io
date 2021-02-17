if(!settings.multipleView) settings.batchView=false;
settings.tex="pdflatex";
settings.inlinetex=true;
deletepreamble();
defaultfilename="key-1";
if(settings.render < 0) settings.render=4;
settings.outformat="";
settings.inlineimage=true;
settings.embed=true;
settings.toolbar=false;
viewportmargin=(2,2);


draw((0,0)--(7,0)--(7,7)--(0,7)--cycle);

draw((0,3)--(4,0)--(7,4)--(3,7)--cycle);

label("$a$", (2,0), S);
label("$b$", (0,1.5), W);
label("$c$", (0,3)--(4,0), NE);

real ras = 0.4;
path ram = (0,ras)--(ras,ras)--(ras,0);

draw(ram);
draw(rotate(90,(7/2,7/2))*ram);
draw(rotate(180,(7/2,7/2))*ram);
draw(rotate(270,(7/2,7/2))*ram);

path iram = rotate(atan2(-3,4)*180/pi, (0,3))*shift(0,3)*ram;
draw(iram);
draw(rotate(90,(7/2,7/2))*iram);
draw(rotate(180,(7/2,7/2))*iram);
draw(rotate(270,(7/2,7/2))*iram);
size(102.42923pt,0,keepAspect=true);
