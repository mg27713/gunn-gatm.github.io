if(!settings.multipleView) settings.batchView=false;
settings.tex="pdflatex";
settings.inlinetex=true;
deletepreamble();
defaultfilename="key-104";
if(settings.render < 0) settings.render=4;
settings.outformat="";
settings.inlineimage=true;
settings.embed=true;
settings.toolbar=false;
viewportmargin=(2,2);

int factorial(int n) { // Factorial function for convenience
if (n == 0 || n == 1)
return 1;
return n * factorial(n - 1); // Tail recursion... why not?
}

// Explanation of mapping integer: Instead of representing the mappings as integer arrays, I represented them as plain integers. No clue why, but I think it's because I thought Asymptote lacked 2D arrays. Anyway, the integer 0 is the identity, which is {1,2,3} in a mapping (start col) => (end col). The integer 1 is A, which is {1,3,2}. The integer 2 is C, which is {2,1,3}... in other words, the integer is the index in the list of permutations for {1,2,...,c-1,c}, where c is the number of columns (cols)

/* This function takes in a pair drawing offset "offset" describing the (x,y) of the top left corner of the snap element, an integer array of mapping integers which will be chained, integer number of columns, an x spacing, and a y spacing (for columns and rows respectively) */
/* For example, to draw the element A connected with the element B at the location (1,1) with a spacing of 4 between columns and 6 between rows, you would effectively do

drawSnapElements((1,1), // at (1,1)
{1,5}, // A, then B
3, // 3 columns
4, // 4 units between columns
6); // 6 units between rows.
*/

void drawSnapElements(pair offset, int[] mappings = {0}, int cols = 3, real xd = 1, real yd = 1.5) {
int rows = mappings.length + 1;

for (int x = 0; x < cols; ++x) {
for (int y = 0; y < rows; ++y) {
if (y < rows - 1) {
int map = mappings[y];
int[] needs; // Which columns (bottom) need to have a line drawn, used in the loop

for (int c = 0; c < cols; ++c) needs.push(c); // Push all columns onto the needed list

for (int i = 0; i < cols; ++i) { // This loop is used to convert an integer into the actual mapping, by figuring out which mapping it actually is
int fact = factorial(cols - i - 1);

int quotient = map # fact; // OCTOTHORPE = integer division lolololol
int index = needs[quotient]; // index of column to be drawn
needs.delete(quotient);

map %= fact; // Get remainder

draw((offset + (i * xd, -y * yd)) -- (offset + (index * xd, -(y + 1) * yd))); // Draw the elastic
}
}
dot(offset + (x * xd, -y * yd)); // add the post dot
}
}
}

int[] standard_indices = {0,1,5,2,4,3}; // mapping integers corresponding to I through E
string[] standard_labels = {"I", "A", "B", "C", "D", "E"}; // for convenience

import three;

triple[] generate_tetrahedron() {
triple[] ret = {};

triple A = (0,0,0);
triple B = (1,0,0); // 1 unit in the x direction
triple C = (1/2, sqrt(3)/2, 0); // mid way between A--B, then jutting out sqrt(3)/2 in y

// the height of this tetrahedron is sqrt(2/3)
// the peak vertex is above the centroid of the base
triple D = (A+B+C)/3 + (0,0,sqrt(2/3));

ret[0] = A;
ret[1] = B;
ret[2] = C;
ret[3] = D;

return ret;
}

void draw_tetra(triple[] vertices) {
for (int i = 0; i < 4; ++i) {
for (int j = i + 1; j < 4; ++j) {
draw(vertices[i]--vertices[j], i == 0 ? dashed : currentpen);
}
}
}


import three;

string d = "$"; // $

void draw_rect_prism(string[] labels, triple loc=(0,0,0), bool midplane_oof) {
triple A = (0,0,0);
triple B = (0,1,0);
triple C = (-1,1,0);
triple D = (-1,0,0);

transform3 sd = shift(0,0,-2);

triple Ap = sd*A;
triple Bp = sd*B;
triple Cp = sd*C;
triple Dp = sd*D;

if (!midplane_oof) {
draw(A--B--C--D--A);
draw(A--Ap--Bp--B);
draw(Bp--Cp--C);
draw(Ap--Dp--D, dashed);
draw(Dp--Cp, dashed);
} else {
real rat = 0.9;

draw(A--(A+D)/2);
draw(A--B--(B+C)/2);
draw(D--C);
draw(A--Ap--Bp--B);
draw(C--Cp);
draw(Ap--Dp,dashed);
draw(Bp--(Bp+Cp)/2);
draw(D--Dp,dashed);
draw(Ap--Dp--Cp,dashed);

draw((Bp+Cp)/2--point(Bp--Cp,rat),dashed);
draw(point(Bp--Cp,rat)--Cp);
draw((B+C)/2--point(B--C,rat),dashed);
draw(point(B--C,rat)--C);
draw((A+D)/2--point(A--D,rat),dashed);
draw(point(A--D,rat)--D);
}

label(d + labels[0] + d, A, NW);
label(d + labels[1] + d, B, N);
label(d + labels[2] + d, C, NE);
label(d + labels[3] + d, D, N);

label(d + labels[4] + d, Ap, SW);
label(d + labels[5] + d, Bp, SE);
label(d + labels[6] + d, Cp, SE);
label(d + labels[7] + d, Dp, S);
}

