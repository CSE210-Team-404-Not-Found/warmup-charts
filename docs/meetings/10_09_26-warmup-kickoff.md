# 10/09/26 - Warmup Project Kickoff Meeting

Format: Hybrid, in-person + Zoom

Attendees: Sarah, Jason, Tony, Pengwei, Nathan, Evan, Albert

## 1. Introductions
Members introduced themselves and described a project they were proud of:
- **Sarah** (first-year MS CS): Led the UI design of a Canva-style business card app in CSE110.
- **Jason** (first-year MS, undergraduate at UCSC): Built a tool for creating NBA player video compilations. Works as a full-stack generalist.
- **Tony** (first-year MS CS): Work on backend engineering, including work on a Steam database system. Prefers backjend work.
- **Pengwei** (first-year MS): Led projects working at ByteDance professionally in China, experience with team management and systems work
- **Nathan** (fourth-year CS, starting MS): systems projects, Neovim rewrite and macOS-compatible operating system
- **Evan** (second-year MS CS): Game jam pixel art and Python/ML work. Would like to learn more frontend.

Most members reported limited experience with HTML, CSS, and JavaScript.

## 2. User Stories

The team practiced the user-story process to familiarize the concept on a lower-stakes environment in preparation for the main project.

Team discussed common frustrations with software: slowness, unintitive interfaces, excessive menus, poor user journeys, and inefficient resource use. Noted that these tie back to not considering the full range of users, including that most users are not familiar with system internalsl, and users may be on low-end devices or slow networks.

Team then worked through an example of a developer competing with Wolfram Alpha who wants a chart communicating performance clearly. That user needs our chart to be easy to quantify and understand, accurate, not misleading, and able to show trends.

## 3. Product Definition

The team will be building a simple graphing library that supports scatter plots and line plots, as outlined in the assignment on Canvas.

Three related points were discussed later in the meeting, but are relevant here:
- There was initial disagreement on the interpretation of "line plot", including "mathematical function plotting", "drawing multiple line segments to form a graph", and "drawing one line in the form `y=mx+b`". Team agreed to unify both the scatter and line plot to a single renderer supporting arbitrary points, a line graph simply connects the points with lines. A mathematical function is represented by possibly many points, and a straight line by two points.
- The team agreed on a single input type, a CSV file of (x,y) pairs. Randomly generated points will be used during development and testing. Multiple input formats and data conversion were ruled out as overcomplicated.
- Editing or adding points directly on the graph was rejected because, as noted in lecture, it makes fabricating data easy.

## 4. Technical Decisions

No frameworks will be used. The project will use plain HTML, CSS, and JavaScript.

The team considered four options for rendering the charts themselves:
- **SVG**: Rejected. Members noted that layered SVGs became messy quickly.
- **WebGL**: Rejected as too complex for the warmup. Only one present member had graphics experience.
- **DOM elements**: Proposed as a simpler alternative to ensure warmup completion, not chosen.
- **Canvas**: Favored for efficiency and feature support. The tradeoff is that hover would require translating mouse coordinates into canvas space. This was accepted as hover is not a core goal.

Canvas was adopted, and later discussion proceeded on that basis.

## 5. AI Usage Policy

AI may be used for code, provided that the author understands entirely what they contribute. You must be able to explain your code and work off of it without losing the theory of it (Naur). The concern is that unexplained code adds bloat and technical debt.

AI will *not* be used for visual or UI design. Members agreed that AI-generated designs tend to be improperly structured, generic, and cluttered.

As 7/10 members were present during the meeting, this decision was made with high majority and will be adopted until objection.

## 6. Scope

An MVP (Minimum Viable Product - what do we need to say this is done?) scope was decided on.

Initial (MVP) scope:
- Points and lines
- Plotted data
- Axis labels
- Fixed start and end values for the axes
- Multiple data series, with distinct colors
    - Adopted as a unit, as multiple series without distinguishing colors would be difficult to distinguish.
    - Likely includes a legend.

#xtended scope (stretch goals):
- Hover interactions
- Configurable axis start and end values
- X-axis markers for significant events

## 7. Process and Repository

The team will use Architecture Decision Records in the MADR format. Each record states the decision, rationale, and alternatives considered.
- A concern was raised about overhead and who is responsible for writing records. This remains an open question, team leads will take responsibility in the meantime.
- The team agreed that ADRs should remain lightweight to establish the repository standard without adding bureaucracy.

GitHub access was confirmed for all attendees.
- The repository will be made public near the end of the project so that members may show it later. No objections were raised.
- A Github Projects board is being set up, use during the warmup will determine whether it stays.

A team document will be created in the GitHub repository to ensure everyone is familiar with and has permissions for necessary branch, edit, and merge actions within the repository. A name and short description will be all that is required.

Familiarity with CI/CD pipelines varied among members, several were familiar with Github Actions. The planned pipeline is that on pushes to `main` or other stable branches:
- Run a linter
- Stage the build
- Publish to GitHub Pages
Branching strategy was to be discussed, but was interrupted by Zoom cutting the meeting off.

## 8. Team Video

The video is planned to be structured as:
1. Team Introduction
2. Member self-introductions (12s each, ~2 minutes total), giving name, year, and what kind of work the member typically does
3. Development approach
4. Demonstration
5. Lessons learned

Each member will record their introduction. If on a phone, use the horizontal orientation.

Albert and Nathan have video editing experience, Albert will assemble the clips of self-introductions to begin with. Remaining work will occur after the project, as project progress and reflection is necessary.

A light, informal tone is preferred for the video.

A suggestion to film introductions inside convenience stores, in keeping with the team's 7-11 theme, was floated. However, this was not adopted due to issues accessing a convenience store.

## 9. Role Assignments

The team will split into frontend and backend halves. Nathan will lead the Backend subteam, Pengwei will lead the Frontend subteam.

- **Frontend**: Sarah, Evan.
- **Backend**: Jason and Tony.

Albert will work on the video, and float to whichever subteam needs help, lean toward frontend, when video downtime exists.

Work areas identified:
- HTML/page structure
- Canvas display setup
- Data visualization (axes, labels, points, lines)
- Data processing (converting input into a form JavaScript can process efficiently)

## 10. Open Items
- Branching and pull-request policy
- Representation of multiple data series
- Github Projects setup
- Commit and branch naming policy
