if(!settings.multipleView) settings.batchView=false;
settings.tex="pdflatex";
settings.inlinetex=true;
deletepreamble();
defaultfilename="key-17";
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



path rect = (0,0)--(2,0)--(2,1)--(0,1)--cycle;

path P_outer = shift(1-0.35/2,0.5-0.5/2)*scale(0.1)*((0,0)--(1,0)--(1,2.5)--(2.5,2.5)..(3.5,3.75)..(2.5,5)--(0,5)--cycle);
path P_inner = shift(1-0.35/2,0.5-0.5/2)*scale(0.1)*((1,3.25)--(2,3.25)..(2.5,3.75)..(2,4.25)--(1,4.25)--cycle);

pair lp = (1,-0.5);

draw(rect);
filldraw(P_outer, gray(0.5));
filldraw(P_inner, white);
label("$I$", lp);

transform tr = shift(5,0)*scale(-1,1);

draw(tr*rect);
filldraw(tr*P_outer, gray(0.5));
filldraw(tr*P_inner, white);
label("$y$", shift(3,0)*lp);

draw((4,1.3)--(4,-0.3),dashed);

tr = shift(0,-1.5)*scale(1,-1);

draw(tr*rect);
filldraw(tr*P_outer, gray(0.5));
filldraw(tr*P_inner, white);
label("$x$", shift(0,-2.5)*lp);

draw((-0.3,-2)--(2.3,-2),dashed);

tr = shift(5,-1.5)*rotate(180);

draw(tr*rect);
filldraw(tr*P_outer, gray(0.5));
filldraw(tr*P_inner, white);
label("$r$", shift(3,-2.5)*lp);
size(227.62206pt,0,keepAspect=true);
