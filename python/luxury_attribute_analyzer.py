# python/luxury_attribute_analyzer.py
LUXURY_ATTRIBUTES = {
    'collar_design': ['notched', 'peak', 'shawl', 'mandarin'],
    'button_material': ['horn', 'mother_of_pearl', 'metal', 'fabric_covered'],
    'construction': ['hand_finished', 'machine_finished', 'bonded'],
    'fit_type': ['slim', 'regular', 'oversized', 'tailored'],
    'fabric_weight': ['lightweight', 'medium_weight', 'heavy_weight'],
    'texture': ['smooth', 'textured', 'embossed', 'brushed'],
    'seam_type': ['flat_fell', 'french', 'overlocked', 'pinked'],
    'lining_type': ['full_lined', 'half_lined', 'unlined'],
    'hardware_finish': ['polished', 'brushed', 'antique', 'matte']
}

def extract_luxury_indicators(fashionpedia_results):
    luxury_score = 0
    indicators = []
    
    for garment in fashionpedia_results['garments']:
        for attr_name, attr_data in garment['attributes'].items():
            if attr_name in LUXURY_ATTRIBUTES:
                if attr_data['confidence'] > 0.8:
                    # High-value luxury indicators
                    if attr_data['value'] in ['hand_finished', 'horn', 'peak', 'tailored', 'french', 'full_lined']:
                        luxury_score += 20
                        indicators.append(f"{attr_name}: {attr_data['value']}")
                    # Medium-value indicators
                    elif attr_data['value'] in ['notched', 'metal', 'slim', 'flat_fell']:
                        luxury_score += 10
                        indicators.append(f"{attr_name}: {attr_data['value']}")
    
    return {
        'luxury_score': min(luxury_score, 100),
        'luxury_indicators': indicators,
        'quality_tier': determine_quality_tier(luxury_score)
    }

def determine_quality_tier(score):
    if score >= 80: return 'ultra_luxury'
    elif score >= 60: return 'luxury'
    elif score >= 40: return 'premium'
    else: return 'contemporary'

