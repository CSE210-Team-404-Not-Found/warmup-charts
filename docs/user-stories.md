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
