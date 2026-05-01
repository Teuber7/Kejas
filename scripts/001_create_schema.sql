-- Pronóstico Card Game Database Schema
-- This script creates all tables needed for the multiplayer card game

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
CREATE POLICY "profiles_select_all" ON public.profiles 
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles 
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles 
  FOR UPDATE USING (auth.uid() = id);

-- Rooms table (game lobbies)
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  host_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
  max_players INTEGER DEFAULT 4 CHECK (max_players BETWEEN 2 AND 7),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rooms_select_all" ON public.rooms;
CREATE POLICY "rooms_select_all" ON public.rooms 
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "rooms_insert_authenticated" ON public.rooms;
CREATE POLICY "rooms_insert_authenticated" ON public.rooms 
  FOR INSERT WITH CHECK (auth.uid() = host_id);

DROP POLICY IF EXISTS "rooms_update_host" ON public.rooms;
CREATE POLICY "rooms_update_host" ON public.rooms 
  FOR UPDATE USING (auth.uid() = host_id);

DROP POLICY IF EXISTS "rooms_delete_host" ON public.rooms;
CREATE POLICY "rooms_delete_host" ON public.rooms 
  FOR DELETE USING (auth.uid() = host_id);

-- Room players junction table
CREATE TABLE IF NOT EXISTS public.room_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seat_position INTEGER NOT NULL CHECK (seat_position BETWEEN 0 AND 6),
  is_ready BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, player_id),
  UNIQUE(room_id, seat_position)
);

ALTER TABLE public.room_players ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "room_players_select_all" ON public.room_players;
CREATE POLICY "room_players_select_all" ON public.room_players 
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "room_players_insert_own" ON public.room_players;
CREATE POLICY "room_players_insert_own" ON public.room_players 
  FOR INSERT WITH CHECK (auth.uid() = player_id);

DROP POLICY IF EXISTS "room_players_update_own" ON public.room_players;
CREATE POLICY "room_players_update_own" ON public.room_players 
  FOR UPDATE USING (auth.uid() = player_id);

DROP POLICY IF EXISTS "room_players_delete_own" ON public.room_players;
CREATE POLICY "room_players_delete_own" ON public.room_players 
  FOR DELETE USING (auth.uid() = player_id);

-- Game state table (current game state)
CREATE TABLE IF NOT EXISTS public.game_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID UNIQUE NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  current_round INTEGER DEFAULT 1 CHECK (current_round BETWEEN 1 AND 14),
  cards_per_round INTEGER DEFAULT 1,
  trump_suit TEXT CHECK (trump_suit IN ('oros', 'copas', 'espadas', 'bastos')),
  trump_card JSONB, -- The visible trump card
  current_phase TEXT DEFAULT 'dealing' CHECK (current_phase IN ('dealing', 'predicting', 'playing', 'scoring', 'tiebreaking', 'finished')),
  current_turn_player_id UUID REFERENCES public.profiles(id),
  dealer_player_id UUID REFERENCES public.profiles(id),
  lead_suit TEXT, -- Suit of the first card played in current trick
  current_trick JSONB DEFAULT '[]'::JSONB, -- Cards played in current trick
  tricks_played INTEGER DEFAULT 0,
  round_scores JSONB DEFAULT '{}'::JSONB, -- Scores for current round
  total_scores JSONB DEFAULT '{}'::JSONB, -- Cumulative scores
  predictions JSONB DEFAULT '{}'::JSONB, -- Player predictions for current round
  tricks_won JSONB DEFAULT '{}'::JSONB, -- Tricks won this round per player
  tiebreak_players JSONB DEFAULT NULL, -- Player IDs involved in a tiebreak
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.game_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "game_state_select_players" ON public.game_state;
CREATE POLICY "game_state_select_players" ON public.game_state 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.room_players 
      WHERE room_id = game_state.room_id 
      AND player_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "game_state_update_players" ON public.game_state;
CREATE POLICY "game_state_update_players" ON public.game_state 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.room_players 
      WHERE room_id = game_state.room_id 
      AND player_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "game_state_insert_host" ON public.game_state;
CREATE POLICY "game_state_insert_host" ON public.game_state 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rooms 
      WHERE id = room_id 
      AND host_id = auth.uid()
    )
  );

-- Player hands table (PRIVATE - only owner can see)
CREATE TABLE IF NOT EXISTS public.player_hands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_state_id UUID NOT NULL REFERENCES public.game_state(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cards JSONB DEFAULT '[]'::JSONB,
  UNIQUE(game_state_id, player_id)
);

ALTER TABLE public.player_hands ENABLE ROW LEVEL SECURITY;

-- CRITICAL: Only the owner can see their own hand
DROP POLICY IF EXISTS "player_hands_select_own" ON public.player_hands;
CREATE POLICY "player_hands_select_own" ON public.player_hands 
  FOR SELECT USING (auth.uid() = player_id);

DROP POLICY IF EXISTS "player_hands_insert_game" ON public.player_hands;
CREATE POLICY "player_hands_insert_game" ON public.player_hands 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.game_state gs
      JOIN public.rooms r ON r.id = gs.room_id
      WHERE gs.id = game_state_id 
      AND r.host_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "player_hands_update_own" ON public.player_hands;
CREATE POLICY "player_hands_update_own" ON public.player_hands
  FOR UPDATE USING (
    auth.uid() = player_id
    OR EXISTS (
      SELECT 1 FROM public.game_state gs
      JOIN public.rooms r ON r.id = gs.room_id
      WHERE gs.id = player_hands.game_state_id
      AND r.host_id = auth.uid()
    )
  );

-- Game history table (completed games)
CREATE TABLE IF NOT EXISTS public.game_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  room_name TEXT NOT NULL,
  winner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  final_scores JSONB NOT NULL,
  player_ids UUID[] NOT NULL,
  rounds_played INTEGER NOT NULL,
  duration_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.game_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "game_history_select_participants" ON public.game_history;
CREATE POLICY "game_history_select_participants" ON public.game_history 
  FOR SELECT USING (auth.uid() = ANY(player_ids));

DROP POLICY IF EXISTS "game_history_insert_authenticated" ON public.game_history;
CREATE POLICY "game_history_insert_authenticated" ON public.game_history 
  FOR INSERT WITH CHECK (auth.uid() = ANY(player_ids));

-- Create trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- RPC function to deal cards for a new round (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION public.deal_new_round(
  p_game_state_id UUID,
  p_player_hands JSONB
)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_key TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.game_state gs
    JOIN public.rooms r ON r.id = gs.room_id
    WHERE gs.id = p_game_state_id
    AND r.host_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  FOR v_key IN SELECT jsonb_object_keys(p_player_hands) LOOP
    UPDATE public.player_hands
    SET cards = p_player_hands->v_key
    WHERE game_state_id = p_game_state_id
    AND player_id = v_key::UUID;
  END LOOP;
END;
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rooms_code ON public.rooms(code);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON public.rooms(status);
CREATE INDEX IF NOT EXISTS idx_room_players_room ON public.room_players(room_id);
CREATE INDEX IF NOT EXISTS idx_room_players_player ON public.room_players(player_id);
CREATE INDEX IF NOT EXISTS idx_game_state_room ON public.game_state(room_id);
CREATE INDEX IF NOT EXISTS idx_player_hands_game ON public.player_hands(game_state_id);
CREATE INDEX IF NOT EXISTS idx_player_hands_player ON public.player_hands(player_id);
CREATE INDEX IF NOT EXISTS idx_game_history_winner ON public.game_history(winner_id);
