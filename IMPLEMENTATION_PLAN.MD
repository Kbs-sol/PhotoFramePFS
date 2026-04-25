# Image Generation & Tooling Enhancement Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** This plan covers the installation of the Chrome DevTools MCP server and the generation of premium product images for the PhotoFrameIn store.

**Architecture:** We will use the `chrome-devtools` MCP server to enable browser-based debugging and use the built-in image generator to create high-quality product images, which will be stored locally and mapped in Supabase.

**Tech Stack:** MCP (Chrome DevTools), Google AI Image Generation, Supabase.

---

### Task 1: Configuration & Infrastructure

**Files:**
- Modify: `mcp_config.json`
- Create: `public/images/products/`

- [ ] **Step 1: Update MCP configuration**
  (Note: Already present, but verify or update with custom config if needed).
  Modify: `mcp_config.json`

- [ ] **Step 2: Create images directory**
  Create: `public/images/products/`
  Run: `mkdir -p public/images/products/`

### Task 2: Image Generation

I will generate unique, premium images for the following products and save them directly into your project's `public/images/products/` directory.

- [ ] **Step 1: Generate "Divine" category images**
  - "Shree Ganesh Golden Aura"
  - "Om Namah Shivaya Cosmic"
  - "Krishna Flute Melody"

- [ ] **Step 2: Generate "Automotive" category images**
  - "Midnight Lambo Neon"
  - "GT-R Skyline Rain"
  - "Porsche 911 Sunset Drive"

- [ ] **Step 3: Generate "Motivation" category images**
  - "Grind in Silence"
  - "Discipline Equals Freedom"
  - "Rise and Conquer"

- [ ] **Step 4: Generate "Sports" category images**
  - "Cricket Stadium Lights"
  - "Football Glory Moment"

### Task 3: Database & Mapping

**Files:**
- Create: `supabase/update_images.sql`

- [ ] **Step 1: Create SQL Update Script**
  Create a script to update `product_images` with the new local file paths and update `categories` with relevant cover images.

- [ ] **Step 2: Provide SQL script for execution**
  Output the SQL script for manual execution in the Supabase Dashboard.

### Verification Plan

**Automated Tests:**
- Verify `mcp_config.json` syntax.
- Check that images exist in the `public/images/products/` directory.

**Manual Verification:**
- View the local frontend at `localhost:5173` to see the new images displayed in the product grid.
