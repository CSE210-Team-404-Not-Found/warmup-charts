---
status: accepted
date: 2026-10-17
decision-makers: Loisel
---

# ADR-0011: implementing tooltips on canvas

## Context
A key feature we wanted to implement on this repo is tooltips. We feel like it's a critical part of interactive graph websites. 

## Thought Process
After a brief internet search and all knowing oracle ai check-in, it seems like there are several possible ways to do this. One, that I'm most familiar with already, is creating listener events for MouseUp and MouseDown (which is something I've done before for a js sketchpad project). The main con of this is that I need to carefully handle resizing when checking mouse positioning and that can be a pan with the way this canvas can be resized. Lowk might have to remove the flexibility in resizing the canvas but we shall see. Another is to draw the tooptip directly on the canvas but this is harder to style and position and can make the renderer more complex. I think the first option is best for building on top of this repo without needing to do a super deep dive into all the files. 

## Where do we go...
I think option #1 is the best choice since it naturally builds onto what this repo has and I'm comfortable implementing it on code I'm not that familiar with (as a secondary point). This repo already has a layout and transform feature in the canvas implemention - which tell you transformation values that are necessary in calculating nearest points when hovering for the tooltip. Chart.js contains all the geometry and canvas logic for the graph so I'll put the actual hit-point logicc in there. I'll put the UI behavior (like the actual tooltip and updating) in main.js because that file has page-level UI and event wiring logic in it. I'll then probably put a minimal API in index.js? Since this qualifies as something to be accessed from the main page, as index stipulates. Main steps for implementing this are:
- Add hover tracking to the canvas (mouseMove)
- Convert pointer position to chart coordinates (mouse coordinates relative to canvas)
- Compare against plotted points (point radius calc)
- Show a tooltip only when the mouse is on a point
- Hide it when the cursor leaves or moves away 
A canvas

## Possible Roadblocks Ahead
- My math and positioning calculation is all off bc I don't know the repo like that and how the canvas is sizing and I have to pretend I got hit by a bus to get out of this 
- Canvas issues: canvas gets redrawn everytime (can see that in the code) which can be inefficient (performance issues), especially in big datasets -> we're not switching from canvas just something to consider 
- Check lag with large datasets when rendering tooltips! Inefficient looping?? 
- mistake made: added findNearestPoint as a function not as a method on the class which won't allow us to call chart.findNearestPoint as that is not a method on the class - needed to be inside class 