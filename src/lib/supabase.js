// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper function to upload image and save analysis
export const saveWardrobeItem = async (imageFile, analysisData, category = 'wardrobe') => {
  try {
    // Generate unique filename
    const fileExt = imageFile.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${category}/${fileName}`;

    // Upload image to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('wardrobe-images')
      .upload(filePath, imageFile);

    if (uploadError) {
      throw uploadError;
    }

    // Get public URL for the uploaded image
    const { data: { publicUrl } } = supabase.storage
      .from('wardrobe-images')
      .getPublicUrl(filePath);

    // Extract key data from analysis for easy querying
    const extractedData = {
      item_name: analysisData.name || 'Unknown Item',
      item_type: analysisData.type || null,
      category: category,
      image_url: publicUrl,
      image_filename: fileName,
      analysis_data: analysisData,
      brand: analysisData.brandIdentifiers?.likelyBrand || null,
      estimated_tier: analysisData.overallAssessment?.tier || null,
      estimated_value: analysisData.overallAssessment?.estimatedRetail || null,
      authenticity_confidence: analysisData.overallAssessment?.authenticityConfidence || null,
      quality_score: calculateQualityScore(analysisData),
      tags: [],
      notes: '',
      is_favorite: false
    };

    // Save to database
    const { data: dbData, error: dbError } = await supabase
      .from('wardrobe_items')
      .insert([extractedData])
      .select()
      .single();

    if (dbError) {
      throw dbError;
    }

    return { success: true, data: dbData };

  } catch (error) {
    console.error('Error saving wardrobe item:', error);
    return { success: false, error: error.message };
  }
};

// Helper function to calculate quality score from analysis
const calculateQualityScore = (analysis) => {
  try {
    const tier = analysis.overallAssessment?.tier?.toLowerCase() || '';
    const confidence = analysis.overallAssessment?.authenticityConfidence?.toLowerCase() || '';
    
    let score = 50; // Base score
    
    // Tier scoring
    if (tier.includes('haute couture')) score += 40;
    else if (tier.includes('luxury')) score += 30;
    else if (tier.includes('premium')) score += 20;
    else if (tier.includes('diffusion')) score += 10;
    else if (tier.includes('mass market')) score -= 10;
    
    // Authenticity confidence
    if (confidence.includes('high')) score += 10;
    else if (confidence.includes('medium')) score += 5;
    else if (confidence.includes('low')) score -= 5;
    
    return Math.max(0, Math.min(100, score));
  } catch {
    return 50; // Default score if analysis fails
  }
};

// Fetch all wardrobe items
export const getWardrobeItems = async (filters = {}) => {
  try {
    let query = supabase
      .from('wardrobe_items')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.category) {
      query = query.eq('category', filters.category);
    }
    if (filters.brand) {
      query = query.eq('brand', filters.brand);
    }
    if (filters.type) {
      query = query.eq('item_type', filters.type);
    }
    if (filters.tier) {
      query = query.eq('estimated_tier', filters.tier);
    }
    if (filters.favorites) {
      query = query.eq('is_favorite', true);
    }

    const { data, error } = await query;

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error fetching wardrobe items:', error);
    return { success: false, error: error.message };
  }
};

// Update wardrobe item (for notes, tags, favorites)
export const updateWardrobeItem = async (id, updates) => {
  try {
    const { data, error } = await supabase
      .from('wardrobe_items')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error updating wardrobe item:', error);
    return { success: false, error: error.message };
  }
};

// Delete wardrobe item
export const deleteWardrobeItem = async (id, imageFilename) => {
  try {
    // Delete from storage
    if (imageFilename) {
      await supabase.storage
        .from('wardrobe-images')
        .remove([`wardrobe/${imageFilename}`, `inspiration/${imageFilename}`]);
    }

    // Delete from database
    const { error } = await supabase
      .from('wardrobe_items')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error deleting wardrobe item:', error);
    return { success: false, error: error.message };
  }
};