void draw_rect_prism_c(string elem, string[] labels, bool midplane_oof) {
draw_rect_prism(labels, (0,0,0), midplane_oof);
if (substr(elem,0,1) == "a") { // Vertical rotation
int deg = length(elem) == 1 ? 1 : (int) substr(elem,2,1);
real ang = deg*pi/2;

dot((-0.5,0.5,0));
dot((-0.5,0.5,-2));

draw((-0.5,0.5,0.2) -- (-0.5,0.5,-2.2), dotted);
draw(((-0.3,0.5,0)..(-0.5,0.5,0) + 0.2 * (cos(ang/2), sin(ang/2), 0)..(-0.5,0.5,0) + 0.2 * (cos(ang), sin(ang), 0)), Arrow3);
}

triple[] diag_axes = {(0,0,-1),(0,1,-1),(-1,1,-1),(-1,0,-1)};
triple[] cntr_axes = {(0,0.5,-1),(-0.5,1,-1),(-1,0.5,-1),(-0.5,0,-1)};

if (substr(elem,0,1) == "b") { // Horizontal rotation
int deg = length(elem) == 1 ? 0 : (length(elem) == 2 ? 1 : (int) substr(elem,3,1));
triple a1,a2;

path3 rotate180 = shift(0,0.5,-1) * ((0,-0.2,0)..(0,0,0.2)..(0,0.2,0));

if (deg % 2 == 0) { // Center rotation
a1 = cntr_axes[deg # 2];
a2 = cntr_axes[2+deg # 2];
} else { // Diagonal rotation
a1 = diag_axes[(deg - 1)#2];
a2 = diag_axes[2+(deg-1)#2];
}

dot(a1);
dot(a2);

draw((1.4*a1-0.4*a2)--(1.4*a2-0.4*a1),dotted);
draw(rotate((45 * (deg-2*(deg%2))), (-0.5,0.5,0), (-0.5,0.5,1)) * shift((deg%2) * (sqrt(2)/2 - 0.5), 0, 0) * rotate180, Arrow3);

}
}

string[] elems = {"I","a","a^2","a^3","b","ba","ba^2","ba^3"};
string[][] labels_list = {
{"A","B","C","D","A'","B'","C'","D'"},
{"D","A","B","C","D'","A'","B'","C'"},
{"C","D","A","B","C'","D'","A'","B'"},
{"B","C","D","A","B'","C'","D'","A'"},
{"B'","A'","D'","C'","B","A","D","C"},
{"A'","D'","C'","B'","A","D","C","B"},
{"D'","C'","B'","A'","D","C","B","A"},
{"C'","B'","A'","D'","C","B","A","D"}
};

void draw_elem(int indx, bool midplane_oof = false) {
draw_rect_prism_c(elems[indx],labels_list[indx],midplane_oof);
label(d + elems[indx] + d, (-0.5,0.5,-2.8));
}

void draw_axis(string name, pair dir, triple a, triple b, real stretch=0.3) {
triple start = (1+stretch)*a-stretch*b;
triple end = (1+stretch)*b-stretch*a;

draw(start--end,dotted);
label("$" + name + "$", start, dir);
}

triple A = (0,0,0); // Vertices of a cube
triple B = (0,1,0);
triple C = (-1,1,0);
triple D = (-1,0,0);

transform3 sd = shift(0,0,-1);

triple Ap = sd * A;
triple Bp = sd * B;
triple Cp = sd * C;
triple Dp = sd * D;

void drawCube(picture pic, string[] labels) {
draw(pic,A--B--C--Cp--Bp--Ap--A--B--Bp);
draw(pic,B--C);
draw(pic,A--D--C);
draw(pic,Ap--Dp--D,dashed); // behind the cube
draw(pic,Dp--Cp,dashed);

if (labels.length > 0) {
label(pic, d + labels[0] + d, A, NW);
label(pic, d + labels[1] + d, B, N);
label(pic, d + labels[2] + d, C, NE);
label(pic, d + labels[3] + d, D, N);
label(pic, d + labels[4] + d, Ap, SW);
label(pic, d + labels[5] + d, Bp, S);
label(pic, d + labels[6] + d, Cp, SE);
label(pic, d + labels[7] + d, Dp, S);
}
}

real markscalefactor=0.03;

picture pathticks(path g, int n=1, real r=.5, real spacing=6, real s=8, pen p=currentpen)
{
picture pict;
pair A,B,C,direct;
real t,l=arclength(g), space=spacing*markscalefactor, halftick=s*markscalefactor/2, startpt;
if (n>0)
{
direct=unit(dir(g,arctime(g,r*l)));
startpt=r*l-(n-1)/2*space;
for (int i=0; i<n; ++i)
{
t=startpt+i*space;
B=point(g,arctime(g,t))+(0,1)*halftick*direct;
C=B+2*(0,-1)*halftick*direct;
draw(pict,B--C,p);
}
}
return pict;
}

pair A = (0,0);
pair B = (1,6);
pair C = (5.5,3);
pair D = (4,0);

path squareOn(pair A, pair B) {
return A--B--(B+rotate(-90)*(A-B))--(A+rotate(90)*(B-A))--cycle;
}

pair a = (B-A)/2;
pair b = (C-B)/2;
pair c = (D-C)/2;
pair d = (A-D)/2;

pair P = a + rotate(90)*a;
pair Q = B + b + rotate(90)*b;
pair R = C + c + rotate(90)*c;
pair SS = D + d + rotate(90)*d;

pair A = (0,0);
pair B = (2,4);
pair C = (5,-3);

pair a = (B-A)/2;
pair b = (C-B)/2;
pair c = (A-C)/2;

pair ia = rotate(90)*a;
pair ib = rotate(90)*b;
pair ic = rotate(90)*c;

pair P = A + a + ia * sqrt(3) / 3;
pair Q = B + b + ib * sqrt(3) / 3;
pair R = C + c + ic * sqrt(3) / 3;


import graph;

void drawUnitSquareTransform(real a, real b, real c, real d, pair dirA, pair dirB, pair dirC, pair dirD) {
pair A = (0,0);
pair B = (1,0);
pair C = (1,1);
pair D = (0,1);

pair Ap = (0,0);
pair Bp = (a,c);
pair Dp = (b,d);
pair Cp = Bp+Dp;

draw(A--B--C--D--A,dashed);
draw(Ap--Bp--Cp--Dp--Ap);

dot(Ap);
dot(Bp);
dot(Cp);
dot(Dp);

pair[] original = {A,B,C,D};
pair[] image = {Ap,Bp,Cp,Dp};

pair[] original_dirs = {SW, SE, NE, NW};
pair[] image_dirs = {unit(unit(Ap-Dp)+unit(Ap-Bp)),
unit(unit(Bp-Cp)+unit(Bp-Ap)),
unit(unit(Cp-Dp)+unit(Cp-Bp)),
unit(unit(Dp-Cp)+unit(Dp-Ap))};

string[] original_names = {"A","B","C","D"};
int[] images_labeled_already = {0,0,0,0};

for (int i = 0; i < 4; ++i) {
pair original_p = original[i];
pair original_d = original_dirs[i];
string original_n = original_names[i];

string[] extra_names = {};

for (int j = 0; j < 4; ++j) {
if (length(image[j]-original[i]) < 0.001) { // Good enough
extra_names.push(original_names[j] + "'");

images_labeled_already[j] = 1;
}
}

string label_str = "$" + original_n;

for (int j = 0; j < extra_names.length; ++j) {
label_str += "=" + extra_names[j];
}

label_str += "$";

label(label_str, original_p, original_d);
}

for (int i = 0; i < 4; ++i) {
if (images_labeled_already[i] == 1) continue;

string extra = "";

for (int j = i+1; j < 4; ++j) {
if (images_labeled_already[j] == 1) continue;

if (length(image[j]-image[i]) < 0.001) {
extra += "= " + original_names[j] + "'";
images_labeled_already[j] = 1;
}
}

label("$" + original_names[i] + "'" + extra + "$", image[i], image_dirs[i]);
}

xaxis();
yaxis();
}

import three;

triple A = (1,1,1);
triple B = (-1,1,1);
triple C = (-1,-1,1);
triple D = (1,-1,1);
triple T = (0,0,-2);
triple Ap = A + T;
triple Bp = B + T;
triple Cp = C + T;
triple Dp = D + T;

void drawTheCube() {
draw(A--B--C--D--cycle);
draw(A--Ap);
draw(B--Bp);
draw(C--Cp);
draw(D--Dp);
draw(Ap--Bp--Cp--Dp--cycle);
}


drawTheCube();

label("$A$", A, N);
label("$B$", B, E);
label("$C$", C, N);
label("$D$", D, W);
label("$A'$", Ap, S);
label("$B'$", Bp, E);
label("$C'$", Cp, S);
label("$D'$", Dp, W);
size(122.9163pt,0,keepAspect=true);
