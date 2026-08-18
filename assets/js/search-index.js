/* Classic script (no ES modules) — see tools/demodulize.py. */
(function (global) {
'use strict';

/* ==========================================================================
   search-index.js — the client-side search index
   ==========================================================================

   ISC 4221C (2026) accessible dashboard. Plain ES module, no dependencies,
   no network access. `search.js` imports `searchIndex` from here.

   THIS FILE IS APPEND-ONLY FOR MODULE AUTHORS.
   Each of the eight module agents adds the entries for its own topics into
   the block marked with its module number, and touches nothing else. The
   seed below already contains every module page, every numbered section
   group, the cross-cutting threads, and the standing pages — so search is
   useful before a single topic entry lands.

   ENTRY SHAPE — every field is required, none may be null.

     {
       id:          'topic-3-5-5',          // unique in this file; equals the DOM id
       kind:        'topic',                // see KINDS below
       number:      '3.5.5',                // '' for kinds with no number
       title:       "Dijkstra's algorithm",
       module:      'M3',                   // '' for site-wide pages
       moduleTitle: 'Graphs',               // '' for site-wide pages
       url:         'm3-graphs.html#topic-3-5-5',
       summary:     'One sentence, <= 160 characters, no trailing period needed.',
       keywords:    ['shortest path', 'greedy', 'relaxation']
     }

   KINDS
     'page'    a standing page (home, accessibility statement)
     'module'  a module landing page
     'section' a numbered group inside a module, e.g. 3.5
     'topic'   a numbered topic from COURSE_TOPIC_MAP.md, e.g. 3.5.5
     'demo'    a named interactive demo, so students can search for the tool
     'thread'  a cross-cutting thread that spans modules

   RULES THAT MATTER
     - `id` must equal the `id` attribute of the element the `url` points at.
       Search results move focus to that element; a mismatch sends a
       keyboard user nowhere.
     - `number` uses dots ('3.5.5'); `id` and the DOM anchor use dashes
       ('topic-3-5-5'). The search ranker understands both, so a student can
       type either.
     - `summary` is prose a student would recognise, not a restatement of the
       title. It is read aloud in the result list.
     - `keywords` are the words a student would actually type, including the
       ones that do NOT appear in the title: synonyms, the lecturer's phrasing,
       the lab name, the exam name.
     - Order does not matter. `search.js` ranks; it never relies on position.

   Run `validateIndex()` from a browser console after adding entries. It
   returns an array of problems and logs nothing if the index is clean.
   ========================================================================== */

/** Bumped whenever the entry shape changes. Purely informational. */
const INDEX_VERSION = '2026.1';

/** Canonical module list. Counts come from COURSE_TOPIC_MAP.md §0. */
const MODULES = [
  { id: 'M0', title: 'Foundations & Tooling',          file: 'm0-foundations.html',              topics: 12 },
  { id: 'M1', title: 'Algorithm Design & Analysis',    file: 'm1-algorithm-design.html',         topics: 24 },
  { id: 'M2', title: 'Probability & Random Processes', file: 'm2-probability.html',              topics: 51 },
  { id: 'M3', title: 'Graphs',                         file: 'm3-graphs.html',                   topics: 55 },
  { id: 'M4', title: 'Image Processing',               file: 'm4-image-processing.html',         topics: 51 },
  { id: 'M5', title: 'Data Mining',                    file: 'm5-data-mining.html',              topics: 49 },
  { id: 'M6', title: 'Computational Geometry',         file: 'm6-computational-geometry.html',   topics: 45 },
  { id: 'M7', title: 'Discrete Optimization',          file: 'm7-discrete-optimization.html',    topics: 36 }
];

/* ==========================================================================
   THE INDEX
   ========================================================================== */

const searchIndex = [

  /* ------------------------------------------------------------------ pages */
  {
    id: 'page-home',
    kind: 'page',
    number: '',
    title: 'Course home',
    module: '',
    moduleTitle: '',
    url: 'index.html',
    summary: 'Course map, the eight modules, cross-cutting threads, and search across all 323 topics',
    keywords: ['home', 'index', 'start', 'overview', 'ISC 4221C', 'course map']
  },
  {
    id: 'page-accessibility',
    kind: 'page',
    number: '',
    title: 'Accessibility statement',
    module: '',
    moduleTitle: '',
    url: '../ACCESSIBILITY_STATEMENT.md',
    summary: 'What is provided in each format, the known limitations, and how to request an alternate format',
    keywords: ['accessibility', 'a11y', 'WCAG', 'screen reader', 'alternate format',
               'accommodation', 'disability', 'captions', 'braille']
  },

  /* ---------------------------------------------------------------- modules */
  {
    id: 'module-m0',
    kind: 'module',
    number: '0',
    title: 'M0 — Foundations & Tooling',
    module: 'M0',
    moduleTitle: 'Foundations & Tooling',
    url: 'm0-foundations.html',
    summary: '12 topics: Git and the GitHub flow, Python environments with uv, loops and recursion, NumPy, Matplotlib',
    keywords: ['git', 'github', 'uv', 'python', 'numpy', 'matplotlib', 'tooling',
               'setup', 'lab01', 'lab02', 'foundations']
  },
  {
    id: 'module-m1',
    kind: 'module',
    number: '1',
    title: 'M1 — Algorithm Design & Analysis',
    module: 'M1',
    moduleTitle: 'Algorithm Design & Analysis',
    url: 'm1-algorithm-design.html',
    summary: '24 topics: brute force, divide and conquer, greedy strategies, and Big-O efficiency analysis',
    keywords: ['big-o', 'complexity', 'sorting', 'searching', 'greedy', 'divide and conquer',
               'brute force', 'lab03', 'lab04', 'midterm']
  },
  {
    id: 'module-m2',
    kind: 'module',
    number: '2',
    title: 'M2 — Probability & Random Processes',
    module: 'M2',
    moduleTitle: 'Probability & Random Processes',
    url: 'm2-probability.html',
    summary: '51 topics: probability fundamentals, random number generation, distributions, the CLT, Monte Carlo, random walks',
    keywords: ['probability', 'random', 'rng', 'monte carlo', 'distribution', 'variance',
               'central limit theorem', 'brownian motion', 'secretary problem',
               'lab05', 'lab06', 'midterm']
  },
  {
    id: 'module-m3',
    kind: 'module',
    number: '3',
    title: 'M3 — Graphs',
    module: 'M3',
    moduleTitle: 'Graphs',
    url: 'm3-graphs.html',
    summary: '55 topics: graph representation, connectivity, traversal, shortest paths, spanning trees, and the TSP',
    keywords: ['graph', 'network', 'dijkstra', 'kruskal', 'bfs', 'dfs', 'mst',
               'adjacency matrix', 'traveling salesman', 'tsp', 'lab07', 'lab08', 'midterm']
  },
  {
    id: 'module-m4',
    kind: 'module',
    number: '4',
    title: 'M4 — Image Processing',
    module: 'M4',
    moduleTitle: 'Image Processing',
    url: 'm4-image-processing.html',
    summary: '51 topics: pixels and formats, histograms, convolution kernels, edge detection, segmentation and morphology',
    keywords: ['image', 'pixel', 'histogram', 'convolution', 'kernel', 'filter', 'sobel',
               'edge detection', 'median filter', 'dilation', 'erosion', 'lab09', 'final']
  },
  {
    id: 'module-m5',
    kind: 'module',
    number: '5',
    title: 'M5 — Data Mining',
    module: 'M5',
    moduleTitle: 'Data Mining',
    url: 'm5-data-mining.html',
    summary: '49 topics: clustering, hierarchical linkage, k-means, Voronoi and CVT, decision trees and impurity measures',
    keywords: ['data mining', 'clustering', 'k-means', 'dendrogram', 'linkage', 'voronoi',
               'cvt', 'decision tree', 'gini', 'entropy', 'information gain',
               'lab10', 'lab11', 'final']
  },
  {
    id: 'module-m6',
    kind: 'module',
    number: '6',
    title: 'M6 — Computational Geometry',
    module: 'M6',
    moduleTitle: 'Computational Geometry',
    url: 'm6-computational-geometry.html',
    summary: '45 topics: points and lines, triangles, polygons and ear clipping, convex hulls, Delaunay triangulation and quadrature',
    keywords: ['geometry', 'triangle', 'polygon', 'convex hull', 'gift wrapping',
               'delaunay', 'ear clipping', 'triangulation', 'quadrature', 'centroid',
               'lab12', 'lab13', 'final']
  },
  {
    id: 'module-m7',
    kind: 'module',
    number: '7',
    title: 'M7 — Discrete Optimization',
    module: 'M7',
    moduleTitle: 'Discrete Optimization',
    url: 'm7-discrete-optimization.html',
    summary: '36 topics: linear programming formulation, the geometry of LP, slack variables, basic feasible solutions, the simplex method',
    keywords: ['optimization', 'linear programming', 'lp', 'simplex', 'tableau',
               'feasible region', 'slack variable', 'diet problem', 'lab14']
  },

  /* --------------------------------------------------------- section groups */
  /* M0 has no numbered sub-groups in COURSE_TOPIC_MAP.md. */
  { id: 'section-0', kind: 'section', number: '0', title: 'Foundations & Tooling', module: 'M0', moduleTitle: 'Foundations & Tooling', url: 'm0-foundations.html#section-0', summary: 'Git, GitHub flow, uv environments, Python fundamentals, NumPy and Matplotlib', keywords: ['git', 'uv', 'numpy', 'matplotlib', 'recursion'] },

  { id: 'section-1-1', kind: 'section', number: '1.1', title: 'Brute Force', module: 'M1', moduleTitle: 'Algorithm Design & Analysis', url: 'm1-algorithm-design.html#section-1-1', summary: 'Generate and test: selection sort, bubble sort, sequential search, and what they cost', keywords: ['selection sort', 'bubble sort', 'linear search', 'generate and test'] },
  { id: 'section-1-2', kind: 'section', number: '1.2', title: 'Divide and Conquer', module: 'M1', moduleTitle: 'Algorithm Design & Analysis', url: 'm1-algorithm-design.html#section-1-2', summary: 'The divide-conquer-combine framework and binary search', keywords: ['binary search', 'recursion', 'merge'] },
  { id: 'section-1-3', kind: 'section', number: '1.3', title: 'Other Strategies', module: 'M1', moduleTitle: 'Algorithm Design & Analysis', url: 'm1-algorithm-design.html#section-1-3', summary: 'Decrease and conquer, transform and conquer, greedy algorithms, and when greedy fails', keywords: ['greedy', 'coin change', 'decrease and conquer', 'transform and conquer'] },
  { id: 'section-1-4', kind: 'section', number: '1.4', title: 'Efficiency Analysis', module: 'M1', moduleTitle: 'Algorithm Design & Analysis', url: 'm1-algorithm-design.html#section-1-4', summary: 'Counting operations, Big-O notation, complexity classes, and best versus worst case', keywords: ['big-o', 'asymptotic', 'complexity class', 'worst case', 'n log n'] },
  { id: 'section-1-5', kind: 'section', number: '1.5', title: 'Applications', module: 'M1', moduleTitle: 'Algorithm Design & Analysis', url: 'm1-algorithm-design.html#section-1-5', summary: 'Lab applications: geospatial sorting, protein sequences, amino-acid counts, codon tables', keywords: ['protein', 'codon', 'dna', 'rna', 'geospatial', 'latitude', 'longitude'] },

  { id: 'section-2-1', kind: 'section', number: '2.1', title: 'Probability Fundamentals', module: 'M2', moduleTitle: 'Probability & Random Processes', url: 'm2-probability.html#section-2-1', summary: 'Sample spaces, events, unions and intersections, conditional probability and independence', keywords: ['sample space', 'venn', 'conditional', 'independence', 'bayes', 'complement'] },
  { id: 'section-2-2', kind: 'section', number: '2.2', title: 'Random Number Generation', module: 'M2', moduleTitle: 'Probability & Random Processes', url: 'm2-probability.html#section-2-2', summary: 'True versus pseudo-random, the linear congruential generator, seeding, and testing randomness quality', keywords: ['lcg', 'prng', 'trng', 'mersenne twister', 'seed', 'runs test'] },
  { id: 'section-2-3', kind: 'section', number: '2.3', title: 'Distributions', module: 'M2', moduleTitle: 'Probability & Random Processes', url: 'm2-probability.html#section-2-3', summary: 'PDF, PMF, CDF, normalization, expected value and variance, and the named distributions', keywords: ['pdf', 'pmf', 'cdf', 'expected value', 'variance', 'binomial', 'poisson', 'exponential'] },
  { id: 'section-2-4', kind: 'section', number: '2.4', title: 'Central Limit Theorem', module: 'M2', moduleTitle: 'Probability & Random Processes', url: 'm2-probability.html#section-2-4', summary: 'Histograms of sample means and convergence to normality regardless of the source distribution', keywords: ['clt', 'sample mean', 'normal distribution', 'dice'] },
  { id: 'section-2-5', kind: 'section', number: '2.5', title: 'Monte Carlo Methods', module: 'M2', moduleTitle: 'Probability & Random Processes', url: 'm2-probability.html#section-2-5', summary: 'Estimating pi, Monte Carlo integration, error and convergence rate, and the curse of dimensionality', keywords: ['monte carlo', 'pi', 'integration', 'sampling', 'convergence', 'confidence interval'] },
  { id: 'section-2-6', kind: 'section', number: '2.6', title: 'Random Processes in Time', module: 'M2', moduleTitle: 'Probability & Random Processes', url: 'm2-probability.html#section-2-6', summary: 'Brownian motion, 2D random walks, diffusion, and the secretary problem', keywords: ['brownian', 'random walk', 'diffusion', 'secretary problem', '37 percent', 'optimal stopping'] },

  { id: 'section-3-1', kind: 'section', number: '3.1', title: 'Foundations', module: 'M3', moduleTitle: 'Graphs', url: 'm3-graphs.html#section-3-1', summary: 'Königsberg, what a graph is, graph taxonomy, node degree, and Eulerian paths', keywords: ['konigsberg', 'euler', 'degree', 'directed', 'weighted', 'simple graph'] },
  { id: 'section-3-2', kind: 'section', number: '3.2', title: 'Representation', module: 'M3', moduleTitle: 'Graphs', url: 'm3-graphs.html#section-3-2', summary: 'Edge lists, adjacency matrices, adjacency lists, incidence matrices, and the GRF file format', keywords: ['edge list', 'adjacency matrix', 'adjacency list', 'incidence matrix', 'grf', 'networkx'] },
  { id: 'section-3-3', kind: 'section', number: '3.3', title: 'Connectivity', module: 'M3', moduleTitle: 'Graphs', url: 'm3-graphs.html#section-3-3', summary: 'Walks and paths, connected components, the connection algorithm, and counting walks with the adjacency matrix', keywords: ['connected', 'component', 'walk', 'path', 'connection algorithm'] },
  { id: 'section-3-4', kind: 'section', number: '3.4', title: 'Traversal', module: 'M3', moduleTitle: 'Graphs', url: 'm3-graphs.html#section-3-4', summary: 'Depth-first and breadth-first search, stack versus queue mechanics, and the trade-offs between them', keywords: ['dfs', 'bfs', 'depth first', 'breadth first', 'stack', 'queue', 'lifo', 'fifo'] },
  { id: 'section-3-5', kind: 'section', number: '3.5', title: 'Weighted Graphs & Shortest Path', module: 'M3', moduleTitle: 'Graphs', url: 'm3-graphs.html#section-3-5', summary: 'Edge weights, the edge-length matrix, brute-force shortest path, and Dijkstra step by step', keywords: ['dijkstra', 'shortest path', 'edge weight', 'relaxation', 'greedy'] },
  { id: 'section-3-6', kind: 'section', number: '3.6', title: 'Trees, MST & TSP', module: 'M3', moduleTitle: 'Graphs', url: 'm3-graphs.html#section-3-6', summary: 'Spanning trees, Kruskal and union-find, permutation generation, and the travelling salesman problem', keywords: ['tree', 'spanning tree', 'mst', 'kruskal', 'union find', 'permutation', 'tsp'] },

  { id: 'section-4-1', kind: 'section', number: '4.1', title: 'Representation', module: 'M4', moduleTitle: 'Image Processing', url: 'm4-image-processing.html#section-4-1', summary: 'From scene to pixels, RGB colour, grayscale encoding, and image bit representation', keywords: ['pixel', 'rgb', 'grayscale', 'bit depth', 'unsigned short'] },
  { id: 'section-4-2', kind: 'section', number: '4.2', title: 'File Formats', module: 'M4', moduleTitle: 'Image Processing', url: 'm4-image-processing.html#section-4-2', summary: 'Images versus formats, the portable gray map, run-length encoding, and vector graphics', keywords: ['pgm', 'png', 'jpeg', 'run-length encoding', 'rle', 'vector graphics', 'format conversion'] },
  { id: 'section-4-3', kind: 'section', number: '4.3', title: 'Global Operations', module: 'M4', moduleTitle: 'Image Processing', url: 'm4-image-processing.html#section-4-3', summary: 'Histograms, contrast stretching, colour quantization, and thresholding', keywords: ['histogram', 'contrast stretch', 'quantization', 'threshold', 'k-means'] },
  { id: 'section-4-4', kind: 'section', number: '4.4', title: 'Local & Convolutional Operations', module: 'M4', moduleTitle: 'Image Processing', url: 'm4-image-processing.html#section-4-4', summary: 'Kernels, mean and median filters, salt-and-pepper and Gaussian noise, blur and sharpen', keywords: ['kernel', 'convolution', 'mean filter', 'median filter', 'gaussian', 'blur', 'sharpen', 'laplacian'] },
  { id: 'section-4-5', kind: 'section', number: '4.5', title: 'Edge Detection', module: 'M4', moduleTitle: 'Image Processing', url: 'm4-image-processing.html#section-4-5', summary: 'What an edge is, building an edge detector, Sobel and Prewitt operators, Canny, and thresholding the edge map', keywords: ['edge', 'sobel', 'prewitt', 'canny', 'gradient', 'edge map'] },
  { id: 'section-4-6', kind: 'section', number: '4.6', title: 'Segmentation & Morphology', module: 'M4', moduleTitle: 'Image Processing', url: 'm4-image-processing.html#section-4-6', summary: 'Two-pass connected-component labelling, 4- versus 8-connectivity, binary images, dilation and erosion', keywords: ['segmentation', 'connected components', 'labelling', 'equivalence table', 'dilation', 'erosion', 'morphology', 'binary image'] },

  { id: 'section-5-1', kind: 'section', number: '5.1', title: 'Introduction to Data Mining', module: 'M5', moduleTitle: 'Data Mining', url: 'm5-data-mining.html#section-5-1', summary: 'What data mining is, the stages of the process, adjacent fields, and the John Snow cholera case', keywords: ['data mining', 'knowledge discovery', 'john snow', 'cholera'] },
  { id: 'section-5-2', kind: 'section', number: '5.2', title: 'Clustering Foundations', module: 'M5', moduleTitle: 'Data Mining', url: 'm5-data-mining.html#section-5-2', summary: 'What clustering is, types of clustering, distance functions, and clustering versus classification', keywords: ['clustering', 'distance function', 'euclidean', 'manhattan', 'metric'] },
  { id: 'section-5-3', kind: 'section', number: '5.3', title: 'Hierarchical Clustering', module: 'M5', moduleTitle: 'Data Mining', url: 'm5-data-mining.html#section-5-3', summary: 'Agglomerative clustering with single, complete and average linkage, and reading a dendrogram', keywords: ['hierarchical', 'agglomerative', 'single linkage', 'complete linkage', 'average linkage', 'dendrogram'] },
  { id: 'section-5-4', kind: 'section', number: '5.4', title: 'K-Means', module: 'M5', moduleTitle: 'Data Mining', url: 'm5-data-mining.html#section-5-4', summary: "Lloyd's method step by step, initialization, convergence testing, choosing k, and weighted k-means", keywords: ['k-means', 'lloyd', 'centroid', 'initialization', 'convergence', 'elbow'] },
  { id: 'section-5-5', kind: 'section', number: '5.5', title: 'Geometric Clustering', module: 'M5', moduleTitle: 'Data Mining', url: 'm5-data-mining.html#section-5-5', summary: 'Voronoi diagrams, Delaunay as the dual, and centroidal Voronoi tessellation', keywords: ['voronoi', 'delaunay', 'cvt', 'tessellation', 'macqueen'] },
  { id: 'section-5-6', kind: 'section', number: '5.6', title: 'Classification', module: 'M5', moduleTitle: 'Data Mining', url: 'm5-data-mining.html#section-5-6', summary: "Decision-tree structure, Hunt's algorithm, impurity measures, information gain, and neural networks", keywords: ['classification', 'decision tree', 'hunt', 'gini', 'entropy', 'information gain', 'neural network'] },

  { id: 'section-6-1', kind: 'section', number: '6.1', title: 'Points and Lines', module: 'M6', moduleTitle: 'Computational Geometry', url: 'm6-computational-geometry.html#section-6-1', summary: 'Parametric lines, the s coordinate, distance via the dot product, and point-to-line distance', keywords: ['point', 'line', 'parametric', 'dot product', 'projection', 'perpendicular'] },
  { id: 'section-6-2', kind: 'section', number: '6.2', title: 'Triangles', module: 'M6', moduleTitle: 'Computational Geometry', url: 'm6-computational-geometry.html#section-6-2', summary: 'Centroid and area, the cross product, orientation, inside-outside tests, and sampling a triangle', keywords: ['triangle', 'centroid', 'area', 'cross product', 'orientation', 'barycentric', 'region code'] },
  { id: 'section-6-3', kind: 'section', number: '6.3', title: 'Polygons', module: 'M6', moduleTitle: 'Computational Geometry', url: 'm6-computational-geometry.html#section-6-3', summary: 'Representing polygons, convexity, triangulation strategies, and ear clipping', keywords: ['polygon', 'convex', 'triangulation', 'ear clipping', 'ear slicing', 'polygon area'] },
  { id: 'section-6-4', kind: 'section', number: '6.4', title: 'Convex Hull', module: 'M6', moduleTitle: 'Computational Geometry', url: 'm6-computational-geometry.html#section-6-4', summary: 'Bounding boxes, the definition of convexity, and the gift-wrapping algorithm step by step', keywords: ['convex hull', 'gift wrapping', 'jarvis march', 'bounding box', 'scipy'] },
  { id: 'section-6-5', kind: 'section', number: '6.5', title: 'Delaunay Triangulation & Quadrature', module: 'M6', moduleTitle: 'Computational Geometry', url: 'm6-computational-geometry.html#section-6-5', summary: 'What makes a triangulation good, integration over irregular domains, and quadrature rules', keywords: ['delaunay', 'quadrature', 'integration', 'precision', 'scattered data', 'gradient'] },

  { id: 'section-7-1', kind: 'section', number: '7.1', title: 'Framing', module: 'M7', moduleTitle: 'Discrete Optimization', url: 'm7-discrete-optimization.html#section-7-1', summary: 'What discrete optimization is, the standard methods, and the catalogue of example problems', keywords: ['discrete optimization', 'combinatorial', 'objective function'] },
  { id: 'section-7-2', kind: 'section', number: '7.2', title: 'Linear Programming Formulation', module: 'M7', moduleTitle: 'Discrete Optimization', url: 'm7-discrete-optimization.html#section-7-2', summary: 'The diet, transportation and blending problems, the general LP, standard form, and matrix representation', keywords: ['linear programming', 'diet problem', 'transportation problem', 'blending', 'standard form'] },
  { id: 'section-7-3', kind: 'section', number: '7.3', title: 'Geometry of LP', module: 'M7', moduleTitle: 'Discrete Optimization', url: 'm7-discrete-optimization.html#section-7-3', summary: 'The graphical solution with two unknowns, feasible regions, redundancy, unboundedness and uniqueness', keywords: ['feasible region', 'graphical solution', 'unbounded', 'redundant constraint', 'vertex'] },
  { id: 'section-7-4', kind: 'section', number: '7.4', title: 'Slack Variables & Basic Solutions', module: 'M7', moduleTitle: 'Discrete Optimization', url: 'm7-discrete-optimization.html#section-7-4', summary: 'Slack variables, underdetermined systems, basic feasible solutions, and the brute-force LP method', keywords: ['slack variable', 'basic feasible solution', 'underdetermined', 'brute force lp'] },
  { id: 'section-7-5', kind: 'section', number: '7.5', title: 'The Simplex Method', module: 'M7', moduleTitle: 'Discrete Optimization', url: 'm7-discrete-optimization.html#section-7-5', summary: 'Canonical form, entering and departing variables, the tableau, the optimality test, and Bland’s rule', keywords: ['simplex', 'tableau', 'pivot', 'entering variable', 'departing variable', 'bland', 'optimality test'] },

  /* -------------------------------------------------- cross-cutting threads */
  {
    id: 'thread-k-means',
    kind: 'thread',
    number: '',
    title: 'Thread: k-means everywhere',
    module: '',
    moduleTitle: '',
    url: 'cross-cutting/kmeans-everywhere.html',
    summary: 'The same algorithm taught three times: colour quantization in M4, clustering in M5, centroidal Voronoi tessellation in M6',
    keywords: ['k-means', 'lloyd', 'quantization', 'clustering', 'cvt', 'cross-cutting',
               'centroid', 'voronoi', 'energy', 'elbow', 'thread']
  },
  {
    id: 'thread-greedy',
    kind: 'thread',
    number: '',
    title: 'Thread: greedy algorithms gallery',
    module: '',
    moduleTitle: '',
    url: 'cross-cutting/greedy-gallery.html',
    summary: "Coin change in M1, Dijkstra and Kruskal in M3, Hunt's tree construction in M5 — one strategy, four appearances",
    keywords: ['greedy', 'coin change', 'dijkstra', 'kruskal', 'hunt', 'cross-cutting',
               'counterexample', '30 cents', 'nickel', 'when greedy fails', 'thread']
  },
  {
    id: 'thread-delaunay',
    kind: 'thread',
    number: '',
    title: 'Thread: Delaunay triangulation',
    module: '',
    moduleTitle: '',
    url: 'cross-cutting/delaunay-thread.html',
    summary: 'Taught in M5 as the Voronoi dual and in M6 as a triangulation method, and used in Lab13 to build a sensor field',
    keywords: ['delaunay', 'voronoi', 'triangulation', 'lab13', 'cross-cutting',
               'minimum angle', 'circumcircle', 'dual', 'sensor field', 'thread']
  },
  {
    id: 'thread-complexity',
    kind: 'thread',
    number: '',
    title: 'Thread: algorithm complexity comparator',
    module: '',
    moduleTitle: '',
    url: 'cross-cutting/complexity-comparator.html',
    summary: 'Big-O across the course: sorting and search in M1, traversal and Dijkstra in M3, Lloyd’s method in M5',
    keywords: ['big-o', 'complexity', 'cost', 'comparison', 'cross-cutting',
               'growth rate', 'operation count', 'crossover', 'scaling', 'thread']
  },
  {
    id: 'thread-exam',
    kind: 'thread',
    number: '',
    title: 'Thread: exam practice',
    module: '',
    moduleTitle: '',
    url: 'cross-cutting/exam-practice.html',
    summary: 'Thirteen problem types from the real midterm and final, each answerable without a figure, each with a worked solution',
    keywords: ['exam', 'midterm', 'final', 'practice', 'revision', 'study',
               'problem type', 'worked solution', 'past paper', 'thread']
  }

  /* =======================================================================
     CROSS-CUTTING DEMOS — appended by the cross-cutting author

     The five thread entries above now point at the pages in
     Dashboard/cross-cutting/ rather than at the summary anchors on the home
     page; those anchors still exist and still carry a one-paragraph version
     of each thread. Only the `url` and `keywords` of those five changed.
     ======================================================================= */

  ,{
    id: 'demo-complexity-comparator',
    kind: 'demo',
    number: '1.4.4',
    title: 'Complexity comparator',
    module: '',
    moduleTitle: '',
    url: 'cross-cutting/complexity-comparator.html#demo-complexity-comparator',
    summary: 'Pick algorithms from M1, M3 and M5, pick a problem size, and read the operation count and the elapsed time',
    keywords: ['big-o', 'complexity', 'operation count', 'compare algorithms', 'growth',
               'selection sort', 'dijkstra', 'lloyd', 'tsp', 'interactive', 'midterm']
  }
  ,{
    id: 'demo-growth-crossover',
    kind: 'demo',
    number: '1.4.7',
    title: 'Crossover explorer',
    module: 'M1',
    moduleTitle: 'Algorithm Design & Analysis',
    url: 'cross-cutting/complexity-comparator.html#demo-growth-crossover',
    summary: 'Watch 50n + 21 overtake n squared + 10n + 5 at n of about 40, and never fall behind again',
    keywords: ['crossover', 'constants', 'asymptotic', 'linear versus quadratic',
               'efficiency', 'interactive']
  }
  ,{
    id: 'demo-lloyd-everywhere',
    kind: 'demo',
    number: '5.4.3',
    title: "Lloyd's method in three settings",
    module: '',
    moduleTitle: '',
    url: 'cross-cutting/kmeans-everywhere.html#demo-lloyd-everywhere',
    summary: 'One k-means loop run as colour quantization, as clustering, and as a centroidal Voronoi tessellation',
    keywords: ['k-means', 'lloyd', 'quantization', 'clustering', 'cvt', 'centroid',
               'convergence', 'energy', 'step through', 'interactive', 'lab10', 'lab11']
  }
  ,{
    id: 'demo-greedy-coin-change',
    kind: 'demo',
    number: '1.3.4',
    title: 'Coin change: greedy against optimal',
    module: '',
    moduleTitle: '',
    url: 'cross-cutting/greedy-gallery.html#demo-greedy-coin-change',
    summary: 'The 30-cent counterexample: greedy takes six coins with 1c, 10c and 25c where three would do',
    keywords: ['greedy', 'coin change', 'counterexample', '30 cents', 'nickel',
               'dynamic programming', 'optimal', 'when greedy fails', 'interactive']
  }
  ,{
    id: 'demo-greedy-gap',
    kind: 'demo',
    number: '1.3.4',
    title: 'Greedy gap survey',
    module: '',
    moduleTitle: '',
    url: 'cross-cutting/greedy-gallery.html#demo-greedy-gap',
    summary: 'Every amount up to a limit where greedy change-making beats or loses to the exact optimum',
    keywords: ['greedy', 'coin change', 'canonical', 'denomination', 'survey',
               'counterexample', 'interactive']
  }
  ,{
    id: 'demo-delaunay-ranking',
    kind: 'demo',
    number: '6.5.3',
    title: 'Every triangulation, ranked by its smallest angle',
    module: '',
    moduleTitle: '',
    url: 'cross-cutting/delaunay-thread.html#demo-delaunay-ranking',
    summary: 'Builds all 14 triangulations of six points and walks from the worst to the Delaunay one',
    keywords: ['delaunay', 'triangulation', 'minimum angle', 'catalan', 'convex position',
               'max-min angle', 'interactive', 'lab13']
  }
  ,{
    id: 'demo-practice-picker',
    kind: 'demo',
    number: '',
    title: 'Practice set builder',
    module: '',
    moduleTitle: '',
    url: 'cross-cutting/exam-practice.html#demo-practice-picker',
    summary: 'Filter the thirteen exam problem types by paper, by module, by answer style and by mark value',
    keywords: ['exam', 'midterm', 'final', 'practice', 'revision', 'filter',
               'problem type', 'study plan', 'interactive']
  }
  ,{
    id: 'demo-dijkstra-midterm',
    kind: 'demo',
    number: '3.5.8',
    title: 'Dijkstra step-through on the road network',
    module: 'M3',
    moduleTitle: 'Graphs',
    url: 'cross-cutting/exam-practice.html#demo-dijkstra-midterm',
    summary: 'The six-city midterm graph, stepped one node at a time, with the C to E road weight exposed',
    keywords: ['dijkstra', 'shortest path', 'midterm', 'road network', 'edge change',
               're-run', 'working table', 'step through', 'interactive']
  }

  /* =======================================================================
     M0 TOPIC ENTRIES — appended by the M0 author
     ======================================================================= */

  ,{
    id: 'topic-0-1',
    kind: 'topic',
    number: '0.1',
    title: 'Git: repositories, cloning',
    module: 'M0',
    moduleTitle: 'Foundations & Tooling',
    url: 'm0-foundations.html#topic-0-1',
    summary: 'A repository is your project folder plus every version of every file; cloning copies the whole of it onto your machine',
    keywords: ['git', 'clone', 'repository', 'repo', 'version control', 'vcs', 'origin', 'readme', 'lab01', 'distributed']
  }
  ,{
    id: 'topic-0-2',
    kind: 'topic',
    number: '0.2',
    title: 'Git: committing and pushing',
    module: 'M0',
    moduleTitle: 'Foundations & Tooling',
    url: 'm0-foundations.html#topic-0-2',
    summary: 'A commit is a local checkpoint; nothing reaches GitHub until you push, which is where most Lab 01 submissions go wrong',
    keywords: ['commit', 'push', 'git add', 'git status', 'commit message', 'checkpoint', 'ahead of origin', 'lab01']
  }
  ,{
    id: 'topic-0-3',
    kind: 'topic',
    number: '0.3',
    title: 'The GitHub flow',
    module: 'M0',
    moduleTitle: 'Foundations & Tooling',
    url: 'm0-foundations.html#topic-0-3',
    summary: 'Branch, commit, open a pull request, review, merge, delete the branch — and main is unchanged until the merge',
    keywords: ['github flow', 'workflow', 'branch', 'pull request', 'merge', 'main', 'default branch', 'lab01']
  }
  ,{
    id: 'topic-0-4',
    kind: 'topic',
    number: '0.4',
    title: 'Branches, forks, pull requests',
    module: 'M0',
    moduleTitle: 'Foundations & Tooling',
    url: 'm0-foundations.html#topic-0-4',
    summary: 'A branch is a safe copy inside one repository, a fork is a copy under your own account, and a pull request is how either comes back',
    keywords: ['branch', 'fork', 'pull request', 'pr', 'merge', 'review', 'contribute', 'git switch', 'lab01']
  }
  ,{
    id: 'topic-0-5',
    kind: 'topic',
    number: '0.5',
    title: 'Issues and project boards',
    module: 'M0',
    moduleTitle: 'Foundations & Tooling',
    url: 'm0-foundations.html#topic-0-5',
    summary: 'Issues track tasks and bugs, boards sort them into columns, and a linked pull request closes its issue when it merges',
    keywords: ['issue', 'project board', 'kanban', 'closes', 'task tracking', 'bug', 'todo', 'lab01']
  }
  ,{
    id: 'topic-0-6',
    kind: 'topic',
    number: '0.6',
    title: 'Markdown authoring on GitHub',
    module: 'M0',
    moduleTitle: 'Foundations & Tooling',
    url: 'm0-foundations.html#topic-0-6',
    summary: 'The syntax every README and lab report is written in, and the heading, link and alt-text habits that make it readable',
    keywords: ['markdown', 'readme', 'report.md', 'heading', 'alt text', 'link text', 'fenced code block', 'profile', 'lab01']
  }
  ,{
    id: 'topic-0-7',
    kind: 'topic',
    number: '0.7',
    title: 'Python environments with uv',
    module: 'M0',
    moduleTitle: 'Foundations & Tooling',
    url: 'm0-foundations.html#topic-0-7',
    summary: 'uv sync turns pyproject.toml and uv.lock into a .venv folder; uv run executes your code inside it without activating anything',
    keywords: ['uv', 'uv sync', 'uv run', 'uv venv', 'virtual environment', 'venv', 'lock file', 'pyproject', 'dependencies', 'lab01', 'lab02']
  }
  ,{
    id: 'topic-0-8',
    kind: 'topic',
    number: '0.8',
    title: 'Loops, conditionals, recursion',
    module: 'M0',
    moduleTitle: 'Foundations & Tooling',
    url: 'm0-foundations.html#topic-0-8',
    summary: 'Accumulator loops and the myrec recurrence f(x) = 2x - f(x-1), including why myrec(5) returns 6 and not 5',
    keywords: ['loop', 'for', 'while', 'conditional', 'if', 'recursion', 'myrec', 'base case', 'guard clause',
               'factorial', 'pseudocode', 'call stack', 'lab02']
  }
  ,{
    id: 'topic-0-9',
    kind: 'topic',
    number: '0.9',
    title: 'File I/O and path handling',
    module: 'M0',
    moduleTitle: 'Foundations & Tooling',
    url: 'm0-foundations.html#topic-0-9',
    summary: 'os.path.exists, os.listdir, os.path.join and os.path.isdir, and why sorted() is the difference between passing and failing',
    keywords: ['file io', 'os', 'os.path', 'listdir', 'isdir', 'join', 'path', 'basic_io', 'sorted', 'folder', 'lab02', 'lab03']
  }
  ,{
    id: 'topic-0-10',
    kind: 'topic',
    number: '0.10',
    title: 'NumPy arrays and vectorization',
    module: 'M0',
    moduleTitle: 'Foundations & Tooling',
    url: 'm0-foundations.html#topic-0-10',
    summary: 'Shape, row and column slicing, and element-wise operations — with the one element that add2and3 counts twice',
    keywords: ['numpy', 'ndarray', 'slicing', 'shape', 'axis', 'vectorization', 'np.sum', 'add2and3',
               'squareme', 'zero indexed', 'lab02']
  }
  ,{
    id: 'topic-0-11',
    kind: 'topic',
    number: '0.11',
    title: 'Matplotlib plotting',
    module: 'M0',
    moduleTitle: 'Foundations & Tooling',
    url: 'm0-foundations.html#topic-0-11',
    summary: 'plt.plot and plt.bar on the same arrays, savefig instead of show in a script, and what makes a figure readable',
    keywords: ['matplotlib', 'pyplot', 'plt.plot', 'plt.bar', 'line plot', 'bar plot', 'savefig', 'show', 'figure', 'lab02']
  }
  ,{
    id: 'topic-0-12',
    kind: 'topic',
    number: '0.12',
    title: 'Classes and functions',
    module: 'M0',
    moduleTitle: 'Foundations & Tooling',
    url: 'm0-foundations.html#topic-0-12',
    summary: 'Default parameters, unenforced type hints, copying before mutating, and exception-handler ordering inside a constructor',
    keywords: ['class', 'function', 'default parameter', 'type hint', 'init', 'method', 'getter', 'setter',
               'composition', 'exception', 'try except', 'ZeroDivisionError', 'PythonOverview']
  }
  ,{
    id: 'demo-git-local-remote',
    kind: 'demo',
    number: '0.2',
    title: 'Clone, commit, push step-through',
    module: 'M0',
    moduleTitle: 'Foundations & Tooling',
    url: 'm0-foundations.html#demo-git-local-remote',
    summary: 'Watch the local and remote commit counts drift apart as you commit, then close again when you push',
    keywords: ['git', 'commit', 'push', 'clone', 'local', 'remote', 'ahead', 'step through', 'interactive']
  }
  ,{
    id: 'demo-github-flow',
    kind: 'demo',
    number: '0.3',
    title: 'GitHub flow step-through',
    module: 'M0',
    moduleTitle: 'Foundations & Tooling',
    url: 'm0-foundations.html#demo-github-flow',
    summary: 'Step through branch, commits, pull request, review rounds and merge, with the commit counts on each line',
    keywords: ['github flow', 'branch', 'pull request', 'merge', 'review', 'step through', 'interactive']
  }
  ,{
    id: 'demo-recursion-myrec',
    kind: 'demo',
    number: '0.8',
    title: 'Recursion call-stack trace',
    module: 'M0',
    moduleTitle: 'Foundations & Tooling',
    url: 'm0-foundations.html#demo-recursion-myrec',
    summary: 'Descend myrec to the base case and unwind it again, one frame at a time, for any x from minus one to ten',
    keywords: ['recursion', 'myrec', 'call stack', 'stack frame', 'base case', 'unwind', 'trace', 'lab02', 'interactive']
  }
  ,{
    id: 'demo-numpy-add2and3',
    kind: 'demo',
    number: '0.10',
    title: 'NumPy slicing explorer',
    module: 'M0',
    moduleTitle: 'Foundations & Tooling',
    url: 'm0-foundations.html#demo-numpy-add2and3',
    summary: 'Change the shape of the matrix and see which cells A[1, :] and A[:, 2] pick up, and which one is counted twice',
    keywords: ['numpy', 'slicing', 'add2and3', 'row', 'column', 'shape', 'guard clause', 'lab02', 'interactive']
  }
  ,{
    id: 'demo-matplotlib-charts',
    kind: 'demo',
    number: '0.11',
    title: 'Line plot versus bar plot',
    module: 'M0',
    moduleTitle: 'Foundations & Tooling',
    url: 'm0-foundations.html#demo-matplotlib-charts',
    summary: 'The same x and y drawn two ways, with the numbers unchanged underneath, to show what the chart type adds',
    keywords: ['matplotlib', 'line plot', 'bar plot', 'chart type', 'plt.plot', 'plt.bar', 'interactive']
  }

  /* =======================================================================
     M1 TOPIC ENTRIES — appended by the M1 author
     ======================================================================= */

  ,{
    id: 'topic-1-1-1',
    kind: 'topic',
    number: '1.1.1',
    title: 'The brute-force philosophy: generate and test',
    module: 'M1',
    moduleTitle: 'Algorithm Design & Analysis',
    url: 'm1-algorithm-design.html#topic-1-1-1',
    summary: 'Enumerate every candidate, then test each one — universal, always correct, and usually far too slow',
    keywords: ['brute force', 'generate and test', 'exhaustive search', 'baseline', 'first pass', 'lab03']
  }
  ,{
    id: 'topic-1-1-2',
    kind: 'topic',
    number: '1.1.2',
    title: 'Selection sort',
    module: 'M1',
    moduleTitle: 'Algorithm Design & Analysis',
    url: 'm1-algorithm-design.html#topic-1-1-2',
    summary: 'Take the current element and swap it with the smallest element on its right, position by position',
    keywords: ['selection sort', 'sorting', 'swap', 'smallest', 'min_loc', 'lab03', 'midterm', 'brute force']
  }
  ,{
    id: 'topic-1-1-3',
    kind: 'topic',
    number: '1.1.3',
    title: 'Bubble sort',
    module: 'M1',
    moduleTitle: 'Algorithm Design & Analysis',
    url: 'm1-algorithm-design.html#topic-1-1-3',
    summary: 'Compare consecutive elements left to right and swap them if out of order, until a sweep makes no swaps',
    keywords: ['bubble sort', 'sweep', 'adjacent', 'bubbles up', 'lab03', 'midterm', 'brute force']
  }
  ,{
    id: 'topic-1-1-4',
    kind: 'topic',
    number: '1.1.4',
    title: 'Sequential (linear) search',
    module: 'M1',
    moduleTitle: 'Algorithm Design & Analysis',
    url: 'm1-algorithm-design.html#topic-1-1-4',
    summary: 'Check each element against the search key in turn, stopping at the first match or the end of the list',
    keywords: ['sequential search', 'linear search', 'search key', 'unsorted', 'lab04', 'miami', 'brute force']
  }
  ,{
    id: 'topic-1-1-5',
    kind: 'topic',
    number: '1.1.5',
    title: 'Computational cost of brute force',
    module: 'M1',
    moduleTitle: 'Algorithm Design & Analysis',
    url: 'm1-algorithm-design.html#topic-1-1-5',
    summary: 'Counting comparisons gives selection sort n squared over two minus n over two, so it is quadratic',
    keywords: ['computational cost', 'comparisons', 'summation', 'series formula', 'quadratic', 'midterm']
  }
  ,{
    id: 'topic-1-2-1',
    kind: 'topic',
    number: '1.2.1',
    title: 'Divide–conquer–combine framework',
    module: 'M1',
    moduleTitle: 'Algorithm Design & Analysis',
    url: 'm1-algorithm-design.html#topic-1-2-1',
    summary: 'Split into sub-problems of the same type, solve each, then combine — the combine step decides if it pays',
    keywords: ['divide and conquer', 'recursion', 'base case', 'combine', 'maximum subarray', 'exercises']
  }
  ,{
    id: 'topic-1-2-2',
    kind: 'topic',
    number: '1.2.2',
    title: 'Binary search',
    module: 'M1',
    moduleTitle: 'Algorithm Design & Analysis',
    url: 'm1-algorithm-design.html#topic-1-2-2',
    summary: 'Check the middle entry of a sorted array and discard the half that cannot contain the key',
    keywords: ['binary search', 'half interval', 'sorted', 'logarithmic', 'dictionary', 'phone book', 'lab04']
  }
  ,{
    id: 'topic-1-2-3',
    kind: 'topic',
    number: '1.2.3',
    title: 'Other applications of divide and conquer',
    module: 'M1',
    moduleTitle: 'Algorithm Design & Analysis',
    url: 'm1-algorithm-design.html#topic-1-2-3',
    summary: 'Bisection, mergesort, quicksort, big-integer multiplication and Strassen all divide and conquer',
    keywords: ['bisection', 'mergesort', 'quicksort', 'strassen', 'matrix multiplication', 'cryptography', 'hoare']
  }
  ,{
    id: 'topic-1-3-1',
    kind: 'topic',
    number: '1.3.1',
    title: 'Decrease and conquer',
    module: 'M1',
    moduleTitle: 'Algorithm Design & Analysis',
    url: 'm1-algorithm-design.html#topic-1-3-1',
    summary: 'Reduce to one smaller instance: pi to the eighth power in three multiplications instead of seven',
    keywords: ['decrease and conquer', 'exponentiation by squaring', 'horner', 'insertion sort', 'pi']
  }
  ,{
    id: 'topic-1-3-2',
    kind: 'topic',
    number: '1.3.2',
    title: 'Transform and conquer',
    module: 'M1',
    moduleTitle: 'Algorithm Design & Analysis',
    url: 'm1-algorithm-design.html#topic-1-3-2',
    summary: 'Restate the problem so it is easier: polar coordinates, or sort first then check adjacent entries',
    keywords: ['transform and conquer', 'presorting', 'duplicates', 'polar coordinates', 'gaussian elimination']
  }
  ,{
    id: 'topic-1-3-3',
    kind: 'topic',
    number: '1.3.3',
    title: 'Greedy algorithms',
    module: 'M1',
    moduleTitle: 'Algorithm Design & Analysis',
    url: 'm1-algorithm-design.html#topic-1-3-3',
    summary: 'Make the best local choice at each step and never take it back — 41 cents in four coins',
    keywords: ['greedy', 'coin change', 'change making', 'local choice', 'irrevocable', 'optimization', 'cashier']
  }
  ,{
    id: 'topic-1-3-4',
    kind: 'topic',
    number: '1.3.4',
    title: 'When greedy fails (counterexamples)',
    module: 'M1',
    moduleTitle: 'Algorithm Design & Analysis',
    url: 'm1-algorithm-design.html#topic-1-3-4',
    summary: 'Drop the five-cent coin and greedy needs six coins for thirty cents, where three tens would do',
    keywords: ['greedy fails', 'counterexample', 'coin change', 'scrabble', 'chess', 'non-canonical', 'optimal']
  }
  ,{
    id: 'topic-1-3-5',
    kind: 'topic',
    number: '1.3.5',
    title: 'Algorithm strategy selection',
    module: 'M1',
    moduleTitle: 'Algorithm Design & Analysis',
    url: 'm1-algorithm-design.html#topic-1-3-5',
    summary: 'Which of the five strategies fits the problem — a rule set read top down, first match wins',
    keywords: ['strategy', 'decision tree', 'which algorithm', 'comparison table', 'choosing', 'mind map']
  }
  ,{
    id: 'topic-1-4-1',
    kind: 'topic',
    number: '1.4.1',
    title: 'Why efficiency matters (seconds to centuries)',
    module: 'M1',
    moduleTitle: 'Algorithm Design & Analysis',
    url: 'm1-algorithm-design.html#topic-1-4-1',
    summary: 'Wall-clock time depends on your laptop; efficiency is the platform-independent measure that does not',
    keywords: ['efficiency', 'wall clock', 'stopwatch', 'scaling', 'seconds to centuries', 'runtime']
  }
  ,{
    id: 'topic-1-4-2',
    kind: 'topic',
    number: '1.4.2',
    title: 'Computational cost and problem size',
    module: 'M1',
    moduleTitle: 'Algorithm Design & Analysis',
    url: 'm1-algorithm-design.html#topic-1-4-2',
    summary: 'Estimate operations as a function of n: the list length, the matrix dimension, the function calls',
    keywords: ['problem size', 'cost', 'operations', 'function calls', 'midterm', 'what is n']
  }
  ,{
    id: 'topic-1-4-3',
    kind: 'topic',
    number: '1.4.3',
    title: 'Operation of interest and counting operations',
    module: 'M1',
    moduleTitle: 'Algorithm Design & Analysis',
    url: 'm1-algorithm-design.html#topic-1-4-3',
    summary: 'Count one representative operation; loop nesting reads off the class and a triangular loop halves it',
    keywords: ['operation of interest', 'counting operations', 'quick hack', 'nested loops', 'triangular', 'midterm']
  }
  ,{
    id: 'topic-1-4-4',
    kind: 'topic',
    number: '1.4.4',
    title: 'Big-O notation',
    module: 'M1',
    moduleTitle: 'Algorithm Design & Analysis',
    url: 'm1-algorithm-design.html#topic-1-4-4',
    summary: 'Drop lower-order terms and constant factors and keep the growth rate: 50n plus 21 is order n',
    keywords: ['big-o', 'big o', 'asymptotic', 'order', 'moore law', 'fft', 'growth rate', 'midterm']
  }
  ,{
    id: 'topic-1-4-5',
    kind: 'topic',
    number: '1.4.5',
    title: 'Complexity classes',
    module: 'M1',
    moduleTitle: 'Algorithm Design & Analysis',
    url: 'm1-algorithm-design.html#topic-1-4-5',
    summary: 'The ordering chain from constant and logarithmic through quadratic to exponential and factorial',
    keywords: ['complexity class', 'ordering chain', 'n log n', 'exponential', 'factorial', 'lhopital', 'midterm']
  }
  ,{
    id: 'topic-1-4-6',
    kind: 'topic',
    number: '1.4.6',
    title: 'Best-case vs. worst-case analysis',
    module: 'M1',
    moduleTitle: 'Algorithm Design & Analysis',
    url: 'm1-algorithm-design.html#topic-1-4-6',
    summary: 'Same n, different input: selection sort has no gap between its cases and bubble sort does',
    keywords: ['best case', 'worst case', 'average case', 'midterm', 'already sorted', 'reversed', 'guarantee']
  }
  ,{
    id: 'topic-1-4-7',
    kind: 'topic',
    number: '1.4.7',
    title: 'Comparing algorithms empirically',
    module: 'M1',
    moduleTitle: 'Algorithm Design & Analysis',
    url: 'm1-algorithm-design.html#topic-1-4-7',
    summary: '50n plus 21 against n squared plus 10n plus 5: the quadratic wins until n is 40 and loses after',
    keywords: ['comparing algorithms', 'crossover', 'empirical', 'timing', 'lab03', 'efficiency plot']
  }
  ,{
    id: 'topic-1-5-1',
    kind: 'topic',
    number: '1.5.1',
    title: 'Sorting geospatial data (latitude and longitude)',
    module: 'M1',
    moduleTitle: 'Algorithm Design & Analysis',
    url: 'm1-algorithm-design.html#topic-1-5-1',
    summary: 'Haversine distances to seven Florida stores with R = 6371 km, then selection sort on the distances',
    keywords: ['haversine', 'latitude', 'longitude', 'geospatial', 'lab03', 'stores', 'kilometres', 'florida']
  }
  ,{
    id: 'topic-1-5-2',
    kind: 'topic',
    number: '1.5.2',
    title: 'Random protein sequence generation',
    module: 'M1',
    moduleTitle: 'Algorithm Design & Analysis',
    url: 'm1-algorithm-design.html#topic-1-5-2',
    summary: 'Draw codons uniformly and reject the three stop codons — rejection sampling in three lines',
    keywords: ['protein', 'codon', 'rejection sampling', 'lab04', 'dna', 'stop codon', 'random string']
  }
  ,{
    id: 'topic-1-5-3',
    kind: 'topic',
    number: '1.5.3',
    title: 'Amino-acid occurrence counting',
    module: 'M1',
    moduleTitle: 'Algorithm Design & Analysis',
    url: 'm1-algorithm-design.html#topic-1-5-3',
    summary: 'Sequential search over the codon-aligned reading frame, summing every codon for one amino acid',
    keywords: ['amino acid', 'frequency', 'codon aligned', 'reading frame', 'lab04', 'cysteine', 'stride 3']
  }
  ,{
    id: 'topic-1-5-4',
    kind: 'topic',
    number: '1.5.4',
    title: 'Codon tables and DNA–RNA translation',
    module: 'M1',
    moduleTitle: 'Algorithm Design & Analysis',
    url: 'm1-algorithm-design.html#topic-1-5-4',
    summary: '61 coding codons and 3 stop codons map onto 20 amino acids; RNA writes U where DNA writes T',
    keywords: ['codon table', 'dna', 'rna', 'amino acid', 'lab04', 'translation', 'uracil', 'thymine']
  }

  ,{
    id: 'demo-selection-sort',
    kind: 'demo',
    number: '1.1.2',
    title: 'Selection sort step-through',
    module: 'M1',
    moduleTitle: 'Algorithm Design & Analysis',
    url: 'm1-algorithm-design.html#demo-selection-sort',
    summary: 'Step through selection sort on the lecture array or the midterm array and watch the sorted prefix grow',
    keywords: ['selection sort', 'step through', 'trace', 'interactive', 'visualizer', 'midterm practice']
  }
  ,{
    id: 'demo-bubble-sort',
    kind: 'demo',
    number: '1.1.3',
    title: 'Bubble sort step-through',
    module: 'M1',
    moduleTitle: 'Algorithm Design & Analysis',
    url: 'm1-algorithm-design.html#demo-bubble-sort',
    summary: 'Step through bubble sort sweep by sweep and compare full-width sweeps against the shortened version',
    keywords: ['bubble sort', 'step through', 'sweep', 'trace', 'interactive', 'visualizer']
  }
  ,{
    id: 'demo-sequential-search',
    kind: 'demo',
    number: '1.1.4',
    title: 'Sequential search step-through',
    module: 'M1',
    moduleTitle: 'Algorithm Design & Analysis',
    url: 'm1-algorithm-design.html#demo-sequential-search',
    summary: 'Move the key to the front, the middle, the end or out of the list and watch the comparison count',
    keywords: ['sequential search', 'linear search', 'best case', 'worst case', 'interactive', 'step through']
  }
  ,{
    id: 'demo-binary-search',
    kind: 'demo',
    number: '1.2.2',
    title: 'Binary search step-through',
    module: 'M1',
    moduleTitle: 'Algorithm Design & Analysis',
    url: 'm1-algorithm-design.html#demo-binary-search',
    summary: 'Watch the interval halve at every comparison, with the sequential-search count shown alongside',
    keywords: ['binary search', 'step through', 'interval', 'comparison', 'interactive', 'search comparison']
  }
  ,{
    id: 'demo-power-squaring',
    kind: 'demo',
    number: '1.3.1',
    title: 'Exponentiation by squaring',
    module: 'M1',
    moduleTitle: 'Algorithm Design & Analysis',
    url: 'm1-algorithm-design.html#demo-power-squaring',
    summary: 'Build any power of pi by repeated squaring and compare the multiplication count against brute force',
    keywords: ['decrease and conquer', 'squaring', 'pi', 'multiplications', 'interactive', 'power']
  }
  ,{
    id: 'demo-coin-change',
    kind: 'demo',
    number: '1.3.3',
    title: 'Greedy coin change simulator',
    module: 'M1',
    moduleTitle: 'Algorithm Design & Analysis',
    url: 'm1-algorithm-design.html#demo-coin-change',
    summary: 'Greedy against the exact optimum for any amount and coin system, with the verdict stated in words',
    keywords: ['coin change', 'greedy', 'optimal', 'simulator', 'counterexample', 'interactive', 'cents']
  }
  ,{
    id: 'demo-strategy-picker',
    kind: 'demo',
    number: '1.3.5',
    title: 'Algorithm strategy picker',
    module: 'M1',
    moduleTitle: 'Algorithm Design & Analysis',
    url: 'm1-algorithm-design.html#demo-strategy-picker',
    summary: 'Describe your problem and see which rule fires first, with every rule and its verdict listed',
    keywords: ['decision tree', 'strategy', 'which algorithm', 'picker', 'interactive', 'rules']
  }
  ,{
    id: 'demo-operation-counter',
    kind: 'demo',
    number: '1.4.3',
    title: 'Operation counter',
    module: 'M1',
    moduleTitle: 'Algorithm Design & Analysis',
    url: 'm1-algorithm-design.html#demo-operation-counter',
    summary: 'Exact operation counts for the midterm snippets at any n, next to the linear reference line',
    keywords: ['counting operations', 'exact count', 'midterm practice', 'snippet', 'interactive', 'loops']
  }
  ,{
    id: 'demo-big-o-explorer',
    kind: 'demo',
    number: '1.4.5',
    title: 'Big-O complexity explorer',
    module: 'M1',
    moduleTitle: 'Algorithm Design & Analysis',
    url: 'm1-algorithm-design.html#demo-big-o-explorer',
    summary: 'Tick complexity classes and compare their growth on a linear or logarithmic axis up to n = 1000',
    keywords: ['big-o', 'explorer', 'complexity class', 'growth', 'interactive', 'log scale', 'compare']
  }
  ,{
    id: 'demo-best-worst',
    kind: 'demo',
    number: '1.4.6',
    title: 'Best case against worst case',
    module: 'M1',
    moduleTitle: 'Algorithm Design & Analysis',
    url: 'm1-algorithm-design.html#demo-best-worst',
    summary: 'Comparison counts for four algorithms in both cases at any n, with the input that causes each',
    keywords: ['best case', 'worst case', 'midterm practice', 'comparison count', 'interactive', 'gap']
  }
  ,{
    id: 'demo-cost-crossover',
    kind: 'demo',
    number: '1.4.7',
    title: 'Cost crossover finder',
    module: 'M1',
    moduleTitle: 'Algorithm Design & Analysis',
    url: 'm1-algorithm-design.html#demo-cost-crossover',
    summary: 'Change the coefficients of a linear and a quadratic cost and watch where the cheaper one changes',
    keywords: ['crossover', 'comparing algorithms', 'cost function', 'interactive', 'linear', 'quadratic']
  }
  ,{
    id: 'demo-store-distances',
    kind: 'demo',
    number: '1.5.1',
    title: 'Nearest stores by selection sort',
    module: 'M1',
    moduleTitle: 'Algorithm Design & Analysis',
    url: 'm1-algorithm-design.html#demo-store-distances',
    summary: 'Lab 03 end to end: Haversine distances to seven Florida stores, then selection sort, one pass per step',
    keywords: ['haversine', 'stores', 'lab03', 'geospatial', 'interactive', 'distance', 'florida']
  }
  ,{
    id: 'demo-protein-generator',
    kind: 'demo',
    number: '1.5.2',
    title: 'Random protein generator',
    module: 'M1',
    moduleTitle: 'Algorithm Design & Analysis',
    url: 'm1-algorithm-design.html#demo-protein-generator',
    summary: 'Lab 04 Problem 1 with the rejection loop made visible: draws made, stop codons thrown away',
    keywords: ['protein', 'codon', 'rejection sampling', 'lab04', 'generator', 'interactive', 'dna']
  }
  ,{
    id: 'demo-amino-count',
    kind: 'demo',
    number: '1.5.3',
    title: 'Amino-acid counter',
    module: 'M1',
    moduleTitle: 'Algorithm Design & Analysis',
    url: 'm1-algorithm-design.html#demo-amino-count',
    summary: 'Lab 04 Problem 2: count an amino acid in the codon-aligned frame and compare it with what chance predicts',
    keywords: ['amino acid', 'counting', 'lab04', 'codon aligned', 'cysteine', 'interactive', 'frequency']
  }

  /* =======================================================================
     M2 TOPIC ENTRIES — appended by the M2 author
     ======================================================================= */

  ,{
    id:          'topic-2-1-1',
    kind:        'topic',
    number:      '2.1.1',
    title:       'What is probability?',
    module:      'M2',
    moduleTitle: 'Probability & Random Processes',
    url:         'm2-probability.html#topic-2-1-1',
    summary:     'A number between 0 and 1 measuring how likely an event is, with 0 impossible and 1 certain',
    keywords:    ['chance', 'axioms', 'likelihood', 'event', 'omega', 'sample space']
  }
  ,{
    id:          'topic-2-1-2',
    kind:        'topic',
    number:      '2.1.2',
    title:       'Sample spaces, events, random variables',
    module:      'M2',
    moduleTitle: 'Probability & Random Processes',
    url:         'm2-probability.html#topic-2-1-2',
    summary:     'X is the random variable, omega the set of all outcomes, and an event is any subset of it',
    keywords:    ['random variable', 'omega', 'subset', 'two dice', 'sum', 'lab05', 'midterm']
  }
  ,{
    id:          'topic-2-1-3',
    kind:        'topic',
    number:      '2.1.3',
    title:       'The Pascal–Fermat problem of points',
    module:      'M2',
    moduleTitle: 'Probability & Random Processes',
    url:         'm2-probability.html#topic-2-1-3',
    summary:     'Divide an interrupted game\'s stake by each player\'s chance of winning from here, not by points already scored',
    keywords:    ['pascal', 'fermat', 'problem of points', 'coin', 'francs', 'history', 'enumeration']
  }
  ,{
    id:          'topic-2-1-4',
    kind:        'topic',
    number:      '2.1.4',
    title:       'Unions and intersections',
    module:      'M2',
    moduleTitle: 'Probability & Random Processes',
    url:         'm2-probability.html#topic-2-1-4',
    summary:     'Add the two probabilities and subtract the overlap, because outcomes in both events get counted twice',
    keywords:    ['union', 'intersection', 'addition rule', 'or', 'and', 'inclusion exclusion', 'midterm']
  }
  ,{
    id:          'topic-2-1-5',
    kind:        'topic',
    number:      '2.1.5',
    title:       'Mutually exclusive sets',
    module:      'M2',
    moduleTitle: 'Probability & Random Processes',
    url:         'm2-probability.html#topic-2-1-5',
    summary:     'Events that share no outcomes, so their intersection is zero and probabilities simply add',
    keywords:    ['disjoint', 'exclusive', 'empty intersection', 'addition rule', 'hurricanes']
  }
  ,{
    id:          'topic-2-1-6',
    kind:        'topic',
    number:      '2.1.6',
    title:       'Complements',
    module:      'M2',
    moduleTitle: 'Probability & Random Processes',
    url:         'm2-probability.html#topic-2-1-6',
    summary:     'The probability an event does not happen is one minus the probability that it does',
    keywords:    ['complement', 'not', 'at least one', '1 minus', 'midterm']
  }
  ,{
    id:          'topic-2-1-7',
    kind:        'topic',
    number:      '2.1.7',
    title:       'Conditional probability',
    module:      'M2',
    moduleTitle: 'Probability & Random Processes',
    url:         'm2-probability.html#topic-2-1-7',
    summary:     'Shrink the sample space to the outcomes where A happened, then ask what fraction of those also have B',
    keywords:    ['given', 'conditional', 'p(b|a)', 'multiplication rule', 'attendance', 'lab05', 'midterm']
  }
  ,{
    id:          'topic-2-1-8',
    kind:        'topic',
    number:      '2.1.8',
    title:       'Independence versus dependence',
    module:      'M2',
    moduleTitle: 'Probability & Random Processes',
    url:         'm2-probability.html#topic-2-1-8',
    summary:     'Knowing one event tells you nothing about the other, so the probabilities simply multiply',
    keywords:    ['independent', 'dependent', 'multiplication', 'product rule', 'lab05']
  }
  ,{
    id:          'topic-2-1-9',
    kind:        'topic',
    number:      '2.1.9',
    title:       'Venn-diagram reasoning',
    module:      'M2',
    moduleTitle: 'Probability & Random Processes',
    url:         'm2-probability.html#topic-2-1-9',
    summary:     'One diagram carries the whole vocabulary: outcome, event, intersection, union, exclusivity and conditioning',
    keywords:    ['venn', 'diagram', 'overlap', 'lens', 'event relationships', 'interactive']
  }
  ,{
    id:          'topic-2-1-10',
    kind:        'topic',
    number:      '2.1.10',
    title:       'Bayes-style disease-testing problems',
    module:      'M2',
    moduleTitle: 'Probability & Random Processes',
    url:         'm2-probability.html#topic-2-1-10',
    summary:     'A 95 percent accurate test for a 1 percent disease is right only 16 percent of the time it fires',
    keywords:    ['bayes', 'base rate', 'false positive', 'sensitivity', 'specificity', 'disease', 'lab05', 'midterm', 'new']
  }
  ,{
    id:          'topic-2-2-1',
    kind:        'topic',
    number:      '2.2.1',
    title:       'Role of random numbers in simulation',
    module:      'M2',
    moduleTitle: 'Probability & Random Processes',
    url:         'm2-probability.html#topic-2-2-1',
    summary:     'Cryptography, scientific simulation and procedural generation all rest on a stream of unpredictable draws',
    keywords:    ['simulation', 'cryptography', 'gaming', 'procedural', 'entropy', 'lab05']
  }
  ,{
    id:          'topic-2-2-2',
    kind:        'topic',
    number:      '2.2.2',
    title:       'True versus pseudo-random (TRNG versus PRNG)',
    module:      'M2',
    moduleTitle: 'Probability & Random Processes',
    url:         'm2-probability.html#topic-2-2-2',
    summary:     'A TRNG harvests physical entropy and cannot repeat; a PRNG runs an algorithm and repeats perfectly from its seed',
    keywords:    ['trng', 'prng', 'entropy', 'rdrand', 'lava lamp', 'netscape', 'deterministic']
  }
  ,{
    id:          'topic-2-2-3',
    kind:        'topic',
    number:      '2.2.3',
    title:       'Linear Congruential Generator (LCG)',
    module:      'M2',
    moduleTitle: 'Probability & Random Processes',
    url:         'm2-probability.html#topic-2-2-3',
    summary:     'Multiply the state, add an increment, take the remainder, and divide by the modulus to get a number below one',
    keywords:    ['lcg', 'multiplier', 'modulus', 'randu', 'modulo', 'congruential']
  }
  ,{
    id:          'topic-2-2-4',
    kind:        'topic',
    number:      '2.2.4',
    title:       'Mersenne Twister and NumPy generators',
    module:      'M2',
    moduleTitle: 'Probability & Random Processes',
    url:         'm2-probability.html#topic-2-2-4',
    summary:     'randint, rand and randn, driven by a generator with a period of two to the 19937 minus one',
    keywords:    ['mersenne', 'mt19937', 'numpy', 'randint', 'rand', 'randn', 'period', 'lab05']
  }
  ,{
    id:          'topic-2-2-5',
    kind:        'topic',
    number:      '2.2.5',
    title:       'Seeding and reproducibility',
    module:      'M2',
    moduleTitle: 'Probability & Random Processes',
    url:         'm2-probability.html#topic-2-2-5',
    summary:     'Same seed, same stream: seed once at the top of a script and record the seed with the results',
    keywords:    ['seed', 'reproducible', 'np.random.seed', '56789', 'debugging', 'lab05']
  }
  ,{
    id:          'topic-2-2-6',
    kind:        'topic',
    number:      '2.2.6',
    title:       'Testing randomness quality (runs test, z-score)',
    module:      'M2',
    moduleTitle: 'Probability & Random Processes',
    url:         'm2-probability.html#topic-2-2-6',
    summary:     'Count streaks above and below the median and compare with what randomness would produce, as a z-score',
    keywords:    ['runs test', 'z score', 'chi square', 'goodness of fit', 'statistical test', 'quality']
  }
  ,{
    id:          'topic-2-2-7',
    kind:        'topic',
    number:      '2.2.7',
    title:       'Correlation plots of consecutive pairs',
    module:      'M2',
    moduleTitle: 'Probability & Random Processes',
    url:         'm2-probability.html#topic-2-2-7',
    summary:     'Plot each value against the next and a linear generator\'s points collapse onto a few parallel lines',
    keywords:    ['lag-1', 'scatter', 'lattice', 'marsaglia', 'correlation', 'pairs', 'randu']
  }
  ,{
    id:          'topic-2-3-1',
    kind:        'topic',
    number:      '2.3.1',
    title:       'Probability Distribution Function (PDF)',
    module:      'M2',
    moduleTitle: 'Probability & Random Processes',
    url:         'm2-probability.html#topic-2-3-1',
    summary:     'The underlying shape that appears when a random variable is measured enough times',
    keywords:    ['pdf', 'density', 'distribution', 'probability distribution', 'midterm']
  }
  ,{
    id:          'topic-2-3-2',
    kind:        'topic',
    number:      '2.3.2',
    title:       'Discrete PDF / PMF',
    module:      'M2',
    moduleTitle: 'Probability & Random Processes',
    url:         'm2-probability.html#topic-2-3-2',
    summary:     'A probability attached to each separate outcome, such as one sixth for every face of a fair die',
    keywords:    ['pmf', 'discrete', 'die', 'uniform', 'mass function', 'midterm']
  }
  ,{
    id:          'topic-2-3-3',
    kind:        'topic',
    number:      '2.3.3',
    title:       'Continuous PDF',
    module:      'M2',
    moduleTitle: 'Probability & Random Processes',
    url:         'm2-probability.html#topic-2-3-3',
    summary:     'Probability is area under a curve, so a density can exceed one without anything being wrong',
    keywords:    ['continuous', 'density', 'normal', 'gaussian', 'heights', 'area', 'lab05']
  }
  ,{
    id:          'topic-2-3-4',
    kind:        'topic',
    number:      '2.3.4',
    title:       'Normalization',
    module:      'M2',
    moduleTitle: 'Probability & Random Processes',
    url:         'm2-probability.html#topic-2-3-4',
    summary:     'The probabilities of everything that can happen add, or integrate, to exactly one',
    keywords:    ['normalization', 'sums to one', 'valid pmf', 'p(omega)', 'midterm']
  }
  ,{
    id:          'topic-2-3-5',
    kind:        'topic',
    number:      '2.3.5',
    title:       'Cumulative Distribution Function (CDF)',
    module:      'M2',
    moduleTitle: 'Probability & Random Processes',
    url:         'm2-probability.html#topic-2-3-5',
    summary:     'The probability of coming out at or below x, a staircase for discrete variables and an S-curve for continuous ones',
    keywords:    ['cdf', 'cumulative', 'staircase', 'f(x)', 'inverse', 'midterm']
  }
  ,{
    id:          'topic-2-3-6',
    kind:        'topic',
    number:      '2.3.6',
    title:       'Mean / expected value',
    module:      'M2',
    moduleTitle: 'Probability & Random Processes',
    url:         'm2-probability.html#topic-2-3-6',
    summary:     'The probability-weighted average of the outcomes; a fair die averages 3.5, which it can never roll',
    keywords:    ['mean', 'expected value', 'e[x]', 'mu', 'average', 'midterm', 'lab05']
  }
  ,{
    id:          'topic-2-3-7',
    kind:        'topic',
    number:      '2.3.7',
    title:       'Expected-value properties',
    module:      'M2',
    moduleTitle: 'Probability & Random Processes',
    url:         'm2-probability.html#topic-2-3-7',
    summary:     'Expectations are linear and always add, even for dependent variables; products need independence',
    keywords:    ['linearity', 'constant rule', 'addition', 'e(ax+by)', 'properties']
  }
  ,{
    id:          'topic-2-3-8',
    kind:        'topic',
    number:      '2.3.8',
    title:       'Variance',
    module:      'M2',
    moduleTitle: 'Probability & Random Processes',
    url:         'm2-probability.html#topic-2-3-8',
    summary:     'The expected squared distance from the mean, most easily computed as E of X squared minus mu squared',
    keywords:    ['variance', 'sigma squared', 'standard deviation', 'spread', 'second moment', 'midterm', 'lab05']
  }
  ,{
    id:          'topic-2-3-9',
    kind:        'topic',
    number:      '2.3.9',
    title:       'Sampling a biased die (discrete)',
    module:      'M2',
    moduleTitle: 'Probability & Random Processes',
    url:         'm2-probability.html#topic-2-3-9',
    summary:     'Draw one uniform number and see which slice of the unit interval it lands in; the slice widths are the probabilities',
    keywords:    ['biased die', 'inverse cdf', 'sampling', 'searchsorted', 'lab05', 'biased_die']
  }
  ,{
    id:          'topic-2-3-10',
    kind:        'topic',
    number:      '2.3.10',
    title:       'Exponential distribution (continuous)',
    module:      'M2',
    moduleTitle: 'Probability & Random Processes',
    url:         'm2-probability.html#topic-2-3-10',
    summary:     'Waiting time at a constant rate, sampled by taking minus the log of a uniform draw divided by lambda',
    keywords:    ['exponential', 'lambda', 'inverse transform', 'waiting time', 'memoryless', 'lab05']
  }
  ,{
    id:          'topic-2-3-11',
    kind:        'topic',
    number:      '2.3.11',
    title:       'Named distributions: Binomial, Poisson, Gamma, Beta, Chi-square, Log-normal',
    module:      'M2',
    moduleTitle: 'Probability & Random Processes',
    url:         'm2-probability.html#topic-2-3-11',
    summary:     'Eight families, what each one models, and the mean and variance you would quote in an exam',
    keywords:    ['binomial', 'poisson', 'gamma', 'beta', 'chi square', 'log-normal', 'families', 'gallery']
  }
  ,{
    id:          'topic-2-4-1',
    kind:        'topic',
    number:      '2.4.1',
    title:       'Multiple dice rolls: mean and variance',
    module:      'M2',
    moduleTitle: 'Probability & Random Processes',
    url:         'm2-probability.html#topic-2-4-1',
    summary:     'Averaging n dice leaves the mean at 3.5 and divides the variance by n',
    keywords:    ['dice', 'average', 'mean', 'variance', 'sigma squared over n', '10000 simulations']
  }
  ,{
    id:          'topic-2-4-2',
    kind:        'topic',
    number:      '2.4.2',
    title:       'Histograms of sample means',
    module:      'M2',
    moduleTitle: 'Probability & Random Processes',
    url:         'm2-probability.html#topic-2-4-2',
    summary:     'Plot the averages at n equals 1, 2, 5, 10, 20 and 50 and the shape turns into a bell',
    keywords:    ['histogram', 'sample means', 'n=50', 'bell curve', 'clt demo', 'interactive']
  }
  ,{
    id:          'topic-2-4-3',
    kind:        'topic',
    number:      '2.4.3',
    title:       'The Central Limit Theorem',
    module:      'M2',
    moduleTitle: 'Probability & Random Processes',
    url:         'm2-probability.html#topic-2-4-3',
    summary:     'The average of n independent draws is normal with the parent mean and the parent variance divided by n',
    keywords:    ['clt', 'central limit theorem', 'normal', 'limit', 'finite variance']
  }
  ,{
    id:          'topic-2-4-4',
    kind:        'topic',
    number:      '2.4.4',
    title:       'Convergence to normality regardless of source',
    module:      'M2',
    moduleTitle: 'Probability & Random Processes',
    url:         'm2-probability.html#topic-2-4-4',
    summary:     'The parent may be a coin, a die or a skewed exponential; averaged enough times, all of them go normal',
    keywords:    ['universality', 'parent distribution', 'skew', 'coin', 'exponential', 'convergence']
  }
  ,{
    id:          'topic-2-5-1',
    kind:        'topic',
    number:      '2.5.1',
    title:       'The Monte Carlo method',
    module:      'M2',
    moduleTitle: 'Probability & Random Processes',
    url:         'm2-probability.html#topic-2-5-1',
    summary:     'Replace a hard deterministic problem with an easy random one and repeat it until the answer stops moving',
    keywords:    ['monte carlo', 'ulam', 'von neumann', 'monaco', 'sampling', 'los alamos', 'midterm', 'lab06']
  }
  ,{
    id:          'topic-2-5-2',
    kind:        'topic',
    number:      '2.5.2',
    title:       'Average value and the integral',
    module:      'M2',
    moduleTitle: 'Probability & Random Processes',
    url:         'm2-probability.html#topic-2-5-2',
    summary:     'The integral equals the average height of the function times the width of the interval',
    keywords:    ['average value', 'f bar', 'integral', 'area', 'mean value', 'midterm']
  }
  ,{
    id:          'topic-2-5-3',
    kind:        'topic',
    number:      '2.5.3',
    title:       'Monte Carlo π estimation',
    module:      'M2',
    moduleTitle: 'Probability & Random Processes',
    url:         'm2-probability.html#topic-2-5-3',
    summary:     'Throw darts at a square, count the ones inside the circle, and multiply the fraction by four',
    keywords:    ['pi', 'darts', 'area ratio', 'circle', 'estimator', 'interactive']
  }
  ,{
    id:          'topic-2-5-4',
    kind:        'topic',
    number:      '2.5.4',
    title:       'Monte Carlo integration (1D)',
    module:      'M2',
    moduleTitle: 'Probability & Random Processes',
    url:         'm2-probability.html#topic-2-5-4',
    summary:     'Sample n points in the domain, average f at them, and multiply by the width of the interval',
    keywords:    ['integration', '1d', 'mapping', 'a+(b-a)u', 'estimate', 'midterm']
  }
  ,{
    id:          'topic-2-5-5',
    kind:        'topic',
    number:      '2.5.5',
    title:       '2D and higher-dimensional integrals',
    module:      'M2',
    moduleTitle: 'Probability & Random Processes',
    url:         'm2-probability.html#topic-2-5-5',
    summary:     'Sample the domain, average the integrand, multiply by the volume; the recipe never changes with dimension',
    keywords:    ['2d', 'darts', 'indicator', 'volume', 'hypersphere', 'integration by darts']
  }
  ,{
    id:          'topic-2-5-6',
    kind:        'topic',
    number:      '2.5.6',
    title:       'Error analysis and convergence rate',
    module:      'M2',
    moduleTitle: 'Probability & Random Processes',
    url:         'm2-probability.html#topic-2-5-6',
    summary:     'Monte Carlo error is the interval width times the spread of f, divided by the square root of n',
    keywords:    ['error', 'convergence', '1/sqrt(n)', 'sigma f', 'rate', 'clt']
  }
  ,{
    id:          'topic-2-5-7',
    kind:        'topic',
    number:      '2.5.7',
    title:       'Equispaced versus random sampling',
    module:      'M2',
    moduleTitle: 'Probability & Random Processes',
    url:         'm2-probability.html#topic-2-5-7',
    summary:     'In one dimension the grid rule wins easily; the crossover is dimension, not smoothness',
    keywords:    ['equispaced', 'quadrature', 'midpoint', 'comparison', 'slope', 'log-log']
  }
  ,{
    id:          'topic-2-5-8',
    kind:        'topic',
    number:      '2.5.8',
    title:       'Curse of dimensionality',
    module:      'M2',
    moduleTitle: 'Probability & Random Processes',
    url:         'm2-probability.html#topic-2-5-8',
    summary:     'A grid costs points per axis raised to the power d; Monte Carlo costs whatever you decide to spend',
    keywords:    ['curse', 'dimensionality', 'high dimensional', 'grid', 'exponential cost', 'unit ball']
  }
  ,{
    id:          'topic-2-5-9',
    kind:        'topic',
    number:      '2.5.9',
    title:       'Confidence intervals on estimates',
    module:      'M2',
    moduleTitle: 'Probability & Random Processes',
    url:         'm2-probability.html#topic-2-5-9',
    summary:     'Turn the standard error into an interval with a normal quantile, and report it with the estimate',
    keywords:    ['confidence interval', 'standard error', 'z', '95 percent', 'error bar']
  }
  ,{
    id:          'topic-2-5-10',
    kind:        'topic',
    number:      '2.5.10',
    title:       'Monte Carlo optimization / random search',
    module:      'M2',
    moduleTitle: 'Probability & Random Processes',
    url:         'm2-probability.html#topic-2-5-10',
    summary:     'Scatter points over the domain and keep the lowest; it finds global minima that gradient methods slide past',
    keywords:    ['optimization', 'random search', 'find_min_mc', 'global minimum', 'lab06', 'final', 'new']
  }
  ,{
    id:          'topic-2-5-11',
    kind:        'topic',
    number:      '2.5.11',
    title:       'Advanced sampling strategies',
    module:      'M2',
    moduleTitle: 'Probability & Random Processes',
    url:         'm2-probability.html#topic-2-5-11',
    summary:     'Zoom in around the best point found so far, or reweight the samples, to cut the error without more of them',
    keywords:    ['zoom', 'refinement', 'find_min_mc_wzoom', 'importance sampling', 'stratified', 'nzoom', 'lab06', 'new']
  }
  ,{
    id:          'topic-2-6-1',
    kind:        'topic',
    number:      '2.6.1',
    title:       'Brownian motion',
    module:      'M2',
    moduleTitle: 'Probability & Random Processes',
    url:         'm2-probability.html#topic-2-6-1',
    summary:     'Pollen grains jitter in still water because molecules bombard them, and the distance travelled grows as the square root of time',
    keywords:    ['brown', 'einstein', '1827', '1905', 'wiener process', 'pollen']
  }
  ,{
    id:          'topic-2-6-2',
    kind:        'topic',
    number:      '2.6.2',
    title:       '2D random walks',
    module:      'M2',
    moduleTitle: 'Probability & Random Processes',
    url:         'm2-probability.html#topic-2-6-2',
    summary:     'Add an independent normal displacement to each coordinate at every step and let it run',
    keywords:    ['random walk', '2d', 'randn', 'trajectory', 'increments', 'simulation']
  }
  ,{
    id:          'topic-2-6-3',
    kind:        'topic',
    number:      '2.6.3',
    title:       'Diffusion',
    module:      'M2',
    moduleTitle: 'Probability & Random Processes',
    url:         'm2-probability.html#topic-2-6-3',
    summary:     'Ink spreads through still water with no stirring, and its diameter grows as the square root of elapsed time',
    keywords:    ['diffusion', 'ink', 'spreading', 'sqrt(t)', 'mixing', 'lab06']
  }
  ,{
    id:          'topic-2-6-4',
    kind:        'topic',
    number:      '2.6.4',
    title:       'Geometric Brownian motion / stock prices',
    module:      'M2',
    moduleTitle: 'Probability & Random Processes',
    url:         'm2-probability.html#topic-2-6-4',
    summary:     'Make the random kick proportional to the price and you get the model underneath Black-Scholes',
    keywords:    ['gbm', 'stock price', 'black-scholes', 'drift', 'volatility', 'log-normal', 'euler-maruyama']
  }
  ,{
    id:          'topic-2-6-5',
    kind:        'topic',
    number:      '2.6.5',
    title:       'Pollutant dispersion simulation',
    module:      'M2',
    moduleTitle: 'Probability & Random Processes',
    url:         'm2-probability.html#topic-2-6-5',
    summary:     'A wind field carries the plume while a random kick widens it, integrated with fourth-order Runge-Kutta',
    keywords:    ['dispersion', 'pollutant', 'oil spill', 'rk4', 'advection', 'plume', 'lab06', 'new']
  }
  ,{
    id:          'topic-2-6-6',
    kind:        'topic',
    number:      '2.6.6',
    title:       'The secretary problem / optimal stopping',
    module:      'M2',
    moduleTitle: 'Probability & Random Processes',
    url:         'm2-probability.html#topic-2-6-6',
    summary:     'Interview in random order, decide immediately, never look back, and try to land the single best applicant',
    keywords:    ['secretary', 'optimal stopping', 'hiring', 'irrevocable', 'sultan\'s dowry']
  }
  ,{
    id:          'topic-2-6-7',
    kind:        'topic',
    number:      '2.6.7',
    title:       'Look-then-leap strategy and the 37% rule',
    module:      'M2',
    moduleTitle: 'Probability & Random Processes',
    url:         'm2-probability.html#topic-2-6-7',
    summary:     'Reject the first 37 percent, then hire the first applicant who beats them; it works 37 percent of the time',
    keywords:    ['37 percent', '1/e', 'look then leap', 'threshold', 'benchmark', 'explore exploit']
  }
  ,{
    id:          'topic-2-6-8',
    kind:        'topic',
    number:      '2.6.8',
    title:       'Simulation protocol and averaging',
    module:      'M2',
    moduleTitle: 'Probability & Random Processes',
    url:         'm2-probability.html#topic-2-6-8',
    summary:     'One run is an anecdote; average a thousand and the jagged trace becomes a curve you can read an optimum off',
    keywords:    ['protocol', 'averaging', '1000 runs', 'randperm', 'noise', 'top 20 percent', 'lab06']
  }
  ,{
    id:          'demo-event-venn',
    kind:        'demo',
    number:      '2.1.9',
    title:       'Event relationships explorer',
    module:      'M2',
    moduleTitle: 'Probability & Random Processes',
    url:         'm2-probability.html#demo-event-venn',
    summary:     'Set p(A), p(B) and the overlap and read the union, both conditionals and the independence verdict',
    keywords:    ['venn', 'union', 'intersection', 'conditional', 'independence', 'interactive', 'calculator']
  }
  ,{
    id:          'demo-bayes-testing',
    kind:        'demo',
    number:      '2.1.10',
    title:       'Disease testing with Bayes\' theorem',
    module:      'M2',
    moduleTitle: 'Probability & Random Processes',
    url:         'm2-probability.html#demo-bayes-testing',
    summary:     'Step through the natural-frequency argument and watch false positives swamp the true ones',
    keywords:    ['bayes', 'base rate', 'false positive', 'contingency', 'natural frequency', 'interactive']
  }
  ,{
    id:          'demo-lcg-lab',
    kind:        'demo',
    number:      '2.2.7',
    title:       'Linear congruential generator laboratory',
    module:      'M2',
    moduleTitle: 'Probability & Random Processes',
    url:         'm2-probability.html#demo-lcg-lab',
    summary:     'Build a generator from a, c and m, then look for the lattice a histogram cannot show',
    keywords:    ['lcg', 'randu', 'runs test', 'lag-1', 'scatter', 'rng lab', 'interactive']
  }
  ,{
    id:          'demo-discrete-rv',
    kind:        'demo',
    number:      '2.3.5',
    title:       'Discrete random variable workbench',
    module:      'M2',
    moduleTitle: 'Probability & Random Processes',
    url:         'm2-probability.html#demo-discrete-rv',
    summary:     'Step through a PMF and watch the CDF, the mean and the variance build up term by term',
    keywords:    ['pmf', 'cdf', 'mean', 'variance', 'biased die', 'midterm problem 2', 'interactive']
  }
  ,{
    id:          'demo-distribution-gallery',
    kind:        'demo',
    number:      '2.3.11',
    title:       'Named distribution gallery',
    module:      'M2',
    moduleTitle: 'Probability & Random Processes',
    url:         'm2-probability.html#demo-distribution-gallery',
    summary:     'Eight distribution families with their densities, cumulative curves, means and variances',
    keywords:    ['binomial', 'poisson', 'gamma', 'beta', 'chi square', 'log-normal', 'gallery', 'interactive']
  }
  ,{
    id:          'demo-clt-dice',
    kind:        'demo',
    number:      '2.4.2',
    title:       'Central Limit Theorem laboratory',
    module:      'M2',
    moduleTitle: 'Probability & Random Processes',
    url:         'm2-probability.html#demo-clt-dice',
    summary:     'Step from n equals 1 to n equals 50 and watch a flat parent distribution turn into a bell',
    keywords:    ['clt', 'histogram', 'sample means', 'parent distribution', 'interactive', 'dice']
  }
  ,{
    id:          'demo-mc-pi',
    kind:        'demo',
    number:      '2.5.3',
    title:       'Estimating pi by throwing darts',
    module:      'M2',
    moduleTitle: 'Probability & Random Processes',
    url:         'm2-probability.html#demo-mc-pi',
    summary:     'Ten batches of darts, a shrinking confidence interval, and every number in a table',
    keywords:    ['pi', 'darts', 'monte carlo', 'confidence interval', 'convergence', 'interactive']
  }
  ,{
    id:          'demo-mc-integration',
    kind:        'demo',
    number:      '2.5.4',
    title:       'Monte Carlo versus equispaced integration',
    module:      'M2',
    moduleTitle: 'Probability & Random Processes',
    url:         'm2-probability.html#demo-mc-integration',
    summary:     'Sweep ten sample sizes and read the two error laws straight off a log-log plot',
    keywords:    ['integration', 'equispaced', 'midpoint', 'error', 'convergence', 'log-log', 'interactive']
  }
  ,{
    id:          'demo-curse-dimension',
    kind:        'demo',
    number:      '2.5.8',
    title:       'The curse of dimensionality',
    module:      'M2',
    moduleTitle: 'Probability & Random Processes',
    url:         'm2-probability.html#demo-curse-dimension',
    summary:     'Estimate the unit ball\'s volume in 1 to 10 dimensions and compare grid cost with Monte Carlo cost',
    keywords:    ['curse', 'dimensionality', 'unit ball', 'grid', 'cost', 'interactive']
  }
  ,{
    id:          'demo-mc-optimization',
    kind:        'demo',
    number:      '2.5.10',
    title:       'Monte Carlo minimisation with zoom',
    module:      'M2',
    moduleTitle: 'Probability & Random Processes',
    url:         'm2-probability.html#demo-mc-optimization',
    summary:     'Lab 06\'s find_min_mc and find_min_mc_wzoom, one zoom stage per playback step',
    keywords:    ['random search', 'zoom', 'find_min_mc', 'lab06', 'global minimum', 'interactive', 'new']
  }
  ,{
    id:          'demo-random-walk',
    kind:        'demo',
    number:      '2.6.2',
    title:       'Random walks, diffusion and stock prices',
    module:      'M2',
    moduleTitle: 'Probability & Random Processes',
    url:         'm2-probability.html#demo-random-walk',
    summary:     'One engine, three readings: a 2-D walk, a diffusing cloud, and a price path under GBM',
    keywords:    ['random walk', 'brownian', 'diffusion', 'gbm', 'stock', 'interactive', 'sqrt t']
  }
  ,{
    id:          'demo-dispersion',
    kind:        'demo',
    number:      '2.6.5',
    title:       'Pollutant dispersion simulator',
    module:      'M2',
    moduleTitle: 'Probability & Random Processes',
    url:         'm2-probability.html#demo-dispersion',
    summary:     'RK4 advection through a wind field plus a Brownian kick, hour by hour',
    keywords:    ['dispersion', 'plume', 'rk4', 'advection', 'diffusion', 'lab06', 'interactive', 'new']
  }
  ,{
    id:          'demo-secretary',
    kind:        'demo',
    number:      '2.6.7',
    title:       'Secretary problem simulator',
    module:      'M2',
    moduleTitle: 'Probability & Random Processes',
    url:         'm2-probability.html#demo-secretary',
    summary:     'Trace one hiring run applicant by applicant, or sweep the look fraction over many runs',
    keywords:    ['secretary', '37 percent', 'optimal stopping', 'look then leap', 'sweep', 'interactive']
  }


  /* =======================================================================
     M3 TOPIC ENTRIES — appended by the M3 author

     Copy this shape exactly:

     ,{
       id: 'topic-3-5-5',
       kind: 'topic',
       number: '3.5.5',
       title: "Dijkstra's algorithm",
       module: 'M3',
       moduleTitle: 'Graphs',
       url: 'm3-graphs.html#topic-3-5-5',
       summary: 'Fix the nearest unfixed node, relax its neighbours, repeat until every node is fixed',
       keywords: ['dijkstra', 'shortest path', 'relaxation', 'greedy', 'midterm']
     }
     ======================================================================= */

  ,{
    id:          'topic-3-1-1',
    kind:        'topic',
    number:      '3.1.1',
    title:       "Euler's Königsberg bridge problem",
    module:      'M3',
    moduleTitle: 'Graphs',
    url:         'm3-graphs.html#topic-3-1-1',
    summary:     "Euler reduced seven bridges to four points and seven links in 1735, and answered the puzzle by counting degrees",
    keywords:    ['konigsberg', 'koenigsberg', 'euler', 'bridges', '1735', 'multigraph', 'history']
  }
  ,{
    id:          'topic-3-1-2',
    kind:        'topic',
    number:      '3.1.2',
    title:       "What is a graph?",
    module:      'M3',
    moduleTitle: 'Graphs',
    url:         'm3-graphs.html#topic-3-1-2',
    summary:     "A set of vertices, some joined in pairs by edges — written G equals V comma E",
    keywords:    ['graph', 'vertex', 'vertices', 'node', 'edge', 'link', 'definition', 'simple example']
  }
  ,{
    id:          'topic-3-1-3',
    kind:        'topic',
    number:      '3.1.3',
    title:       "How graphs are used (applications)",
    module:      'M3',
    moduleTitle: 'Graphs',
    url:         'm3-graphs.html#topic-3-1-3',
    summary:     "What a node and an edge stand for in state maps, PERT charts, web search, chemistry, GPS and supply chains",
    keywords:    ['applications', 'uses', 'pert', 'google', 'gps', 'supply chain', 'ecosystem', 'circuit']
  }
  ,{
    id:          'topic-3-1-4',
    kind:        'topic',
    number:      '3.1.4',
    title:       "Graph taxonomy (directed, weighted, simple)",
    module:      'M3',
    moduleTitle: 'Graphs',
    url:         'm3-graphs.html#topic-3-1-4',
    summary:     "Four questions about what an edge may be: loops, multiple edges, weights and direction",
    keywords:    ['taxonomy', 'directed', 'digraph', 'weighted', 'simple graph', 'loop', 'multigraph', 'classes']
  }
  ,{
    id:          'topic-3-1-5',
    kind:        'topic',
    number:      '3.1.5',
    title:       "Degree of a node",
    module:      'M3',
    moduleTitle: 'Graphs',
    url:         'm3-graphs.html#topic-3-1-5',
    summary:     "The number of edges that begin at a node, and how to read it off each of the four representations",
    keywords:    ['degree', 'valency', 'edges at a node', 'handshake', 'sum of degrees', 'lab07']
  }
  ,{
    id:          'topic-3-1-6',
    kind:        'topic',
    number:      '3.1.6',
    title:       "Eulerian paths",
    module:      'M3',
    moduleTitle: 'Graphs',
    url:         'm3-graphs.html#topic-3-1-6',
    summary:     "Count the odd-degree nodes: if there are 0 or 2 the figure can be drawn in one stroke, otherwise it cannot",
    keywords:    ['eulerian', 'euler path', 'one stroke', 'pen puzzle', 'odd degree', 'without lifting the pen', 'konigsberg']
  }
  ,{
    id:          'topic-3-2-1',
    kind:        'topic',
    number:      '3.2.1',
    title:       "Edge list",
    module:      'M3',
    moduleTitle: 'Graphs',
    url:         'm3-graphs.html#topic-3-2-1',
    summary:     "Write each of the M edges as its pair of vertices — simple, compact, and it silently loses isolated nodes",
    keywords:    ['edge list', 'representation', 'pairs', 'isolated node', 'sparse', 'lab07']
  }
  ,{
    id:          'topic-3-2-2',
    kind:        'topic',
    number:      '3.2.2',
    title:       "Storing an edge list",
    module:      'M3',
    moduleTitle: 'Graphs',
    url:         'm3-graphs.html#topic-3-2-2',
    summary:     "Store edges as numeric index pairs and keep the human labels in a second array",
    keywords:    ['storing', 'indices', 'labels', 'numpy', 'loadtxt', 'off by one', 'lab07']
  }
  ,{
    id:          'topic-3-2-3',
    kind:        'topic',
    number:      '3.2.3',
    title:       "Adjacency matrix",
    module:      'M3',
    moduleTitle: 'Graphs',
    url:         'm3-graphs.html#topic-3-2-3',
    summary:     "An N by N matrix with a 1 where two nodes are joined — symmetric, sparse, and it does keep isolated nodes",
    keywords:    ['adjacency matrix', 'matrix', 'symmetric', 'sparse', 'isomorphism', 'midterm', 'lab07']
  }
  ,{
    id:          'topic-3-2-4',
    kind:        'topic',
    number:      '3.2.4',
    title:       "Adjacency structure / list",
    module:      'M3',
    moduleTitle: 'Graphs',
    url:         'm3-graphs.html#topic-3-2-4',
    summary:     "A list of sublists: each node's sublist names its neighbours, so its length is the degree",
    keywords:    ['adjacency structure', 'adjacency list', 'sublist', 'neighbours', 'neighbors', 'lab07']
  }
  ,{
    id:          'topic-3-2-5',
    kind:        'topic',
    number:      '3.2.5',
    title:       "Incidence matrix",
    module:      'M3',
    moduleTitle: 'Graphs',
    url:         'm3-graphs.html#topic-3-2-5',
    summary:     "M rows of edges by N columns of nodes; every row has exactly two ones because every edge touches two nodes",
    keywords:    ['incidence matrix', 'edges as rows', 'transpose', 'representation']
  }
  ,{
    id:          'topic-3-2-6',
    kind:        'topic',
    number:      '3.2.6',
    title:       "The GRF file format",
    module:      'M3',
    moduleTitle: 'Graphs',
    url:         'm3-graphs.html#topic-3-2-6',
    summary:     "One line per node: index, x, y, then its neighbours — the adjacency structure plus drawing coordinates",
    keywords:    ['grf', 'file format', 'coordinates', 'grf_display', 'drawing', 'layout', 'lab07']
  }
  ,{
    id:          'topic-3-2-7',
    kind:        'topic',
    number:      '3.2.7',
    title:       "Space and time trade-offs between representations",
    module:      'M3',
    moduleTitle: 'Graphs',
    url:         'm3-graphs.html#topic-3-2-7',
    summary:     "Choose by density: sparse graphs want the adjacency structure, dense graphs and edge tests want the matrix",
    keywords:    ['trade off', 'space', 'time', 'complexity', 'sparse', 'dense', 'choose representation', 'comparison']
  }
  ,{
    id:          'topic-3-2-8',
    kind:        'topic',
    number:      '3.2.8',
    title:       "Graphs in Python (networkx, graph-tool)",
    module:      'M3',
    moduleTitle: 'Graphs',
    url:         'm3-graphs.html#topic-3-2-8',
    summary:     "Build a graph from an edge list with networkx, remembering to add the isolated nodes separately",
    keywords:    ['networkx', 'graph-tool', 'python', 'from_numpy_array', 'draw', 'matplotlib', 'lab07']
  }
  ,{
    id:          'topic-3-2-9',
    kind:        'topic',
    number:      '3.2.9',
    title:       "Maze as a graph",
    module:      'M3',
    moduleTitle: 'Graphs',
    url:         'm3-graphs.html#topic-3-2-9',
    summary:     "A node is a decision point and an edge is a corridor; the Lab 07 maze becomes a tree with one solution",
    keywords:    ['maze', 'lab07', 'decision point', 'right hand rule', 'corridor', 'tree', 'mazer']
  }
  ,{
    id:          'topic-3-3-1',
    kind:        'topic',
    number:      '3.3.1',
    title:       "Connectivity of a graph",
    module:      'M3',
    moduleTitle: 'Graphs',
    url:         'm3-graphs.html#topic-3-3-1',
    summary:     "Edges carry local information; connectivity is the global property every algorithm in this group computes",
    keywords:    ['connectivity', 'local', 'global', 'connected', 'reachable']
  }
  ,{
    id:          'topic-3-3-2',
    kind:        'topic',
    number:      '3.3.2',
    title:       "Connectivity taxonomy",
    module:      'M3',
    moduleTitle: 'Graphs',
    url:         'm3-graphs.html#topic-3-3-2',
    summary:     "Adjacent, connected, isolated, connected graph, disconnected, subgraph and connected component, defined",
    keywords:    ['taxonomy', 'isolated', 'subgraph', 'component', 'connected graph', 'vocabulary']
  }
  ,{
    id:          'topic-3-3-3',
    kind:        'topic',
    number:      '3.3.3',
    title:       "Adjacent nodes, simple graphs",
    module:      'M3',
    moduleTitle: 'Graphs',
    url:         'm3-graphs.html#topic-3-3-3',
    summary:     "Two nodes are adjacent when a single edge joins them; adjacency is not the same as connectivity",
    keywords:    ['adjacent', 'adjacency', 'simple graph', 'touching', 'direct edge']
  }
  ,{
    id:          'topic-3-3-4',
    kind:        'topic',
    number:      '3.3.4',
    title:       "Walks and paths",
    module:      'M3',
    moduleTitle: 'Graphs',
    url:         'm3-graphs.html#topic-3-3-4',
    summary:     "A walk lists adjacent nodes in visit order; a path is a walk that never reuses an edge",
    keywords:    ['walk', 'path', 'cycle', 'node list', 'edge list', 'repeat', 'definition']
  }
  ,{
    id:          'topic-3-3-5',
    kind:        'topic',
    number:      '3.3.5',
    title:       "Connected nodes and graphs",
    module:      'M3',
    moduleTitle: 'Graphs',
    url:         'm3-graphs.html#topic-3-3-5',
    summary:     "A path between two nodes makes them connected; a path between every pair makes the whole graph connected",
    keywords:    ['connected', 'isolated', 'subgraph', 'disconnected example', 'lab07']
  }
  ,{
    id:          'topic-3-3-6',
    kind:        'topic',
    number:      '3.3.6',
    title:       "The connection algorithm",
    module:      'M3',
    moduleTitle: 'Graphs',
    url:         'm3-graphs.html#topic-3-3-6',
    summary:     "Keep every node in used, new or untouched; move one out of new, explore its edges, repeat until new empties",
    keywords:    ['connection algorithm', 'used new untouched', 'bit vector', 'find_path', 'lab07', 'reachability']
  }
  ,{
    id:          'topic-3-3-7',
    kind:        'topic',
    number:      '3.3.7',
    title:       "Connected components",
    module:      'M3',
    moduleTitle: 'Graphs',
    url:         'm3-graphs.html#topic-3-3-7',
    summary:     "The failures of the connection algorithm are what count the components; wrap it in an outer loop",
    keywords:    ['components', 'connected components', 'count', 'c', 'lab07', 'forest']
  }
  ,{
    id:          'topic-3-3-8',
    kind:        'topic',
    number:      '3.3.8',
    title:       "Modified connection algorithm",
    module:      'M3',
    moduleTitle: 'Graphs',
    url:         'm3-graphs.html#topic-3-3-8',
    summary:     "Drop the early exit and the failure message, add a component stamp, and the search labels every component",
    keywords:    ['modified connection algorithm', 'component label', 'no early exit', 'inner loop']
  }
  ,{
    id:          'topic-3-3-9',
    kind:        'topic',
    number:      '3.3.9',
    title:       "Counting walks with the adjacency matrix",
    module:      'M3',
    moduleTitle: 'Graphs',
    url:         'm3-graphs.html#topic-3-3-9',
    summary:     "Entry i j of A to the power k counts the walks of length k from node i to node j",
    keywords:    ['counting walks', 'matrix power', 'a squared', 'linear algebra', 'connectivity test', 'bipartite']
  }
  ,{
    id:          'topic-3-3-10',
    kind:        'topic',
    number:      '3.3.10',
    title:       "Counting paths",
    module:      'M3',
    moduleTitle: 'Graphs',
    url:         'm3-graphs.html#topic-3-3-10',
    summary:     "No matrix power counts paths, but no path uses more than N minus 1 edges, so the search always terminates",
    keywords:    ['counting paths', 'no repeats', 'termination', 'n minus 1', 'enumerate']
  }
  ,{
    id:          'topic-3-4-1',
    kind:        'topic',
    number:      '3.4.1',
    title:       "Depth-First Search: concept",
    module:      'M3',
    moduleTitle: 'Graphs',
    url:         'm3-graphs.html#topic-3-4-1',
    summary:     "Follow one branch to its end, remembering the rest on a stack, and back up when you hit a dead end",
    keywords:    ['dfs', 'depth first', 'stack', 'lifo', 'museum', 'maze', 'traversal', 'spanning tree']
  }
  ,{
    id:          'topic-3-4-2',
    kind:        'topic',
    number:      '3.4.2',
    title:       "DFS: the algorithm in words",
    module:      'M3',
    moduleTitle: 'Graphs',
    url:         'm3-graphs.html#topic-3-4-2',
    summary:     "Pick a neighbour, push the rest, remember what you have visited, and pop when nothing new is left",
    keywords:    ['dfs in words', 'visited', 'push', 'pop', 'backtrack', 'restart']
  }
  ,{
    id:          'topic-3-4-3',
    kind:        'topic',
    number:      '3.4.3',
    title:       "DFS: pseudocode and output",
    module:      'M3',
    moduleTitle: 'Graphs',
    url:         'm3-graphs.html#topic-3-4-3',
    summary:     "The three-block pseudocode and the full eighteen-step stack trace on the museum graph",
    keywords:    ['dfs pseudocode', 'stack trace', 'museum', 'initialize', 'output', 'rooms']
  }
  ,{
    id:          'topic-3-4-4',
    kind:        'topic',
    number:      '3.4.4',
    title:       "DFS: generating all paths between nodes",
    module:      'M3',
    moduleTitle: 'Graphs',
    url:         'm3-graphs.html#topic-3-4-4',
    summary:     "Keep a list of partial paths and extend each by one node — decrease and conquer applied to path generation",
    keywords:    ['generate paths', 'partial path', 'frontier', 'decrease and conquer', 'all paths']
  }
  ,{
    id:          'topic-3-4-5',
    kind:        'topic',
    number:      '3.4.5',
    title:       "Breadth-First Search",
    module:      'M3',
    moduleTitle: 'Graphs',
    url:         'm3-graphs.html#topic-3-4-5',
    summary:     "Replace the stack with a queue and the traversal visits every node one edge away, then two, then three",
    keywords:    ['bfs', 'breadth first', 'queue', 'fifo', 'shortest path unweighted', 'levels', 'ripples']
  }
  ,{
    id:          'topic-3-4-6',
    kind:        'topic',
    number:      '3.4.6',
    title:       "Stack (LIFO) vs. queue (FIFO) mechanics",
    module:      'M3',
    moduleTitle: 'Graphs',
    url:         'm3-graphs.html#topic-3-4-6',
    summary:     "One line separates the two traversals: which end of the container you take the next node from",
    keywords:    ['stack', 'queue', 'lifo', 'fifo', 'deque', 'popleft', 'push', 'pop']
  }
  ,{
    id:          'topic-3-4-7',
    kind:        'topic',
    number:      '3.4.7',
    title:       "DFS vs. BFS trade-offs",
    module:      'M3',
    moduleTitle: 'Graphs',
    url:         'm3-graphs.html#topic-3-4-7',
    summary:     "Both cost O of N plus M; BFS finds the fewest-edge route, DFS uses less memory on deep narrow graphs",
    keywords:    ['dfs vs bfs', 'trade off', 'comparison', 'memory', 'degrees of separation', 'which to use']
  }
  ,{
    id:          'topic-3-5-1',
    kind:        'topic',
    number:      '3.5.1',
    title:       "Measuring edges / edge weights",
    module:      'M3',
    moduleTitle: 'Graphs',
    url:         'm3-graphs.html#topic-3-5-1',
    summary:     "A non-negative number on each edge turns three new questions into solvable problems",
    keywords:    ['edge weight', 'weighted graph', 'distance', 'cost', 'travel time', 'lab08', 'midterm']
  }
  ,{
    id:          'topic-3-5-2',
    kind:        'topic',
    number:      '3.5.2',
    title:       "Edge-length matrix",
    module:      'M3',
    moduleTitle: 'Graphs',
    url:         'm3-graphs.html#topic-3-5-2',
    summary:     "The adjacency matrix with lengths in place of ones and infinity in place of zeros",
    keywords:    ['edge length matrix', 'weight matrix', 'L', 'np.inf', 'infinity', 'wtgraph', 'lab08']
  }
  ,{
    id:          'topic-3-5-3',
    kind:        'topic',
    number:      '3.5.3',
    title:       "The shortest-path problem",
    module:      'M3',
    moduleTitle: 'Graphs',
    url:         'm3-graphs.html#topic-3-5-3',
    summary:     "The distance of a path is the sum of its edge lengths; the problem asks for the smallest such sum",
    keywords:    ['shortest path', 'distance', 'all pairs', 'single source', 'midterm', 'definition']
  }
  ,{
    id:          'topic-3-5-4',
    kind:        'topic',
    number:      '3.5.4',
    title:       "Shortest path by brute force",
    module:      'M3',
    moduleTitle: 'Graphs',
    url:         'm3-graphs.html#topic-3-5-4',
    summary:     "Generate every path with a depth-first search, measure each, and keep the shortest — correct and unusable",
    keywords:    ['brute force', 'enumerate paths', 'exhaustive', 'all paths', 'cost', 'why not']
  }
  ,{
    id:          'topic-3-5-5',
    kind:        'topic',
    number:      '3.5.5',
    title:       "Dijkstra's algorithm",
    module:      'M3',
    moduleTitle: 'Graphs',
    url:         'm3-graphs.html#topic-3-5-5',
    summary:     "Connect the nearest unconnected node, relax every edge leaving it, and repeat until the target is connected",
    keywords:    ['dijkstra', 'shortest path', 'relaxation', 'greedy', 'connect', 'dist', 'negative weights', 'midterm']
  }
  ,{
    id:          'topic-3-5-6',
    kind:        'topic',
    number:      '3.5.6',
    title:       "Dijkstra: worked example / step-through",
    module:      'M3',
    moduleTitle: 'Graphs',
    url:         'm3-graphs.html#topic-3-5-6',
    summary:     "The six-node example worked to Dist F equals 41 along A C B F, one relaxation at a time",
    keywords:    ['dijkstra example', 'trace', 'worked', '41', 'step through', 'working table', 'midterm']
  }
  ,{
    id:          'topic-3-5-7',
    kind:        'topic',
    number:      '3.5.7',
    title:       "Shortest paths to all other nodes",
    module:      'M3',
    moduleTitle: 'Graphs',
    url:         'm3-graphs.html#topic-3-5-7',
    summary:     "Delete step 6, the early exit, and Dijkstra returns the shortest distance to every node for no extra work",
    keywords:    ['all destinations', 'single source', 'drop early exit', 'all pairs', 'every node']
  }
  ,{
    id:          'topic-3-5-8',
    kind:        'topic',
    number:      '3.5.8',
    title:       "Re-running Dijkstra after an edge change",
    module:      'M3',
    moduleTitle: 'Graphs',
    url:         'm3-graphs.html#topic-3-5-8',
    summary:     "Change one travel time and the whole algorithm has to run again — the midterm's part b, with both answers",
    keywords:    ['edge change', 're-run', 'midterm', 'perturbation', 'c to e', 'road network', 'recompute']
  }
  ,{
    id:          'topic-3-5-9',
    kind:        'topic',
    number:      '3.5.9',
    title:       "Algorithm classification (greedy)",
    module:      'M3',
    moduleTitle: 'Graphs',
    url:         'm3-graphs.html#topic-3-5-9',
    summary:     "Dijkstra takes the shortest edge available with no long-term strategy, and non-negative weights make that safe",
    keywords:    ['greedy', 'classification', 'strategy', 'decrease and conquer', 'm1', 'optimal']
  }
  ,{
    id:          'topic-3-6-1',
    kind:        'topic',
    number:      '3.6.1',
    title:       "What is a tree?",
    module:      'M3',
    moduleTitle: 'Graphs',
    url:         'm3-graphs.html#topic-3-6-1',
    summary:     "A connected graph with no cycles, and five equivalent ways of saying the same thing",
    keywords:    ['tree', 'acyclic', 'cycle', 'n minus 1 edges', 'unique path', 'definition']
  }
  ,{
    id:          'topic-3-6-2',
    kind:        'topic',
    number:      '3.6.2',
    title:       "Spanning tree",
    module:      'M3',
    moduleTitle: 'Graphs',
    url:         'm3-graphs.html#topic-3-6-2',
    summary:     "A tree formed by deleting every edge not needed to keep the graph connected; it always has N minus 1 edges",
    keywords:    ['spanning tree', 'n minus 1', '66', 'subgraph', 'connected']
  }
  ,{
    id:          'topic-3-6-3',
    kind:        'topic',
    number:      '3.6.3',
    title:       "Minimum spanning tree",
    module:      'M3',
    moduleTitle: 'Graphs',
    url:         'm3-graphs.html#topic-3-6-3',
    summary:     "The spanning tree with the smallest total edge length — three requirements, one answer",
    keywords:    ['mst', 'minimum spanning tree', 'minimal', 'cheapest network', 'cable', 'lab08']
  }
  ,{
    id:          'topic-3-6-4',
    kind:        'topic',
    number:      '3.6.4',
    title:       "Kruskal's algorithm",
    module:      'M3',
    moduleTitle: 'Graphs',
    url:         'm3-graphs.html#topic-3-6-4',
    summary:     "Sort the edges, add the shortest that closes no cycle, and stop at N minus 1 edges",
    keywords:    ['kruskal', 'mst', 'sort edges', 'greedy', '48', 'lab08', 'trace']
  }
  ,{
    id:          'topic-3-6-5',
    kind:        'topic',
    number:      '3.6.5',
    title:       "Cycle detection / Union-Find",
    module:      'M3',
    moduleTitle: 'Graphs',
    url:         'm3-graphs.html#topic-3-6-5',
    summary:     "An edge closes a cycle exactly when both its ends are already in the same piece — which union-find answers fast",
    keywords:    ['union find', 'disjoint set', 'dsu', 'cycle', 'find', 'union', 'path compression', 'rank', 'lab08']
  }
  ,{
    id:          'topic-3-6-6',
    kind:        'topic',
    number:      '3.6.6',
    title:       "Kruskal on disconnected graphs (edge cases)",
    module:      'M3',
    moduleTitle: 'Graphs',
    url:         'm3-graphs.html#topic-3-6-6',
    summary:     "On a disconnected graph Kruskal returns a minimum spanning forest of N minus c edges, not a tree",
    keywords:    ['disconnected', 'forest', 'edge case', 'empty graph', 'single node', 'ties', 'lab08', '42 vs 41']
  }
  ,{
    id:          'topic-3-6-7',
    kind:        'topic',
    number:      '3.6.7',
    title:       "Permutations: basics",
    module:      'M3',
    moduleTitle: 'Graphs',
    url:         'm3-graphs.html#topic-3-6-7',
    summary:     "A permutation of order N is an ordered list of 1 to N with each number once, and there are N factorial of them",
    keywords:    ['permutation', 'order n', 'factorial', 'combinatorics', 'rank', 'arrangements']
  }
  ,{
    id:          'topic-3-6-8',
    kind:        'topic',
    number:      '3.6.8',
    title:       "Combinatorial objects and tasks",
    module:      'M3',
    moduleTitle: 'Graphs',
    url:         'm3-graphs.html#topic-3-6-8',
    summary:     "Enumerate, generate, sample, rank and unrank — the five questions asked of every class of combinatorial object",
    keywords:    ['combinatorial', 'enumerate', 'generate', 'sample', 'rank', 'unrank', 'subsets', 'combinations']
  }
  ,{
    id:          'topic-3-6-9',
    kind:        'topic',
    number:      '3.6.9',
    title:       "Random permutation generation",
    module:      'M3',
    moduleTitle: 'Graphs',
    url:         'm3-graphs.html#topic-3-6-9',
    summary:     "Fisher and Yates: for I from N down to 2, swap P of I with a random P of J drawn from 1 to I",
    keywords:    ['fisher yates', 'shuffle', 'random permutation', 'sample', 'seed', 'bias', 'knuth']
  }
  ,{
    id:          'topic-3-6-10',
    kind:        'topic',
    number:      '3.6.10',
    title:       "The next-permutation algorithm",
    module:      'M3',
    moduleTitle: 'Graphs',
    url:         'm3-graphs.html#topic-3-6-10',
    summary:     "Find the highest I with P of I below its neighbour, swap it with the highest larger J, then reverse the tail",
    keywords:    ['next permutation', 'next_perm', 'generate', 'lexicographic', 'trace', 'order 4']
  }
  ,{
    id:          'topic-3-6-11',
    kind:        'topic',
    number:      '3.6.11',
    title:       "Traveling Salesman Problem",
    module:      'M3',
    moduleTitle: 'Graphs',
    url:         'm3-graphs.html#topic-3-6-11',
    summary:     "Start somewhere, visit every city once, return home, and pay as little as possible for the round trip",
    keywords:    ['tsp', 'travelling salesman', 'traveling salesman', 'round trip', 'itinerary', 'tour', 'lab08']
  }
  ,{
    id:          'topic-3-6-12',
    kind:        'topic',
    number:      '3.6.12',
    title:       "TSP by brute force",
    module:      'M3',
    moduleTitle: 'Graphs',
    url:         'm3-graphs.html#topic-3-6-12',
    summary:     "Generate every itinerary with next-permutation and keep the best; 120 routes collapse to 12 distinct tours",
    keywords:    ['tsp brute force', '120', '12 tours', 'rotations', 'reversals', '19', 'acbed', 'factorial', 'lab08']
  }
  ,{
    id:          'topic-3-6-13',
    kind:        'topic',
    number:      '3.6.13',
    title:       "TSP heuristics",
    module:      'M3',
    moduleTitle: 'Graphs',
    url:         'm3-graphs.html#topic-3-6-13',
    summary:     "Nearest neighbour: always hop to the closest unvisited city. Fast, and on this example never optimal",
    keywords:    ['heuristic', 'nearest neighbour', 'nearest neighbor', '21', 'approximation', 'greedy', 'guess']
  }
  ,{
    id:          'topic-3-6-14',
    kind:        'topic',
    number:      '3.6.14',
    title:       "Improving a good route (local search)",
    module:      'M3',
    moduleTitle: 'Graphs',
    url:         'm3-graphs.html#topic-3-6-14',
    summary:     "If a route crosses itself, uncross it: the 2-opt move reverses the stretch between two legs and shortens the tour",
    keywords:    ['2-opt', 'two opt', 'local search', 'triangle inequality', 'crossing', 'improve', 'local minimum']
  }
  ,{
    id:          'demo-euler-check',
    kind:        'demo',
    number:      '3.1.6',
    title:       "Eulerian path checker",
    module:      'M3',
    moduleTitle: 'Graphs',
    url:         'm3-graphs.html#demo-euler-check',
    summary:     "Count the degree of every node one at a time and read off whether the figure can be drawn in a single stroke",
    keywords:    ['eulerian', 'one stroke', 'odd degree', 'konigsberg', 'envelope', 'pen puzzle', 'interactive']
  }
  ,{
    id:          'demo-representations',
    kind:        'demo',
    number:      '3.2.7',
    title:       "One graph, five representations",
    module:      'M3',
    moduleTitle: 'Graphs',
    url:         'm3-graphs.html#demo-representations',
    summary:     "Rewrite the same graph as an edge list, adjacency matrix, adjacency structure, incidence matrix or GRF file",
    keywords:    ['representations', 'edge list', 'adjacency matrix', 'incidence', 'grf', 'storage cost', 'interactive']
  }
  ,{
    id:          'demo-connection-algorithm',
    kind:        'demo',
    number:      '3.3.6',
    title:       "Connection algorithm step-through",
    module:      'M3',
    moduleTitle: 'Graphs',
    url:         'm3-graphs.html#demo-connection-algorithm',
    summary:     "Watch used, new and untouched fill in one node at a time, in path mode or component mode",
    keywords:    ['connection algorithm', 'components', 'used new untouched', 'bit vector', 'step through', 'interactive']
  }
  ,{
    id:          'demo-walk-counter',
    kind:        'demo',
    number:      '3.3.9',
    title:       "Walk and path counter",
    module:      'M3',
    moduleTitle: 'Graphs',
    url:         'm3-graphs.html#demo-walk-counter',
    summary:     "Raise the adjacency matrix to the power k to count walks, or search the graph to enumerate paths",
    keywords:    ['counting walks', 'matrix power', 'paths', 'a squared', 'enumerate', 'interactive']
  }
  ,{
    id:          'demo-traversal',
    kind:        'demo',
    number:      '3.4.1',
    title:       "DFS and BFS step-through",
    module:      'M3',
    moduleTitle: 'Graphs',
    url:         'm3-graphs.html#demo-traversal',
    summary:     "Run either traversal on the same graph from the same start and compare the visit orders",
    keywords:    ['dfs', 'bfs', 'stack', 'queue', 'traversal', 'visit order', 'museum', 'maze', 'interactive']
  }
  ,{
    id:          'demo-brute-force-paths',
    kind:        'demo',
    number:      '3.5.4',
    title:       "Brute-force shortest path",
    module:      'M3',
    moduleTitle: 'Graphs',
    url:         'm3-graphs.html#demo-brute-force-paths',
    summary:     "Generate every path between two nodes in depth-first order and watch the best-so-far shrink",
    keywords:    ['brute force', 'all paths', 'shortest', 'enumerate', 'candidate', 'interactive']
  }
  ,{
    id:          'demo-dijkstra-trace',
    kind:        'demo',
    number:      '3.5.6',
    title:       "Dijkstra step-through",
    module:      'M3',
    moduleTitle: 'Graphs',
    url:         'm3-graphs.html#demo-dijkstra-trace',
    summary:     "Step through Dijkstra on the six-node example and watch the working table fill in",
    keywords:    ['dijkstra', 'step through', 'trace', 'working table', 'relaxation', 'interactive']
  }
  ,{
    id:          'demo-dijkstra-edge-change',
    kind:        'demo',
    number:      '3.5.8',
    title:       "Dijkstra after an edge change",
    module:      'M3',
    moduleTitle: 'Graphs',
    url:         'm3-graphs.html#demo-dijkstra-edge-change',
    summary:     "Drag one travel time and see both the old and the new shortest route on the midterm road network",
    keywords:    ['edge change', 're-run', 'midterm', 'road network', 'compare', 'interactive']
  }
  ,{
    id:          'demo-kruskal',
    kind:        'demo',
    number:      '3.6.4',
    title:       "Kruskal step-through with union-find",
    module:      'M3',
    moduleTitle: 'Graphs',
    url:         'm3-graphs.html#demo-kruskal',
    summary:     "Take each sorted edge in turn and see the two union-find set identifiers that decide add or reject",
    keywords:    ['kruskal', 'mst', 'union find', 'cycle', 'sorted edges', 'forest', 'interactive']
  }
  ,{
    id:          'demo-permutations',
    kind:        'demo',
    number:      '3.6.10',
    title:       "Permutation generator",
    module:      'M3',
    moduleTitle: 'Graphs',
    url:         'm3-graphs.html#demo-permutations',
    summary:     "Walk through every permutation in order, or draw one at random with a seeded Fisher and Yates shuffle",
    keywords:    ['permutation', 'next_perm', 'fisher yates', 'shuffle', 'seed', 'generate', 'interactive']
  }
  ,{
    id:          'demo-tsp-bruteforce',
    kind:        'demo',
    number:      '3.6.12',
    title:       "TSP brute-force solver",
    module:      'M3',
    moduleTitle: 'Graphs',
    url:         'm3-graphs.html#demo-tsp-bruteforce',
    summary:     "Measure every itinerary of the five-city example and watch the best-so-far fall to 19",
    keywords:    ['tsp', 'brute force', 'itinerary', 'tour', '19', 'optimal', 'interactive']
  }
  ,{
    id:          'demo-tsp-heuristic',
    kind:        'demo',
    number:      '3.6.14',
    title:       "Nearest neighbour and 2-opt",
    module:      'M3',
    moduleTitle: 'Graphs',
    url:         'm3-graphs.html#demo-tsp-heuristic',
    summary:     "Build a route by hopping to the nearest unvisited city, then uncross two legs to shorten it",
    keywords:    ['tsp', 'nearest neighbour', '2-opt', 'heuristic', 'improve', 'local search', 'interactive']
  }

  /* =======================================================================
     M4 TOPIC ENTRIES — appended by the M4 author
     ======================================================================= */
  ,
  {
    id: 'topic-4-1-1',
    kind: 'topic',
    number: '4.1.1',
    title: 'From scene to pixels',
    module: 'M4',
    moduleTitle: 'Image Processing',
    url: 'm4-image-processing.html#topic-4-1-1',
    summary: 'Four steps of discretization turn a 3-D scene into an M by N array of integers, and each step throws something away',
    keywords: ['discretization', 'pixel', 'picture element', 'sampling', 'quantization', 'image is data', 'm by n array']
  },
  {
    id: 'topic-4-1-2',
    kind: 'topic',
    number: '4.1.2',
    title: 'Pixels must disappear for realism',
    module: 'M4',
    moduleTitle: 'Image Processing',
    url: 'm4-image-processing.html#topic-4-1-2',
    summary: 'Pixels have to be small enough to stop being visible; lines and edges give a coarse image away first',
    keywords: ['resolution', 'pixelated', 'realism', '541 by 200', 'zoom', 'image size', 'aliasing']
  },
  {
    id: 'topic-4-1-3',
    kind: 'topic',
    number: '4.1.3',
    title: 'Color as an RGB setting',
    module: 'M4',
    moduleTitle: 'Image Processing',
    url: 'm4-image-processing.html#topic-4-1-3',
    summary: 'A colour is a red, a green and a blue setting; the model is additive and cannot reach every visible colour',
    keywords: ['rgb', 'colour model', 'additive', 'chromaticity', 'gamut', 'cie', 'colour cube', '255']
  },
  {
    id: 'topic-4-1-4',
    kind: 'topic',
    number: '4.1.4',
    title: 'Grayscale encoding, and where gray comes from',
    module: 'M4',
    moduleTitle: 'Image Processing',
    url: 'm4-image-processing.html#topic-4-1-4',
    summary: 'When R equals G equals B the eye sees gray, so a grayscale image needs one third of the data',
    keywords: ['grayscale', 'greyscale', 'gray', 'r=g=b', 'storage', 'compression', 'lab09', 'one third']
  },
  {
    id: 'topic-4-1-5',
    kind: 'topic',
    number: '4.1.5',
    title: 'Image bit representation and colour depth',
    module: 'M4',
    moduleTitle: 'Image Processing',
    url: 'm4-image-processing.html#topic-4-1-5',
    summary: 'Bits per pixel fix how many shades exist: 1-bit is black and white, 4-bit is FEEP, 8-bit is the standard',
    keywords: ['colour depth', 'color depth', 'bit depth', '4-bit', '8-bit', '256 levels', 'bits per pixel']
  },
  {
    id: 'topic-4-1-6',
    kind: 'topic',
    number: '4.1.6',
    title: 'Unsigned short integers, and integers becoming reals',
    module: 'M4',
    moduleTitle: 'Image Processing',
    url: 'm4-image-processing.html#topic-4-1-6',
    summary: 'Use uint8 because image values are always positive, and convert to a shade S = G / MAXINT for arithmetic',
    keywords: ['uint8', 'unsigned', 'int8', 'overflow', 'clipping', 'procrustes', 'rescale', 'normalisation', 's = g / maxint']
  },
  {
    id: 'topic-4-1-7',
    kind: 'topic',
    number: '4.1.7',
    title: 'The FEEP example',
    module: 'M4',
    moduleTitle: 'Image Processing',
    url: 'm4-image-processing.html#topic-4-1-7',
    summary: 'A 7 by 24 array of values 0 to 15 that renders as the word FEEP in four gray levels',
    keywords: ['feep', '7 by 24', 'maxint 15', 'worked example', 'negative', 'exercise', 'toy image']
  },
  {
    id: 'topic-4-1-8',
    kind: 'topic',
    number: '4.1.8',
    title: 'Applications: satellite, medical, facial recognition',
    module: 'M4',
    moduleTitle: 'Image Processing',
    url: 'm4-image-processing.html#topic-4-1-8',
    summary: 'Roads and buildings, tumours and organs, faces: the three motivating applications and the technique each one needs',
    keywords: ['satellite', 'medical imaging', 'mri', 'facial recognition', 'applications', 'motivation', 'remote sensing']
  },
  {
    id: 'topic-4-2-1',
    kind: 'topic',
    number: '4.2.1',
    title: 'Images vs. formats',
    module: 'M4',
    moduleTitle: 'Image Processing',
    url: 'm4-image-processing.html#topic-4-2-1',
    summary: 'The image is an M by N matrix; the format is every storage decision made about how to write it down',
    keywords: ['format', 'lossy', 'lossless', 'jpeg', 'png', 'storage', 'abstraction', 'lab09']
  },
  {
    id: 'topic-4-2-2',
    kind: 'topic',
    number: '4.2.2',
    title: 'Common image formats',
    module: 'M4',
    moduleTitle: 'Image Processing',
    url: 'm4-image-processing.html#topic-4-2-2',
    summary: 'BMP, GIF, JPEG, PBM/PGM/PPM, PNG, PostScript and TIFF, and the four reasons formats differ',
    keywords: ['bmp', 'gif', 'jpeg', 'png', 'tiff', 'postscript', 'ppm', 'pbm', 'format table', 'compression']
  },
  {
    id: 'topic-4-2-3',
    kind: 'topic',
    number: '4.2.3',
    title: 'The Portable Gray Map (PGM)',
    module: 'M4',
    moduleTitle: 'Image Processing',
    url: 'm4-image-processing.html#topic-4-2-3',
    summary: 'P2, a comment, width and height, the maximum value, then the data: the simplest grayscale format there is',
    keywords: ['pgm', 'p2', 'p5', 'portable gray map', 'netpbm', 'header', 'ascii', 'magic number', 'lab09']
  },
  {
    id: 'topic-4-2-4',
    kind: 'topic',
    number: '4.2.4',
    title: 'Run-length encoding',
    module: 'M4',
    moduleTitle: 'Image Processing',
    url: 'm4-image-processing.html#topic-4-2-4',
    summary: 'Store value-and-count pairs instead of pixels; the first three FEEP rows go from 72 values to 42',
    keywords: ['rle', 'run length encoding', 'compression', 'runs', '72 to 42', 'worst case']
  },
  {
    id: 'topic-4-2-5',
    kind: 'topic',
    number: '4.2.5',
    title: 'Vector graphics',
    module: 'M4',
    moduleTitle: 'Image Processing',
    url: 'm4-image-processing.html#topic-4-2-5',
    summary: 'PostScript and its relatives store drawing instructions, not pixels, so they stay sharp at any size',
    keywords: ['vector', 'raster', 'postscript', 'svg', 'pdf', 'line art', 'scaling', 'moveto drawto']
  },
  {
    id: 'topic-4-2-6',
    kind: 'topic',
    number: '4.2.6',
    title: 'Format conversion',
    module: 'M4',
    moduleTitle: 'Image Processing',
    url: 'm4-image-processing.html#topic-4-2-6',
    summary: 'imageio, matplotlib, scikit-image and pillow, plus the RGBA and uint8 traps that break Lab 09 question 1',
    keywords: ['convert', 'imageio', 'pillow', 'pil', 'opencv', 'scikit-image', 'gimp', 'imagemagick', 'rgba', 'lab09']
  },
  {
    id: 'topic-4-3-1',
    kind: 'topic',
    number: '4.3.1',
    title: 'Image histograms',
    module: 'M4',
    moduleTitle: 'Image Processing',
    url: 'm4-image-processing.html#topic-4-3-1',
    summary: 'The population census of an image\'s pixel values, and the four shapes that tell you dark, bright, contrasty or flat',
    keywords: ['histogram', 'frequency', 'intensity', 'global statistic', 'dark image', 'low contrast', 'lab09']
  },
  {
    id: 'topic-4-3-2',
    kind: 'topic',
    number: '4.3.2',
    title: 'Histogram plotting',
    module: 'M4',
    moduleTitle: 'Image Processing',
    url: 'm4-image-processing.html#topic-4-3-2',
    summary: 'Flatten the array with ravel, choose a bin count, and plot one histogram per channel for a colour image',
    keywords: ['plt.hist', 'ravel', 'bins', 'matplotlib', 'channel', 'rgb histogram', 'lab09']
  },
  {
    id: 'topic-4-3-3',
    kind: 'topic',
    number: '4.3.3',
    title: 'Contrast stretching',
    module: 'M4',
    moduleTitle: 'Image Processing',
    url: 'm4-image-processing.html#topic-4-3-3',
    summary: 'A linear remap spreading the used range over the full 0 to 255, and why the lecture\'s Experiment 1 also clips',
    keywords: ['contrast stretch', 'histogram stretching', 'normalisation', 'rescale', '127.5', 'experiment 1', 'clipping', 'lab09']
  },
  {
    id: 'topic-4-3-4',
    kind: 'topic',
    number: '4.3.4',
    title: 'Colour quantization and depth reduction',
    module: 'M4',
    moduleTitle: 'Image Processing',
    url: 'm4-image-processing.html#topic-4-3-4',
    summary: 'Reduce the number of shades on purpose; three gray levels still leave the photograph readable',
    keywords: ['quantization', 'depth reduction', 'posterise', 'three shades', 'compression', 'palette']
  },
  {
    id: 'topic-4-3-5',
    kind: 'topic',
    number: '4.3.5',
    title: 'K-means for quantization',
    module: 'M4',
    moduleTitle: 'Image Processing',
    url: 'm4-image-processing.html#topic-4-3-5',
    summary: 'Assign every pixel to its nearest of k representative shades, move the centres to the means, repeat until nothing changes',
    keywords: ['k-means', 'kmeans', 'clustering', 'centroid', 'casablanca', 'convergence', 'inertia', 'lab11', 'quantization']
  },
  {
    id: 'topic-4-3-6',
    kind: 'topic',
    number: '4.3.6',
    title: 'Manual vs. automatic thresholding',
    module: 'M4',
    moduleTitle: 'Image Processing',
    url: 'm4-image-processing.html#topic-4-3-6',
    summary: 'Reading break points off a histogram by eye does not scale; K-means and Otsu are the automatic versions',
    keywords: ['threshold', 'thresholding', 'otsu', 'automatic', 'manual', 'binary image', 'break points']
  },
  {
    id: 'topic-4-3-7',
    kind: 'topic',
    number: '4.3.7',
    title: '3-D RGB colour-space visualization',
    module: 'M4',
    moduleTitle: 'Image Processing',
    url: 'm4-image-processing.html#topic-4-3-7',
    summary: 'A pixel is a point in a 256-cube, grayscale is its main diagonal, and quantization is covering the cloud with k markers',
    keywords: ['rgb cube', 'colour space', '3d scatter', 'euclidean distance', 'diagonal', 'centroid']
  },
  {
    id: 'topic-4-4-1',
    kind: 'topic',
    number: '4.4.1',
    title: 'The kernel: a window on a neighbourhood',
    module: 'M4',
    moduleTitle: 'Image Processing',
    url: 'm4-image-processing.html#topic-4-4-1',
    summary: 'Centre a small matrix on a pixel, multiply, add: blur, sharpen and edge detection are all this one operation',
    keywords: ['kernel', 'convolution', 'filter', 'window', 'neighbourhood', 'border', 'final', 'lab09', 'cross-correlation']
  },
  {
    id: 'topic-4-4-2',
    kind: 'topic',
    number: '4.4.2',
    title: 'Local contrast enhancement',
    module: 'M4',
    moduleTitle: 'Image Processing',
    url: 'm4-image-processing.html#topic-4-4-2',
    summary: 'Height equals pixel minus the NEWS average; put back average plus S times height to exaggerate what stands out',
    keywords: ['local contrast', 'enhancement', 'news', 'height', 'exaggeration', 'sharpen', 's parameter', 'relief globe']
  },
  {
    id: 'topic-4-4-3',
    kind: 'topic',
    number: '4.4.3',
    title: 'Estimating the local baseline',
    module: 'M4',
    moduleTitle: 'Image Processing',
    url: 'm4-image-processing.html#topic-4-4-3',
    summary: 'Five ways to say what the neighbours predict, from the four-pixel NEWS average to the bilateral weighting',
    keywords: ['baseline', 'news average', 'neighbourhood', 'mean', 'median', 'weighted', 'estimator']
  },
  {
    id: 'topic-4-4-4',
    kind: 'topic',
    number: '4.4.4',
    title: 'Mean / box filter',
    module: 'M4',
    moduleTitle: 'Image Processing',
    url: 'm4-image-processing.html#topic-4-4-4',
    summary: 'Every weight equal to one ninth: the cheapest smoothing there is, and the wrong tool for impulse noise',
    keywords: ['mean filter', 'box filter', 'averaging', 'blur', '1/9', 'smoothing', 'lab09']
  },
  {
    id: 'topic-4-4-5',
    kind: 'topic',
    number: '4.4.5',
    title: 'Salt-and-pepper noise',
    module: 'M4',
    moduleTitle: 'Image Processing',
    url: 'm4-image-processing.html#topic-4-4-5',
    summary: 'A few pixels forced to the extreme values by a sensor failure, and why the eye goes straight to them',
    keywords: ['salt and pepper', 'impulse noise', 'speckle', 'outlier', 'sensor failure', 'lab09']
  },
  {
    id: 'topic-4-4-6',
    kind: 'topic',
    number: '4.4.6',
    title: 'Median filter',
    module: 'M4',
    moduleTitle: 'Image Processing',
    url: 'm4-image-processing.html#topic-4-4-6',
    summary: 'Replace each pixel by the fifth of its nine sorted neighbours, so an extreme value is discarded rather than diluted',
    keywords: ['median filter', 'median', 'non-linear', 'order statistic', '3x3', 'final', 'exam q4a', 'lab09']
  },
  {
    id: 'topic-4-4-7',
    kind: 'topic',
    number: '4.4.7',
    title: 'Median vs. average',
    module: 'M4',
    moduleTitle: 'Image Processing',
    url: 'm4-image-processing.html#topic-4-4-7',
    summary: 'One outlier drags the average from 5 to 204 and leaves the median at 5; the ranking flips for Gaussian noise',
    keywords: ['median versus average', 'outlier', 'mse', 'psnr', 'comparison', 'table 1', 'robustness', 'lab09']
  },
  {
    id: 'topic-4-4-8',
    kind: 'topic',
    number: '4.4.8',
    title: 'Gaussian noise',
    module: 'M4',
    moduleTitle: 'Image Processing',
    url: 'm4-image-processing.html#topic-4-4-8',
    summary: 'Every pixel slightly wrong, distributed as a bell curve of width sigma, plus optical blur into the neighbours',
    keywords: ['gaussian noise', 'additive noise', 'sigma', 'standard deviation', 'grain', 'bell curve', 'blur']
  },
  {
    id: 'topic-4-4-9',
    kind: 'topic',
    number: '4.4.9',
    title: 'Gaussian filter: weighted averaging',
    module: 'M4',
    moduleTitle: 'Image Processing',
    url: 'm4-image-processing.html#topic-4-4-9',
    summary: 'A weighted average with the centre counting most; sigma is how much you trust the neighbours',
    keywords: ['gaussian filter', 'gaussian blur', 'smoothing', 'weighted average', 'sigma', 'lab09']
  },
  {
    id: 'topic-4-4-10',
    kind: 'topic',
    number: '4.4.10',
    title: 'Computing kernel coefficients',
    module: 'M4',
    moduleTitle: 'Image Processing',
    url: 'm4-image-processing.html#topic-4-4-10',
    summary: 'Evaluate the Gaussian at each offset then divide by the total, which is the step the compiled slide hides',
    keywords: ['kernel coefficients', 'normalise', 'normalisation', 'sum to one', 'gaussian kernel', '0.2042', 'variance']
  },
  {
    id: 'topic-4-4-11',
    kind: 'topic',
    number: '4.4.11',
    title: 'Sharpen, emboss and Laplacian kernels',
    module: 'M4',
    moduleTitle: 'Image Processing',
    url: 'm4-image-processing.html#topic-4-4-11',
    summary: 'Eight standard 3 by 3 kernels in one table, and the discrete Laplacian that answers the lecture\'s unanswered quiz',
    keywords: ['sharpen', 'emboss', 'laplacian', 'second derivative', 'kernel table', 'identity', 'presets', 'lab09']
  },
  {
    id: 'topic-4-4-12',
    kind: 'topic',
    number: '4.4.12',
    title: 'Bilateral filter',
    module: 'M4',
    moduleTitle: 'Image Processing',
    url: 'm4-image-processing.html#topic-4-4-12',
    summary: 'Weight a neighbour by distance and by how different its value is, so edges survive the smoothing',
    keywords: ['bilateral', 'edge preserving', 'range sigma', 'spatial sigma', 'non-linear', 'denoise']
  },
  {
    id: 'topic-4-5-1',
    kind: 'topic',
    number: '4.5.1',
    title: 'What is an edge? Slope measures change',
    module: 'M4',
    moduleTitle: 'Image Processing',
    url: 'm4-image-processing.html#topic-4-5-1',
    summary: 'An edge is where linear behaviour is disrupted; a steady gradient is not an edge however dark it gets',
    keywords: ['edge', 'slope', 'derivative', 'step', 'ramp', 'gradient', 'finite difference']
  },
  {
    id: 'topic-4-5-2',
    kind: 'topic',
    number: '4.5.2',
    title: 'Building an edge detector: the E statistic',
    module: 'M4',
    moduleTitle: 'Image Processing',
    url: 'm4-image-processing.html#topic-4-5-2',
    summary: 'E is the sum of the absolute horizontal and vertical slopes, zero on flat regions and large where values differ',
    keywords: ['e statistic', 'news', 'edge detector', 'coins', 'absolute slope', 'edge strength']
  },
  {
    id: 'topic-4-5-3',
    kind: 'topic',
    number: '4.5.3',
    title: 'Sobel X / Sobel Y',
    module: 'M4',
    moduleTitle: 'Image Processing',
    url: 'm4-image-processing.html#topic-4-5-3',
    summary: 'Six neighbours with the middle one doubled, giving a smoother gradient than the plain difference',
    keywords: ['sobel', 'gx', 'gy', 'gradient', 'kernel', 'final', 'exam q4b', 'vertical edges', 'horizontal edges', 'lab09']
  },
  {
    id: 'topic-4-5-4',
    kind: 'topic',
    number: '4.5.4',
    title: 'Prewitt X / Y / combined',
    module: 'M4',
    moduleTitle: 'Image Processing',
    url: 'm4-image-processing.html#topic-4-5-4',
    summary: 'Sobel without the doubled centre weight, which is the cleanest way to see what that weight buys',
    keywords: ['prewitt', 'gradient', 'kernel', 'comparison', 'polarity', 'signed arithmetic']
  },
  {
    id: 'topic-4-5-5',
    kind: 'topic',
    number: '4.5.5',
    title: 'Canny edge detection',
    module: 'M4',
    moduleTitle: 'Image Processing',
    url: 'm4-image-processing.html#topic-4-5-5',
    summary: 'Smooth, take gradients, thin the ridge to one pixel, then threshold with hysteresis so weak edges keep their chain',
    keywords: ['canny', 'non-maximum suppression', 'hysteresis', 'two thresholds', 'thin edges', 'pipeline']
  },
  {
    id: 'topic-4-5-6',
    kind: 'topic',
    number: '4.5.6',
    title: 'Thresholding the edge map',
    module: 'M4',
    moduleTitle: 'Image Processing',
    url: 'm4-image-processing.html#topic-4-5-6',
    summary: 'Turn an edge strength into a yes-or-no decision, and read the result more easily in reverse video',
    keywords: ['threshold', 'reverse video', 'edge map', 'binary', '255 minus p', 'edges in red', 'lab09']
  },
  {
    id: 'topic-4-6-1',
    kind: 'topic',
    number: '4.6.1',
    title: 'Goal of segmentation',
    module: 'M4',
    moduleTitle: 'Image Processing',
    url: 'm4-image-processing.html#topic-4-6-1',
    summary: 'Stop producing images and start producing a list of objects: how many components, and how big is each',
    keywords: ['segmentation', 'connected components', 'objects', 'counting', 'implicit graph', 'coins']
  },
  {
    id: 'topic-4-6-2',
    kind: 'topic',
    number: '4.6.2',
    title: 'Connected components: the 1-D case',
    module: 'M4',
    moduleTitle: 'Image Processing',
    url: 'm4-image-processing.html#topic-4-6-2',
    summary: 'One comparison against the previous pixel decides whether a run starts a new component or continues the old one',
    keywords: ['1d components', 'pold', 'label array', 'string of beads', 'warm up', 'walkthrough']
  },
  {
    id: 'topic-4-6-3',
    kind: 'topic',
    number: '4.6.3',
    title: 'Two-pass labeling algorithm (2-D)',
    module: 'M4',
    moduleTitle: 'Image Processing',
    url: 'm4-image-processing.html#topic-4-6-3',
    summary: 'Cheap local decisions in pass one, equivalences recorded, then a resolution pass that fixes them all at once',
    keywords: ['two pass', 'labelling', 'labeling', 'raster scan', 'equivalence', 'connected components', 'algorithm']
  },
  {
    id: 'topic-4-6-4',
    kind: 'topic',
    number: '4.6.4',
    title: 'First pass: raster scan, provisional labels',
    module: 'M4',
    moduleTitle: 'Image Processing',
    url: 'm4-image-processing.html#topic-4-6-4',
    summary: 'Four cases at each foreground pixel: new component, continue from left, continue from above, or merge on the minimum',
    keywords: ['first pass', 'raster', 'provisional label', 'min', 'cases', 'pseudocode', 'over-identify']
  },
  {
    id: 'topic-4-6-5',
    kind: 'topic',
    number: '4.6.5',
    title: 'Equivalence table and label adjustment',
    module: 'M4',
    moduleTitle: 'Image Processing',
    url: 'm4-image-processing.html#topic-4-6-5',
    summary: 'A component can have many labels but a label never has two components, so keeping the lower one always resolves',
    keywords: ['equivalence', 'label adjustment', 'union find', 'disjoint set', 'dsu', 'chain', '15 labels', '6 components']
  },
  {
    id: 'topic-4-6-6',
    kind: 'topic',
    number: '4.6.6',
    title: '4-connected vs. 8-connected',
    module: 'M4',
    moduleTitle: 'Image Processing',
    url: 'm4-image-processing.html#topic-4-6-6',
    summary: 'Corners count or they do not; the first pass consults 2 already-visited neighbours or 4, and the count changes',
    keywords: ['4-connected', '8-connected', 'connectivity', 'neighbours', 'diagonal', 'offsets']
  },
  {
    id: 'topic-4-6-7',
    kind: 'topic',
    number: '4.6.7',
    title: '3-D connected components',
    module: 'M4',
    moduleTitle: 'Image Processing',
    url: 'm4-image-processing.html#topic-4-6-7',
    summary: 'Voxels, six face neighbours and three already-visited ones: the same algorithm with one constant changed',
    keywords: ['3d', 'voxel', 'mri stack', 'six neighbours', 'back neighbours', 'traversal order']
  },
  {
    id: 'topic-4-6-8',
    kind: 'topic',
    number: '4.6.8',
    title: 'Real-world example: MRI',
    module: 'M4',
    moduleTitle: 'Image Processing',
    url: 'm4-image-processing.html#topic-4-6-8',
    summary: 'Threshold at 200 to 255, label, count and measure: one mass or thirty is a different clinical answer from thirty pixels',
    keywords: ['mri', 'tumour', 'tumor', '64 by 64', 'threshold', 'volume', 'medical', 'pipeline']
  },
  {
    id: 'topic-4-6-9',
    kind: 'topic',
    number: '4.6.9',
    title: 'Binary images and the set language',
    module: 'M4',
    moduleTitle: 'Image Processing',
    url: 'm4-image-processing.html#topic-4-6-9',
    summary: 'A binary image is a set of positions, so union, intersection, complement, subset and disjoint all mean something pictorial',
    keywords: ['binary image', 'set operations', 'union', 'intersection', 'complement', 'subset', 'structuring element', 'reflection', 'translation', 'final']
  },
  {
    id: 'topic-4-6-10',
    kind: 'topic',
    number: '4.6.10',
    title: 'Morphology: dilation',
    module: 'M4',
    moduleTitle: 'Image Processing',
    url: 'm4-image-processing.html#topic-4-6-10',
    summary: 'Mark a position when the structuring element touches the object anywhere, which grows it and closes small gaps',
    keywords: ['dilation', 'morphology', 'structuring element', 'grow', 'a plus b', 'final', 'exam q4', 'cross element']
  },
  {
    id: 'topic-4-6-11',
    kind: 'topic',
    number: '4.6.11',
    title: 'Morphology: erosion',
    module: 'M4',
    moduleTitle: 'Image Processing',
    url: 'm4-image-processing.html#topic-4-6-11',
    summary: 'Mark a position only when the structuring element fits entirely inside, which shrinks the object and deletes thin parts',
    keywords: ['erosion', 'morphology', 'structuring element', 'shrink', 'fits inside', 'final', 'exam q4', 'all zeros']
  },
  {
    id: 'topic-4-6-12',
    kind: 'topic',
    number: '4.6.12',
    title: 'Uses of morphological operators: opening and closing',
    module: 'M4',
    moduleTitle: 'Image Processing',
    url: 'm4-image-processing.html#topic-4-6-12',
    summary: 'Erode then dilate to despeckle, dilate then erode to fill holes; the order is the whole difference',
    keywords: ['opening', 'closing', 'despeckle', 'hole fill', 'separate touching objects', 'morphology', 'peppercorns']
  },
  {
    id: 'demo-pgm-feep',
    kind: 'demo',
    number: '4.2.3',
    title: 'PGM file reader',
    module: 'M4',
    moduleTitle: 'Image Processing',
    url: 'm4-image-processing.html#demo-pgm-feep',
    summary: 'Read FEEP as a PGM, change MAXINT with and without rescaling, and take the negative',
    keywords: ['pgm', 'feep', 'header', 'maxint', 'negative', 'interactive', 'file format', 'reader']
  },
  {
    id: 'demo-run-length',
    kind: 'demo',
    number: '4.2.4',
    title: 'Run-length encoder',
    module: 'M4',
    moduleTitle: 'Image Processing',
    url: 'm4-image-processing.html#demo-run-length',
    summary: 'Step through the runs of a FEEP row and watch the saving accumulate, or fail to',
    keywords: ['rle', 'run length', 'encoder', 'step through', 'compression', 'interactive', 'runs']
  },
  {
    id: 'demo-histogram-stretch',
    kind: 'demo',
    number: '4.3.3',
    title: 'Histogram and contrast stretch',
    module: 'M4',
    moduleTitle: 'Image Processing',
    url: 'm4-image-processing.html#demo-histogram-stretch',
    summary: 'Change the bin count and the output range and watch the histogram of a dark test image move',
    keywords: ['histogram', 'contrast', 'stretch', 'bins', 'interactive', 'experiment 1', 'clipping']
  },
  {
    id: 'demo-kmeans-quantize',
    kind: 'demo',
    number: '4.3.5',
    title: 'K-means quantization step-through',
    module: 'M4',
    moduleTitle: 'Image Processing',
    url: 'm4-image-processing.html#demo-kmeans-quantize',
    summary: 'Step through the assignment and update rounds and watch the total squared error fall to convergence',
    keywords: ['k-means', 'kmeans', 'quantization', 'step through', 'iteration', 'inertia', 'interactive']
  },
  {
    id: 'demo-convolution-window',
    kind: 'demo',
    number: '4.4.1',
    title: 'Convolution window step-through',
    module: 'M4',
    moduleTitle: 'Image Processing',
    url: 'm4-image-processing.html#demo-convolution-window',
    summary: 'Slide a kernel across the image and see the nine multiplications and the sum behind each output pixel',
    keywords: ['convolution', 'kernel', 'window', 'step through', 'products', 'interactive', 'sobel', 'blur']
  },
  {
    id: 'demo-gaussian-kernel',
    kind: 'demo',
    number: '4.4.10',
    title: 'Gaussian kernel builder',
    module: 'M4',
    moduleTitle: 'Image Processing',
    url: 'm4-image-processing.html#demo-gaussian-kernel',
    summary: 'Build an n by n Gaussian kernel at any sigma and see what normalisation does to it',
    keywords: ['gaussian', 'kernel', 'coefficients', 'sigma', 'normalise', 'interactive', 'builder']
  },
  {
    id: 'demo-noise-filters',
    kind: 'demo',
    number: '4.4.7',
    title: 'Noise and filter laboratory',
    module: 'M4',
    moduleTitle: 'Image Processing',
    url: 'm4-image-processing.html#demo-noise-filters',
    summary: 'Damage the test image, clean it with each filter, and compare MSE and PSNR side by side',
    keywords: ['noise', 'filter', 'median', 'mean', 'bilateral', 'mse', 'psnr', 'salt and pepper', 'interactive']
  },
  {
    id: 'demo-edge-detect',
    kind: 'demo',
    number: '4.5.3',
    title: 'Edge detector',
    module: 'M4',
    moduleTitle: 'Image Processing',
    url: 'm4-image-processing.html#demo-edge-detect',
    summary: 'Sobel, Prewitt, Laplacian, Canny and the E statistic on the exam matrix, one pixel at a time',
    keywords: ['edge', 'sobel', 'prewitt', 'canny', 'threshold', 'step through', 'interactive', 'exam']
  },
  {
    id: 'demo-components-two-pass',
    kind: 'demo',
    number: '4.6.3',
    title: 'Two-pass labelling step-through',
    module: 'M4',
    moduleTitle: 'Image Processing',
    url: 'm4-image-processing.html#demo-components-two-pass',
    summary: 'Watch the raster scan hand out provisional labels, record collisions and resolve them',
    keywords: ['connected components', 'two pass', 'labelling', 'equivalence', 'connectivity', 'step through', 'interactive']
  },
  {
    id: 'demo-morphology',
    kind: 'demo',
    number: '4.6.11',
    title: 'Morphology explorer',
    module: 'M4',
    moduleTitle: 'Image Processing',
    url: 'm4-image-processing.html#demo-morphology',
    summary: 'Place the structuring element at every position and see dilation, erosion, opening and closing decided cell by cell',
    keywords: ['morphology', 'dilation', 'erosion', 'opening', 'closing', 'structuring element', 'interactive', 'exam']
  }


  /* =======================================================================
     M5 TOPIC ENTRIES — appended by the M5 author
     ======================================================================= */

  ,{ id: 'topic-5-1-1', kind: 'topic', number: '5.1.1', title: 'What is data mining?', module: 'M5', moduleTitle: 'Data Mining', url: 'm5-data-mining.html#topic-5-1-1', summary: 'The extraction of implicit, previously unknown and potentially useful information from data, and why the term began as an insult', keywords: ['data mining', 'definition', 'data dredging', 'rhine', 'esp', 'data deluge', 'frawley'] }
  ,{ id: 'topic-5-1-2', kind: 'topic', number: '5.1.2', title: 'Examples / who does data mining', module: 'M5', moduleTitle: 'Data Mining', url: 'm5-data-mining.html#topic-5-1-2', summary: 'Yield management, advertising, recommendation, fraud detection and genomics, and the five fields that contribute to the subject', keywords: ['examples', 'netflix', 'fraud detection', 'recommendation', 'diabetes', 'interdisciplinary', 'who'] }
  ,{ id: 'topic-5-1-3', kind: 'topic', number: '5.1.3', title: 'Stages of the data-mining process', module: 'M5', moduleTitle: 'Data Mining', url: 'm5-data-mining.html#topic-5-1-3', summary: 'Gathering, cleansing, feature extraction, pattern recognition, visualization and evaluation — six stages, only two of which people mean', keywords: ['stages', 'pipeline', 'cleansing', 'feature extraction', 'pattern recognition', 'evaluation'] }
  ,{ id: 'topic-5-1-4', kind: 'topic', number: '5.1.4', title: 'Data mining and adjacent fields', module: 'M5', moduleTitle: 'Data Mining', url: 'm5-data-mining.html#topic-5-1-4', summary: 'How it differs from statistics, machine learning, knowledge discovery from databases and predictive analytics', keywords: ['statistics', 'machine learning', 'kdd', 'knowledge discovery', 'predictive analytics'] }
  ,{ id: 'topic-5-1-5', kind: 'topic', number: '5.1.5', title: 'Historical case: John Snow and cholera', module: 'M5', moduleTitle: 'Data Mining', url: 'm5-data-mining.html#topic-5-1-5', summary: 'The 1854 Broad Street outbreak, mapped by hand into what amounts to a Voronoi diagram, and the death of miasma theory', keywords: ['john snow', 'cholera', 'broad street', 'pump', 'miasma', 'epidemiology', 'london', '1854'] }

  ,{ id: 'topic-5-2-1', kind: 'topic', number: '5.2.1', title: 'What is clustering?', module: 'M5', moduleTitle: 'Data Mining', url: 'm5-data-mining.html#topic-5-2-1', summary: 'Grouping objects that behave similarly, with similarity quantified by a distance function and no labels supplied in advance', keywords: ['clustering', 'unsupervised learning', 'segmentation', 'look-a-like', 'similarity', 'lab10'] }
  ,{ id: 'topic-5-2-2', kind: 'topic', number: '5.2.2', title: 'Types of clustering', module: 'M5', moduleTitle: 'Data Mining', url: 'm5-data-mining.html#topic-5-2-2', summary: 'Hierarchical, k-means and geometric, plus the agglomerative versus divisive split within hierarchical clustering', keywords: ['hierarchical', 'agglomerative', 'divisive', 'bottom-up', 'top-down', 'geometric clustering'] }
  ,{ id: 'topic-5-2-3', kind: 'topic', number: '5.2.3', title: 'Distance functions', module: 'M5', moduleTitle: 'Data Mining', url: 'm5-data-mining.html#topic-5-2-3', summary: 'The Euclidean metric, the alternatives, and the four axioms any cluster distance has to satisfy', keywords: ['distance', 'euclidean', 'metric', 'triangle inequality', 'cityblock', 'manhattan', 'norm', 'lab10'] }
  ,{ id: 'topic-5-2-4', kind: 'topic', number: '5.2.4', title: 'Unusual / custom distance functions', module: 'M5', moduleTitle: 'Data Mining', url: 'm5-data-mining.html#topic-5-2-4', summary: 'The GOLF to WORD word ladder, and the lab distance whose minimiser is not the arithmetic mean', keywords: ['word ladder', 'golf', 'word', 'custom distance', 'similarity table', 'lab10', 'square root'] }
  ,{ id: 'topic-5-2-5', kind: 'topic', number: '5.2.5', title: 'Clustering vs. classification', module: 'M5', moduleTitle: 'Data Mining', url: 'm5-data-mining.html#topic-5-2-5', summary: 'Unlabelled data and discovered groups versus labelled data and a predicted label — the hinge between the two halves of M5', keywords: ['supervised', 'unsupervised', 'labelled', 'comparison', 'classification'] }

  ,{ id: 'topic-5-3-1', kind: 'topic', number: '5.3.1', title: 'Hierarchical (agglomerative) clustering', module: 'M5', moduleTitle: 'Data Mining', url: 'm5-data-mining.html#topic-5-3-1', summary: 'Start with N one-object clusters, merge the two closest, record the merge, repeat until one cluster is left', keywords: ['agglomerative', 'merge', 'scipy', 'linkage', 'hierarchy', 'final', 'exam'] }
  ,{ id: 'topic-5-3-2', kind: 'topic', number: '5.3.2', title: 'Single linkage (nearest neighbor)', module: 'M5', moduleTitle: 'Data Mining', url: 'm5-data-mining.html#topic-5-3-2', summary: 'Cluster distance is the shortest link between the two clusters, which finds stringy shapes and suffers from chaining', keywords: ['single linkage', 'nearest neighbour', 'nearest neighbor', 'minimum', 'chaining', 'final', 'exam'] }
  ,{ id: 'topic-5-3-3', kind: 'topic', number: '5.3.3', title: 'Complete linkage (farthest neighbor)', module: 'M5', moduleTitle: 'Data Mining', url: 'm5-data-mining.html#topic-5-3-3', summary: 'Cluster distance is the longest link, so nothing merges unless every member is close to every member', keywords: ['complete linkage', 'farthest neighbour', 'farthest neighbor', 'maximum', 'compact clusters'] }
  ,{ id: 'topic-5-3-4', kind: 'topic', number: '5.3.4', title: 'Average / centroid linkage', module: 'M5', moduleTitle: 'Data Mining', url: 'm5-data-mining.html#topic-5-3-4', summary: 'The mean over all cross-cluster pairs, and the distance between the two cluster means — the other two linkage rules', keywords: ['average linkage', 'centroid linkage', 'upgma', 'mean distance', 'four linkages'] }
  ,{ id: 'topic-5-3-5', kind: 'topic', number: '5.3.5', title: 'Dendrogram construction and reading', module: 'M5', moduleTitle: 'Data Mining', url: 'm5-data-mining.html#topic-5-3-5', summary: 'Every join is drawn at the height where the merge happened, so a horizontal cut gives that many clusters', keywords: ['dendrogram', 'cut height', 'y axis', 'tree', 'reading', 'final', 'exam'] }
  ,{ id: 'topic-5-3-6', kind: 'topic', number: '5.3.6', title: 'Step-by-step worked example', module: 'M5', moduleTitle: 'Data Mining', url: 'm5-data-mining.html#topic-5-3-6', summary: 'The five-point distance matrix of final-exam Question 3, merged one step at a time under all three linkage rules', keywords: ['worked example', 'distance matrix', 'five points', 'trace', 'final', 'exam', 'q3'] }

  ,{ id: 'topic-5-4-1', kind: 'topic', number: '5.4.1', title: 'Averages as energy minimizers', module: 'M5', moduleTitle: 'Data Mining', url: 'm5-data-mining.html#topic-5-4-1', summary: 'The lemma that the mean uniquely minimises one half the sum of squared deviations, with its one-line calculus proof', keywords: ['lemma', 'energy', 'proof', 'minimiser', 'mean', 'derivative', 'sum of squares'] }
  ,{ id: 'topic-5-4-2', kind: 'topic', number: '5.4.2', title: "k-means / Lloyd's method", module: 'M5', moduleTitle: 'Data Mining', url: 'm5-data-mining.html#topic-5-4-2', summary: 'Find k centres minimising the total squared distance, where each cluster is the set of points nearest its own centre', keywords: ['k-means', 'kmeans', 'lloyd', 'llyod', 'generator', 'centre', 'center', 'lab10'] }
  ,{ id: 'topic-5-4-3', kind: 'topic', number: '5.4.3', title: 'The algorithm step by step', module: 'M5', moduleTitle: 'Data Mining', url: 'm5-data-mining.html#topic-5-4-3', summary: 'Initialize, assign every record to its nearest centre, move each centre to its cluster average, test for convergence', keywords: ['assign', 'update', 'pseudocode', 'iteration', 'expectation maximization', 'lab10'] }
  ,{ id: 'topic-5-4-4', kind: 'topic', number: '5.4.4', title: 'Initialization strategies', module: 'M5', moduleTitle: 'Data Mining', url: 'm5-data-mining.html#topic-5-4-4', summary: 'Random records, multiple restarts, domain knowledge and quasi-random sampling — and why the centres must be distinct', keywords: ['initialization', 'restarts', 'random records', 'halton', 'latin hypercube', 'seed', 'lab10'] }
  ,{ id: 'topic-5-4-5', kind: 'topic', number: '5.4.5', title: 'Convergence testing / termination criteria', module: 'M5', moduleTitle: 'Data Mining', url: 'm5-data-mining.html#topic-5-4-5', summary: 'Total discrete cluster variance, the tolerance test on centre movement, and the three-part argument that it must terminate', keywords: ['convergence', 'tolerance', 'cluster variance', 'termination', 'local minimum', 'lab10'] }
  ,{ id: 'topic-5-4-6', kind: 'topic', number: '5.4.6', title: 'Sensitivity to initial generators', module: 'M5', moduleTitle: 'Data Mining', url: 'm5-data-mining.html#topic-5-4-6', summary: 'The same data and the same algorithm reach a local or a global minimum depending only on where the centres started', keywords: ['local minimum', 'global minimum', 'basin of attraction', 'seed', 'iris', 'restarts'] }
  ,{ id: 'topic-5-4-7', kind: 'topic', number: '5.4.7', title: "Computational cost of Lloyd's method", module: 'M5', moduleTitle: 'Data Mining', url: 'm5-data-mining.html#topic-5-4-7', summary: 'Order k times the number of records times the number of iterations, dominated by the nearest-centre search', keywords: ['cost', 'complexity', 'big-o', 'order', 'nearest centre', 'brute force'] }
  ,{ id: 'topic-5-4-8', kind: 'topic', number: '5.4.8', title: 'Choosing k / changing k', module: 'M5', moduleTitle: 'Data Mining', url: 'm5-data-mining.html#topic-5-4-8', summary: 'Sweep k, plot the total cluster variance, and look for the elbow where extra clusters stop buying much', keywords: ['elbow', 'choosing k', 'variance plot', 'iris', 'diminishing returns', 'lab10'] }
  ,{ id: 'topic-5-4-9', kind: 'topic', number: '5.4.9', title: 'Weighted k-means', module: 'M5', moduleTitle: 'Data Mining', url: 'm5-data-mining.html#topic-5-4-9', summary: 'Give each record an importance weight and minimise the weighted cluster variance — the siting problem', keywords: ['weighted', 'weights', 'siting', 'starbucks', 'capital', 'hub', 'population density'] }
  ,{ id: 'topic-5-4-10', kind: 'topic', number: '5.4.10', title: 'Centroid and center of mass', module: 'M5', moduleTitle: 'Data Mining', url: 'm5-data-mining.html#topic-5-4-10', summary: 'The unweighted and weighted update formulas, and why the result always lies inside the convex hull', keywords: ['centroid', 'center of mass', 'centre of mass', 'convex hull', 'rubber band', 'balance'] }
  ,{ id: 'topic-5-4-11', kind: 'topic', number: '5.4.11', title: 'k-means for image compression', module: 'M5', moduleTitle: 'Data Mining', url: 'm5-data-mining.html#topic-5-4-11', summary: 'Cluster the pixels, keep the centres as the palette, and write each pixel back as the centre of its cluster', keywords: ['image compression', 'quantization', 'palette', 'grayscale', 'rgb', 'lab11', 'boat', 'mandrill'] }

  ,{ id: 'topic-5-5-1', kind: 'topic', number: '5.5.1', title: 'Voronoi diagrams', module: 'M5', moduleTitle: 'Data Mining', url: 'm5-data-mining.html#topic-5-5-1', summary: 'Partition space rather than points: every location belongs to its nearest generator, and every wall is a perpendicular bisector', keywords: ['voronoi', 'generator', 'tessellation', 'perpendicular bisector', 'ambulance', 'scipy', 'stripack', 'voro++'] }
  ,{ id: 'topic-5-5-2', kind: 'topic', number: '5.5.2', title: 'Computing Voronoi regions by sampling', module: 'M5', moduleTitle: 'Data Mining', url: 'm5-data-mining.html#topic-5-5-2', summary: 'Pixel-ize the region, map each pixel index to coordinates, and give it to the nearest generator', keywords: ['sampling', 'pixel plot', 'pixelize', 'resolution', 'index map', 'unit square', 'staircase'] }
  ,{ id: 'topic-5-5-3', kind: 'topic', number: '5.5.3', title: 'Delaunay triangulation (as Voronoi dual)', module: 'M5', moduleTitle: 'Data Mining', url: 'm5-data-mining.html#topic-5-5-3', summary: 'Join generators whose cells share a wall and you get a mesh; each Delaunay edge crosses one Voronoi wall at a right angle', keywords: ['delaunay', 'dual', 'mesh', 'triangulation', 'grid generation', 'lab13'] }
  ,{ id: 'topic-5-5-4', kind: 'topic', number: '5.5.4', title: 'Centroidal Voronoi Tessellation (CVT)', module: 'M5', moduleTitle: 'Data Mining', url: 'm5-data-mining.html#topic-5-5-4', summary: 'The special tessellation in which every generator is the centre of mass of its own cell, and the energy it minimises', keywords: ['cvt', 'centroidal', 'centre of mass', 'density', 'energy', 'tessellation'] }
  ,{ id: 'topic-5-5-5', kind: 'topic', number: '5.5.5', title: 'CVT vs. ordinary Voronoi', module: 'M5', moduleTitle: 'Data Mining', url: 'm5-data-mining.html#topic-5-5-5', summary: 'Off-centre generators and uneven slivers become centred generators and near-hexagonal cells of equal mass', keywords: ['hexagonal', 'honeycomb', 'comparison', 'equal area', 'non-uniform density', 'slivers'] }
  ,{ id: 'topic-5-5-6', kind: 'topic', number: '5.5.6', title: 'Computing a CVT', module: 'M5', moduleTitle: 'Data Mining', url: 'm5-data-mining.html#topic-5-5-6', summary: "Lloyd's algorithm again — tessellate, move each generator to its cell's centre of mass, test, repeat", keywords: ['lloyd', 'cvt algorithm', 'steps', 'triangle', 'shewchuk', 'iteration'] }
  ,{ id: 'topic-5-5-7', kind: 'topic', number: '5.5.7', title: "Probabilistic Lloyd's / MacQueen's algorithm", module: 'M5', moduleTitle: 'Data Mining', url: 'm5-data-mining.html#topic-5-5-7', summary: 'Never build the tessellation: scatter random samples, count which generator each is nearest, and average', keywords: ['macqueen', 'mcqueen', 'probabilistic', 'monte carlo', 'sampling density', 'parallel', 'lab11'] }

  ,{ id: 'topic-5-6-1', kind: 'topic', number: '5.6.1', title: 'Terminology and attribute types', module: 'M5', moduleTitle: 'Data Mining', url: 'm5-data-mining.html#topic-5-6-1', summary: 'Instance, attribute set, class label, target function, training and test sets, and the nominal to ratio scale', keywords: ['instance', 'attribute', 'class label', 'target function', 'nominal', 'ordinal', 'interval', 'ratio', 'training set'] }
  ,{ id: 'topic-5-6-2', kind: 'topic', number: '5.6.2', title: 'General approach to classification', module: 'M5', moduleTitle: 'Data Mining', url: 'm5-data-mining.html#topic-5-6-2', summary: 'Train, test, evaluate — plus the confusion matrix that turns predictions into an accuracy and an error rate', keywords: ['confusion matrix', 'accuracy', 'error rate', 'test set', 'learning algorithm', 'scikit-learn'] }
  ,{ id: 'topic-5-6-3', kind: 'topic', number: '5.6.3', title: 'Decision trees: structure', module: 'M5', moduleTitle: 'Data Mining', url: 'm5-data-mining.html#topic-5-6-3', summary: 'Root, internal and leaf nodes, and classification as a walk from root to leaf following the record attribute values', keywords: ['decision tree', 'root node', 'internal node', 'leaf node', 'penguin', 'mammal', 'final', 'exam'] }
  ,{ id: 'topic-5-6-4', kind: 'topic', number: '5.6.4', title: 'Greedy tree construction', module: 'M5', moduleTitle: 'Data Mining', url: 'm5-data-mining.html#topic-5-6-4', summary: 'Finding the optimal tree is exponentially hard, so make the best local choice and never revisit it', keywords: ['greedy', 'inductive', 'suboptimal', 'np-complete', 'local choice', 'irrevocable'] }
  ,{ id: 'topic-5-6-5', kind: 'topic', number: '5.6.5', title: "Hunt's algorithm", module: 'M5', moduleTitle: 'Data Mining', url: 'm5-data-mining.html#topic-5-6-5', summary: 'The recursion: if every record at a node shares a class make it a leaf, otherwise choose a test and recurse on the children', keywords: ['hunt', 'recursion', 'partition', 'test condition', 'child node', 'final', 'exam'] }
  ,{ id: 'topic-5-6-6', kind: 'topic', number: '5.6.6', title: 'Splitting training subsets', module: 'M5', moduleTitle: 'Data Mining', url: 'm5-data-mining.html#topic-5-6-6', summary: 'How binary, nominal, ordinal and continuous attributes are split, worked on the ten-record loan-default set', keywords: ['split', 'binary attribute', 'continuous', 'threshold', 'loan default', 'training subset', 'final', 'exam'] }
  ,{ id: 'topic-5-6-7', kind: 'topic', number: '5.6.7', title: 'Selecting good attributes', module: 'M5', moduleTitle: 'Data Mining', url: 'm5-data-mining.html#topic-5-6-7', summary: 'The class proportion p(i|t), what a pure node is, and why the thing to measure is the impurity of the children', keywords: ['purity', 'impurity', 'homogeneous', 'proportion', 'attribute selection', 'final', 'exam'] }
  ,{ id: 'topic-5-6-8', kind: 'topic', number: '5.6.8', title: 'Impurity measures (Gini, entropy, classification error)', module: 'M5', moduleTitle: 'Data Mining', url: 'm5-data-mining.html#topic-5-6-8', summary: 'Three formulas that all vanish at a pure node and peak at an even split, with the coin-flip intuition for entropy', keywords: ['gini', 'entropy', 'classification error', 'impurity', 'coin flip', 'overstock', 'log2', 'final', 'exam'] }
  ,{ id: 'topic-5-6-9', kind: 'topic', number: '5.6.9', title: 'Information gain', module: 'M5', moduleTitle: 'Data Mining', url: 'm5-data-mining.html#topic-5-6-9', summary: 'Parent impurity minus the weighted average of the children, worked through the fourteen-record play-tennis example', keywords: ['gain', 'information gain', 'delta', 'weighted average', 'play tennis', 'outlook', 'final', 'exam'] }
  ,{ id: 'topic-5-6-10', kind: 'topic', number: '5.6.10', title: 'Nominal attribute splits', module: 'M5', moduleTitle: 'Data Mining', url: 'm5-data-mining.html#topic-5-6-10', summary: 'A three-valued attribute can split three ways or as any of three two-way groupings, and gain quietly prefers more children', keywords: ['nominal', 'multiway split', 'grouping', 'marital status', 'gain ratio', 'final', 'exam'] }
  ,{ id: 'topic-5-6-11', kind: 'topic', number: '5.6.11', title: 'Majority rules / stopping criteria', module: 'M5', moduleTitle: 'Data Mining', url: 'm5-data-mining.html#topic-5-6-11', summary: 'Empty children and records that agree on every attribute but disagree on the label both fall back to the majority class', keywords: ['majority', 'stopping', 'termination', 'empty child', 'identical attributes', 'early stopping', 'overfitting'] }
  ,{ id: 'topic-5-6-12', kind: 'topic', number: '5.6.12', title: 'Multiple decision trees', module: 'M5', moduleTitle: 'Data Mining', url: 'm5-data-mining.html#topic-5-6-12', summary: 'Ask the questions in another order and you get another tree, equally right about the training data — the road to ensembles', keywords: ['multiple trees', 'ensemble', 'random forest', 'question order', 'voting', 'bagging'] }
  ,{ id: 'topic-5-6-13', kind: 'topic', number: '5.6.13', title: 'Neural networks: the artificial neuron', module: 'M5', moduleTitle: 'Data Mining', url: 'm5-data-mining.html#topic-5-6-13', summary: 'Weighted sum minus a threshold, then a non-linear activation function — and why the non-linearity is the whole point', keywords: ['neural network', 'neuron', 'weights', 'threshold', 'bias', 'activation function', 'sigmoid', 'relu', 'layers'] }
  ,{ id: 'topic-5-6-14', kind: 'topic', number: '5.6.14', title: 'Neural networks: the learning process', module: 'M5', moduleTitle: 'Data Mining', url: 'm5-data-mining.html#topic-5-6-14', summary: 'Feedforward, loss, backpropagation, weight update — plus the firing rule and what generalization means for one neuron', keywords: ['backpropagation', 'training', 'loss function', 'firing rule', 'generalization', 'truth table', 'chain rule'] }
  ,{ id: 'topic-5-6-15', kind: 'topic', number: '5.6.15', title: 'Decision trees vs. neural networks', module: 'M5', moduleTitle: 'Data Mining', url: 'm5-data-mining.html#topic-5-6-15', summary: 'White box against black box: interpretability, data appetite, training cost, and when accountability is part of correctness', keywords: ['comparison', 'interpretability', 'black box', 'white box', 'explainable ai', 'xai', 'trade-off'] }

  ,{ id: 'demo-linkage-trace', kind: 'demo', number: '5.3.6', title: 'Agglomerative linkage step-through', module: 'M5', moduleTitle: 'Data Mining', url: 'm5-data-mining.html#demo-linkage-trace', summary: 'Merge the closest clusters one step at a time and watch the dendrogram grow and the distance matrix shrink', keywords: ['dendrogram', 'linkage', 'single', 'complete', 'average', 'step through', 'cut height', 'interactive', 'final'] }
  ,{ id: 'demo-kmeans-lloyd', kind: 'demo', number: '5.4.3', title: 'k-means step-through', module: 'M5', moduleTitle: 'Data Mining', url: 'm5-data-mining.html#demo-kmeans-lloyd', summary: 'Alternate the assignment and update halves of each iteration and watch the energy fall at both', keywords: ['k-means', 'kmeans', 'lloyd', 'step through', 'initialization', 'seed', 'elbow', 'interactive'] }
  ,{ id: 'demo-voronoi-cvt', kind: 'demo', number: '5.5.2', title: 'Voronoi and CVT pixel sampler', module: 'M5', moduleTitle: 'Data Mining', url: 'm5-data-mining.html#demo-voronoi-cvt', summary: 'Sample the unit square at your chosen resolution, then iterate the generators toward a centroidal tessellation', keywords: ['voronoi', 'cvt', 'pixel plot', 'sampling', 'resolution', 'density', 'lloyd', 'interactive'] }
  ,{ id: 'demo-impurity-curve', kind: 'demo', number: '5.6.8', title: 'Impurity measures explorer', module: 'M5', moduleTitle: 'Data Mining', url: 'm5-data-mining.html#demo-impurity-curve', summary: 'Slide the class share and read Gini, classification error and entropy at every point between 0 and 1', keywords: ['gini', 'entropy', 'classification error', 'curve', 'p1', 'slider', 'interactive'] }
  ,{ id: 'demo-impurity-gain', kind: 'demo', number: '5.6.9', title: 'Impurity and gain calculator', module: 'M5', moduleTitle: 'Data Mining', url: 'm5-data-mining.html#demo-impurity-gain', summary: 'Score every candidate root split on a real training set and see the child breakdown behind each gain', keywords: ['gain', 'information gain', 'gini', 'entropy', 'loan', 'play tennis', 'tumour', 'calculator', 'final', 'interactive'] }
  ,{ id: 'demo-hunt-tree', kind: 'demo', number: '5.6.5', title: "Hunt's algorithm tree builder", module: 'M5', moduleTitle: 'Data Mining', url: 'm5-data-mining.html#demo-hunt-tree', summary: 'Expand one node per step and watch the greedy recursion turn a training table into a finished decision tree', keywords: ['hunt', 'decision tree', 'greedy', 'step through', 'builder', 'early stopping', 'interactive', 'final'] }

  /* =======================================================================
     M6 TOPIC ENTRIES — appended by the M6 author
     ======================================================================= */

  ,{
    id:          'topic-6-1-1',
    kind:        'topic',
    number:      '6.1.1',
    title:       'Representing points',
    module:      'M6',
    moduleTitle: 'Computational Geometry',
    url:         'm6-computational-geometry.html#topic-6-1-1',
    summary:     'Store a point\'s coordinates in one variable so every formula works unchanged in any dimension',
    keywords:    ['point', 'coordinates', 'cartesian', 'numpy array', 'atoms of geometry']
  }
  ,{
    id:          'topic-6-1-2',
    kind:        'topic',
    number:      '6.1.2',
    title:       'Representing lines (parametric form)',
    module:      'M6',
    moduleTitle: 'Computational Geometry',
    url:         'm6-computational-geometry.html#topic-6-1-2',
    summary:     'Two points give a direction vector, and p(s) = p1 + s(p2 - p1) walks along the line',
    keywords:    ['line', 'parametric', 'direction vector', 'p of s', 'final', 'exam']
  }
  ,{
    id:          'topic-6-1-3',
    kind:        'topic',
    number:      '6.1.3',
    title:       'The s coordinate along a line',
    module:      'M6',
    moduleTitle: 'Computational Geometry',
    url:         'm6-computational-geometry.html#topic-6-1-3',
    summary:     'One number indexes every point of a line; 0 to 1 is the segment and outside that is off each end',
    keywords:    ['s coordinate', 'parameter', 'line segment', 'index', 'final']
  }
  ,{
    id:          'topic-6-1-4',
    kind:        'topic',
    number:      '6.1.4',
    title:       'Distance via the dot product',
    module:      'M6',
    moduleTitle: 'Computational Geometry',
    url:         'm6-computational-geometry.html#topic-6-1-4',
    summary:     's = (r dot v) / (v dot v) recovers the parameter of a point, and unlike the distance ratio it keeps the sign',
    keywords:    ['dot product', 'projection', 'line_parameter_s', 'distance ratio', 'final']
  }
  ,{
    id:          'topic-6-1-5',
    kind:        'topic',
    number:      '6.1.5',
    title:       'Sign and interpretation of s',
    module:      'M6',
    moduleTitle: 'Computational Geometry',
    url:         'm6-computational-geometry.html#topic-6-1-5',
    summary:     's is a signed relative distance, not a distance: s = 1 is always p2 however far away p2 is',
    keywords:    ['sign of s', 'cos alpha', 'signed relative distance', 'scale', 'final']
  }
  ,{
    id:          'topic-6-1-6',
    kind:        'topic',
    number:      '6.1.6',
    title:       'Vectorized computation',
    module:      'M6',
    moduleTitle: 'Computational Geometry',
    url:         'm6-computational-geometry.html#topic-6-1-6',
    summary:     'The same formula runs in any dimension and on a whole array, if you contract the right axis',
    keywords:    ['vectorized', 'numpy', 'broadcasting', 'repmat', 'batch', '3d']
  }
  ,{
    id:          'topic-6-1-7',
    kind:        'topic',
    number:      '6.1.7',
    title:       'Points off lines',
    module:      'M6',
    moduleTitle: 'Computational Geometry',
    url:         'm6-computational-geometry.html#topic-6-1-7',
    summary:     'For a point off the line the dot product returns the nearest point\'s s; the distance ratio returns something useless',
    keywords:    ['off the line', 'nearest point', 'perpendicular foot', 'circle', 'final']
  }
  ,{
    id:          'topic-6-1-8',
    kind:        'topic',
    number:      '6.1.8',
    title:       'Distance from a point to a line',
    module:      'M6',
    moduleTitle: 'Computational Geometry',
    url:         'm6-computational-geometry.html#topic-6-1-8',
    summary:     'Rotate the direction vector to get a unit normal w, then t = w dot r is the signed distance to the line',
    keywords:    ['t coordinate', 'perpendicular', 'normal vector', 'line_parameter_t', 'distance to line', 'final']
  }
  ,{
    id:          'topic-6-1-9',
    kind:        'topic',
    number:      '6.1.9',
    title:       'Perpendicular axis, decomposition',
    module:      'M6',
    moduleTitle: 'Computational Geometry',
    url:         'm6-computational-geometry.html#topic-6-1-9',
    summary:     'Unit vectors v and w give an orthonormal frame on the line, so any point splits into s hat along it and t across it',
    keywords:    ['orthonormal', 'decomposition', 'composition', 's hat', 'line_side', 'orientation']
  }
  ,{
    id:          'topic-6-2-1',
    kind:        'topic',
    number:      '6.2.1',
    title:       'Sides and angles',
    module:      'M6',
    moduleTitle: 'Computational Geometry',
    url:         'm6-computational-geometry.html#topic-6-2-1',
    summary:     'Side lengths by Pythagoras, interior angles by the law of cosines, with arccos clipped to avoid nan',
    keywords:    ['side length', 'law of cosines', 'angles', 'arccos', 'lab12', 'triangle_angles']
  }
  ,{
    id:          'topic-6-2-2',
    kind:        'topic',
    number:      '6.2.2',
    title:       'Centroid',
    module:      'M6',
    moduleTitle: 'Computational Geometry',
    url:         'm6-computational-geometry.html#topic-6-2-2',
    summary:     'The centroid is the plain average of the three vertices, where the three medians meet',
    keywords:    ['centroid', 'median', 'average of vertices', 'lab12', 'triangle_centroid']
  }
  ,{
    id:          'topic-6-2-3',
    kind:        'topic',
    number:      '6.2.3',
    title:       'Area',
    module:      'M6',
    moduleTitle: 'Computational Geometry',
    url:         'm6-computational-geometry.html#topic-6-2-3',
    summary:     'Half the magnitude of the cross product of two sides, or half the three by three determinant',
    keywords:    ['area', 'cross product', 'determinant', 'shoelace', 'lab12', 'triangle_area']
  }
  ,{
    id:          'topic-6-2-4',
    kind:        'topic',
    number:      '6.2.4',
    title:       'Cross product in Python',
    module:      'M6',
    moduleTitle: 'Computational Geometry',
    url:         'm6-computational-geometry.html#topic-6-2-4',
    summary:     'np.cross on 3-D vectors with a zero z, and np.linalg.norm rather than the np.norm the slide names',
    keywords:    ['np.cross', 'np.linalg.norm', 'numpy', 'area of triangle', 'errata']
  }
  ,{
    id:          'topic-6-2-5',
    kind:        'topic',
    number:      '6.2.5',
    title:       'Orientation (clockwise / counter-clockwise)',
    module:      'M6',
    moduleTitle: 'Computational Geometry',
    url:         'm6-computational-geometry.html#topic-6-2-5',
    summary:     'The sign of the cross product says which way the vertices were listed, which is why the area formulas need absolute values',
    keywords:    ['orientation', 'counterclockwise', 'ccw', 'clockwise', 'sign', 'signed area']
  }
  ,{
    id:          'topic-6-2-6',
    kind:        'topic',
    number:      '6.2.6',
    title:       'Inside or outside a triangle',
    module:      'M6',
    moduleTitle: 'Computational Geometry',
    url:         'm6-computational-geometry.html#topic-6-2-6',
    summary:     'A point is inside exactly when it is to the left of all three sides walked counter-clockwise',
    keywords:    ['point in triangle', 'triangle_contains', 'line_side', 'containment', 'lab12']
  }
  ,{
    id:          'topic-6-2-7',
    kind:        'topic',
    number:      '6.2.7',
    title:       'Walking along vertices',
    module:      'M6',
    moduleTitle: 'Computational Geometry',
    url:         'm6-computational-geometry.html#topic-6-2-7',
    summary:     'Walk the boundary counter-clockwise and your left hand points inward, so an inside point is left of every side',
    keywords:    ['walking', 'left hand rule', 'boundary', 'inside outside']
  }
  ,{
    id:          'topic-6-2-8',
    kind:        'topic',
    number:      '6.2.8',
    title:       'Randomly sampling a triangle (3 algorithms)',
    module:      'M6',
    moduleTitle: 'Computational Geometry',
    url:         'm6-computational-geometry.html#topic-6-2-8',
    summary:     'Barycentric weights that are non-negative and sum to one, drawn so the points spread evenly',
    keywords:    ['sampling', 'barycentric', 'alpha beta gamma', 'rand', 'lab12', 'uniform', 'triangle_sample']
  }
  ,{
    id:          'topic-6-2-9',
    kind:        'topic',
    number:      '6.2.9',
    title:       'Distance from a point to a triangle',
    module:      'M6',
    moduleTitle: 'Computational Geometry',
    url:         'm6-computational-geometry.html#topic-6-2-9',
    summary:     'The region code picks the case: inside, nearest an edge, or nearest a vertex',
    keywords:    ['distance to triangle', 'clamped projection', 'nearest feature', 'lab12', 'seven twentyfour']
  }
  ,{
    id:          'topic-6-2-10',
    kind:        'topic',
    number:      '6.2.10',
    title:       'Region codes (001, 010, 100, 011, 101, 110)',
    module:      'M6',
    moduleTitle: 'Computational Geometry',
    url:         'm6-computational-geometry.html#topic-6-2-10',
    summary:     'Three line_side bits label seven regions around a triangle; 000 is impossible',
    keywords:    ['region code', 'inout2', 'seven regions', '111', '000', 'impossible']
  }
  ,{
    id:          'topic-6-3-1',
    kind:        'topic',
    number:      '6.3.1',
    title:       'Representing a polygon',
    module:      'M6',
    moduleTitle: 'Computational Geometry',
    url:         'm6-computational-geometry.html#topic-6-3-1',
    summary:     'Store the polygon as a linked list of prev, index, next, ear, x and y so a vertex can be deleted with two pointer writes',
    keywords:    ['linked list', 'prev next', 'polygon representation', 'vertex record', 'ear flag']
  }
  ,{
    id:          'topic-6-3-2',
    kind:        'topic',
    number:      '6.3.2',
    title:       'Convex polygons',
    module:      'M6',
    moduleTitle: 'Computational Geometry',
    url:         'm6-computational-geometry.html#topic-6-3-2',
    summary:     'Convex means the whole segment between any two points of the shape stays inside it',
    keywords:    ['convex', 'dents', 'segment', 'definition of convexity']
  }
  ,{
    id:          'topic-6-3-3',
    kind:        'topic',
    number:      '6.3.3',
    title:       'Decomposing polygons into triangles',
    module:      'M6',
    moduleTitle: 'Computational Geometry',
    url:         'm6-computational-geometry.html#topic-6-3-3',
    summary:     'Area, containment, distance, centroid and sampling all reduce to the same question on each triangle',
    keywords:    ['decompose', 'triangulate', 'reduce to triangles', 'combine']
  }
  ,{
    id:          'topic-6-3-4',
    kind:        'topic',
    number:      '6.3.4',
    title:       'Triangulation strategies',
    module:      'M6',
    moduleTitle: 'Computational Geometry',
    url:         'm6-computational-geometry.html#topic-6-3-4',
    summary:     'N vertices always give N-2 triangles from N-3 diagonals, found by decrease and conquer',
    keywords:    ['triangulation', 'N minus 2', 'diagonals', 'decrease and conquer', 'final', 'exam']
  }
  ,{
    id:          'topic-6-3-5',
    kind:        'topic',
    number:      '6.3.5',
    title:       '"Polygons have ears" theorem',
    module:      'M6',
    moduleTitle: 'Computational Geometry',
    url:         'm6-computational-geometry.html#topic-6-3-5',
    summary:     'Meisters 1975: any simple polygon with four or more vertices has at least two ears, so there is always something to clip',
    keywords:    ['ear', 'meisters', 'theorem', 'simple polygon', 'two ears', 'reflex']
  }
  ,{
    id:          'topic-6-3-6',
    kind:        'topic',
    number:      '6.3.6',
    title:       'Ear slicing / ear clipping',
    module:      'M6',
    moduleTitle: 'Computational Geometry',
    url:         'm6-computational-geometry.html#topic-6-3-6',
    summary:     'Find three consecutive vertices whose triangle is counter-clockwise and empty, add the diagonal, delete the middle one, repeat',
    keywords:    ['ear clipping', 'ear slicing', 'triangulate polygon', 'final', 'exam', 'diagonal']
  }
  ,{
    id:          'topic-6-3-7',
    kind:        'topic',
    number:      '6.3.7',
    title:       'Ear removal task sequence',
    module:      'M6',
    moduleTitle: 'Computational Geometry',
    url:         'm6-computational-geometry.html#topic-6-3-7',
    summary:     'Five writes per clipped ear: the diagonal, the dead index, both pointers, and the two neighbours\' ear flags',
    keywords:    ['ear removal', 'pointer update', 'task list', 'triangle list', 'bookkeeping']
  }
  ,{
    id:          'topic-6-3-8',
    kind:        'topic',
    number:      '6.3.8',
    title:       'Polygon properties (area, centroid)',
    module:      'M6',
    moduleTitle: 'Computational Geometry',
    url:         'm6-computational-geometry.html#topic-6-3-8',
    summary:     'Perimeter and angles need no triangulation; area is a sum and the centroid is an area-weighted mean',
    keywords:    ['polygon area', 'polygon centroid', 'perimeter', 'atan2', 'polygon_angles', 'area weighted']
  }
  ,{
    id:          'topic-6-3-9',
    kind:        'topic',
    number:      '6.3.9',
    title:       'Sampling polygons',
    module:      'M6',
    moduleTitle: 'Computational Geometry',
    url:         'm6-computational-geometry.html#topic-6-3-9',
    summary:     'Pick a triangle with probability proportional to its area, then sample inside it',
    keywords:    ['polygon sampling', 'area weighted', 'cumulative sum', 'inverse transform', 'polygon_sample']
  }
  ,{
    id:          'topic-6-4-1',
    kind:        'topic',
    number:      '6.4.1',
    title:       'Shape of data / bounding box',
    module:      'M6',
    moduleTitle: 'Computational Geometry',
    url:         'm6-computational-geometry.html#topic-6-4-1',
    summary:     'The axis-aligned box is four numbers and one pass, and it is almost never tight',
    keywords:    ['bounding box', 'range of the data', 'min max', 'axis aligned', 'scattered data']
  }
  ,{
    id:          'topic-6-4-2',
    kind:        'topic',
    number:      '6.4.2',
    title:       'Convex hull definition and convexity',
    module:      'M6',
    moduleTitle: 'Computational Geometry',
    url:         'm6-computational-geometry.html#topic-6-4-2',
    summary:     'The convex polygon of smallest perimeter containing the points, equivalently the smallest convex set containing them',
    keywords:    ['convex hull', 'smallest perimeter', 'fence', 'wrapping', 'rope', 'definition']
  }
  ,{
    id:          'topic-6-4-3',
    kind:        'topic',
    number:      '6.4.3',
    title:       'The gift-wrapping algorithm (step by step)',
    module:      'M6',
    moduleTitle: 'Computational Geometry',
    url:         'm6-computational-geometry.html#topic-6-4-3',
    summary:     'Start at the leftmost point and repeatedly take the edge that leaves every other point on its left',
    keywords:    ['gift wrapping', 'jarvis march', 'leftmost point', 'hull edge', 'step by step']
  }
  ,{
    id:          'topic-6-4-4',
    kind:        'topic',
    number:      '6.4.4',
    title:       'Convex hull in Python (SciPy)',
    module:      'M6',
    moduleTitle: 'Computational Geometry',
    url:         'm6-computational-geometry.html#topic-6-4-4',
    summary:     'ConvexHull gives edges in simplices and ordered indices in vertices; in 2-D area is the perimeter',
    keywords:    ['scipy', 'ConvexHull', 'simplices', 'vertices', 'hull.area', 'errata']
  }
  ,{
    id:          'topic-6-4-5',
    kind:        'topic',
    number:      '6.4.5',
    title:       'Applications beyond geometry',
    module:      'M6',
    moduleTitle: 'Computational Geometry',
    url:         'm6-computational-geometry.html#topic-6-4-5',
    summary:     'The hull describes where the data actually live, generates plausible synthetic points, and screens containment cheaply',
    keywords:    ['applications', 'higher dimensions', 'convhulln', 'synthetic data', 'extrapolation', 'support']
  }
  ,{
    id:          'topic-6-5-1',
    kind:        'topic',
    number:      '6.5.1',
    title:       'The point-set problem',
    module:      'M6',
    moduleTitle: 'Computational Geometry',
    url:         'm6-computational-geometry.html#topic-6-5-1',
    summary:     'Add non-crossing lines until you cannot, and you always end with a triangulation of 2n-2-h triangles',
    keywords:    ['point set', 'triangulation count', 'euler', '2n-2-h', 'lab13', 'many triangulations']
  }
  ,{
    id:          'topic-6-5-2',
    kind:        'topic',
    number:      '6.5.2',
    title:       'What makes a "good" triangulation',
    module:      'M6',
    moduleTitle: 'Computational Geometry',
    url:         'm6-computational-geometry.html#topic-6-5-2',
    summary:     'Shortest total edge length if the edges are roads, largest small angles if the triangles are elements',
    keywords:    ['good triangulation', 'sliver', 'small angles', 'criterion', 'lab13']
  }
  ,{
    id:          'topic-6-5-3',
    kind:        'topic',
    number:      '6.5.3',
    title:       'Delaunay triangulation',
    module:      'M6',
    moduleTitle: 'Computational Geometry',
    url:         'm6-computational-geometry.html#topic-6-5-3',
    summary:     'The triangulation whose smallest angle is as large as any triangulation of the same points can make it',
    keywords:    ['delaunay', 'maximin angle', 'empty circumcircle', 'lawson flip', 'scipy', 'voronoi', 'lab13']
  }
  ,{
    id:          'topic-6-5-4',
    kind:        'topic',
    number:      '6.5.4',
    title:       'Integration over irregular domains',
    module:      'M6',
    moduleTitle: 'Computational Geometry',
    url:         'm6-computational-geometry.html#topic-6-5-4',
    summary:     'The hand outline: the function is trivial and the region is the problem, so triangulate the region',
    keywords:    ['irregular domain', 'hand', 'area as an integral', 'volume', 'lab13']
  }
  ,{
    id:          'topic-6-5-5',
    kind:        'topic',
    number:      '6.5.5',
    title:       'Approximate integration over triangles',
    module:      'M6',
    moduleTitle: 'Computational Geometry',
    url:         'm6-computational-geometry.html#topic-6-5-5',
    summary:     'Estimate the integral over one general triangle as a weighted average of a few function values',
    keywords:    ['quadrature', 'monte carlo', 'weighted average', 'one over root n', 'lab12', 'lab13']
  }
  ,{
    id:          'topic-6-5-6',
    kind:        'topic',
    number:      '6.5.6',
    title:       'Quadrature rules',
    module:      'M6',
    moduleTitle: 'Computational Geometry',
    url:         'm6-computational-geometry.html#topic-6-5-6',
    summary:     'A rule is n points and n weights; its precision is the highest polynomial degree it integrates exactly',
    keywords:    ['quadrature rule', 'weights', 'precision', 'unit triangle', 'T01', 'lab12']
  }
  ,{
    id:          'topic-6-5-7',
    kind:        'topic',
    number:      '6.5.7',
    title:       'Rule of precision 1',
    module:      'M6',
    moduleTitle: 'Computational Geometry',
    url:         'm6-computational-geometry.html#topic-6-5-7',
    summary:     'Average the function at the three vertices, or evaluate it once at the centroid; both are exact for linears',
    keywords:    ['vertex rule', 'precision 1', 'centroid rule', 'three points', 'lab12']
  }
  ,{
    id:          'topic-6-5-8',
    kind:        'topic',
    number:      '6.5.8',
    title:       'Rule of precision 4 / higher order',
    module:      'M6',
    moduleTitle: 'Computational Geometry',
    url:         'm6-computational-geometry.html#topic-6-5-8',
    summary:     'Six points and two shared weights integrate every polynomial through degree four exactly',
    keywords:    ['precision 4', 'six points', 'alpha beta gamma delta', 'weights u v', 'higher order', 'lab12']
  }
  ,{
    id:          'topic-6-5-9',
    kind:        'topic',
    number:      '6.5.9',
    title:       'Linear map to a general triangle',
    module:      'M6',
    moduleTitle: 'Computational Geometry',
    url:         'm6-computational-geometry.html#topic-6-5-9',
    summary:     '(X,Y) = Ax + By + C(1-x-y) carries the rule off T01; the weights survive, the area factor does not',
    keywords:    ['linear map', 'T01 to TABC', 'barycentric', 'centroid check', 'lab13']
  }
  ,{
    id:          'topic-6-5-10',
    kind:        'topic',
    number:      '6.5.10',
    title:       'Piecewise-linear quadrature',
    module:      'M6',
    moduleTitle: 'Computational Geometry',
    url:         'm6-computational-geometry.html#topic-6-5-10',
    summary:     'Integrating the P1 interpolant gives area times the mean of the three vertex values, which is not the centroid rule',
    keywords:    ['piecewise linear', 'P1 interpolant', 'vertex average', 'centroid rule', 'lab13', 'errata']
  }
  ,{
    id:          'topic-6-5-11',
    kind:        'topic',
    number:      '6.5.11',
    title:       'Constructing a field from scattered sensor data',
    module:      'M6',
    moduleTitle: 'Computational Geometry',
    url:         'm6-computational-geometry.html#topic-6-5-11',
    summary:     'Delaunay plus a linear fit per triangle gives a continuous field, but only over the convex hull of the sensors',
    keywords:    ['scattered data', 'sensor', 'interpolant', 'pollution plume', 'hull coverage', 'lab13']
  }
  ,{
    id:          'topic-6-5-12',
    kind:        'topic',
    number:      '6.5.12',
    title:       'Gradient estimation on a triangulation',
    module:      'M6',
    moduleTitle: 'Computational Geometry',
    url:         'm6-computational-geometry.html#topic-6-5-12',
    summary:     'One 3x3 solve per triangle gives a constant gradient, and a sliver manufactures a fake hotspot',
    keywords:    ['gradient', 'P1 gradient', 'finite element', 'hotspot', 'sliver', 'lab13']
  }
  ,{
    id:          'demo-line-parameter',
    kind:        'demo',
    number:      '6.1.8',
    title:       'The s and t coordinates of a point',
    module:      'M6',
    moduleTitle: 'Computational Geometry',
    url:         'm6-computational-geometry.html#demo-line-parameter',
    summary:     'Step through the six lines of working that turn a point\'s coordinates into an s along a line and a t across it',
    keywords:    ['s and t', 'dot product', 'perpendicular', 'final exam question 1', 'step through', 'interactive']
  }
  ,{
    id:          'demo-triangle-explorer',
    kind:        'demo',
    number:      '6.2.6',
    title:       'Triangle properties and region code',
    module:      'M6',
    moduleTitle: 'Computational Geometry',
    url:         'm6-computational-geometry.html#demo-triangle-explorer',
    summary:     'Move a test point and watch the sides, angles, area, centroid, region code and distance all update',
    keywords:    ['triangle', 'region code', 'centroid', 'area', 'angles', 'inside outside', 'interactive']
  }
  ,{
    id:          'demo-triangle-sampler',
    kind:        'demo',
    number:      '6.2.8',
    title:       'Three ways to sample a triangle',
    module:      'M6',
    moduleTitle: 'Computational Geometry',
    url:         'm6-computational-geometry.html#demo-triangle-sampler',
    summary:     'Count how many samples land in each quarter of the triangle and see which of the three algorithms is biased',
    keywords:    ['sampling', 'barycentric', 'uniform', 'lab12', 'monte carlo', 'bias', 'interactive']
  }
  ,{
    id:          'demo-ear-clipping',
    kind:        'demo',
    number:      '6.3.6',
    title:       'Ear clipping step-through',
    module:      'M6',
    moduleTitle: 'Computational Geometry',
    url:         'm6-computational-geometry.html#demo-ear-clipping',
    summary:     'Watch the linked list update as each ear is tested and clipped, on the exam polygon or a twelve-vertex comb',
    keywords:    ['ear clipping', 'triangulation', 'linked list', 'polygon', 'final exam', 'step through']
  }
  ,{
    id:          'demo-gift-wrapping',
    kind:        'demo',
    number:      '6.4.3',
    title:       'Gift wrapping step-through',
    module:      'M6',
    moduleTitle: 'Computational Geometry',
    url:         'm6-computational-geometry.html#demo-gift-wrapping',
    summary:     'Count the points on the wrong side of every candidate edge and watch the hull close',
    keywords:    ['convex hull', 'gift wrapping', 'jarvis', 'bounding box', 'step through', 'interactive']
  }
  ,{
    id:          'demo-delaunay-flips',
    kind:        'demo',
    number:      '6.5.3',
    title:       'Delaunay by edge flips',
    module:      'M6',
    moduleTitle: 'Computational Geometry',
    url:         'm6-computational-geometry.html#demo-delaunay-flips',
    summary:     'Start from an arbitrary triangulation and flip failing diagonals until the smallest angle cannot improve',
    keywords:    ['delaunay', 'flip', 'lawson', 'in circle', 'min angle', 'step through']
  }
  ,{
    id:          'demo-triangle-quadrature',
    kind:        'demo',
    number:      '6.5.8',
    title:       'Quadrature step-through',
    module:      'M6',
    moduleTitle: 'Computational Geometry',
    url:         'm6-computational-geometry.html#demo-triangle-quadrature',
    summary:     'Add one quadrature point at a time and compare the finished estimate against an accurate reference',
    keywords:    ['quadrature', 'precision', 'weights', 'vertex rule', 'precision 4', 'step through']
  }
  ,{
    id:          'demo-scattered-field',
    kind:        'demo',
    number:      '6.5.12',
    title:       'Scattered sensor field',
    module:      'M6',
    moduleTitle: 'Computational Geometry',
    url:         'm6-computational-geometry.html#demo-scattered-field',
    summary:     'Triangulate random sensors, fit a linear field per triangle, integrate, and find the missing ten per cent',
    keywords:    ['lab13', 'sensor', 'delaunay', 'gradient', 'integral', 'hull coverage', 'interactive']
  }

  /* =======================================================================
     M7 TOPIC ENTRIES — appended by the M7 author
     ======================================================================= */
  ,{
    id: 'topic-7-1-1',
    kind: 'topic',
    number: '7.1.1',
    title: 'What is discrete optimization?',
    module: 'M7',
    moduleTitle: 'Discrete Optimization',
    url: 'm7-discrete-optimization.html#topic-7-1-1',
    summary: 'Optimizing over a finite set instead of the real line, so searching replaces differentiating',
    keywords: ['discrete optimization', 'combinatorial optimization', 'continuous', 'integer variables', 'binary', 'zero one']
  }
  ,{
    id: 'topic-7-1-2',
    kind: 'topic',
    number: '7.1.2',
    title: 'Standard methods for discrete optimization',
    module: 'M7',
    moduleTitle: 'Discrete Optimization',
    url: 'm7-discrete-optimization.html#topic-7-1-2',
    summary: 'The seven families named in the slides and what tells them apart: LP, QP, NLP, DP, annealing, branch and bound, genetic',
    keywords: ['linear programming', 'quadratic programming', 'nonlinear', 'dynamic programming', 'simulated annealing', 'branch and bound', 'genetic algorithm']
  }
  ,{
    id: 'topic-7-1-3',
    kind: 'topic',
    number: '7.1.3',
    title: 'Example problem catalog',
    module: 'M7',
    moduleTitle: 'Discrete Optimization',
    url: 'm7-discrete-optimization.html#topic-7-1-3',
    summary: 'Knapsack, travelling salesman and crew scheduling — three word problems with the same linear shape',
    keywords: ['knapsack', 'hitchhiker', 'travelling salesman', 'tsp', 'crew scheduling', 'rostering', 'storage budget']
  }
  ,{
    id: 'topic-7-2-1',
    kind: 'topic',
    number: '7.2.1',
    title: 'The diet problem',
    module: 'M7',
    moduleTitle: 'Discrete Optimization',
    url: 'm7-discrete-optimization.html#topic-7-2-1',
    summary: 'Six foods, three nutrition minimums and six palatability limits: the cheapest diet a student will actually eat',
    keywords: ['diet problem', 'oatmeal', 'pork and beans', 'calcium', 'protein', 'energy', 'servings', 'lab14']
  }
  ,{
    id: 'topic-7-2-2',
    kind: 'topic',
    number: '7.2.2',
    title: 'The transportation problem',
    module: 'M7',
    moduleTitle: 'Discrete Optimization',
    url: 'm7-discrete-optimization.html#topic-7-2-2',
    summary: 'Two plants, three warehouses and six routes: minimize shipping cost subject to supply and demand',
    keywords: ['transportation problem', 'shipping', 'salt lake city', 'denver', 'warehouse', 'supply', 'demand', 'tons']
  }
  ,{
    id: 'topic-7-2-3',
    kind: 'topic',
    number: '7.2.3',
    title: 'The blending problem',
    module: 'M7',
    moduleTitle: 'Discrete Optimization',
    url: 'm7-discrete-optimization.html#topic-7-2-3',
    summary: 'Split 14 kg of saccharin and 18 kg of dextrose between two sweeteners so that profit is largest',
    keywords: ['blending problem', 'saccharin', 'dextrose', 'sweetener', 'lo-sugar', 'profit', 'mixture']
  }
  ,{
    id: 'topic-7-2-4',
    kind: 'topic',
    number: '7.2.4',
    title: 'Mathematical formulation',
    module: 'M7',
    moduleTitle: 'Discrete Optimization',
    url: 'm7-discrete-optimization.html#topic-7-2-4',
    summary: 'Turning each sentence of a word problem into one linear inequality, line by line, for the diet problem',
    keywords: ['formulation', 'modelling', 'inequality', 'translate', 'word problem', 'constraint count', 'lab14']
  }
  ,{
    id: 'topic-7-2-5',
    kind: 'topic',
    number: '7.2.5',
    title: 'General LP problem',
    module: 'M7',
    moduleTitle: 'Discrete Optimization',
    url: 'm7-discrete-optimization.html#topic-7-2-5',
    summary: 'Maximize or minimize c1x1 + … + cnxn subject to m linear constraints: the objective function and the constraints defined',
    keywords: ['general lp', 'objective function', 'constraints', 'linear program', 'definition', 'lab14']
  }
  ,{
    id: 'topic-7-2-6',
    kind: 'topic',
    number: '7.2.6',
    title: 'Standard form',
    module: 'M7',
    moduleTitle: 'Discrete Optimization',
    url: 'm7-discrete-optimization.html#topic-7-2-6',
    summary: 'Maximize, keep every variable non-negative, and write every other constraint with less-than-or-equal',
    keywords: ['standard form', 'convert min to max', 'negate', 'multiply by minus one', 'non-negativity', 'lab14']
  }
  ,{
    id: 'topic-7-2-7',
    kind: 'topic',
    number: '7.2.7',
    title: 'Matrix representation of standard form',
    module: 'M7',
    moduleTitle: 'Discrete Optimization',
    url: 'm7-discrete-optimization.html#topic-7-2-7',
    summary: 'Maximize c transpose x subject to Ax ≤ b and x ≥ 0, with feasible and optimal solutions defined',
    keywords: ['matrix form', 'ax leq b', 'feasible solution', 'optimal solution', 'vector notation', 'feasibility check']
  }
  ,{
    id: 'topic-7-3-1',
    kind: 'topic',
    number: '7.3.1',
    title: 'LP with two unknowns (graphical solution)',
    module: 'M7',
    moduleTitle: 'Discrete Optimization',
    url: 'm7-discrete-optimization.html#topic-7-3-1',
    summary: 'Draw the constraints, shade the polyhedron, and read the maximum off the boundary — it is always at a corner',
    keywords: ['graphical solution', 'two variables', 'polyhedron', 'boundary', 'contour', 'lp visualizer']
  }
  ,{
    id: 'topic-7-3-2',
    kind: 'topic',
    number: '7.3.2',
    title: 'Feasible region',
    module: 'M7',
    moduleTitle: 'Discrete Optimization',
    url: 'm7-discrete-optimization.html#topic-7-3-2',
    summary: 'An intersection of half-planes is a convex polyhedron, and an optimum always sits at one of its extreme points',
    keywords: ['feasible region', 'convex', 'polyhedron', 'extreme point', 'vertex', 'theorem', 'half-plane', 'lab14']
  }
  ,{
    id: 'topic-7-3-3',
    kind: 'topic',
    number: '7.3.3',
    title: 'Redundant constraints',
    module: 'M7',
    moduleTitle: 'Discrete Optimization',
    url: 'm7-discrete-optimization.html#topic-7-3-3',
    summary: 'A constraint with positive slack at every vertex removes no feasible point but still costs work',
    keywords: ['redundant constraint', 'slack at every vertex', 'not binding', 'delete constraint', '9.6']
  }
  ,{
    id: 'topic-7-3-4',
    kind: 'topic',
    number: '7.3.4',
    title: 'Empty feasible set / no feasible solution',
    module: 'M7',
    moduleTitle: 'Discrete Optimization',
    url: 'm7-discrete-optimization.html#topic-7-3-4',
    summary: 'When two constraints conflict the half-planes never overlap, so there is no feasible and no optimal solution',
    keywords: ['empty feasible set', 'infeasible', 'no solution', 'conflicting constraints', 'overlap']
  }
  ,{
    id: 'topic-7-3-5',
    kind: 'topic',
    number: '7.3.5',
    title: 'Unbounded feasible region',
    module: 'M7',
    moduleTitle: 'Discrete Optimization',
    url: 'm7-discrete-optimization.html#topic-7-3-5',
    summary: 'The same open wedge has no maximum but does have a minimum, 11 at the vertex (3, 2)',
    keywords: ['unbounded', 'no maximum', 'open region', 'wedge', 'minimum at a vertex', 'bounded empty unbounded']
  }
  ,{
    id: 'topic-7-3-6',
    kind: 'topic',
    number: '7.3.6',
    title: 'Uniqueness of the optimum',
    module: 'M7',
    moduleTitle: 'Discrete Optimization',
    url: 'm7-discrete-optimization.html#topic-7-3-6',
    summary: 'When the objective lies flat along an edge, every point of that edge is optimal and the answer is not unique',
    keywords: ['uniqueness', 'multiple optima', 'degenerate', 'edge of optima', 'ties', 'alternative optimum']
  }
  ,{
    id: 'topic-7-4-1',
    kind: 'topic',
    number: '7.4.1',
    title: 'Slack variables',
    module: 'M7',
    moduleTitle: 'Discrete Optimization',
    url: 'm7-discrete-optimization.html#topic-7-4-1',
    summary: 'Add a non-negative variable to each inequality to make it an equation; it measures the unused resource',
    keywords: ['slack variable', 'inequality to equation', 'unused resource', 'u and v', 'take up the slack', 'lab14']
  }
  ,{
    id: 'topic-7-4-2',
    kind: 'topic',
    number: '7.4.2',
    title: 'Slack variables and the optimal solution',
    module: 'M7',
    moduleTitle: 'Discrete Optimization',
    url: 'm7-discrete-optimization.html#topic-7-4-2',
    summary: 'Both directions of the equivalence: the slack LP and the original have the same feasible points and the same optimum',
    keywords: ['equivalence', 'proof', 'tight constraint', 'binding', 'zero slack', 'lab14']
  }
  ,{
    id: 'topic-7-4-3',
    kind: 'topic',
    number: '7.4.3',
    title: 'Handling ≥ constraints',
    module: 'M7',
    moduleTitle: 'Discrete Optimization',
    url: 'm7-discrete-optimization.html#topic-7-4-3',
    summary: 'A greater-than-or-equal constraint subtracts its slack instead of adding it, one slack per constraint either way',
    keywords: ['greater than or equal', 'surplus variable', 'subtract slack', 'minus one', 'mixed constraints']
  }
  ,{
    id: 'topic-7-4-4',
    kind: 'topic',
    number: '7.4.4',
    title: 'Standard matrix form with slack variables',
    module: 'M7',
    moduleTitle: 'Discrete Optimization',
    url: 'm7-discrete-optimization.html#topic-7-4-4',
    summary: 'Ax = b with A the original block beside an m by m identity, s = n + m variables, and rank A equal to m',
    keywords: ['identity block', 'rank', 's equals n plus m', 'augmented matrix', 'equality constraints', 'lab14']
  }
  ,{
    id: 'topic-7-4-5',
    kind: 'topic',
    number: '7.4.5',
    title: 'Underdetermined systems',
    module: 'M7',
    moduleTitle: 'Discrete Optimization',
    url: 'm7-discrete-optimization.html#topic-7-4-5',
    summary: 'More unknowns than equations: set s − m components to zero and solve, but not every choice gives an invertible basis',
    keywords: ['underdetermined', 'null space', 'rref', 'row reduce', 'singular', 'degrees of freedom', 'sympy', 'lab14']
  }
  ,{
    id: 'topic-7-4-6',
    kind: 'topic',
    number: '7.4.6',
    title: 'Basic feasible solutions',
    module: 'M7',
    moduleTitle: 'Discrete Optimization',
    url: 'm7-discrete-optimization.html#topic-7-4-6',
    summary: 'Every basic feasible solution is an extreme point and every extreme point is one, and there are finitely many',
    keywords: ['basic solution', 'basic variables', 'basic feasible solution', 'bfs', 'extreme point theorem', 'basis', 'lab14']
  }
  ,{
    id: 'topic-7-4-7',
    kind: 'topic',
    number: '7.4.7',
    title: 'Generating permutations of basic solutions',
    module: 'M7',
    moduleTitle: 'Discrete Optimization',
    url: 'm7-discrete-optimization.html#topic-7-4-7',
    summary: 'There are s choose m candidates, and the object you need is a combination — permutations would repeat each one',
    keywords: ['combinations', 'permutations', 'itertools', 'n choose k', 'candidate count', 'six ten', 'lab14']
  }
  ,{
    id: 'topic-7-4-8',
    kind: 'topic',
    number: '7.4.8',
    title: 'Evaluating feasibility',
    module: 'M7',
    moduleTitle: 'Discrete Optimization',
    url: 'm7-discrete-optimization.html#topic-7-4-8',
    summary: 'A basic solution is feasible only when every component including the slacks is non-negative; four of six here',
    keywords: ['feasibility test', 'non-negative', 'discard', 'negative slack', 'enumeration table', 'lab14']
  }
  ,{
    id: 'topic-7-4-9',
    kind: 'topic',
    number: '7.4.9',
    title: 'Brute-force LP method',
    module: 'M7',
    moduleTitle: 'Discrete Optimization',
    url: 'm7-discrete-optimization.html#topic-7-4-9',
    summary: 'Enumerate every basic solution, discard the infeasible ones, keep the best — and solve the transportation problem for $1720',
    keywords: ['brute force lp', 'enumeration', 'delcols', 'setdiff', 'transportation', '1720', 'algorithm steps', 'lab14']
  }
  ,{
    id: 'topic-7-5-1',
    kind: 'topic',
    number: '7.5.1',
    title: 'Simplex strategy outline',
    module: 'M7',
    moduleTitle: 'Discrete Optimization',
    url: 'm7-discrete-optimization.html#topic-7-5-1',
    summary: 'Generate only feasible solutions, move so the objective increases, and stop when nothing improves it',
    keywords: ['strategy', 'cost of brute force', '70', '12870', 'combinatorial growth', 'why simplex']
  }
  ,{
    id: 'topic-7-5-2',
    kind: 'topic',
    number: '7.5.2',
    title: 'Simplex requirements',
    module: 'M7',
    moduleTitle: 'Discrete Optimization',
    url: 'm7-discrete-optimization.html#topic-7-5-2',
    summary: 'A starting vertex, a way to reach a better adjacent one, and a stopping test; adjacency means a shared basic variable',
    keywords: ['requirements', 'adjacent', 'adjacency', 'dantzig', '1947', 'shared basic variable']
  }
  ,{
    id: 'topic-7-5-3',
    kind: 'topic',
    number: '7.5.3',
    title: 'Initial basic feasible solution',
    module: 'M7',
    moduleTitle: 'Discrete Optimization',
    url: 'm7-discrete-optimization.html#topic-7-5-3',
    summary: 'When every b is non-negative, setting the original variables to zero leaves the slacks equal to b — the origin',
    keywords: ['initial solution', 'starting vertex', 'b non-negative', 'origin', 'identity system', 'two phase']
  }
  ,{
    id: 'topic-7-5-4',
    kind: 'topic',
    number: '7.5.4',
    title: 'Canonical form',
    module: 'M7',
    moduleTitle: 'Discrete Optimization',
    url: 'm7-discrete-optimization.html#topic-7-5-4',
    summary: 'Each basic variable has a +1 in exactly one row and zeros elsewhere, so its value is read off the right-hand side',
    keywords: ['canonical form', 'tableau layout', 'basic variable column', 'read off', 'rhs column']
  }
  ,{
    id: 'topic-7-5-5',
    kind: 'topic',
    number: '7.5.5',
    title: 'Moving to an adjacent vertex',
    module: 'M7',
    moduleTitle: 'Discrete Optimization',
    url: 'm7-discrete-optimization.html#topic-7-5-5',
    summary: 'Raise a non-basic variable whose objective coefficient is positive, which shows up as a negative entry in the tableau',
    keywords: ['adjacent vertex', 'increase a variable', 'negative entry', 'objective row', 'sign convention']
  }
  ,{
    id: 'topic-7-5-6',
    kind: 'topic',
    number: '7.5.6',
    title: 'Entering variable',
    module: 'M7',
    moduleTitle: 'Discrete Optimization',
    url: 'm7-discrete-optimization.html#topic-7-5-6',
    summary: 'Take the most negative entry of the objective row — Dantzig’s greedy rule about the rate, not the total, of improvement',
    keywords: ['entering variable', 'most negative', 'dantzig rule', 'pivot column', 'greedy choice']
  }
  ,{
    id: 'topic-7-5-7',
    kind: 'topic',
    number: '7.5.7',
    title: 'Departing variable',
    module: 'M7',
    moduleTitle: 'Discrete Optimization',
    url: 'm7-discrete-optimization.html#topic-7-5-7',
    summary: 'The smallest positive ratio of right-hand side to entering coefficient names the row whose basic variable hits zero first',
    keywords: ['departing variable', 'minimum ratio test', 'smallest positive ratio', 'pivot row', 'pivot element', 'leaving']
  }
  ,{
    id: 'topic-7-5-8',
    kind: 'topic',
    number: '7.5.8',
    title: 'The simplex tableau',
    module: 'M7',
    moduleTitle: 'Discrete Optimization',
    url: 'm7-discrete-optimization.html#topic-7-5-8',
    summary: 'Pivoting: divide the pivotal row by the pivot, then clear the rest of the column, objective row included',
    keywords: ['tableau', 'pivoting', 'row operations', 'gauss elimination', 'pivot', '430', '420 typo']
  }
  ,{
    id: 'topic-7-5-9',
    kind: 'topic',
    number: '7.5.9',
    title: 'Optimality test',
    module: 'M7',
    moduleTitle: 'Discrete Optimization',
    url: 'm7-discrete-optimization.html#topic-7-5-9',
    summary: 'No negative entry in the objective row means no variable can improve z, so the current tableau is optimal',
    keywords: ['optimality test', 'termination', 'stopping criterion', 'no negative entries', 'unbounded column', '8 18 0']
  }
  ,{
    id: 'topic-7-5-10',
    kind: 'topic',
    number: '7.5.10',
    title: "Bland's rule (anti-cycling)",
    module: 'M7',
    moduleTitle: 'Discrete Optimization',
    url: 'm7-discrete-optimization.html#topic-7-5-10',
    summary: 'Choosing the smallest subscript among the eligible candidates stops the method cycling on a degenerate vertex',
    keywords: ['bland', 'anti-cycling', 'cycling', 'smallest subscript', 'degenerate', 'termination guarantee']
  }
  ,{
    id: 'topic-7-5-11',
    kind: 'topic',
    number: '7.5.11',
    title: 'Quadratic programming (preview)',
    module: 'M7',
    moduleTitle: 'Discrete Optimization',
    url: 'm7-discrete-optimization.html#topic-7-5-11',
    summary: 'A quadratic objective with linear constraints, whose optimum need not sit at a vertex; Q = 0 reduces it to an LP',
    keywords: ['quadratic programming', 'qp', 'symmetric matrix', 'x transpose q x', 'least squares', 'preview']
  }
  ,{
    id: 'demo-lp-geometry',
    kind: 'demo',
    number: '7.3.1',
    title: 'Two-variable LP explorer',
    module: 'M7',
    moduleTitle: 'Discrete Optimization',
    url: 'm7-discrete-optimization.html#demo-lp-geometry',
    summary: 'Draw the feasible region for six preset problems and walk its corners, watching the objective at each one',
    keywords: ['feasible region', 'graphical', 'vertices', 'corners', 'redundant', 'unbounded', 'empty', 'interactive']
  }
  ,{
    id: 'demo-slack-explorer',
    kind: 'demo',
    number: '7.4.1',
    title: 'Slack variable explorer',
    module: 'M7',
    moduleTitle: 'Discrete Optimization',
    url: 'm7-discrete-optimization.html#demo-slack-explorer',
    summary: 'Move a point and watch u and v; a negative bar is the algebraic form of a broken constraint',
    keywords: ['slack', 'surplus', 'tight constraint', 'feasible point', 'sliders', 'interactive']
  }
  ,{
    id: 'demo-basic-solutions',
    kind: 'demo',
    number: '7.4.8',
    title: 'Basic-solution enumerator',
    module: 'M7',
    moduleTitle: 'Discrete Optimization',
    url: 'm7-discrete-optimization.html#demo-basic-solutions',
    summary: 'Step through every basic solution of four problems, testing feasibility and keeping the best objective so far',
    keywords: ['brute force', 'enumeration', 'basic feasible solution', 'lab14', 'combinations', 'singular basis', 'interactive']
  }
  ,{
    id: 'demo-simplex-tableau',
    kind: 'demo',
    number: '7.5.8',
    title: 'Simplex tableau step-through',
    module: 'M7',
    moduleTitle: 'Discrete Optimization',
    url: 'm7-discrete-optimization.html#demo-simplex-tableau',
    summary: 'Every entering choice, departing choice and pivot on four problems, with Dantzig’s rule or Bland’s',
    keywords: ['simplex', 'tableau', 'pivot', 'entering', 'departing', 'bland', 'unbounded', 'step through', 'interactive']
  }
  ,{
    id: 'demo-brute-force-cost',
    kind: 'demo',
    number: '7.5.1',
    title: 'Brute-force cost calculator',
    module: 'M7',
    moduleTitle: 'Discrete Optimization',
    url: 'm7-discrete-optimization.html#demo-brute-force-cost',
    summary: 'How many linear systems brute force must solve as n and m grow, and why 70 becomes 12 870',
    keywords: ['cost', 'combinatorial explosion', 'n choose k', 'why simplex', 'scaling', 'interactive']
  }
];


/* ==========================================================================
   VALIDATOR

   Not run automatically — it costs nothing, but a search box that throws on
   load because somebody fat-fingered a comma is worse than one that quietly
   works. Call it from the console:

     import('./assets/js/search-index.js').then(m => console.table(m.validateIndex()));

   An empty array means the index is clean.
   ========================================================================== */

const REQUIRED_FIELDS = ['id', 'kind', 'number', 'title', 'module', 'moduleTitle', 'url', 'summary', 'keywords'];
const KINDS = ['page', 'module', 'section', 'topic', 'demo', 'thread'];

/**
 * Check the index for structural problems.
 * @param {Array} [index] defaults to the exported index
 * @returns {Array<{id: string, problem: string}>}
 */
function validateIndex(index = searchIndex) {
  const problems = [];
  const seen = new Set();

  index.forEach((entry, i) => {
    const label = entry && entry.id ? entry.id : `entry #${i}`;

    REQUIRED_FIELDS.forEach((field) => {
      if (!(field in entry)) problems.push({ id: label, problem: `missing field "${field}"` });
    });

    if (seen.has(entry.id)) problems.push({ id: label, problem: 'duplicate id' });
    seen.add(entry.id);

    if (!KINDS.includes(entry.kind)) {
      problems.push({ id: label, problem: `kind "${entry.kind}" is not one of ${KINDS.join(', ')}` });
    }

    if (!Array.isArray(entry.keywords) || entry.keywords.length === 0) {
      problems.push({ id: label, problem: 'keywords must be a non-empty array' });
    }

    if (typeof entry.summary !== 'string' || entry.summary.trim() === '') {
      problems.push({ id: label, problem: 'summary is empty' });
    }

    if (/^https?:/i.test(entry.url || '')) {
      problems.push({ id: label, problem: 'url points off-site; the dashboard must work offline' });
    }

    // A fragment url must agree with the entry id, or search results send
    // keyboard focus to the wrong place (or nowhere at all).
    const hash = (entry.url || '').split('#')[1];
    if (hash && hash !== entry.id) {
      problems.push({ id: label, problem: `url fragment "#${hash}" does not match id "${entry.id}"` });
    }

    if (entry.kind === 'topic' && !/^\d+(\.\d+)+$/.test(entry.number || '')) {
      problems.push({ id: label, problem: `topic number "${entry.number}" is not dotted decimal` });
    }
  });

  return problems;
}

global.SearchIndex = { INDEX_VERSION, MODULES, searchIndex, validateIndex };
})(window);
