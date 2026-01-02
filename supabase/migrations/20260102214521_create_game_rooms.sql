/*
  # Game Rooms System

  1. New Tables
    - `game_rooms`
      - `id` (text, primary key) - Room code
      - `host_name` (text) - Name of room host
      - `status` (text) - WAITING, IN_PROGRESS, FINISHED
      - `player_count` (int) - Current number of players
      - `max_players` (int) - Maximum players (default 2)
      - `created_at` (timestamptz) - Room creation time
      - `updated_at` (timestamptz) - Last activity
      
  2. Security
    - Enable RLS on `game_rooms` table
    - Allow anyone to read open rooms
    - Allow anyone to create rooms
    - Auto-cleanup old rooms
*/

CREATE TABLE IF NOT EXISTS game_rooms (
  id text PRIMARY KEY,
  host_name text NOT NULL DEFAULT 'Player',
  status text NOT NULL DEFAULT 'WAITING',
  player_count int NOT NULL DEFAULT 1,
  max_players int NOT NULL DEFAULT 2,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE game_rooms ENABLE ROW LEVEL SECURITY;

-- Anyone can view open rooms
CREATE POLICY "Anyone can view waiting rooms"
  ON game_rooms
  FOR SELECT
  USING (status = 'WAITING' OR status = 'IN_PROGRESS');

-- Anyone can create rooms
CREATE POLICY "Anyone can create rooms"
  ON game_rooms
  FOR INSERT
  WITH CHECK (true);

-- Anyone can update rooms (for player count, status)
CREATE POLICY "Anyone can update rooms"
  ON game_rooms
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Anyone can delete old/finished rooms
CREATE POLICY "Anyone can delete rooms"
  ON game_rooms
  FOR DELETE
  USING (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_game_rooms_status ON game_rooms(status);
CREATE INDEX IF NOT EXISTS idx_game_rooms_created ON game_rooms(created_at DESC);