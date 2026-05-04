# Future Features

## 1. AI Agent for Menu Creation

An AI-powered agent that generates a personalized meal plan (daily or weekly) based on user preferences and constraints.

**Ideas:**
- Input: calorie target, macro split (carb/fat/protein), dietary restrictions, preferred cuisines
- Output: a structured menu with meals mapped to the existing star system
- Could leverage the Claude API with tool use to pull from the food DB (see feature 3)
- UI: a new "Menu" tab where the user can request, review, and approve a generated plan

---

## 2. Enhanced AI Analyzer — Text Support

Extend the current image analyzer to also accept free-text descriptions of meals, running them through the same Claude-powered nutrition pipeline.

**Ideas:**
- Input: plain text like "קערת שיבולת שועל עם בננה וכף חמאת בוטנים"
- Same output format as image analysis: ingredients list with kcal and macro classification
- UI: toggle between "Photo" and "Text" modes in the Analyze tab
- Useful when the user ate something without photographing it

---

## 4. Google Calendar Integration — Training Slot Suggestions

Connect to the user's Google Calendar via MCP to analyze their weekly schedule and suggest optimal workout/training slots.

**Ideas:**
- Use the Google Calendar MCP to read the user's existing events
- Identify free time windows that are suitable for training (e.g. 45–90 min blocks)
- Factor in user preferences: preferred days, time of day (morning/evening), training frequency
- Suggest slots with context: "You have a free 60-min window Tuesday at 7am — want to schedule a training?"
- Optionally create a calendar event when the user confirms a slot
- Could cross-reference with diet/energy data (e.g. suggest training on high-calorie days)

---

## 3. Building a Food DB from Images

Over time, persist analyzed image results in MongoDB to build a personal (or shared) food database, eliminating re-analysis for repeat items.

**Ideas:**
- After each successful analysis, store the image hash + ingredient results
- On new upload, check hash first — return cached results instantly if matched
- Longer term: allow users to confirm/correct entries to improve accuracy
- Could evolve into a shared community DB across users
