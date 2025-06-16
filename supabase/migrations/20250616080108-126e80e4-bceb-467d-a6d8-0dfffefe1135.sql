
-- Create tables for storing user images and edits
CREATE TABLE IF NOT EXISTS user_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  original_url TEXT NOT NULL,
  edited_url TEXT,
  filename TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create table for storing text regions and edits
CREATE TABLE IF NOT EXISTS text_regions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  image_id UUID REFERENCES user_images(id) ON DELETE CASCADE,
  original_text TEXT,
  edited_text TEXT,
  translated_text TEXT,
  x FLOAT NOT NULL,
  y FLOAT NOT NULL,
  width FLOAT NOT NULL,
  height FLOAT NOT NULL,
  font_size INTEGER DEFAULT 16,
  font_family TEXT DEFAULT 'Arial',
  color TEXT DEFAULT '#000000',
  background_color TEXT,
  status TEXT DEFAULT 'original' CHECK (status IN ('original', 'translated', 'edited')),
  confidence FLOAT DEFAULT 1.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE text_regions ENABLE ROW LEVEL SECURITY;

-- Create policies for user_images
CREATE POLICY "Users can view their own images" ON user_images
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own images" ON user_images
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own images" ON user_images
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own images" ON user_images
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for text_regions
CREATE POLICY "Users can view text regions for their images" ON text_regions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_images 
      WHERE user_images.id = text_regions.image_id 
      AND user_images.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert text regions for their images" ON text_regions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_images 
      WHERE user_images.id = text_regions.image_id 
      AND user_images.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update text regions for their images" ON text_regions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_images 
      WHERE user_images.id = text_regions.image_id 
      AND user_images.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete text regions for their images" ON text_regions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_images 
      WHERE user_images.id = text_regions.image_id 
      AND user_images.user_id = auth.uid()
    )
  );

-- Create storage bucket for images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies
CREATE POLICY "Users can upload images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view images" ON storage.objects
  FOR SELECT USING (bucket_id = 'images');

CREATE POLICY "Users can update their own images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own images" ON storage.objects
  FOR DELETE USING (bucket_id = 'images' AND auth.uid()::text = (storage.foldername(name))[1]);
