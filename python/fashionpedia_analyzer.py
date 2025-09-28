# python/fashionpedia_analyzer.py
import sys
import json
from fashionpedia import Fashionpedia
import cv2
import numpy as np

class ProductionFashionpediaAnalyzer:
    def __init__(self):
        self.model = Fashionpedia()
        self.model.load_model('./models/fashionpedia_rcnn_R_101_FPN_3x.pkl')
    
    def analyze_image(self, image_path):
        image = cv2.imread(image_path)
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        results = self.model.inference(image_rgb)
        
        analysis = {
            'garments': [],
            'overall_confidence': 0.0
        }
        
        for detection in results['instances']:
            garment = {
                'category': detection['category_name'],
                'bbox': detection['bbox'],
                'mask': detection['mask'].tolist(),
                'attributes': {},
                'confidence': detection['score']
            }
            
            # Extract fine-grained attributes
            for attr_id, attr_value in detection['attributes'].items():
                attr_name = self.model.attribute_names[attr_id]
                garment['attributes'][attr_name] = {
                    'value': attr_value,
                    'confidence': detection['attribute_scores'][attr_id]
                }
            
            analysis['garments'].append(garment)
        
        analysis['overall_confidence'] = np.mean([g['confidence'] for g in analysis['garments']])
        return analysis

if __name__ == "__main__":
    analyzer = ProductionFashionpediaAnalyzer()
    result = analyzer.analyze_image(sys.argv[1])
    print(json.dumps(result))