# User Stories

User stories for the Warmup Charts demo, based on a review of the live site
and our testing.

### 1. Load my own CSV file

As a student,
I want to load my own CSV file
so that I can chart large amounts of data without inputting points one at a time.

- [x] Choosing a `.csv` file with the CSV Input button draws its series on the
  chart, with the file name as the chart title.
- [x] The header row names the series, and each column after `x` becomes its
  own series.
- [x] If the file can't be loaded (i.e. a missing header), an error
  message explains why and the previous chart stays on screen.

### 2. Read my data clearly

As an analyst,
I want a chart that fits my data and tells my series apart
so that I can see trends without adjusting anything.

- [x] The Chart Type menu switches between a scatter plot and a line graph,
  with line points connected in order of x.
- [x] The axes fit every point automatically, including negative values and
  decimals.
- [x] Each series has its own color (the first four are colorblind-safe), and a
  legend shows each series' name and color.

### 3. See a point's exact value

As an analyst,
I want to hover over a point to see its values
so that I don't have to estimate them from the axes.

- [x] Hovering within 7 pixels of a point shows a tooltip with the series name
  and the point's x and y values.
- [x] When several points are nearby, the tooltip shows the closest one, and it
  hides when the pointer leaves the chart.

### 4. Customize the chart and save it

As a presenter,
I want to label, size, and simplify the chart, then download it
so that it fits my report or slides.

- [x] Axis labels, width, height, and the Axes, Axis labels, and Legend
  checkboxes only take effect when Apply Changes is clicked, and a success
  message confirms the redraw.
- [x] An empty or non-positive width or height isn't applied, and the browser
  points to the invalid field.
- [x] Download PNG saves the chart as currently drawn, named after the dataset
  (e.g. `Multi-series.png`).

### 5. Chart a million points without freezing the page

As a researcher with large data,
I want big scatter plots to draw quickly
so that I can explore large datasets in the browser.

- [x] Scatter plots with 18,000 points or more are drawn in parallel by Web
  Workers; smaller charts use the main-thread renderer, which is faster at
  that size.
- [x] The Million Rows sample (two series, 1,000,000 rows) draws all of its
  points.
- [x] Browsers without Web Workers fall back to the main-thread renderer, so
  the chart still draws.
