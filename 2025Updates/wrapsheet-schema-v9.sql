-- WrapSheet Schema v9 - Coin Reward System
-- Run these commands in Cloudflare D1 console

-- Add coin tracking columns to users table
ALTER TABLE users ADD COLUMN coin_balance INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN coin_day_earned INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN coin_day_key TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN coin_week_earned INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN coin_week_key TEXT DEFAULT '';
