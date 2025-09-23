// src/components/WardrobeGallery.js
import React, { useState, useEffect } from 'react';
import { getWardrobeItems, updateWardrobeItem, deleteWardrobeItem } from '../lib/supabase';
import { Heart, Tag, Trash2, Eye, Filter, Star } from 'lucide-react';

const WardrobeGallery = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: '',
    brand: '',
    tier: '',
    favorites: false
  });
  const [selectedItem, setSelectedItem] = useState(null);

  // Load items
  useEffect(() => {
    loadItems();
  }, [filters]);

  const loadItems = async () => {
    setLoading(true);
    const result = await getWardrobeItems(filters);
    if (result.success) {
      setItems(result.data);
    }
    setLoading(false);
  };

  // Toggle favorite
  const toggleFavorite = async (item) => {
    const result = await updateWardrobeItem(item.id, {
      is_favorite: !item.is_favorite
    });
    
    if (result.success) {
      setItems(items.map(i => 
        i.id === item.id ? { ...i, is_favorite: !i.is_favorite } : i
      ));
    }
  };

  // Delete item
  const handleDelete = async (item) => {
    if (!confirm('Delete this item from your wardrobe?')) return;
    
    const result = await deleteWardrobeItem(item.id, item.image_filename);
    if (result.success) {
      setItems(items.filter(i => i.id !== item.id));
    }
  };

  // Get unique values for filters
  const brands = [...new Set(items.map(item => item.brand).filter(Boolean))];
  const tiers = [...new Set(items.map(item => item.estimated_tier).filter(Boolean))];

  const QualityBadge = ({ score }) => {
    const getColor = (score) => {
      if (score >= 80) return 'bg-green-100 text-green-800';
      if (score >= 60) return 'bg-blue-100 text-blue-800';
      if (score >= 40) return 'bg-yellow-100 text-yellow-800';
      return 'bg-red-100 text-red-800';
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getColor(score)}`}>
        {score}/100
      </span>
    );
  };

  const ItemModal = ({ item, onClose }) => {
    if (!item) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-4xl max-h-screen overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold">{item.item_name}</h2>
              <button 
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <img 
                  src={item.image_url} 
                  alt={item.item_name}
                  className="w-full h-96 object-cover rounded-lg"
                />
                
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <QualityBadge score={item.quality_score} />
                    {item.brand && (
                      <span className="px-2 py-1 bg-gray-100 rounded-full text-sm">
                        {item.brand}
                      </span>
                    )}
                  </div>
                  
                  {item.estimated_tier && (
                    <p className="text-sm text-gray-600">
                      <strong>Tier:</strong> {item.estimated_tier}
                    </p>
                  )}
                  
                  {item.estimated_value && (
                    <p className="text-sm text-gray-600">
                      <strong>Estimated Value:</strong> {item.estimated_value}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-2">Analysis Details</h3>
                  <div className="bg-gray-50 p-4 rounded-lg text-sm space-y-2">
                    {item.analysis_data.brandIdentifiers && (
                      <div>
                        <strong>Brand Confidence:</strong> {item.analysis_data.brandIdentifiers.confidence}/100
                      </div>
                    )}
                    
                    {item.analysis_data.overallAssessment?.condition && (
                      <div>
                        <strong>Condition:</strong> {item.analysis_data.overallAssessment.condition}
                      </div>
                    )}
                    
                    {item.analysis_data.fabricAnalysis?.weaveStructure && (
                      <div>
                        <strong>Fabric:</strong> {item.analysis_data.fabricAnalysis.weaveStructure}
                      </div>
                    )}
                    
                    {item.analysis_data.constructionSignatures?.shoulderConstruction && (
                      <div>
                        <strong>Construction:</strong> {item.analysis_data.constructionSignatures.shoulderConstruction}
                      </div>
                    )}
                  </div>
                </div>
                
                {item.analysis_data.qualityIndicators?.luxuryMarkers && (
                  <div>
                    <h4 className="font-medium mb-2">Luxury Markers</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {item.analysis_data.qualityIndicators.luxuryMarkers.map((marker, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Star className="w-3 h-3 mt-1 text-yellow-500 flex-shrink-0" />
                          {marker}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Wardrobe</h1>
        <div className="text-sm text-gray-600">
          {items.length} items
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">Filters:</span>
          </div>
          
          <select 
            value={filters.category} 
            onChange={(e) => setFilters({...filters, category: e.target.value})}
            className="px-3 py-1 border rounded text-sm"
          >
            <option value="">All Categories</option>
            <option value="wardrobe">Wardrobe</option>
            <option value="inspiration">Inspiration</option>
          </select>
          
          <select 
            value={filters.brand} 
            onChange={(e) => setFilters({...filters, brand: e.target.value})}
            className="px-3 py-1 border rounded text-sm"
          >
            <option value="">All Brands</option>
            {brands.map(brand => (
              <option key={brand} value={brand}>{brand}</option>
            ))}
          </select>
          
          <select 
            value={filters.tier} 
            onChange={(e) => setFilters({...filters, tier: e.target.value})}
            className="px-3 py-1 border rounded text-sm"
          >
            <option value="">All Tiers</option>
            {tiers.map(tier => (
              <option key={tier} value={tier}>{tier}</option>
            ))}
          </select>
          
          <button
            onClick={() => setFilters({...filters, favorites: !filters.favorites})}
            className={`px-3 py-1 rounded text-sm flex items-center gap-1 ${
              filters.favorites ? 'bg-red-100 text-red-800' : 'bg-gray-100'
            }`}
          >
            <Heart className={`w-4 h-4 ${filters.favorites ? 'fill-current' : ''}`} />
            Favorites
          </button>
          
          <button
            onClick={() => setFilters({ category: '', brand: '', tier: '', favorites: false })}
            className="px-3 py-1 bg-gray-100 rounded text-sm"
          >
            Clear All
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your wardrobe...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">No items found. Upload some photos to get started!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {items.map((item) => (
            <div key={item.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
              <div className="relative">
                <img 
                  src={item.image_url} 
                  alt={item.item_name}
                  className="w-full h-48 object-cover"
                />
                
                <div className="absolute top-2 right-2 flex gap-1">
                  <button
                    onClick={() => toggleFavorite(item)}
                    className={`p-1 rounded-full ${
                      item.is_favorite 
                        ? 'bg-red-100 text-red-600' 
                        : 'bg-white text-gray-400'
                    } hover:bg-red-100 hover:text-red-600`}
                  >
                    <Heart className={`w-4 h-4 ${item.is_favorite ? 'fill-current' : ''}`} />
                  </button>
                  
                  <button
                    onClick={() => handleDelete(item)}
                    className="p-1 rounded-full bg-white text-gray-400 hover:bg-red-100 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="absolute bottom-2 left-2">
                  <QualityBadge score={item.quality_score} />
                </div>
              </div>
              
              <div className="p-4">
                <h3 className="font-semibold truncate mb-2">{item.item_name}</h3>
                
                <div className="space-y-1 text-sm text-gray-600 mb-3">
                  {item.brand && <div>Brand: {item.brand}</div>}
                  {item.estimated_tier && <div>Tier: {item.estimated_tier}</div>}
                  {item.estimated_value && <div>Value: {item.estimated_value}</div>}
                </div>
                
                <button
                  onClick={() => setSelectedItem(item)}
                  className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedItem && (
        <ItemModal 
          item={selectedItem} 
          onClose={() => setSelectedItem(null)} 
        />
      )}
    </div>
  );
};

export default WardrobeGallery;