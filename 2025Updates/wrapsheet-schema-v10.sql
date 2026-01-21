-- WrapSheet Schema v10 - Bird Customization
-- Run these commands in Cloudflare D1 console

-- Add bird_colors column to user_preferences table
-- This stores the JSON object for bird color customization
ALTER TABLE user_preferences ADD COLUMN bird_colors TEXT;
